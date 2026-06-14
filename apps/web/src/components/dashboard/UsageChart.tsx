"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface UsagePoint {
  date: string;
  requests: number;
}

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="leafFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="#7d847c"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis stroke="#7d847c" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#11150f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#f6f7f6",
            }}
            cursor={{ stroke: "rgba(34,197,94,0.3)" }}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#leafFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
