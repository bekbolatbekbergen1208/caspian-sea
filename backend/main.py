"""Authenticated geospatial service, durable SQLite jobs, bounded worker pool."""
from __future__ import annotations
import os, json, sqlite3, uuid, math, asyncio, threading
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone, date
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import httpx
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel, Field, model_validator
from rasterio.io import MemoryFile
from rasterio.crs import CRS
from rasterio.transform import from_origin
from shapely.geometry import shape, box, mapping
from shapely.ops import transform as transform_geometry
from pyproj import Transformer
from processing import summarize, ALGORITHM

DATA_DIR=Path(os.environ.get('DATA_DIR','./data'))
DATA_DIR.mkdir(parents=True,exist_ok=True)
DB_PATH=DATA_DIR/'jobs.sqlite3'
def connect():
    db=sqlite3.connect(DB_PATH)
    db.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,status TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT,created_at TEXT NOT NULL)')
    return db
with connect() as db:
    db.execute("UPDATE jobs SET status='failed',error='Service restarted; submit the job again.' WHERE status IN ('queued','running')")
POOL=ThreadPoolExecutor(max_workers=2)
SLOTS=threading.BoundedSemaphore(8)

@asynccontextmanager
async def lifespan(app):
    yield
    POOL.shutdown(wait=True)
app=FastAPI(title='CaspianWatch Geospatial API',lifespan=lifespan)
def authorized(x_api_key: str=Header(default='')):
    import secrets
    expected=os.environ.get('GEO_API_KEY','')
    if not expected or not secrets.compare_digest(expected,x_api_key):
        raise HTTPException(401,'Invalid processing service key')

class AnalyzeInput(BaseModel):
    bbox:list[float]=Field(min_length=4,max_length=4)
    before:date
    after:date
    region:str=Field(max_length=100)
    threshold:float=Field(default=0,ge=-.5,le=.5)
    polygon:Optional[dict]=None
    @model_validator(mode='after')
    def validate_input(self):
        b=self.bbox
        if not (46<=b[0]<b[2]<=55 and 36<=b[1]<b[3]<=48):raise ValueError('AOI outside Caspian bounds')
        if self.before>=self.after or self.after>date.today():raise ValueError('Invalid observation dates')
        if self.polygon:
            p=shape(self.polygon)
            if p.geom_type!='Polygon' or not p.is_valid or p.area<=0 or not box(*b).covers(p):raise ValueError('Invalid AOI polygon')
        return self

def request_retry(client,url,**kwargs):
    import time
    for attempt in range(3):
        r=client.post(url,**kwargs)
        if r.status_code<400:return r
        if (r.status_code==429 or r.status_code>=500) and attempt<2:
            time.sleep(0.5*2**attempt)
            continue
        raise ValueError(f'Copernicus returned HTTP {r.status_code}. Check credentials, quota and dates.')

