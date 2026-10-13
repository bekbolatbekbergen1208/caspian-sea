"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { regions } from "@/lib/data";
import {
  levelForecast,
  shorelineScenario,
  NASA_CASPIAN_URL,
  type LevelDataset,
} from "@/lib/altimetry";
const LevelChart = dynamic(() => import("./level-chart"), {
  ssr: false,
  loading: () => <p>Loading chart…</p>,
});
function save(name: string, value: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function AltimetryForecast() {
  const [data, setData] = useState<LevelDataset | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [region, setRegion] = useState("aktau"),
    [slope, setSlope] = useState("500");
  useEffect(() => {
    let cancelled = false;
    fetch("/datasets/caspian-altimetry.json")
      .then((r) => {
        if (!r.ok) throw new Error("Saved NASA dataset could not be loaded.");
        return r.json();
      })
      .then((j) => {
        if (!cancelled) setData(j as LevelDataset);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const result = useMemo(
    () => (data ? levelForecast(data, target) : null),
    [data, target],
  );
  const reg = regions.find((r) => r.id === region)!;
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/altimetry");
      const j = (await r.json()) as LevelDataset & { error?: string };
      if (!r.ok) throw new Error(j.error || "NASA refresh failed.");
      setData(j);
    } catch (e) {
      setError(
        (e as Error).message + " The saved observations remain available.",
      );
    } finally {
      setBusy(false);
    }
  }
  function downloadForecast() {
    if (!data || !result || "error" in result) return;
    save(
      `caspian-level-forecast-${target}.json`,
      JSON.stringify(
        {
          source: data.source,
          source_url: data.source_url,
          retrieved_at: data.retrieved_at,
          sha256: data.sha256 || null,
          datum: data.datum,
          track_center: data.track_center,
          study_area: {
            region,
            bbox: reg.bbox,
            center: reg.center,
            scope: "Basin-scale level proxy; not a local measurement",
          },
          forecast: result,
          shoreline_scenario: {
            assumed_slope_ratio: Number(slope),
            displacement_m:
              Number(slope) >= 1 && Number(slope) <= 10000
                ? shorelineScenario(result.change_m, Number(slope))
                : null,
            meaning:
              "Hypothetical planar slope, not derived from coordinates or imagery",
          },
          limitations: [
            "No independently validated operational forecast.",
            "Winter extrapolation lacks ice-free winter validation.",
            "Empirical error range is not a calibrated confidence interval.",
            "Does not model wind, river inflow or evaporation.",
          ],
        },
        null,
        2,
      ),
    );
  }
  return (
    <div className="forecast-layout">
      <section className="panel level-intro">
        <div>
          <span className="eyebrow">
            REAL SATELLITE OBSERVATIONS · APPROXIMATE FORECAST
          </span>
          <h2>Forecast the Caspian water level</h2>
          <p>
            NASA radar altimetry supplies numerical observations from 1992
            onward. We fit recent monthly levels with a trend and, when selected
            by historical tests, an annual seasonal cycle.
          </p>
        </div>
        <button className="button" disabled={busy} onClick={refresh}>
          {busy ? "Checking NASA…" : "Refresh NASA observations"}
        </button>
      </section>
      {error && (
        <div role="alert" className="forecast-warning">
          {error}
        </div>
      )}
      <section className="panel level-content">
        <div className="forecast-controls">
          <label>
            Forecast date
            <input
              type="date"
              value={target}
              max={
                data
                  ? new Date(
                      Date.parse(data.rows.at(-1)!.date) + 365 * 86400000,
                    )
                      .toISOString()
                      .slice(0, 10)
                  : undefined
              }
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label>
            Study location
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.en}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          Study centre: {reg.center[1].toFixed(3)}° N,{" "}
          {reg.center[0].toFixed(3)}° E. NASA track centre: 41.970° N, 50.385°
          E. All regions use the same basin-scale level proxy; these coordinates
          do not establish a local coastal water level.
        </p>
        {!data ? (
          <p>Loading real NASA observations…</p>
        ) : (
          <div className="forecast-metrics">
            <p>
              Saved observations:{" "}
              <b>{data.rows.length.toLocaleString("en-US")}</b>
            </p>
            <p>
              Coverage:{" "}
              <b>
                {data.rows[0].date} → {data.rows.at(-1)!.date}
              </b>
            </p>
            <p>
              Retrieved: <b>{data.retrieved_at.slice(0, 10)}</b>
            </p>
            <p>
              Processing version: <b>{data.processing_version}</b>
            </p>
          </div>
        )}
        {result &&
          ("error" in result ? (
            <div className="empty-inline">
              <h3>Choose another date</h3>
              <p>{result.error}</p>
            </div>
          ) : (
            <>
              <div className="level-cards">
                <div className="level-card">
                  <span>Approximate level · {target}</span>
                  <strong>
                    {result.level_m.toFixed(2)} <small>m</small>
                  </strong>
                  <small>EGM2008 orthometric datum</small>
                </div>
                <div className="level-card">
                  <span>Difference from latest observation</span>
                  <strong>
                    {(result.change_m * 100).toFixed(0)} <small>cm</small>
                  </strong>
                  <small>Compared with {result.latest.date}</small>
                </div>
                <div className="level-card">
                  <span>Historical-error scenario range</span>
                  <strong>
                    {result.lower_m.toFixed(2)} to {result.upper_m.toFixed(2)}{" "}
                    <small>m</small>
                  </strong>
                  <small>Not a calibrated probability interval</small>
                </div>
              </div>
              <div className="forecast-warning">
                <b>Exploratory estimate.</b>{" "}
                {result.validation.beats_persistence
                  ? "This model improved on a constant-level baseline in the displayed held-out checks."
                  : "In the held-out checks, keeping the last monthly level unchanged performed better. Do not treat this model as a demonstrated improvement."}{" "}
                {result.winter_extrapolation &&
                  "Winter target: ice-flagged observations were excluded, so the winter seasonal extension has no ice-free winter validation and is less reliable."}
              </div>
              <LevelChart history={result.history} future={result.future} />
              <p>
                Constant-level alternative:{" "}
                <b>{result.persistence_level_m.toFixed(2)} m EGM2008</b> (the
                last training monthly median). This simpler forecast is included
                so you can compare the model with its baseline.
              </p>
              <div className="forecast-metrics">
                <p>
                  Latest observed level:{" "}
                  <b>{result.latest.egm2008_m.toFixed(2)} m</b> ·{" "}
                  {result.latest.mission}
                  {result.latest.provisional ? " · provisional IGDR" : ""}
                </p>
                <p>
                  Recent annual trend:{" "}
                  <b>{(result.trend_m_year * 100).toFixed(1)} cm/year</b>
                </p>
                <p>
                  Training:{" "}
                  <b>
                    {result.raw_count} ice-free readings /{" "}
                    {result.monthly_count} monthly medians
                  </b>
                </p>
                <p>
                  Model:{" "}
                  <b>
                    {result.model === "seasonal"
                      ? "Linear trend + annual sine/cosine"
                      : "Linear trend"}
                  </b>
                </p>
                <p>
                  Forecast lead: <b>{result.horizon_days} days</b>
                </p>
                <p>
                  Held-out mean absolute error:{" "}
                  <b>{(result.validation.mae_m * 100).toFixed(1)} cm</b>
                </p>
                <p>
                  Constant-level baseline error:{" "}
                  <b>
                    {(result.validation.persistence_mae_m * 100).toFixed(1)} cm
                  </b>
                </p>
                <p>
                  Checks: <b>{result.validation.count} historical targets</b> ·{" "}
                  {result.validation.horizon_days}-day minimum lead
                </p>
              </div>
              <button className="button primary" onClick={downloadForecast}>
                Download forecast + provenance
              </button>
              <section className="shoreline-scenarios">
                <h3>What might that mean for a shoreline?</h3>
                <p>
                  Water-level change can be translated into a horizontal
                  distance only with a coastal slope. The following are
                  hypothetical slopes, not measured slopes at {reg.en}. Positive
                  distance means movement toward the sea; negative means
                  movement inland.
                </p>
                <div className="forecast-metrics">
                  {[100, 500, 1000].map((ratio) => (
                    <p key={ratio}>
                      Assumed slope 1:{ratio}
                      <br />
                      <b>
                        {shorelineScenario(result.change_m, ratio).toFixed(0)} m
                      </b>
                      <br />
                      <small>
                        Scenario range:{" "}
                        {shorelineScenario(
                          result.change_upper_m,
                          ratio,
                        ).toFixed(0)}{" "}
                        to{" "}
                        {shorelineScenario(
                          result.change_lower_m,
                          ratio,
                        ).toFixed(0)}{" "}
                        m
                      </small>
                    </p>
                  ))}
                </div>
                <label className="slope-input">
                  Your assumed slope · 1:
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={slope}
                    onChange={(e) => setSlope(e.target.value)}
                  />
                </label>
                {Number(slope) >= 1 && Number(slope) <= 10000 ? (
                  <p>
                    Conditional displacement:{" "}
                    <b>
                      {shorelineScenario(
                        result.change_m,
                        Number(slope),
                      ).toFixed(0)}{" "}
                      m
                    </b>
                    . A real shoreline prediction needs a surveyed elevation
                    profile or suitable bathymetry and image-based validation.
                  </p>
                ) : (
                  <p>Enter a slope ratio between 1 and 10000.</p>
                )}
              </section>
            </>
          ))}
      </section>
      <section className="panel level-content">
        <span className="eyebrow">IMAGE EVIDENCE</span>
        <div className="image-evidence">
          <img
            src="/images/sentinel-2026-preview.jpg"
            alt="Official Sentinel-2B quicklook near Aktau, 11 October 2026"
          />
          <div>
            <h3>What the available image contributes</h3>
            <p>
              CoastSeg was run on the actual Sentinel-2B tile 39TWJ quicklook
              from 2026-10-11. It classified{" "}
              <b>
                {((150454 / 262144) * 100).toFixed(1)}% of resized image pixels
                as water
              </b>{" "}
              (150,454 / 262,144 pixels). This is a classifier output, not a
              measured sea area or ground-truth accuracy.
            </p>
            <p>
              The preview covers an entire tile and has no per-pixel cloud mask
              or usable geotransform in this JPEG. Its pixel fraction is not
              converted into km² and is not used to train the water-level
              forecast.
            </p>
            <Link className="button" href="/shoreline-ai">
              Inspect / rerun the image model
            </Link>
          </div>
        </div>
      </section>
      <section className="panel level-content">
        <h3>Sources and next data to add</h3>
        <p>
          <a href={NASA_CASPIAN_URL} target="_blank" rel="noreferrer">
            NASA / USDA-FAS water-level product · Caspian target 000270
          </a>{" "}
          supplies the observations. The level uses source column 15 (EGM2008),
          not a JPEG-derived estimate or an unspecified local gauge datum.{" "}
          <a href="/datasets/caspian-nasa-000270.txt" download>
            Download saved original NASA text
          </a>
          .
        </p>
        <p>
          The most useful additions are consistent Sentinel-2 / Landsat
          shoreline dates, surveyed coastal slopes, local gauges, river inflow,
          wind, rainfall and evaporation. These inputs have not yet been fitted
          into this model.
        </p>
        <p>
          Missing-value sentinels and invalid dates are removed. Training
          excludes potential ice and reported errors over 25 cm, takes monthly
          medians with at least two readings and uses up to five recent years.
          We compare a straight trend and an annual harmonic using earlier
          historical targets, then report errors on later held-out targets with
          no future observations in training. The model is fitted to all
          available training months afterwards. Error ranges use the held-out
          90th percentile absolute error with a measurement-error floor; small
          samples, temporal dependence and winter extrapolation prevent a
          calibrated confidence claim.
        </p>
        {data && (
          <button
            className="button"
            onClick={() =>
              save(
                "caspian-nasa-observations.csv",
                "date,mission,relative_m,egm2008_m,error_m,ice,provisional\n" +
                  data.rows
                    .map((r) =>
                      [
                        r.date,
                        r.mission,
                        r.relative_m,
                        r.egm2008_m,
                        r.error_m,
                        r.ice,
                        r.provisional,
                      ].join(","),
                    )
                    .join("\n"),
                "text/csv",
              )
            }
          >
            Download all observations CSV
          </button>
        )}
      </section>
    </div>
  );
}
