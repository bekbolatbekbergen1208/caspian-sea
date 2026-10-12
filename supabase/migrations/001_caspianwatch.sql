-- Run in Supabase SQL editor. All scientific data inherits owner access.
create extension if not exists postgis with schema extensions;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.users(id,display_name) values(new.id,new.raw_user_meta_data->>'display_name');return new;end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Support users created before the migration.
insert into public.users(id) select id from auth.users on conflict do nothing;
create table public.research_projects (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 title text not null check(char_length(title) between 2 and 150),
 region text not null,
 before date not null,
 after date not null check(after>before),
 bbox jsonb not null,
 notes text not null default '',
 status text not null default 'draft' check(status in ('draft','processing','completed','failed')),
 result jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.study_areas (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 name text not null,geometry extensions.geometry(Polygon,4326) not null,created_at timestamptz not null default now()
);
create table public.satellite_scenes (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 source_scene_id text not null,acquired_at timestamptz not null,platform text not null default 'Sentinel-2',
 collection text not null default 'sentinel-2-l2a',cloud_cover real check(cloud_cover between 0 and 100),
 footprint extensions.geometry(Geometry,4326),metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
create table public.imagery_assets (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 scene_id uuid references public.satellite_scenes on delete set null,storage_path text not null,
 layer text not null,crs text not null,resolution_m real not null,source text not null,created_at timestamptz not null default now()
);
create table public.shoreline_vectors (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 acquired_on date not null,geometry extensions.geometry(Geometry,4326) not null,
 algorithm_version text not null,source_scene_ids text[] not null,computed_at timestamptz not null default now()
);
create table public.water_area_measurements (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 before_date date not null,after_date date not null,exposed_km2 double precision not null check(exposed_km2>=0),
 flooded_km2 double precision not null check(flooded_km2>=0),water_before_km2 double precision not null,
 water_after_km2 double precision not null,valid_fraction real not null check(valid_fraction between 0 and 1),
 uncertainty_km2 double precision not null,displacement_m double precision,
 algorithm_version text not null,projection text not null,threshold real not null,
 source_scene_ids text[] not null,computed_at timestamptz not null
);
create table public.analysis_jobs (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 external_job_id text not null,status text not null check(status in ('queued','running','completed','failed')),
 error text,parameters jsonb not null default '{}',algorithm_version text not null,created_at timestamptz not null default now()
);
create table public.ai_analysis_reports (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.research_projects on delete cascade,
 content text not null,model text not null,source_measurement_ids uuid[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.users enable row level security;
create policy owner_profile on public.users for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.research_projects enable row level security;
create policy own_projects_read on public.research_projects for select to authenticated using(user_id=auth.uid());
create policy own_drafts_insert on public.research_projects for insert to authenticated with check(user_id=auth.uid() and result is null and status='draft');
create policy own_drafts_update on public.research_projects for update to authenticated using(user_id=auth.uid() and result is null) with check(user_id=auth.uid() and result is null and status='draft');
create policy own_projects_delete on public.research_projects for delete to authenticated using(user_id=auth.uid());
do $$ declare t text;begin
 foreach t in array array['study_areas','satellite_scenes','imagery_assets','shoreline_vectors','water_area_measurements','analysis_jobs','ai_analysis_reports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for select to authenticated using(exists(select 1 from public.research_projects p where p.id=project_id and p.user_id=auth.uid()))',t);
 execute format('create index on public.%I(project_id)',t);
 end loop;end;$$;
create index on public.research_projects(user_id,created_at desc);
create index on public.study_areas using gist(geometry);
create index on public.shoreline_vectors using gist(geometry);
-- Transactional server-verified result persistence. RLS still applies to the caller.
create function public.save_analysis(p_title text,p_result jsonb,p_user_id uuid,p_project_id uuid default null) returns uuid
language plpgsql security invoker set search_path = public,extensions as $$
declare pid uuid; feature jsonb; ids text[]; sid text;begin
 if auth.role() <> 'service_role' then raise exception 'Server access required';end if;
 ids=string_to_array((p_result->>'before_scene')||';'||(p_result->>'after_scene'),';');
 if p_project_id is not null then
 update research_projects set region=p_result->>'region',before=(p_result->>'before')::date,after=(p_result->>'after')::date,bbox=p_result->'bbox',result=p_result,status='completed',updated_at=now() where id=p_project_id and user_id=p_user_id and result is null returning id into pid;
 if pid is null then raise exception 'Draft project not found or already completed';end if;
 else
 insert into research_projects(user_id,title,region,before,after,bbox,status,result)
 values(p_user_id,p_title,p_result->>'region',(p_result->>'before')::date,(p_result->>'after')::date,p_result->'bbox','completed',p_result) returning id into pid;
 end if;
 foreach sid in array string_to_array(p_result->>'before_scene',';') loop
 insert into satellite_scenes(project_id,source_scene_id,acquired_at,metadata) values(pid,sid,(p_result->>'before')::timestamptz,jsonb_build_object('source','Copernicus','date_precision','day'));end loop;
 foreach sid in array string_to_array(p_result->>'after_scene',';') loop
 insert into satellite_scenes(project_id,source_scene_id,acquired_at,metadata) values(pid,sid,(p_result->>'after')::timestamptz,jsonb_build_object('source','Copernicus','date_precision','day'));end loop;
 insert into study_areas(project_id,name,geometry) values(pid,p_result->>'region',st_setsrid(st_geomfromgeojson((p_result->'polygon')::text),4326));
 insert into water_area_measurements(project_id,before_date,after_date,exposed_km2,flooded_km2,water_before_km2,water_after_km2,valid_fraction,uncertainty_km2,displacement_m,algorithm_version,projection,threshold,source_scene_ids,computed_at)
 values(pid,(p_result->>'before')::date,(p_result->>'after')::date,(p_result->>'exposed_km2')::float8,(p_result->>'flooded_km2')::float8,(p_result->>'water_before_km2')::float8,(p_result->>'water_after_km2')::float8,(p_result->>'valid_fraction')::real,(p_result->>'uncertainty_km2')::float8,(p_result->>'displacement_m')::float8,p_result->>'algorithm',p_result->>'projection',(p_result->>'threshold')::real,ids,(p_result->>'created_at')::timestamptz);
 for feature in select * from jsonb_array_elements(p_result->'shoreline'->'features') loop
 insert into shoreline_vectors(project_id,acquired_on,geometry,algorithm_version,source_scene_ids,computed_at)
 values(pid,case when feature->'properties'->>'period'='before' then (p_result->>'before')::date else (p_result->>'after')::date end,st_setsrid(st_geomfromgeojson((feature->'geometry')::text),4326),p_result->>'algorithm',ids,(p_result->>'created_at')::timestamptz);
 end loop;
 insert into analysis_jobs(project_id,external_job_id,status,algorithm_version) values(pid,p_result->>'id','completed',p_result->>'algorithm');
 return pid;
end;$$;
revoke execute on function public.save_analysis(text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.save_analysis(text,jsonb,uuid,uuid) to service_role;
-- Private Storage bucket; paths begin with auth.uid().
insert into storage.buckets(id,name,public) values('research-assets','research-assets',false) on conflict do nothing;
create policy own_assets_read on storage.objects for select to authenticated using(bucket_id='research-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_assets_write on storage.objects for insert to authenticated with check(bucket_id='research-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_assets_update on storage.objects for update to authenticated using(bucket_id='research-assets' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='research-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy own_assets_delete on storage.objects for delete to authenticated using(bucket_id='research-assets' and (storage.foldername(name))[1]=auth.uid()::text);
