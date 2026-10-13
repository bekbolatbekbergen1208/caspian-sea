import ts from "typescript";
import fs from "node:fs";
import assert from "node:assert/strict";
const js = ts.transpileModule(fs.readFileSync("lib/altimetry.ts", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { parseAltimetry, monthlyLevels, levelForecast, shorelineScenario } =
  await import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
const raw = fs.readFileSync("public/datasets/caspian-nasa-000270.txt", "utf8");
const data = parseAltimetry(raw, "2026-10-13T00:00:00Z");
assert.equal(data.rows.length, 1309);
assert.equal(data.rows.at(-1).date, "2026-10-03");
assert.equal(data.rows.at(-1).egm2008_m, -28.56);
assert.equal(data.rows.at(-1).relative_m, -1.98);
assert(data.rows.every((r) => Math.abs(r.egm2008_m) < 100 && r.error_m < 1));
assert.throws(() =>
  parseAltimetry(raw.replace("000270 Caspian Sea", "000270 Wrong Sea")),
);
const predicted = levelForecast(data, "2026-11-12");
assert(!predicted.error);
assert(predicted.level_m > -30 && predicted.level_m < -27);
assert.equal(predicted.winter_extrapolation, true);
assert.equal(predicted.monthly_count, 35);
assert(predicted.validation.count >= 8);
assert(predicted.validation.mae_m > 0);
assert.equal(predicted.validation.beats_persistence, false); // important limitation must remain visible
assert(
  predicted.lower_m < predicted.level_m &&
    predicted.upper_m > predicted.level_m,
);
assert(levelForecast(data, "2028-01-01").error);
assert(levelForecast(data, "2026-02-30").error);
const changed = {
  ...data,
  rows: [
    ...data.rows,
    {
      date: "2026-12-01",
      mission: "FAKE_TEST_ONLY",
      egm2008_m: 99,
      relative_m: 99,
      error_m: 0.01,
      ice: false,
      provisional: false,
    },
  ],
};
assert.deepEqual(
  levelForecast(data, "2026-09-01"),
  levelForecast(changed, "2026-09-01"),
); // future data cannot leak
const available = monthlyLevels(data.rows, "2026-09-14");
assert(available.every((r) => r.date < "2026-09-14"));
assert.equal(shorelineScenario(-0.2, 500), 100);
assert.equal(shorelineScenario(0.2, 500), -100);
assert.throws(() => shorelineScenario(-0.2, 0));
// Known trend + annual harmonic: recover coefficients from independent synthetic test data.
const rows = [];
const epoch = Date.parse("2017-01-01");
for (let y = 2017; y <= 2024; y++)
  for (let m = 1; m <= 12; m++) {
    const end = `${y}-${String(m).padStart(2, "0")}-20`;
    const t = Date.parse(end);
    const level =
      -27 -
      (0.15 * (t - epoch)) / (365.25 * 86400000) +
      0.18 * Math.sin((2 * Math.PI * t) / (365.25 * 86400000));
    for (const d of [10, 20])
      rows.push({
        date: `${y}-${String(m).padStart(2, "0")}-${d}`,
        mission: "TEST_ONLY",
        egm2008_m: level,
        relative_m: 0,
        error_m: 0.01,
        ice: false,
        provisional: false,
      });
  }
const synthetic = levelForecast({ ...data, rows }, "2025-01-20");
assert(!synthetic.error);
assert.equal(synthetic.model, "seasonal");
assert(Math.abs(synthetic.trend_m_year + 0.15) < 1e-8);
assert(synthetic.validation.mae_m < 1e-8);
console.log(
  "Altimetry checks passed: NASA parsing/datum/sentinels, seasonal regression, held-out checks, temporal leakage, date/horizon guards and conditional slope sign.",
);
