"use client";
// components/charts/StockChart.tsx
// True OHLC candlestick chart using Recharts + custom SVG candle renderer.
// Includes live price polling, BB overlay, volume, RSI sub-chart.

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Cell,
} from "recharts";
import type { HistoricalData } from "@/lib/technicals";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRealtimeQuote } from "@/hooks/useRealTimeQuotes";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface StockChartProps {
  data: HistoricalData[];
  symbol: string;
  height?: number;
  showLivePrice?: boolean;
  onRangeChange?: (range: string) => void;
}

type ChartType = "candle" | "line" | "area";
type Indicator =
  | "ma20"
  | "ma50"
  | "ma200"
  | "bb"
  | "ema"
  | "vwap"
  | "volume"
  | "rsi"
  | "macd";
type Range =
  | "1H"
  | "1D"
  | "5D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "2Y"
  | "ALL";
// ── Custom candlestick renderer ───────────────────────────────────────────────
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload, chartHeight } = props;
  if (!payload) return null;
  const { open, high, low, close } = payload;
  if (!open || !close || !high || !low) return null;

  const isUp = close >= open;
  const fill = isUp
    ? "var(--candle-up, #22C55E)"
    : "var(--candle-down, #EF4444)";
  const stroke = isUp
    ? "var(--candle-up, #22C55E)"
    : "var(--candle-down, #EF4444)";

  // We need to work in chart coordinates — this is called from a custom shape
  // The `y` and `height` from recharts are for the bar, we need the candlestick geometry
  const bodyTop = Math.min(y ?? 0, (y ?? 0) + (height ?? 0));
  const bodyBot = Math.max(y ?? 0, (y ?? 0) + (height ?? 0));
  const bodyH = Math.max(1, Math.abs(height ?? 1));
  const cx = (x ?? 0) + (width ?? 6) / 2;
  const wickW = Math.max(1, (width ?? 6) * 0.12);

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={cx}
        y1={bodyTop}
        x2={cx}
        y2={y}
        stroke={stroke}
        strokeWidth={wickW}
      />
      {/* Body */}
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={bodyH}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.5}
        rx={1}
      />
      {/* Lower wick */}
      <line
        x1={cx}
        y1={bodyBot}
        x2={cx}
        y2={(y ?? 0) + (height ?? 0)}
        stroke={stroke}
        strokeWidth={wickW}
      />
    </g>
  );
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const OHLCTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  const chg = d.close - d.open;
  const chgPct = d.open > 0 ? (chg / d.open) * 100 : 0;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "var(--shadow-lg)",
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: "var(--text-muted)",
          fontSize: 10,
          marginBottom: 6,
        }}
      >
        {d.date}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          rowGap: 3,
          columnGap: 12,
        }}
      >
        {[
          ["O", d.open],
          ["H", d.high],
          ["L", d.low],
          ["C", d.close],
        ].map(([lbl, val]) => (
          <span
            key={lbl as string}
            style={{ display: "flex", gap: 4, alignItems: "center" }}
          >
            <span
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                fontWeight: 700,
                width: 10,
              }}
            >
              {lbl}
            </span>
            <span
              style={{
                fontFamily: "JetBrains Mono",
                fontWeight: 600,
                color:
                  lbl === "H"
                    ? "#4ADE80"
                    : lbl === "L"
                      ? "#F87171"
                      : lbl === "C"
                        ? isUp
                          ? "#4ADE80"
                          : "#F87171"
                        : "var(--text-primary)",
              }}
            >
              ₹{Number(val).toFixed(2)}
            </span>
          </span>
        ))}
      </div>
      <div
        style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "JetBrains Mono",
            color: isUp ? "#4ADE80" : "#F87171",
            fontWeight: 700,
          }}
        >
          {isUp ? "+" : ""}
          {chg.toFixed(2)} ({chgPct.toFixed(2)}%)
        </span>
      </div>
      {d.volume > 0 && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
          Vol: {(d.volume / 1e6).toFixed(2)}M
        </div>
      )}
      {d.rsi !== undefined && (
        <div
          style={{
            fontSize: 10,
            color:
              d.rsi > 70
                ? "#F87171"
                : d.rsi < 30
                  ? "#4ADE80"
                  : "var(--text-muted)",
            marginTop: 2,
          }}
        >
          RSI: {d.rsi.toFixed(1)}
        </div>
      )}
    </div>
  );
};

