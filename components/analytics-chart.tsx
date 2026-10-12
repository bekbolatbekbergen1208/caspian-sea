"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Analysis } from "@/lib/data";
import { Lang, words } from "@/lib/i18n";
export default function AnalyticsChart({
  data,
  lang,
}: {
  data: Analysis[];
  lang: Lang;
}) {
  const t = words[lang];
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
        <XAxis dataKey="after" stroke="var(--muted)" />
        <YAxis stroke="var(--muted)" />
        <Tooltip
          contentStyle={{
            background: "var(--panel)",
            borderColor: "var(--border)",
          }}
        />
        <Area
          type="linear"
          dataKey="exposed_km2"
          name={t.exposed}
          stroke="#16c8e8"
          fill="#16c8e8"
          fillOpacity={0.15}
        />
        <Area
          type="linear"
          dataKey="flooded_km2"
          name={t.flooded}
          stroke="#20c997"
          fill="#20c997"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
