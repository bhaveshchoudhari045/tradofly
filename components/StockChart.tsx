"use client";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from "recharts";
import type { HistoricalData } from "@/types";
import { useMemo, useState } from "react";

interface StockChartProps {
  data: HistoricalData[];
  symbol: string;
  height?: number;
}

type ChartType = "line" | "area" | "candle";
type Indicator = "ma20" | "ma50" | "ma200" | "bb" | "volume";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "var(--shadow-lg)",
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 6,
          color: "var(--text-secondary)",
          fontSize: 11,
        }}
      >
        {d.date}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3px 12px",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>Open</span>
        <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600 }}>
          ₹{d.open?.toFixed(2)}
        </span>
        <span style={{ color: "var(--text-muted)" }}>High</span>
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontWeight: 600,
            color: "var(--accent-green)",
          }}
        >
          ₹{d.high?.toFixed(2)}
        </span>
        <span style={{ color: "var(--text-muted)" }}>Low</span>
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontWeight: 600,
            color: "var(--accent-red)",
          }}
        >
          ₹{d.low?.toFixed(2)}
        </span>
        <span style={{ color: "var(--text-muted)" }}>Close</span>
        <span
          style={{
            fontFamily: "JetBrains Mono",
            fontWeight: 600,
            color: isUp ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          ₹{d.close?.toFixed(2)}
        </span>
        {d.volume && (
          <>
            <span style={{ color: "var(--text-muted)" }}>Vol</span>
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600 }}>
              {(d.volume / 1e6).toFixed(2)}M
            </span>
          </>
        )}
        {d.rsi && (
          <>
            <span style={{ color: "var(--text-muted)" }}>RSI</span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
                color:
                  d.rsi > 70
                    ? "var(--accent-red)"
                    : d.rsi < 30
                      ? "var(--accent-green)"
                      : "var(--text-primary)",
              }}
            >
              {d.rsi.toFixed(1)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default function StockChart({
  data,
  symbol,
  height = 400,
}: StockChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [indicators, setIndicators] = useState<Set<Indicator>>(
    new Set(["ma20", "volume"]),
  );
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y" | "2Y" | "ALL">(
    "6M",
  );

  const ranges = {
    "1M": 22,
    "3M": 66,
    "6M": 130,
    "1Y": 252,
    "2Y": 504,
    ALL: 9999,
  };

  const filteredData = useMemo(() => {
    const count = ranges[range];
    return data.slice(-count);
  }, [data, range]);

  function toggleIndicator(ind: Indicator) {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  }

  const firstClose = filteredData[0]?.close ?? 0;
  const lastClose = filteredData[filteredData.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const lineColor = isUp ? "var(--accent-green)" : "var(--accent-red)";
  const lineColorVal = isUp ? "#4ADE80" : "#F87171";

  const yMin = useMemo(() => {
    const prices = filteredData.map((d) => d.low).filter(Boolean);
    return Math.floor(Math.min(...prices) * 0.98);
  }, [filteredData]);

  const yMax = useMemo(() => {
    const prices = filteredData.map((d) => d.high).filter(Boolean);
    return Math.ceil(Math.max(...prices) * 1.02);
  }, [filteredData]);

  const buttonStyle = (active: boolean) => ({
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "var(--border-accent)" : "var(--border-card)",
    background: active ? "var(--accent-green-bg)" : "transparent",
    color: active ? "var(--accent-green)" : "var(--text-muted)",
    transition: "all 0.15s",
  });

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        {/* Range buttons */}
        <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
          {(["1M", "3M", "6M", "1Y", "2Y", "ALL"] as const).map((r) => (
            <button
              key={r}
              style={buttonStyle(range === r)}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-card)",
            margin: "0 4px",
          }}
        />

        {/* Chart type */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["line", "area", "candle"] as ChartType[]).map((t) => (
            <button
              key={t}
              style={buttonStyle(chartType === t)}
              onClick={() => setChartType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-card)",
            margin: "0 4px",
          }}
        />

        {/* Indicators */}
        {(["ma20", "ma50", "ma200", "bb", "volume"] as Indicator[]).map(
          (ind) => (
            <button
              key={ind}
              style={buttonStyle(indicators.has(ind))}
              onClick={() => toggleIndicator(ind)}
            >
              {ind === "ma20"
                ? "MA20"
                : ind === "ma50"
                  ? "MA50"
                  : ind === "ma200"
                    ? "MA200"
                    : ind === "bb"
                      ? "BB"
                      : "Vol"}
            </button>
          ),
        )}
      </div>

      {/* Main price chart */}
      <ResponsiveContainer
        width="100%"
        height={indicators.has("volume") ? height * 0.7 : height}
      >
        <ComposedChart
          data={filteredData}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-card)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.toLocaleString("en", { month: "short" })} ${d.getFullYear().toString().slice(2)}`;
            }}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-card)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) =>
              `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`
            }
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Bollinger Bands */}
          {indicators.has("bb") && (
            <>
              <Line
                dataKey="upperBand"
                stroke="#A78BFA"
                strokeWidth={1}
                dot={false}
                strokeDasharray="4 3"
                name="BB Upper"
              />
              <Line
                dataKey="upperBand1"
                stroke="#8B5CF6"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 3"
                name="BB 1σ Upper"
              />
              <Line
                dataKey="lowerBand1"
                stroke="#8B5CF6"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 3"
                name="BB 1σ Lower"
              />
              <Line
                dataKey="lowerBand"
                stroke="#A78BFA"
                strokeWidth={1}
                dot={false}
                strokeDasharray="4 3"
                name="BB Lower"
              />
            </>
          )}

          {/* Moving Averages */}
          {indicators.has("ma20") && (
            <Line
              dataKey="ma20"
              stroke="#F59E0B"
              strokeWidth={1.5}
              dot={false}
              name="MA20"
            />
          )}
          {indicators.has("ma50") && (
            <Line
              dataKey="ma50"
              stroke="#3B82F6"
              strokeWidth={1.5}
              dot={false}
              name="MA50"
            />
          )}
          {indicators.has("ma200") && (
            <Line
              dataKey="ma200"
              stroke="#EC4899"
              strokeWidth={1.5}
              dot={false}
              name="MA200"
            />
          )}

          {/* Price */}
          {chartType === "area" && (
            <Area
              type="monotone"
              dataKey="close"
              stroke={lineColorVal}
              strokeWidth={2}
              fill={`url(#colorClose)`}
              dot={false}
              name="Price"
            />
          )}
          {chartType === "line" && (
            <Line
              type="monotone"
              dataKey="close"
              stroke={lineColorVal}
              strokeWidth={2}
              dot={false}
              name="Price"
            />
          )}
          {chartType === "candle" && (
            // Simplified: use high-low as area, close as line
            <>
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill="var(--accent-green-bg)"
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="none"
                fill="var(--bg-primary)"
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={lineColorVal}
                strokeWidth={2}
                dot={false}
              />
            </>
          )}

          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColorVal} stopOpacity={0.15} />
              <stop offset="95%" stopColor={lineColorVal} stopOpacity={0.01} />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume chart */}
      {indicators.has("volume") && (
        <ResponsiveContainer width="100%" height={height * 0.25}>
          <ComposedChart
            data={filteredData}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-card)"
              strokeOpacity={0.3}
            />
            <XAxis dataKey="date" hide />
            <YAxis
              tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
              tick={{ fontSize: 9, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              formatter={(v: any) => [
                `${(Number(v) / 1e6).toFixed(2)}M`,
                "Volume",
              ]}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
              }}
            />
            <Bar
              dataKey="volume"
              fill="var(--accent-blue)"
              opacity={0.6}
              radius={[2, 2, 0, 0]}
              name="Volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
