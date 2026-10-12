import { z } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const buckets = new Map<string, { n: number; until: number }>();
export function limit(request: Request) {
  const key =
    request.headers.get("oai-authenticated-user-id") ||
    request.headers.get("cf-connecting-ip") ||
    "local";
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.until < now) {
    b = { n: 0, until: now + 60000 };
    buckets.set(key, b);
  }
  if (++b.n > 30)
    throw new AppError(429, "Сұрау тым көп. Бір минуттан кейін қайталаңыз.");
  if (buckets.size > 2000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
}
export async function fetchRetry(
  url: string,
  init: RequestInit = {},
  timeout = 25000,
) {
  for (let i = 0; i < 3; i++) {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeout),
    });
    if (response.ok) return response;
    if (response.status === 429 || response.status >= 500) {
      if (i < 2) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** i));
        continue;
      }
    }
    throw new AppError(
      response.status === 401 ? 502 : 503,
      "Сыртқы сервис сұрауды қабылдамады. Кілттерді, квотаны және қосылымды тексеріңіз.",
    );
  }
  throw new AppError(503, "Сервис уақытша қолжетімсіз");
}
let cachedToken: { token: string; expires: number } | undefined;
export async function copernicusToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.token;
  const id = process.env.COPERNICUS_CLIENT_ID,
    secret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!id || !secret)
    throw new AppError(
      503,
      "Copernicus қосылмаған. COPERNICUS_CLIENT_ID және COPERNICUS_CLIENT_SECRET серверде орнатылуы керек. NASA архивін және базалық картаны қолдануға болады.",
    );
  const r = await fetchRetry(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: id,
        client_secret: secret,
      }),
    },
  );
  const j = (await r.json()) as any;
  cachedToken = {
    token: j.access_token,
    expires: Date.now() + (j.expires_in - 60) * 1000,
  };
  return j.access_token as string;
}
export const bounds = z
  .tuple([
    z.number().min(46).max(55),
    z.number().min(36).max(48),
    z.number().min(46).max(55),
    z.number().min(36).max(48),
  ])
  .refine((b) => b[0] < b[2] && b[1] < b[3], "Жарамсыз шекара");
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) =>
      !Number.isNaN(Date.parse(d)) &&
      new Date(d).toISOString().slice(0, 10) === d &&
      d <= new Date().toISOString().slice(0, 10),
    "Жарамсыз күн",
  );
export const querySchema = z
  .object({
    bbox: bounds,
    start: date,
    end: date,
    cloud: z.number().min(0).max(100).default(20),
  })
  .refine((x) => x.start <= x.end, "Күн аралығы дұрыс емес");
export const imagerySchema = z.object({
  bbox: bounds,
  date: date,
  layer: z.enum(["true", "false", "ndwi"]).default("true"),
  width: z.number().int().min(64).max(1024).default(768),
  height: z.number().int().min(64).max(1024).default(768),
});
const cache = new Map<string, { expires: number; data: any }>();
export async function catalog(body: z.infer<typeof querySchema>) {
  const key = JSON.stringify(body),
    hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const token = await copernicusToken();
  const response = await fetchRetry(
    "https://sh.dataspace.copernicus.eu/catalog/v1/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collections: ["sentinel-2-l2a"],
        bbox: body.bbox,
        datetime: `${body.start}T00:00:00Z/${body.end}T23:59:59Z`,
        limit: 30,
        filter: `eo:cloud_cover <= ${body.cloud}`,
        "filter-lang": "cql2-text",
      }),
    },
  );
  const result = (await response.json()) as any;
  const data = {
    scenes: result.features.map((f: any) => ({
      id: f.id,
      date: f.properties.datetime,
      cloud: f.properties["eo:cloud_cover"],
      platform: f.properties.platform,
      geometry: f.geometry,
    })),
    next: result.links?.some((l: any) => l.rel === "next"),
  };
  if (cache.size > 100) cache.clear();
  cache.set(key, { expires: Date.now() + 300000, data });
  return data;
}
export async function imagery(body: z.infer<typeof imagerySchema>) {
  const token = await copernicusToken();
  const expression =
    body.layer === "true"
      ? "[2.5*s.B04,2.5*s.B03,2.5*s.B02,s.dataMask]"
      : body.layer === "false"
        ? "[2.5*s.B08,2.5*s.B04,2.5*s.B03,s.dataMask]"
        : "(s.B03+s.B08>0?((s.B03-s.B08)/(s.B03+s.B08)>0?[0.05,0.7,0.85,s.dataMask]:[0.7,0.65,0.5,s.dataMask]):[0,0,0,0])";
  return fetchRetry("https://sh.dataspace.copernicus.eu/process/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: body.bbox,
          properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: body.date + "T00:00:00Z",
                to: body.date + "T23:59:59Z",
              },
              mosaickingOrder: "leastCC",
            },
          },
        ],
      },
      output: {
        width: body.width,
        height: body.height,
        responses: [{ identifier: "default", format: { type: "image/png" } }],
      },
      evalscript: `//VERSION=3\nfunction setup(){return {input:["B02","B03","B04","B08","dataMask"],output:{bands:4}}}function evaluatePixel(s){return ${expression}}`,
    }),
  });
}
export async function geoRequest(path: string, body?: unknown) {
  const url = process.env.GEO_API_URL,
    key = process.env.GEO_API_KEY;
  if (!url || !key)
    throw new AppError(
      503,
      "NDWI өңдеу сервисі қосылмаған. Python сервисін іске қосып, GEO_API_URL және GEO_API_KEY орнатыңыз. Сандық нәтиже есептелген жоқ.",
    );
  const r = await fetch(url.replace(/\/$/, "") + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const j: any = await r.json();
  if (!r.ok)
    throw new AppError(
      r.status === 401 ? 502 : r.status,
      typeof j.detail === "string" ? j.detail : "Өңдеу сұрауы орындалмады.",
    );
  return j;
}
