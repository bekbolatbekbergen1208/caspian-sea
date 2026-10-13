"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Analysis } from "@/lib/data";
import { regions } from "@/lib/data";
import { forecastSeries, predict } from "@/lib/forecast";
export default function Forecast({ results }: { results: Analysis[] }) {
  const [region, setRegion] = useState("aktau");
  const [date, setDate] = useState(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const groups = useMemo(
    () => forecastSeries(results, region),
    [results, region],
  );
  const [selected, setSelected] = useState("");
  const group = groups.find((g) => g.key === selected) || groups[0];
  const result = group
    ? predict(group.points, date)
    : {
        error:
          "No compatible observations yet. Complete NDWI analyses for the same area with 100% jointly valid coverage.",
      };
  function exportResult() {
    const payload = {
      target_date: date,
      region,
      method: "Ordinary least squares water-area trend",
      measurement_configuration: group ? JSON.parse(group.key) : null,
      result,
      limitations: [
        "Exploratory trend, not a validated hydrological forecast.",
        "No sea-level or shoreline-position prediction.",
        "Boundary sensitivity is not a confidence interval.",
        "Seasonality, wind and correlated errors are not modelled.",
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `caspian-forecast-${date}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="forecast-layout">
      <section className="panel" style={{ padding: 24 }}>
        <span className="eyebrow">DATE-BASED WATER AREA FORECAST</span>
        <h2>Explore the coast's next observation</h2>
        <p>
          Choose a target date to estimate classified water area from your
          measured satellite time series.
        </p>
        <div className="forecast-controls">
          <label>
            Study region
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setSelected("");
              }}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.en}
                </option>
              ))}
            </select>
          </label>
          <label>
            Forecast date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {groups.length > 0 && (
            <label>
              Compatible measurement series
              <select
                value={group?.key}
                onChange={(e) => setSelected(e.target.value)}
              >
                {groups.map((g, i) => (
                  <option key={g.key} value={g.key}>
                    Series {i + 1} · {g.points.length} dates · NDWI &gt;{" "}
                    {JSON.parse(g.key)[5]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {"error" in result ? (
          <div className="empty-inline">
            <h3>More observations needed</h3>
            <p>{result.error}</p>
            <Link className="button primary" href="/compare?mode=ndwi">
              Calculate NDWI observations
            </Link>
          </div>
        ) : (
          <>
            <div className="forecast-number">
              <span>Estimated water area · {date}</span>
              <strong>
                {result.area.toFixed(4)} <small>km²</small>
              </strong>
            </div>
            <div className="forecast-metrics">
              <p>
                Trend: <b>{(result.slope * 365.25).toFixed(4)} km²/year</b>
              </p>
              <p>
                Training observations: <b>{result.n}</b>
              </p>
              <p>
                Latest observation: <b>{result.latest}</b>
              </p>
              <p>
                Forecast horizon: <b>{result.horizon} days</b>
              </p>
              <p>
                Residual standard deviation:{" "}
                <b>{result.residual.toFixed(4)} km²</b>
              </p>
              <p>
                Maximum boundary sensitivity:{" "}
                <b>{result.sensitivity.toFixed(4)} km²</b>
              </p>
            </div>
            <button className="button" onClick={exportResult}>
              Download forecast JSON
            </button>
          </>
        )}
      </section>
      <section className="panel" style={{ padding: 24 }}>
        <h3>Observed dates</h3>
        {group?.points.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Water area</th>
                  <th>Target date</th>
                </tr>
              </thead>
              <tbody>
                {group.points.map((p) => (
                  <tr key={p.date}>
                    <td>{p.date}</td>
                    <td>{p.area.toFixed(4)} km²</td>
                    <td>
                      <button
                        className="button"
                        onClick={() =>
                          setDate(
                            new Date(Date.parse(p.date) + 30 * 86400000)
                              .toISOString()
                              .slice(0, 10),
                          )
                        }
                      >
                        Forecast +30 days
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            Your completed analyses will appear here. NASA browse images and RGB
            model masks do not provide measured water area.
          </p>
        )}
      </section>
      <section className="panel" style={{ padding: 24 }}>
        <h3>How this forecast works</h3>
        <p>
          A straight line is fitted to at least four distinct dates spanning 30
          days or more. Only measurements before the chosen date are used.
          Identical area geometry, projection, resolution, algorithm and NDWI
          threshold are required, with fully valid coverage. Conflicting repeat
          measurements are excluded.
        </p>
        <p>
          The forecast horizon is limited to the observed time span and a
          maximum of 365 days. This exploratory trend has not been validated as
          a Caspian hydrological forecast. It does not model seasonality or wind
          and does not predict sea level or shoreline position. Residual spread
          and boundary sensitivity are diagnostics, not a calibrated prediction
          interval.
        </p>
      </section>
    </div>
  );
}
