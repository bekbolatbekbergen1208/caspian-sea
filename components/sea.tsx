"use client";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, Waves, MapPin, Satellite } from "lucide-react";
import { regions, photos } from "@/lib/data";
const SatelliteMap = dynamic(() => import("./satellite-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading Caspian map…</div>,
});
export default function Sea() {
  const [region, setRegion] = useState("basin");
  const selected = regions.find((r) => r.id === region)!;
  const image = photos.find((p) => p.id === "caspian-2026")!;
  return (
    <div className="sea-page">
      <section className="sea-hero panel">
        <img
          src={image.image}
          alt="NASA Terra MODIS daily view of the Caspian Sea on 11 October 2026"
        />
        <div className="sea-hero-copy">
          <span className="eyebrow">ONE SEA. MANY CONNECTED SHORES.</span>
          <h2>Meet the Caspian Sea</h2>
          <p>
            Earth’s largest inland water body connects diverse coastlines, river
            deltas and communities. Explore its geography, then follow the
            observations that help us understand change.
          </p>
          <a
            className="sea-source"
            href="https://science.nasa.gov/earth/earth-observatory/caspian-sea-44253/"
            target="_blank"
            rel="noreferrer"
          >
            Geography source: NASA Earth Observatory <ArrowUpRight size={16} />
          </a>
          <div className="sea-actions">
            <Link className="button primary" href="/explorer">
              <Satellite size={17} /> Explore satellite scenes
            </Link>
            <Link className="button" href="/forecast">
              View forecasts <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <a
          className="sea-image-credit"
          href={image.url}
          target="_blank"
          rel="noreferrer"
        >
          {image.credit} · {image.date} · daily browse
        </a>
      </section>
      <div className="sea-facts">
        <article className="panel">
          <Waves />
          <h3>A landlocked sea</h3>
          <p>
            Despite its name, the Caspian is an inland lake with no natural
            outlet to the world ocean.
          </p>
          <a
            href="https://science.nasa.gov/earth/earth-observatory/caspian-sea-44253/"
            target="_blank"
            rel="noreferrer"
          >
            Read NASA’s overview ↗
          </a>
        </article>
        <article className="panel">
          <MapPin />
          <h3>A shallow northern coast</h3>
          <p>
            Shallow areas make the northern Caspian particularly sensitive to
            changes in water level: small vertical changes can expose broad
            coastal areas.
          </p>
          <a
            href="https://science.nasa.gov/earth/earth-observatory/the-caspians-shallow-north-149054/"
            target="_blank"
            rel="noreferrer"
          >
            Explore the shallow north ↗
          </a>
        </article>
        <article className="panel">
          <Satellite />
          <h3>Different views of change</h3>
          <p>
            Radar altimetry measures water height. Spectral imagery maps water
            extent. Comparing both helps distinguish level changes from local
            shoreline effects.
          </p>
          <Link href="/methodology">Understand the methods ↗</Link>
        </article>
      </div>
      <section className="panel sea-map-section">
        <div className="sea-section-heading">
          <div>
            <span className="eyebrow">EXPLORE THE BASIN</span>
            <h2>Find your coastline</h2>
            <p>
              Switch between the whole basin and the platform’s study windows.
            </p>
          </div>
          <label>
            Study window
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.en}
                </option>
              ))}
            </select>
          </label>
        </div>
        <SatelliteMap region={region} lang="en" />
        <p className="sea-coordinate">
          {selected.en} · map centre {selected.center[1].toFixed(3)}° N,{" "}
          {selected.center[0].toFixed(3)}° E. Study windows are navigation aids,
          not administrative boundaries.
        </p>
      </section>
      <section className="sea-next panel">
        <div>
          <span className="eyebrow">FROM GEOGRAPHY TO EVIDENCE</span>
          <h2>Follow the sea through time</h2>
          <p>
            Compare real satellite dates, inspect image segmentation, or explore
            an approximate water-level forecast. Each view keeps its data source
            and limitations visible.
          </p>
        </div>
        <div className="sea-actions">
          <Link className="button" href="/compare">
            Compare dates <ArrowUpRight size={17} />
          </Link>
          <Link className="button" href="/shoreline-ai">
            AI shoreline <ArrowUpRight size={17} />
          </Link>
          <Link className="button primary" href="/forecast">
            Forecast <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}
