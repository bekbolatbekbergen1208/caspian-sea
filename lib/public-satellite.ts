import { z } from "zod";
import { AppError, bounds, date, fetchRetry, querySchema } from "./server";
import { browseLayers } from "./satellite";
let capabilitiesCache: { until: number; data: any } | undefined;
export async function browseMetadata() {
  if (capabilitiesCache && capabilitiesCache.until > Date.now())
    return capabilitiesCache.data;
  const r = await fetchRetry(
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml",
  );
  const xml = await r.text();
  const sections = [
    ...xml.matchAll(/<(?:\w+:)?Layer\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Layer>/g),
  ].map((m) => m[1]);
  const data = {
    source: "NASA GIBS WMTS GetCapabilities",
    checked_at: new Date().toISOString(),
    layers: browseLayers
      .map((config) => {
        const section = sections.find((s) =>
          s.includes(">" + config.layer + "</"),
        );
        const dimension = section?.match(
          /<(?:\w+:)?Dimension\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Dimension>/,
        )?.[1];
        const latest = dimension?.match(/<(?:\w+:)?Default>([^<]+)</)?.[1];
        const intervals = [
          ...(dimension?.matchAll(/<(?:\w+:)?Value>([^<]+)</g) || []),
        ].map((m) => m[1]);
        return {
          ...config,
          provider_latest: latest,
          latest:
            latest && latest > new Date().toISOString().slice(0, 10)
              ? new Date().toISOString().slice(0, 10)
              : latest,
          intervals,
        };
      })
      .filter((x) => x.latest),
  };
  if (!data.layers.length)
    throw new AppError(503, "NASA қабат метадеректері табылмады.");
  capabilitiesCache = { until: Date.now() + 3600000, data };
  return data;
}
export const browseImageSchema = z.object({
  bbox: bounds,
  date,
  source: z.enum(["terra", "aqua", "viirs"]).default("terra"),
});
export async function browseImage(input: z.infer<typeof browseImageSchema>) {
  const meta = await browseMetadata();
  const config = meta.layers.find((x: any) => x.id === input.source)!;
  if (
    !config ||
    !config.intervals.some((range: string) => {
      const [first, last] = range.split("/");
      return input.date >= first && input.date <= last;
    })
  )
    throw new AppError(
      404,
      "Бұл күнде NASA қабаты қолжетімсіз. Басқа күнді таңдаңыз.",
    );
  const q = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: config.layer,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    SRS: "EPSG:4326",
    BBOX: input.bbox.join(","),
    WIDTH: "768",
    HEIGHT: "768",
    TIME: input.date,
  });
  const r = await fetchRetry(
    "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?" + q,
  );
  if (!r.headers.get("Content-Type")?.includes("image/png"))
    throw new AppError(502, "NASA суреті алынбады.");
  return r;
}
export async function publicCatalog(input: z.infer<typeof querySchema>) {
  const r = await fetchRetry("https://stac.dataspace.copernicus.eu/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collections: ["sentinel-2-l2a"],
      bbox: input.bbox,
      datetime: `${input.start}T00:00:00Z/${input.end}T23:59:59Z`,
      limit: 50,
      filter: { op: "<=", args: [{ property: "eo:cloud_cover" }, input.cloud] },
      "filter-lang": "cql2-json",
    }),
  });
  const j: any = await r.json();
  return {
    source: "Copernicus public STAC",
    scenes: j.features.map((f: any) => ({
      id: f.id,
      date: f.properties.datetime,
      cloud: f.properties["eo:cloud_cover"],
      platform:
        f.properties.platform || f.properties.constellation || "Sentinel-2",
      geometry: f.geometry,
      preview: !!f.assets.thumbnail,
      public_preview: true,
    })),
    next: j.links?.some((l: any) => l.rel === "next"),
  };
}
export const previewSchema = z.object({
  id: z
    .string()
    .regex(/^S2[ABC]_MSIL2A_[A-Za-z0-9_]+$/)
    .max(180),
});
export async function publicPreview(id: string) {
  const r = await fetchRetry(
    "https://stac.dataspace.copernicus.eu/v1/collections/sentinel-2-l2a/items/" +
      encodeURIComponent(id),
  );
  const item: any = await r.json();
  const href = item.assets?.thumbnail?.href;
  if (!href) throw new AppError(404, "Түсірілім preview-ы жоқ.");
  const url = new URL(href);
  if (
    url.protocol !== "https:" ||
    !["datahub.creodias.eu", "catalogue.dataspace.copernicus.eu"].includes(
      url.hostname,
    ) ||
    !/^\/odata\/v1\/Assets\([a-f0-9-]+\)\/\$value$/.test(url.pathname)
  )
    throw new AppError(502, "Preview мекенжайы қолдау көрсетілмейді.");
  return fetchRetry(url.href);
}
