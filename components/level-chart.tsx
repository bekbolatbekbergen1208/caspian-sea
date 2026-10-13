"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
export default function LevelChart({
  history,
  future,
}: {
  history: { date: string; observed: number; fitted: number }[];
  future: { date: string; forecast: number }[];
}) {
  const rows = [...history, ...future].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart
        data={rows}
        margin={{ left: 12, right: 18, top: 12, bottom: 12 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
        <XAxis dataKey="date" minTickGap={65} stroke="var(--muted)" />
        <YAxis
          domain={["auto", "auto"]}
          tickFormatter={(v) => Number(v).toFixed(1)}
          label={{ value: "EGM2008 · m", angle: -90, position: "insideLeft" }}
          stroke="var(--muted)"
        />
        <Tooltip
          formatter={(v) => [`${Number(v).toFixed(2)} m`]}
          contentStyle={{
            background: "var(--panel)",
            borderColor: "var(--border)",
          }}
        />
        <Legend />
        <Line
          type="linear"
          dataKey="observed"
          name="Observed monthly median"
          stroke="#16c8e8"
          dot={{ r: 3 }}
        />
        <Line
          type="linear"
          dataKey="fitted"
          name="Historical fitted trend"
          stroke="#20c997"
          dot={false}
        />
        <Line
          type="linear"
          dataKey="forecast"
          name="Exploratory forecast"
          stroke="#ffb454"
          strokeDasharray="6 4"
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
