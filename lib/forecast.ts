import type { Analysis } from "./data";
export type Observation = {
  date: string;
  area: number;
  sensitivity: number;
  ids: string[];
};
export function forecastSeries(results: Analysis[], region: string) {
  const groups = new Map<string, Map<string, Observation>>();
  for (const r of results) {
    // Partial masks from separate comparisons do not share a measurement footprint.
    if (
      r.region !== region ||
      r.valid_fraction !== 1 ||
      !r.bbox ||
      !r.polygon ||
      !r.projection ||
      !r.algorithm ||
      !Number.isFinite(r.threshold) ||
      !(r.resolution_m > 0) ||
      (!Number.isFinite(r.uncertainty_km2) || !(r.uncertainty_km2 >= 0))
    )
      continue;
    const key = JSON.stringify([
      r.bbox,
      r.polygon,
      r.projection,
      r.resolution_m,
      r.algorithm,
      r.threshold,
    ]);
    const series = groups.get(key) || new Map<string, Observation>();
    groups.set(key, series);
    for (const [date, area] of [
      [r.before, r.water_before_km2],
      [r.after, r.water_after_km2],
    ] as [string, number][]) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        !Number.isFinite(area) ||
        area < 0
      )
        continue;
      const old = series.get(date);
      // Disagreeing repeat measurements are excluded rather than averaged away.
      if (old && Math.abs(old.area - area) > 1e-6) {
        old.area = NaN;
        continue;
      }
      if (old) {
        old.ids.push(r.id);
        old.sensitivity = Math.max(old.sensitivity, r.uncertainty_km2);
      } else
        series.set(date, {
          date,
          area,
          sensitivity: r.uncertainty_km2,
          ids: [r.id],
        });
    }
  }
  return [...groups.entries()]
    .map(([key, points]) => ({
      key,
      points: [...points.values()]
        .filter((p) => Number.isFinite(p.area))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.points.length - a.points.length);
}
export function predict(points: Observation[], target: string) {
  const time = Date.parse(target + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(target) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== target
  )
    return { error: "Choose a valid target date." };
  // Only observations available before the target enter a forecast.
  const past = points.filter((p) => Date.parse(p.date + "T00:00:00Z") < time);
  if (past.length < 4)
    return {
      error:
        "At least four distinct observations before the target date are required.",
    };
  const origin = Date.parse(past[0].date + "T00:00:00Z");
  const x = past.map(
    (p) => (Date.parse(p.date + "T00:00:00Z") - origin) / 86400000,
  );
  const span = x.at(-1)!;
  if (span < 30) return { error: "Observations must span at least 30 days." };
  const targetX = (time - origin) / 86400000,
    horizon = targetX - span;
  if (horizon > Math.min(span, 365))
    return {
      error:
        "Choose a date within one observed time span after the latest observation, up to 365 days.",
    };
  const n = past.length,
    mx = x.reduce((a, b) => a + b, 0) / n,
    my = past.reduce((a, b) => a + b.area, 0) / n;
  const sxx = x.reduce((a, b) => a + (b - mx) ** 2, 0);
  const slope =
    past.reduce((a, p, i) => a + (x[i] - mx) * (p.area - my), 0) / sxx;
  const area = my + slope * (targetX - mx);
  if (area < 0)
    return {
      error:
        "The linear trend predicts a negative area. This model is unsuitable for the selected date.",
    };
  const residual = Math.sqrt(
    past.reduce((a, p, i) => a + (p.area - my - slope * (x[i] - mx)) ** 2, 0) /
      (n - 2),
  );
  const sensitivity = Math.max(...past.map((p) => p.sensitivity));
  return {
    area,
    slope,
    horizon,
    n,
    latest: past.at(-1)!.date,
    residual,
    sensitivity,
    points: past,
  };
}
