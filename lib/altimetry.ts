export const NASA_CASPIAN_URL =
  "https://earth.gsfc.nasa.gov/gwm/timeseries/lake000270.10d.2.txt";
export type LevelObservation = {
  date: string;
  mission: string;
  relative_m: number;
  error_m: number;
  egm2008_m: number;
  ice: boolean;
  provisional: boolean;
};
export type LevelDataset = {
  source: string;
  source_url: string;
  retrieved_at: string;
  sha256?: string;
  processing_version: string;
  target_id: string;
  track_center: number[];
  datum: string;
  rows: LevelObservation[];
  excluded_rows: number;
};
const DAY = 86400000,
  YEAR = 365.25 * DAY;
export function parseAltimetry(
  text: string,
  asOf = new Date().toISOString(),
): LevelDataset {
  if (
    !text.includes("000270 Caspian Sea") ||
    !text.includes("Column 15: Target height variation in EGM2008")
  )
    throw new Error("Unexpected NASA target or datum.");
  const center = text
    .split(/\r?\n/)[2]
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(Number);
  if (
    !center ||
    center.length !== 2 ||
    !center.every(Number.isFinite) ||
    center[0] < 36 ||
    center[0] > 48 ||
    center[1] < 46 ||
    center[1] > 55
  )
    throw new Error("Unexpected NASA track coordinates.");
  const rows: LevelObservation[] = [];
  let excluded_rows = 0;
  for (const line of text.split(/\r?\n/)) {
    const c = line.trim().split(/\s+/);
    if (c.length !== 16 || !/^\d{8}$/.test(c[2])) continue;
    const date = `${c[2].slice(0, 4)}-${c[2].slice(4, 6)}-${c[2].slice(6)}`;
    const stamp = Date.parse(date + "T00:00:00Z");
    const relative_m = Number(c[5]),
      error_m = Number(c[6]),
      egm2008_m = Number(c[14]);
    if (
      !Number.isFinite(stamp) ||
      new Date(stamp).toISOString().slice(0, 10) !== date ||
      date > asOf.slice(0, 10) ||
      ![relative_m, error_m, egm2008_m].every(Number.isFinite) ||
      Math.abs(relative_m) >= 100 ||
      error_m < 0 ||
      error_m >= 1 ||
      Math.abs(egm2008_m) >= 100 ||
      !["0", "1"].includes(c[13]) ||
      !["0", "1"].includes(c[15])
    ) {
      excluded_rows++;
      continue;
    }
    rows.push({
      date,
      mission: c[0],
      relative_m,
      error_m,
      egm2008_m,
      ice: c[13] === "1",
      provisional: c[15] === "1",
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 36)
    throw new Error("NASA series contains too few valid observations.");
  return {
    source: "NASA / USDA-FAS Global Water Measurements",
    source_url: NASA_CASPIAN_URL,
    retrieved_at: asOf,
    processing_version: text.split(/\s/)[0],
    target_id: "000270",
    track_center: [center[1], center[0]],
    datum: "EGM2008 orthometric height (source column 15), metres",
    rows,
    excluded_rows,
  };
}
export type MonthlyLevel = {
  date: string;
  level: number;
  count: number;
  error: number;
};
function median(values: number[]) {
  const v = [...values].sort((a, b) => a - b),
    m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export function monthlyLevels(rows: LevelObservation[], before: string) {
  const groups = new Map<string, LevelObservation[]>();
  for (const r of rows)
    if (r.date < before && !r.ice && r.error_m <= 0.25) {
      const key = r.date.slice(0, 7);
      groups.set(key, [...(groups.get(key) || []), r]);
    }
  return [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((g) => ({
      date: g.at(-1)!.date,
      level: median(g.map((r) => r.egm2008_m)),
      count: g.length,
      error: Math.max(...g.map((r) => r.error_m)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
type ModelKind = "seasonal" | "linear";
function features(time: number, origin: number, kind: ModelKind) {
  const t = (time - origin) / YEAR;
  return kind === "seasonal"
    ? [
        1,
        t,
        Math.sin((2 * Math.PI * time) / YEAR),
        Math.cos((2 * Math.PI * time) / YEAR),
      ]
    : [1, t];
}
// Small, centred normal equations with pivoted elimination; no external ML service.
function fit(points: MonthlyLevel[], kind: ModelKind) {
  if (points.length < 24) return null;
  const origin = Date.parse(points[0].date),
    last = Date.parse(points.at(-1)!.date);
  if (last - origin < 2 * YEAR) return null;
  const p = kind === "seasonal" ? 4 : 2;
  const mean = points.reduce((a, r) => a + r.level, 0) / points.length;
  const matrix = Array.from({ length: p }, () => Array(p + 1).fill(0));
  for (const r of points) {
    const x = features(Date.parse(r.date), origin, kind);
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) matrix[i][j] += x[i] * x[j];
      matrix[i][p] += x[i] * (r.level - mean);
    }
  }
  for (let i = 0; i < p; i++) {
    let pivot = i;
    for (let k = i + 1; k < p; k++)
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[pivot][i])) pivot = k;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const d = matrix[i][i];
    if (Math.abs(d) < 1e-10) return null;
    for (let j = i; j <= p; j++) matrix[i][j] /= d;
    for (let k = 0; k < p; k++)
      if (k !== i) {
        const f = matrix[k][i];
        for (let j = i; j <= p; j++) matrix[k][j] -= f * matrix[i][j];
      }
  }
  const coefficients = matrix.map((r) => r[p]);
  return {
    kind,
    origin,
    coefficients,
    mean,
    n: points.length,
    trend: coefficients[1],
    at: (stamp: number) =>
      mean +
      features(stamp, origin, kind).reduce(
        (a, v, i) => a + v * coefficients[i],
        0,
      ),
  };
}
function recent(points: MonthlyLevel[], end: number) {
  return points.filter(
    (p) => Date.parse(p.date) < end && Date.parse(p.date) >= end - 5 * YEAR,
  );
}
export function levelForecast(dataset: LevelDataset, target: string) {
  const stamp = Date.parse(target + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(target) ||
    !Number.isFinite(stamp) ||
    new Date(stamp).toISOString().slice(0, 10) !== target
  )
    return { error: "Choose a valid date." };
  const raw = dataset.rows.filter(
    (r) => r.date < target && !r.ice && r.error_m <= 0.25,
  );
  const latest = raw.at(-1);
  if (!latest) return { error: "No earlier valid altimetry observations." };
  const horizon = (stamp - Date.parse(latest.date)) / DAY;
  if (horizon > 365)
    return {
      error: `Choose a date no later than ${new Date(Date.parse(latest.date) + 365 * DAY).toISOString().slice(0, 10)}. Longer-range extrapolation is disabled.`,
    };
  const monthly = monthlyLevels(dataset.rows, target);
  const training = recent(monthly, Date.parse(latest.date) + DAY);
  const validationHorizon = Math.max(30, Math.ceil(horizon / 30) * 30);
  const tests: Record<ModelKind, number[]> = { linear: [], seasonal: [] };
  const baseline: number[] = [];
  // Each historical target uses ONLY prior months, at the requested forecast lead.
  for (const observed of monthly.slice(-24)) {
    const end = Date.parse(observed.date) - validationHorizon * DAY;
    const past = recent(
      monthlyLevels(dataset.rows, new Date(end).toISOString().slice(0, 10)),
      end,
    );
    const linear = fit(past, "linear"),
      seasonal = fit(past, "seasonal");
    if (!linear || !seasonal) continue;
    tests.linear.push(linear.at(Date.parse(observed.date)) - observed.level);
    tests.seasonal.push(
      seasonal.at(Date.parse(observed.date)) - observed.level,
    );
    baseline.push(past.at(-1)!.level - observed.level);
  }
  if (baseline.length < 16)
    return {
      error:
        "Not enough earlier observations for an honest historical forecast check. Choose a later date.",
    };
  const mae = (e: number[]) =>
    e.reduce((a, v) => a + Math.abs(v), 0) / e.length;
  const split = Math.floor(baseline.length / 2);
  const kind: ModelKind =
    mae(tests.seasonal.slice(0, split)) <= mae(tests.linear.slice(0, split))
      ? "seasonal"
      : "linear";
  const validationErrors = tests[kind].slice(split);
  const validationBaseline = baseline.slice(split);
  const model = fit(training, kind);
  if (!model)
    return {
      error:
        "At least 24 monthly observations spanning two years are required.",
    };
  const predicted = model.at(stamp),
    delta = predicted - latest.egm2008_m;
  const errors = validationErrors.map(Math.abs).sort((a, b) => a - b);
  // Empirical error range, not a calibrated probability interval; measurement floor.
  const spread = Math.max(
    errors[Math.ceil(0.9 * errors.length) - 1],
    1.96 * latest.error_m,
  );
  const history = training.slice(-24).map((p) => ({
    date: p.date,
    observed: p.level,
    fitted: model.at(Date.parse(p.date)),
  }));
  const future = [];
  for (let day = 0; day < horizon; day += 30) {
    const time = Date.parse(latest.date) + day * DAY;
    future.push({
      date: new Date(time).toISOString().slice(0, 10),
      forecast: model.at(time),
    });
  }
  future.push({ date: target, forecast: predicted });
  return {
    target,
    winter_extrapolation: [11, 12, 1, 2, 3].includes(
      Number(target.slice(5, 7)),
    ),
    persistence_level_m: training.at(-1)!.level,
    level_m: predicted,
    lower_m: predicted - spread,
    upper_m: predicted + spread,
    change_m: delta,
    change_lower_m: delta - spread,
    change_upper_m: delta + spread,
    trend_m_year: model.trend,
    model: kind,
    monthly_count: model.n,
    raw_count: raw.filter(
      (p) => Date.parse(p.date) >= Date.parse(latest.date) + DAY - 5 * YEAR,
    ).length,
    horizon_days: horizon,
    latest,
    training_start: training[0].date,
    validation: {
      count: errors.length,
      horizon_days: validationHorizon,
      selection_count: split,
      mae_m: mae(validationErrors),
      persistence_mae_m: mae(validationBaseline),
      linear_mae_m: mae(tests.linear.slice(split)),
      seasonal_mae_m: mae(tests.seasonal.slice(split)),
      empirical_90_abs_error_m: errors[Math.ceil(0.9 * errors.length) - 1],
      beats_persistence: mae(validationErrors) < mae(validationBaseline),
    },
    history,
    future,
  };
}
export function shorelineScenario(changeMetres: number, slopeRatio: number) {
  if (
    !Number.isFinite(changeMetres) ||
    !Number.isFinite(slopeRatio) ||
    slopeRatio < 1 ||
    slopeRatio > 10000
  )
    throw new Error("Slope ratio must be between 1 and 10000.");
  // Positive means movement toward the sea under an assumed uniform planar slope.
  return -changeMetres * slopeRatio;
}
