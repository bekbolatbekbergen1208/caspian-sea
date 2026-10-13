"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Crosshair,
  Download,
  Layers,
  PenTool,
  Check,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { regions } from "@/lib/data";
import { browseLayers, browseTiles, completeBrowseDay } from "@/lib/satellite";
import { Lang, words } from "@/lib/i18n";
export default function SatelliteMap({
  region = "aktau",
  lang = "kk",
  image,
  shoreline,
  onPolygon,
}: {
  region?: string;
  lang?: Lang;
  image?: { url: string; bbox: number[] };
  shoreline?: any;
  onPolygon?: (p: any) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false),
    [drawing, setDrawing] = useState(false),
    [points, setPoints] = useState<number[][]>([]),
    [base, setBase] = useState("satellite"),
    [showShore, setShowShore] = useState(true),
    [error, setError] = useState("");
  const drawingRef = useRef(false);
  const t = words[lang];
  const [browseSource, setBrowseSource] = useState("terra"),
    [browseDate, setBrowseDate] = useState("2024-09-29"),
    [metadata, setMetadata] = useState<any>(null);
  const config = browseLayers.find((x) => x.id === browseSource)!;
  useEffect(() => {
    fetch("/api/browse-metadata")
      .then((r) => {
        if (!r.ok) throw new Error("NASA metadata could not be loaded");
        return r.json();
      })
      .then((j: any) => {
        setMetadata(j);
        const latest = j.layers.find((l: any) => l.id === "terra")?.latest;
        if (latest) setBrowseDate(completeBrowseDay(latest));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!host.current) return;
    const r = regions.find((x) => x.id === region) || regions[0];
    const m = new maplibregl.Map({
      container: host.current,
      center: r.center,
      zoom: r.zoom,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          satellite: {
            type: "raster",
            tiles: [
              "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-09-29/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
            ],
            tileSize: 256,
            maxzoom: 9,
            attribution: "NASA GIBS · imagery date and source shown above",
          },
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          { id: "satellite", type: "raster", source: "satellite" },
        ],
      },
    });
    map.current = m;
    m.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );
    m.on("load", () => {
      m.addSource("polygon", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      m.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygon",
        paint: { "fill-color": "#16c8e8", "fill-opacity": 0.12 },
      });
      m.addLayer({
        id: "polygon-line",
        type: "line",
        source: "polygon",
        paint: { "line-color": "#16c8e8", "line-width": 2 },
      });
      m.addLayer({
        id: "polygon-points",
        type: "circle",
        source: "polygon",
        paint: { "circle-radius": 5, "circle-color": "#16c8e8" },
      });
      setReady(true);
    });
    m.on("click", (e) => {
      if (drawingRef.current)
        setPoints((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    });
    m.on("error", () =>
      setError("Map layer could not be loaded. Check your connection."),
    );
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const source = m.getSource("satellite") as maplibregl.RasterTileSource;
    source.setTiles([browseTiles(config.layer, browseDate)]);
    setError("");
  }, [ready, browseSource, browseDate]);
  useEffect(() => {
    drawingRef.current = drawing;
    if (map.current)
      map.current.getCanvas().style.cursor = drawing ? "crosshair" : "";
  }, [drawing]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const r = regions.find((x) => x.id === region) || regions[0];
    map.current.flyTo({ center: r.center, zoom: r.zoom });
    setPoints([]);
  }, [region, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setLayoutProperty(
      "satellite",
      "visibility",
      base === "satellite" ? "visible" : "none",
    );
  }, [base, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const features: any[] = points.map((p) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: p },
    }));
    if (points.length >= 3)
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[...points, points[0]]] },
      });
    (map.current.getSource("polygon") as maplibregl.GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features,
    });
  }, [points, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (m.getLayer("scene")) m.removeLayer("scene");
    if (m.getSource("scene")) m.removeSource("scene");
    if (image) {
      const b = image.bbox;
      m.addSource("scene", {
        type: "image",
        url: image.url,
        coordinates: [
          [b[0], b[3]],
          [b[2], b[3]],
          [b[2], b[1]],
          [b[0], b[1]],
        ],
      });
      m.addLayer({
        id: "scene",
        type: "raster",
        source: "scene",
        paint: { "raster-opacity": 1, "raster-fade-duration": 0 },
      });
      m.fitBounds(
        [
          [b[0], b[1]],
          [b[2], b[3]],
        ],
        { padding: 40 },
      );
    }
  }, [image, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (m.getLayer("shoreline")) m.removeLayer("shoreline");
    if (m.getSource("shoreline")) m.removeSource("shoreline");
    if (shoreline) {
      m.addSource("shoreline", { type: "geojson", data: shoreline });
      m.addLayer({
        id: "shoreline",
        type: "line",
        source: "shoreline",
        paint: { "line-color": "#20c997", "line-width": 3 },
      });
    }
  }, [shoreline, ready]);
  useEffect(() => {
    if (map.current?.getLayer("shoreline"))
      map.current.setLayoutProperty(
        "shoreline",
        "visibility",
        showShore ? "visible" : "none",
      );
  }, [showShore]);
  function finish() {
    if (points.length < 3) {
      setError("Select at least three points for a polygon.");
      return;
    }
    const p = { type: "Polygon", coordinates: [[...points, points[0]]] };
    setDrawing(false);
    onPolygon?.(p);
    setError("");
  }
  function exportPNG() {
    const m = map.current;
    if (!m) return;
    m.triggerRepaint();
    m.once("idle", () => {
      try {
        const a = document.createElement("a");
        a.download = "caspian-map.png";
        a.href = m.getCanvas().toDataURL("image/png");
        a.click();
      } catch {
        setError("PNG export failed.");
      }
    });
  }
  return (
    <div className="map-wrap">
      <div className="map-canvas" ref={host} />
      <div className="map-top">
        <span className="map-label">
          <span className="live-dot" />
          {image ? "SENTINEL-2 L2A" : `${config.title} · ${browseDate}`}
        </span>
        <div className="segmented">
          <button
            className={base === "satellite" ? "selected" : ""}
            onClick={() => setBase("satellite")}
          >
            {t.satellite}
          </button>
          <button
            className={base === "map" ? "selected" : ""}
            onClick={() => setBase("map")}
          >
            {t.map}
          </button>
        </div>
      </div>
      {!image && (
        <div className="browse-controls">
          <select
            aria-label="Satellite source"
            value={browseSource}
            onChange={(e) => setBrowseSource(e.target.value)}
          >
            {browseLayers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            aria-label="Satellite imagery date"
            type="date"
            value={browseDate}
            max={
              metadata?.layers.find((l: any) => l.id === browseSource)?.latest
            }
            min={metadata?.layers
              .find((l: any) => l.id === browseSource)
              ?.intervals[0]?.slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) setBrowseDate(e.target.value);
            }}
          />
          <span>{"Daily browse imagery; not a 10 m measurement"}</span>
        </div>
      )}
      <div className="map-tools">
        <button title="Zoom in" onClick={() => map.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button title="Zoom out" onClick={() => map.current?.zoomOut()}>
          <Minus size={18} />
        </button>
        <button
          title="Center"
          onClick={() => {
            const r = regions.find((x) => x.id === region) || regions[0];
            map.current?.flyTo({ center: r.center, zoom: r.zoom });
          }}
        >
          <Crosshair size={18} />
        </button>
        <button
          title={t.draw}
          className={drawing ? "selected" : ""}
          onClick={() => {
            setDrawing(!drawing);
            setPoints([]);
          }}
        >
          <PenTool size={18} />
        </button>
        <button title="PNG" onClick={exportPNG}>
          <Download size={18} />
        </button>
      </div>
      {drawing && (
        <div className="draw-tip">
          {"Click at least 3 points on the map"}{" "}
          <button onClick={finish}>
            <Check size={16} />
            {t.finish}
          </button>
          <button
            onClick={() => {
              setDrawing(false);
              setPoints([]);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="map-legend">
        <Layers size={14} />
        {image
          ? "Copernicus · Sentinel-2"
          : `${config.title} · ${config.resolution}`}
        {shoreline && (
          <label>
            <input
              type="checkbox"
              checked={showShore}
              onChange={(e) => setShowShore(e.target.checked)}
            />
            <i />
            {"Detected shoreline"}
          </label>
        )}
      </div>
      {error && (
        <div className="map-error" role="alert">
          {error}
          <button aria-label="Close" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