export default function StockChart({
  data,
  symbol,
  height = 420,
  showLivePrice = true,
  onRangeChange,
}: StockChartProps) {
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [indicators, setIndicators] = useState<Set<Indicator>>(
    new Set(["ma20", "bb", "volume"]),
  );
  const [subChart, setSubChart] = useState<"volume" | "rsi" | "macd" | "none">(
    "volume",
  );
  const [range, setRange] = useState<Range>("3M");

  // Live price poll
  const {
    quote: liveQuote,
    loading: liveLoading,
    lastFetchedAt,
  } = useRealtimeQuote(showLivePrice ? symbol : null, 30_000);

  const ranges: Record<Range, number> = {
    "1H": 12, // 12 x 5min bars = 1 hour
    "1D": 26, // 26 x 15min = ~6.5 hours
    "5D": 80,
    "1W": 7,
    "1M": 22,
    "3M": 66,
    "6M": 130,
    "1Y": 252,
    "2Y": 504,
    ALL: 9999,
  };

  const slicedData = useMemo(() => {
    const count = ranges[range];
    const sliced = data.slice(-count);
    // Patch the last bar with live price if available
    if (liveQuote && sliced.length > 0) {
      const last = { ...sliced[sliced.length - 1] };
      last.close = liveQuote.price || last.close;
      last.high = Math.max(
        last.high,
        liveQuote.high || last.high,
        liveQuote.price || last.high,
      );
      last.low = Math.min(
        last.low,
        liveQuote.low || last.low,
        liveQuote.price || last.low,
      );
      return [...sliced.slice(0, -1), last];
    }
    return sliced;
  }, [data, range, liveQuote]);

  function toggleIndicator(ind: Indicator) {
    setIndicators((prev) => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });
  }

  const lastClose = slicedData[slicedData.length - 1]?.close ?? 0;
  const firstClose = slicedData[0]?.close ?? 0;
  const periodChange =
    firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
  const isUp = periodChange >= 0;
  const candleUpColor = "#22C55E";
  const candleDownColor = "#EF4444";
  const priceColor = isUp ? candleUpColor : candleDownColor;

  const yDomain = useMemo(() => {
    const lows = slicedData
      .map((d) => d.lowerBand ?? d.low ?? d.close)
      .filter((v) => v > 0);
    const highs = slicedData
      .map((d) => d.upperBand ?? d.high ?? d.close)
      .filter((v) => v > 0);
    if (!lows.length || !highs.length) return ["auto", "auto"];
    return [
      Math.floor(Math.min(...lows) * 0.975),
      Math.ceil(Math.max(...highs) * 1.025),
    ];
  }, [slicedData]);

  const mainH = subChart !== "none" ? height * 0.65 : height;
  const subH = height * 0.3;

  const btnStyle = (active: boolean, small = false) => ({
    padding: small ? "3px 7px" : "4px 10px",
    borderRadius: 6,
    fontSize: small ? 10 : 11,
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
      {/* ── Live price badge ── */}
      {showLivePrice && liveQuote && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="live-dot" />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--accent-green)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Live
            </span>
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-primary)",
            }}
          >
            ₹
            {liveQuote.price.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={liveQuote.changePercent >= 0 ? "price-up" : "price-down"}
            style={{ display: "flex", alignItems: "center", gap: 3 }}
          >
            {liveQuote.changePercent >= 0 ? (
              <TrendingUp size={10} />
            ) : (
              <TrendingDown size={10} />
            )}
            {liveQuote.changePercent >= 0 ? "+" : ""}
            {liveQuote.changePercent.toFixed(2)}%
          </span>
          {lastFetchedAt && (
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              Updated{" "}
              {lastFetchedAt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {/* Range */}
        <div style={{ display: "flex", gap: 3 }}>
          {(
            ["1H", "1D", "1W", "1M", "3M", "6M", "1Y", "2Y", "ALL"] as Range[]
          ).map((r) => (
            <button
              key={r}
              style={btnStyle(range === r)}
              onClick={() => {
                setRange(r);
                onRangeChange?.(r);
              }}
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
            flexShrink: 0,
          }}
        />

        {/* Chart type */}
        <div style={{ display: "flex", gap: 3 }}>
          {(["candle", "line", "area"] as ChartType[]).map((t) => (
            <button
              key={t}
              style={btnStyle(chartType === t)}
              onClick={() => setChartType(t)}
            >
              {t === "candle" ? "📊" : t === "line" ? "📉" : "📈"}{" "}
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-card)",
            flexShrink: 0,
          }}
        />

        {/* Overlays */}
        {(["ma20", "ma50", "ma200", "bb", "ema", "vwap"] as Indicator[]).map(
          (ind) => (
            <button
              key={ind}
              style={btnStyle(indicators.has(ind), true)}
              onClick={() => toggleIndicator(ind)}
            >
              {ind.toUpperCase()}
            </button>
          ),
        )}

        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border-card)",
            flexShrink: 0,
          }}
        />

        {/* Sub-chart */}
        {(["volume", "rsi", "macd", "none"] as const).map((s) => (
          <button
            key={s}
            style={btnStyle(subChart === s, true)}
            onClick={() => setSubChart(s)}
          >
            {s === "none" ? "—" : s.toUpperCase()}
          </button>
        ))}

        {/* Period change indicator */}
        <span
          className={isUp ? "price-up" : "price-down"}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {isUp ? "+" : ""}
          {periodChange.toFixed(2)}% ({range})
        </span>
      </div>

      {/* ── Main price chart ── */}
      <ResponsiveContainer width="100%" height={mainH}>
        <ComposedChart
          data={slicedData}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="gradUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={candleUpColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={candleUpColor} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="gradDown" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={candleDownColor}
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor={candleDownColor}
                stopOpacity={0.01}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-card)"
            opacity={0.5}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date(v);
              return `${d.toLocaleString("default", { month: "short" })} '${d.getFullYear().toString().slice(2)}`;
            }}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border-card)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v) =>
              `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : Number(v).toFixed(0)}`
            }
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            width={58}
            yAxisId="price"
          />
          <Tooltip content={<OHLCTooltip />} />

          {/* BB Bands */}
          {indicators.has("bb") && (
            <>
              <Line
                yAxisId="price"
                dataKey="upperBand"
                stroke="rgba(168,85,247,0.5)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 3"
                name="BB+"
                connectNulls
              />
              <Line
                yAxisId="price"
                dataKey="lowerBand"
                stroke="rgba(168,85,247,0.5)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="5 3"
                name="BB−"
                connectNulls
              />
              <Line
                yAxisId="price"
                dataKey="upperBand1"
                stroke="rgba(168,85,247,0.25)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 4"
                name="BB+1σ"
                connectNulls
              />
              <Line
                yAxisId="price"
                dataKey="lowerBand1"
                stroke="rgba(168,85,247,0.25)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 4"
                name="BB−1σ"
                connectNulls
              />
              <Line
                yAxisId="price"
                dataKey="ma20"
                stroke="rgba(168,85,247,0.6)"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="8 3"
                name="BB Mid"
                connectNulls
              />
            </>
          )}

          {/* Moving averages */}
          {indicators.has("ma20") && !indicators.has("bb") && (
            <Line
              yAxisId="price"
              dataKey="ma20"
              stroke="#F59E0B"
              strokeWidth={1.5}
              dot={false}
              name="MA20"
              connectNulls
            />
          )}
          {indicators.has("ma50") && (
            <Line
              yAxisId="price"
              dataKey="ma50"
              stroke="#3B82F6"
              strokeWidth={1.5}
              dot={false}
              name="MA50"
              connectNulls
            />
          )}
          {indicators.has("ma200") && (
            <Line
              yAxisId="price"
              dataKey="ma200"
              stroke="#EC4899"
              strokeWidth={1.5}
              dot={false}
              name="MA200"
              connectNulls
            />
          )}
          {indicators.has("ema") && (
            <>
              <Line
                yAxisId="price"
                dataKey="ema12"
                stroke="#06B6D4"
                strokeWidth={1.2}
                dot={false}
                strokeDasharray="4 2"
                name="EMA12"
                connectNulls
              />
              <Line
                yAxisId="price"
                dataKey="ema26"
                stroke="#0EA5E9"
                strokeWidth={1.2}
                dot={false}
                strokeDasharray="4 2"
                name="EMA26"
                connectNulls
              />
            </>
          )}
          {indicators.has("vwap") && (
            <Line
              yAxisId="price"
              dataKey="vwap"
              stroke="#F97316"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="6 2"
              name="VWAP"
              connectNulls
            />
          )}

          {/* ── CANDLESTICK chart type ── */}
          {chartType === "candle" && (
            <Bar
              yAxisId="price"
              dataKey="close"
              shape={(props: any) => <CandlestickShape {...props} />}
              name="OHLC"
              maxBarSize={16}
              isAnimationActive={false}
            >
              {slicedData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.close >= d.open ? "#22C55E" : "#EF4444"}
                />
              ))}
            </Bar>
          )}

          {/* ── LINE chart type ── */}
          {chartType === "line" && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke={priceColor}
              strokeWidth={2}
              dot={false}
              name="Price"
              connectNulls
            />
          )}

          {/* ── AREA chart type ── */}
          {chartType === "area" && (
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="close"
              stroke={priceColor}
              strokeWidth={2}
              fill={isUp ? "url(#gradUp)" : "url(#gradDown)"}
              dot={false}
              name="Price"
              connectNulls
            />
          )}

          {/* Live price line */}
          {liveQuote && (
            <ReferenceLine
              yAxisId="price"
              y={liveQuote.price}
              stroke={priceColor}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Live ₹${liveQuote.price.toFixed(2)}`,
                fill: priceColor,
                fontSize: 9,
                position: "insideTopRight",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* ── Sub chart: Volume ── */}
      {subChart === "volume" && (
        <ResponsiveContainer width="100%" height={subH}>
          <ComposedChart
            data={slicedData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-card)"
              opacity={0.3}
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
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v: any) => [
                `${(Number(v) / 1e6).toFixed(2)}M`,
                "Volume",
              ]}
            />
            <Bar dataKey="volume" maxBarSize={12} radius={[2, 2, 0, 0]}>
              {slicedData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.close >= d.open
                      ? "rgba(34,197,94,0.5)"
                      : "rgba(239,68,68,0.5)"
                  }
                />
              ))}
            </Bar>
            <Line
              dataKey="obv"
              stroke="rgba(99,102,241,0.6)"
              strokeWidth={1.5}
              dot={false}
              name="OBV"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Sub chart: RSI ── */}
      {subChart === "rsi" && (
        <ResponsiveContainer width="100%" height={subH}>
          <ComposedChart
            data={slicedData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-card)"
              opacity={0.3}
            />
            <XAxis dataKey="date" hide />
            <YAxis
              domain={[0, 100]}
              ticks={[20, 30, 50, 70, 80]}
              tick={{ fontSize: 9, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                fontSize: 11,
              }}
              formatter={(v: any) => [Number(v).toFixed(1), "RSI"]}
            />
            <ReferenceLine
              y={70}
              stroke="#EF4444"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={30}
              stroke="#22C55E"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={50}
              stroke="var(--text-muted)"
              strokeDasharray="2 4"
              strokeOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="rsi"
              stroke="#A78BFA"
              strokeWidth={2}
              fill="rgba(167,139,250,0.1)"
              dot={false}
              name="RSI"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Sub chart: MACD ── */}
      {subChart === "macd" && (
        <ResponsiveContainer width="100%" height={subH}>
          <ComposedChart
            data={slicedData}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-card)"
              opacity={0.3}
            />
            <XAxis dataKey="date" hide />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--text-muted)" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <ReferenceLine
              y={0}
              stroke="var(--text-muted)"
              strokeOpacity={0.4}
            />
            <Bar
              dataKey="macdHist"
              name="Histogram"
              maxBarSize={10}
              radius={[2, 2, 0, 0]}
            >
              {slicedData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    (d.macdHist ?? 0) >= 0
                      ? "rgba(34,197,94,0.6)"
                      : "rgba(239,68,68,0.6)"
                  }
                />
              ))}
            </Bar>
            <Line
              dataKey="macd"
              stroke="#38BDF8"
              strokeWidth={1.5}
              dot={false}
              name="MACD"
              connectNulls
            />
            <Line
              dataKey="macdSignal"
              stroke="#F97316"
              strokeWidth={1.5}
              dot={false}
              name="Signal"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Proper candlestick shape for Recharts Bar ─────────────────────────────────
// Recharts Bar passes x, y, width, height relative to the bar's y-range.
// We use a custom shape to draw wicks + body properly.
function CandlestickShape(props: any) {
  const { x, width, payload, yAxis } = props;
  if (!payload || width <= 0 || !yAxis?.scale) return null;

  const { open, high, low, close } = payload;
  if (open == null || close == null || high == null || low == null) return null;

  const isUp = close >= open;
  const color = isUp ? "#22C55E" : "#EF4444";
  const scale = yAxis.scale;

  const yOpen = scale(open);
  const yClose = scale(close);
  const yHigh = scale(high);
  const yLow = scale(low);

  const bodyTop = Math.min(yOpen, yClose);
  const bodyBot = Math.max(yOpen, yClose);
  const bodyH = Math.max(1, bodyBot - bodyTop);
  const cx = x + width / 2;
  const bw = Math.max(2, width - 2);
  const bx = cx - bw / 2;

  return (
    <g>
      <line
        x1={cx}
        y1={yHigh}
        x2={cx}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={bx}
        y={bodyTop}
        width={bw}
        height={bodyH}
        fill={isUp ? "transparent" : color}
        stroke={color}
        strokeWidth={1.5}
        rx={0.5}
      />
      <line
        x1={cx}
        y1={bodyBot}
        x2={cx}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  );
}
