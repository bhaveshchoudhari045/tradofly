"use client";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Cell,
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

// ── Custom Candlestick Bar ─────────────────────────────────────────────────
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? "#4ADE80" : "#F87171";

  // We need to calculate positions from the chart's coordinate system
  // x, y, width, height come from recharts Bar positioning
  // But for candles we need to use the yAxis scale
  // This is handled via the custom shape approach
  return null; // placeholder — real candles drawn via CustomCandlestick
};

// Real SVG candlestick renderer
const CustomCandlestick = ({ x, width, yAxis, payload }: any) => {
  if (!payload || !yAxis) return null;
  const { open, close, high, low } = payload;
  if (!open || !close || !high || !low) return null;

  const isUp = close >= open;
  const color = isUp ? "#4ADE80" : "#F87171";
  const fillColor = isUp ? "#4ADE80" : "#F87171";

  const toY = (val: number) => {
    if (!yAxis || typeof yAxis.scale !== "function") return 0;
    return yAxis.scale(val);
  };

  const bodyTop = toY(Math.max(open, close));
  const bodyBottom = toY(Math.min(open, close));
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const wickX = x + width / 2;
  const candleWidth = Math.max(2, width * 0.7);
  const candleX = x + (width - candleWidth) / 2;

  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={wickX}
        y1={toY(high)}
        x2={wickX}
        y2={toY(low)}
        stroke={color}
        strokeWidth={1}
      />
      {/* Open-Close body */}
      <rect
        x={candleX}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        fill={isUp ? fillColor : fillColor}
        stroke={color}
        strokeWidth={0.5}
        opacity={isUp ? 0.85 : 0.85}
      />
    </g>
  );
};

// Candlestick chart using SVG overlay on top of recharts
const CandleChart = ({
  data,
  height,
  yMin,
  yMax,
  indicators,
}: {
  data: HistoricalData[];
  height: number;
  yMin: number;
  yMax: number;
  indicators: Set<Indicator>;
}) => {
  const MARGIN = { top: 4, right: 4, bottom: 30, left: 60 };

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={MARGIN}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-card)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.toLocaleString("en", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              stroke: "var(--border-primary)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />

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
                dataKey="lowerBand"
                stroke="#A78BFA"
                strokeWidth={1}
                dot={false}
                strokeDasharray="4 3"
                name="BB Lower"
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

          {/* Invisible bar to get position data for candles */}
          <Bar
            dataKey="high"
            fill="transparent"
            stroke="transparent"
            shape={(props: any) => {
              const { x, width, yAxis, payload } = props;
              if (!payload || !yAxis?.scale) return <g />;
              const { open, close, high: h, low: l } = payload;
              if (!open || !close || !h || !l) return <g />;
              const isUp = close >= open;
              const color = isUp ? "#4ADE80" : "#F87171";
              const toY = (val: number) => yAxis.scale(val);
              const bodyTop = toY(Math.max(open, close));
              const bodyBottom = toY(Math.min(open, close));
              const bodyH = Math.max(1, bodyBottom - bodyTop);
              const wickX = x + width / 2;
              const cw = Math.max(2, width * 0.75);
              const cx = x + (width - cw) / 2;
              return (
                <g key={`candle-${x}`}>
                  <line
                    x1={wickX}
                    y1={toY(h)}
                    x2={wickX}
                    y2={toY(l)}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <rect
                    x={cx}
                    y={bodyTop}
                    width={cw}
                    height={bodyH}
                    fill={isUp ? color : color}
                    stroke={color}
                    strokeWidth={0.5}
                    opacity={0.9}
                  />
                </g>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
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
        minWidth: 170,
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
        {d.ma20 && (
          <>
            <span style={{ color: "var(--text-muted)" }}>MA20</span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
                color: "#F59E0B",
              }}
            >
              ₹{d.ma20?.toFixed(2)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Chart Component ───────────────────────────────────────────────────
export default function StockChart({
  data,
  symbol,
  height = 400,
}: StockChartProps) {
  const [chartType, setChartType] = useState<ChartType>("candle");
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

  const filteredData = useMemo(() => data.slice(-ranges[range]), [data, range]);

  function toggleIndicator(ind: Indicator) {
    setIndicators((prev) => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });
  }

  const firstClose = filteredData[0]?.close ?? 0;
  const lastClose = filteredData[filteredData.length - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const lineColorVal = isUp ? "#4ADE80" : "#F87171";

  const yMin = useMemo(() => {
    const prices = filteredData.map((d) => d.low).filter(Boolean) as number[];
    return prices.length ? Math.floor(Math.min(...prices) * 0.98) : 0;
  }, [filteredData]);

  const yMax = useMemo(() => {
    const prices = filteredData.map((d) => d.high).filter(Boolean) as number[];
    return prices.length ? Math.ceil(Math.max(...prices) * 1.02) : 100;
  }, [filteredData]);

  const btnStyle = (active: boolean) => ({
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

  const mainHeight = indicators.has("volume") ? height * 0.72 : height;

  return (
    <div>
      {/* ── Controls ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        {/* Range */}
        <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
          {(["1M", "3M", "6M", "1Y", "2Y", "ALL"] as const).map((r) => (
            <button
              key={r}
              style={btnStyle(range === r)}
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
          {(
            [
              { id: "candle", label: "🕯 Candle" },
              { id: "area", label: "◬ Area" },
              { id: "line", label: "— Line" },
            ] as { id: ChartType; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              style={btnStyle(chartType === id)}
              onClick={() => setChartType(id)}
            >
              {label}
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
              style={btnStyle(indicators.has(ind))}
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

      {/* ── Candle Chart ── */}
      {chartType === "candle" && (
        <CandleChart
          data={filteredData}
          height={mainHeight}
          yMin={yMin}
          yMax={yMax}
          indicators={indicators}
        />
      )}

      {/* ── Area / Line Chart ── */}
      {(chartType === "area" || chartType === "line") && (
        <ResponsiveContainer width="100%" height={mainHeight}>
          <ComposedChart
            data={filteredData}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColorVal} stopOpacity={0.18} />
                <stop
                  offset="95%"
                  stopColor={lineColorVal}
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-card)"
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.toLocaleString("en", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "var(--border-primary)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

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
                  dataKey="lowerBand"
                  stroke="#A78BFA"
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="4 3"
                  name="BB Lower"
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
              </>
            )}
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

            {chartType === "area" ? (
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColorVal}
                strokeWidth={2}
                fill="url(#colorClose)"
                dot={false}
                name="Price"
              />
            ) : (
              <Line
                type="monotone"
                dataKey="close"
                stroke={lineColorVal}
                strokeWidth={2}
                dot={false}
                name="Price"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Volume ── */}
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
            <Bar dataKey="volume" radius={[2, 2, 0, 0]} name="Volume">
              {filteredData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.close >= d.open ? "#4ADE8066" : "#F8717166"}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