def process(inp:AnalyzeInput):
    client_id,secret=os.environ.get('COPERNICUS_CLIENT_ID'),os.environ.get('COPERNICUS_CLIENT_SECRET')
    if not client_id or not secret:raise ValueError('Copernicus credentials not configured on Python service')
    b=inp.bbox
    polygon=shape(inp.polygon) if inp.polygon else box(*b)
    lon,lat=polygon.centroid.x,polygon.centroid.y
    crs=CRS.from_epsg(32600+int((lon+180)//6)+1)
    transformer=Transformer.from_crs('EPSG:4326',crs,always_xy=True)
    projected=transform_geometry(transformer.transform,polygon)
    xmin,ymin,xmax,ymax=projected.bounds
    xmin,ymin=math.floor(xmin/10)*10,math.floor(ymin/10)*10
    xmax,ymax=math.ceil(xmax/10)*10,math.ceil(ymax/10)*10
    width,height=int((xmax-xmin)/10),int((ymax-ymin)/10)
    if width>1024 or height>1024:raise ValueError('NDWI area is limited to 10.24 × 10.24 km per job. Draw a smaller polygon or select the Aktau study window.')
    transform=from_origin(xmin,ymax,10,10)
    evalscript='''//VERSION=3
function setup(){return {input:[{bands:["B03","B08","B11","SCL","dataMask"]}],output:{bands:5,sampleType:"FLOAT32"}}}
function evaluatePixel(s){return [s.B03,s.B08,s.B11,s.SCL,s.dataMask]}'''
    scenes=[];arrays=[];metadata=[]
    with httpx.Client(timeout=90) as client:
        token=request_retry(client,'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',data={'grant_type':'client_credentials','client_id':client_id,'client_secret':secret}).json()['access_token']
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'}
        for day in [inp.before.isoformat(),inp.after.isoformat()]:
            catalog=request_retry(client,'https://sh.dataspace.copernicus.eu/catalog/v1/search',headers=headers,json={'collections':['sentinel-2-l2a'],'bbox':list(polygon.bounds),'datetime':day+'T00:00:00Z/'+day+'T23:59:59Z','limit':100}).json()
            features=catalog.get('features',[])
            if not features:raise ValueError(f'No Sentinel-2 L2A scenes found on {day}. Choose another day.')
            # Preserve every contributing tile ID, rather than claim one exact tile mosaic.
            scenes.append([f['id'] for f in features]);metadata.append([{'id':f['id'],'datetime':f['properties'].get('datetime'),'cloud_cover':f['properties'].get('eo:cloud_cover'),'platform':f['properties'].get('platform')} for f in features])
            payload={'input':{'bounds':{'bbox':[xmin,ymin,xmax,ymax],'properties':{'crs':f'http://www.opengis.net/def/crs/EPSG/0/{crs.to_epsg()}'}},'data':[{'type':'sentinel-2-l2a','dataFilter':{'timeRange':{'from':day+'T00:00:00Z','to':day+'T23:59:59Z'},'mosaickingOrder':'leastCC'},'processing':{'upsampling':'NEAREST','downsampling':'NEAREST'}}]},'output':{'width':width,'height':height,'responses':[{'identifier':'default','format':{'type':'image/tiff'}}]},'evalscript':evalscript}
            response=request_retry(client,'https://sh.dataspace.copernicus.eu/process/v1',headers=headers,json=payload)
            with MemoryFile(response.content) as mem:
                with mem.open() as ds:
                    if ds.width!=width or ds.height!=height:raise ValueError('Unexpected raster grid')
                    if ds.crs and ds.crs!=crs:raise ValueError('Unexpected raster projection')
                    arrays.append(ds.read())
    result=summarize(arrays[0],arrays[1],transform,crs,mapping(projected),inp.threshold)
    result.update({'region':inp.region,'before':inp.before.isoformat(),'after':inp.after.isoformat(),
        'before_scene':';'.join(scenes[0]),'after_scene':';'.join(scenes[1]),'bbox':b,'polygon':mapping(polygon),
        'scene_metadata':{'before':metadata[0],'after':metadata[1]},'created_at':datetime.now(timezone.utc).isoformat(),'source':'Copernicus Sentinel-2 Level-2A',
        'season_warning':abs(inp.before.month-inp.after.month)>1})
    if result['season_warning']:result['limitations'].append('Different seasons may confound comparison.')
    return result

def run_job(job_id,inp):
    try:
        with connect() as db:db.execute("UPDATE jobs SET status='running' WHERE id=?",(job_id,))
        result=process(inp);result['id']=job_id
        with connect() as db:db.execute("UPDATE jobs SET status='completed',result=? WHERE id=?",(json.dumps(result),job_id))
    except Exception as e:
        with connect() as db:db.execute("UPDATE jobs SET status='failed',error=? WHERE id=?",(str(e),job_id))
    finally:SLOTS.release()

def submit(inp):
    if not SLOTS.acquire(blocking=False):raise HTTPException(429,'Processing queue full. Try later.')
    job_id=str(uuid.uuid4())
    with connect() as db:db.execute('INSERT INTO jobs(id,status,input,created_at) VALUES (?,?,?,?)',(job_id,'queued',inp.model_dump_json(),datetime.now(timezone.utc).isoformat()))
    POOL.submit(run_job,job_id,inp)
    return job_id

@app.get('/health')
def health():return {'status':'ok','algorithm':ALGORITHM}
@app.post('/jobs',dependencies=[Depends(authorized)],status_code=202)
def create_job(inp:AnalyzeInput):return {'job_id':submit(inp),'status':'queued'}
@app.get('/jobs/{job_id}',dependencies=[Depends(authorized)])
def get_job(job_id:str):
    with connect() as db:row=db.execute('SELECT status,result,error FROM jobs WHERE id=?',(job_id,)).fetchone()
    if not row:raise HTTPException(404,'Job not found')
    return {'job_id':job_id,'status':row[0],'result':json.loads(row[1]) if row[1] else None,'error':row[2]}
@app.post('/analyze',dependencies=[Depends(authorized)])
async def analyze(inp:AnalyzeInput):
    # Compatibility endpoint. Work continues durably if the client disconnects.
    job_id=submit(inp)
    for _ in range(240):
        job=get_job(job_id)
        if job['status']=='completed':return job['result']
        if job['status']=='failed':raise HTTPException(422,job['error'])
        await asyncio.sleep(.5)
    raise HTTPException(504,f'Processing continues. Poll /jobs/{job_id}')
