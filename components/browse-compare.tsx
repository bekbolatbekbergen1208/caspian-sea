"use client";
import { useEffect, useState } from "react";
import {
  GitCompareArrows,
  Satellite,
  AlertCircle,
  Download,
} from "lucide-react";
import { browseLayers, completeBrowseDay } from "@/lib/satellite";
import { regions } from "@/lib/data";
import { Lang, words } from "@/lib/i18n";
export default function BrowseCompare({ lang }: { lang: Lang }) {
  const t = words[lang];
  const [region, setRegion] = useState("north"),
    [source, setSource] = useState("terra"),
    [before, setBefore] = useState("2025-10-11"),
    [after, setAfter] = useState("2026-10-11"),
    [latest, setLatest] = useState(""),
    [slider, setSlider] = useState(50),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pair, setPair] = useState<{
      before: string;
      after: string;
      dates: string[];
      source: string;
      region: string;
    } | null>(null);
  const config = browseLayers.find((c) => c.id === source)!;
  useEffect(() => {
    fetch("/api/browse-metadata")
      .then((r) => r.json())
      .then((j: any) => {
        const day = j.layers?.find((l: any) => l.id === "terra")?.latest;
        if (day) {
          const d = completeBrowseDay(day);
          setLatest(day);
          setAfter(d);
          setBefore(`${Number(d.slice(0, 4)) - 1}${d.slice(4)}`);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(
    () => () => {
      if (pair) {
        URL.revokeObjectURL(pair.before);
        URL.revokeObjectURL(pair.after);
      }
    },
    [pair],
  );
  async function load() {
    setBusy(true);
    setError("");
    setPair(null);
    try {
      if (before >= after)
        throw new Error("The start date must be earlier than the end date.");
      const reg = regions.find((r) => r.id === region)!;
      const bbox = region === "aktau" ? [50.9, 43.4, 51.5, 43.9] : reg.bbox;
      const responses = await Promise.all(
        [before, after].map(async (day) => {
          const r = await fetch("/api/browse-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bbox, date: day, source }),
          });
          if (!r.ok) {
            const j: any = await r.json();
            throw new Error(j.error);
          }
          return r.blob();
        }),
      );
      setPair({
        before: URL.createObjectURL(responses[0]),
        after: URL.createObjectURL(responses[1]),
        dates: [before, after],
        source: config.title,
        region: reg.en,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="panel comparison-fields">
        <label className="field">
          {t.region}
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setPair(null);
            }}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.en}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t.satellite}
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPair(null);
            }}
          >
            {browseLayers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t.before}
          <input
            type="date"
            value={before}
            max={latest || undefined}
            onChange={(e) => {
              setBefore(e.target.value);
              setPair(null);
            }}
          />
        </label>
        <label className="field">
          {t.after}
          <input
            type="date"
            value={after}
            max={latest || undefined}
            onChange={(e) => {
              setAfter(e.target.value);
              setPair(null);
            }}
          />
        </label>
        <button className="button primary" disabled={busy} onClick={load}>
          <Satellite size={16} />
          {busy ? t.loading : "Load NASA comparison"}
        </button>
      </div>
      {error && (
        <div className="notice" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {pair ? (
        <>
          <div className="comparison-view">
            <img
              className="compare-image"
              src={pair.after}
              alt={`${pair.source} ${pair.dates[1]}`}
            />
            <div
              className="comparison-before"
              style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
            >
              <img
                className="compare-image"
                src={pair.before}
                alt={`${pair.source} ${pair.dates[0]}`}
              />
            </div>
            <div className="comparison-line" style={{ left: slider + "%" }}>
              <span>
                <GitCompareArrows size={22} />
              </span>
            </div>
            <span className="date-pill before-pill">
              {pair.dates[0]}
              <small>{pair.source}</small>
            </span>
            <span className="date-pill after-pill">
              {pair.dates[1]}
              <small>{pair.source}</small>
            </span>
            <input
              className="comparison-range"
              aria-label="Comparison slider"
              type="range"
              min="0"
              max="100"
              value={slider}
              onChange={(e) => setSlider(+e.target.value)}
            />
          </div>
          <div className="export-buttons">
            {["before", "after"].map((key, i) => (
              <a
                key={key}
                className="button secondary"
                href={key === "before" ? pair.before : pair.after}
                download={`NASA-${pair.dates[i]}.png`}
              >
                <Download size={16} />
                {pair.dates[i]} PNG
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="panel empty-state">
          <Satellite size={36} />
          <h3>{"Compare real 2026 observations"}</h3>
          <p>{"Choose two dates and load NASA imagery. No API key needed."}</p>
        </div>
      )}
      <div className="notice success">
        <AlertCircle size={18} />
        <span>
          {
            "NASA daily browse imagery on the same extent and 768 × 768 grid. Visual comparison only: no spectral NDWI or area measurement. Clouds and missing coverage can obscure the coastline."
          }
        </span>
      </div>
    </div>
  );
}
