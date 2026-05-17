"use client";
import { useEffect, useState, useRef } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { usePaletteStore } from "@/store/paletteStore";
import {
  calcLotROI,
  type SignalMatch,
  type BBResult,
  type OHLCV,
  type LotROI,
} from "@/lib/bollingerEngine";
import {
  X,
  TrendingUp,
  Target,
  Shield,
  Zap,
  BarChart2,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface StockDetailProps {
  symbol: string;
  onClose: () => void;
}

interface DetailData {
  symbol: string;
  rawData: OHLCV[];
  bbData: BBResult[];
  allSignals: SignalMatch[];
  currentPrice: number;
  changePercent: number;
}

const LOT_SIZES = [1, 5, 10, 25, 50, 100, 500, 1000];

export default function StockDetailPanel({
  symbol,
  onClose,
}: StockDetailProps) {
  const { getPalette } = usePaletteStore();
  const palette = getPalette();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSignalIdx, setSelectedSignalIdx] = useState(0);
  const [activeLot, setActiveLot] = useState(10);
  const [activeTab, setActiveTab] = useState<"chart" | "roi" | "signals">(
    "chart",
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/recommended?symbol=${encodeURIComponent(symbol)}`,
        );
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const accentColor = palette.accent;
  const accentRgb = palette.accentRgb;
  const buyColor = palette.buyColor;
  const sellColor = palette.sellColor;

  if (loading) {
    return (
      <DetailOverlay onClose={onClose} palette={palette}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: 400,
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `3px solid rgba(${accentRgb}, 0.15)`,
              borderTop: `3px solid ${accentColor}`,
              animation: "spin 0.8s linear infinite",
              boxShadow: `0 0 20px rgba(${accentRgb}, 0.3)`,
            }}
          />
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Loading deep analysis for{" "}
            <b style={{ color: accentColor }}>{symbol}</b>…
          </p>
        </div>
      </DetailOverlay>
    );
  }

  if (!data) {
    return (
      <DetailOverlay onClose={onClose} palette={palette}>
        <p
          style={{
            color: "var(--text-muted)",
            textAlign: "center",
            padding: 40,
          }}
        >
          No data found for {symbol}
        </p>
      </DetailOverlay>
    );
  }

  const buySignals = data.allSignals.filter((s) => s.direction === "BUY");
  const sig = buySignals[selectedSignalIdx] || buySignals[0];
  if (!sig) return null;

  const lotROI = calcLotROI(
    sig.entryPrice,
    sig.targetMin,
    sig.targetMid,
    sig.targetMax,
    sig.stopLoss,
  );
  const selectedLotROI = lotROI.find((r) => r.lots === activeLot) || lotROI[2];

  // Build chart data: raw OHLCV + BB overlay
  const chartData = data.rawData.map((d, i) => {
    const bb = data.bbData[i];
    return {
      ...d,
      upper2: bb?.upper2 || null,
      lower2: bb?.lower2 || null,
      sma: bb?.sma || null,
      upper1: bb?.upper1 || null,
      lower1: bb?.lower1 || null,
      signal: buySignals.some((s) => s.date === d.date) ? d.close : null,
    };
  });

  // ROI chart data for selected lot
  const roiChartData = lotROI.map((r) => ({
    lots: `${r.lots}`,
    profitMid: r.profitMid,
    profitMax: r.profitMax,
    invested: r.invested,
    pctMid: r.pctMid,
  }));

  return (
    <DetailOverlay onClose={onClose} palette={palette}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "Syne, sans-serif",
                background: `linear-gradient(135deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
              }}
            >
              {symbol.replace(".NS", "")}
            </h2>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: `rgba(${accentRgb}, 0.12)`,
                color: accentColor,
                border: `1px solid rgba(${accentRgb}, 0.25)`,
              }}
            >
              NSE
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background:
                  data.changePercent >= 0
                    ? `rgba(${palette.buyRgb}, 0.1)`
                    : `rgba(${palette.sellRgb}, 0.1)`,
                color: data.changePercent >= 0 ? buyColor : sellColor,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {data.changePercent >= 0 ? <TrendingUp size={10} /> : null}
              {data.changePercent >= 0 ? "+" : ""}
              {data.changePercent.toFixed(2)}%
            </span>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-primary)",
              marginTop: 4,
            }}
          >
            ₹
            {data.currentPrice.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: 8,
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Signal selector (if multiple) ── */}
      {buySignals.length > 1 && (
        <div
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              alignSelf: "center",
            }}
          >
            Signal:
          </span>
          {buySignals.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelectedSignalIdx(i)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                border: `1px solid ${selectedSignalIdx === i ? `rgba(${accentRgb}, 0.4)` : "var(--border-card)"}`,
                background:
                  selectedSignalIdx === i
                    ? `rgba(${accentRgb}, 0.1)`
                    : "transparent",
                color:
                  selectedSignalIdx === i ? accentColor : "var(--text-muted)",
              }}
            >
              {s.date} · {s.type}
            </button>
          ))}
        </div>
      )}

      {/* ── Signal summary cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            icon: Zap,
            label: "Entry Price",
            value: `₹${sig.entryPrice.toFixed(2)}`,
            color: accentColor,
            sub: sig.type,
          },
          {
            icon: Target,
            label: "Target (Mid)",
            value: `₹${sig.targetMid.toFixed(2)}`,
            color: buyColor,
            sub: `+${(((sig.targetMid - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}% gain`,
          },
          {
            icon: Target,
            label: "Target (Max)",
            value: `₹${sig.targetMax.toFixed(2)}`,
            color: accentColor,
            sub: `+${(((sig.targetMax - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}% stretch`,
          },
          {
            icon: Shield,
            label: "Stop Loss",
            value: `₹${sig.stopLoss.toFixed(2)}`,
            color: sellColor,
            sub: `${(((sig.stopLoss - sig.entryPrice) / sig.entryPrice) * 100).toFixed(1)}%`,
          },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div
            key={label}
            style={{
              padding: "14px",
              borderRadius: 12,
              background: `rgba(${color === accentColor ? accentRgb : color === buyColor ? palette.buyRgb : palette.sellRgb}, 0.06)`,
              border: `1px solid rgba(${color === accentColor ? accentRgb : color === buyColor ? palette.buyRgb : palette.sellRgb}, 0.15)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 6,
              }}
            >
              <Icon size={11} color={color} />
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {value}
            </div>
            <div
              style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Condition description ── */}
      <div
        style={{
          marginBottom: 20,
          padding: "10px 14px",
          borderRadius: 10,
          background: `rgba(${accentRgb}, 0.06)`,
          border: `1px solid rgba(${accentRgb}, 0.15)`,
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontWeight: 700, color: accentColor }}>
          📋 Condition:{" "}
        </span>
        {sig.conditionDesc}
        {" · "}
        <span style={{ fontWeight: 700 }}>R:R = </span>
        <span
          style={{
            color:
              sig.riskRewardRatio >= 2 ? buyColor : "var(--text-secondary)",
            fontFamily: "JetBrains Mono",
            fontWeight: 700,
          }}
        >
          {sig.riskRewardRatio}x
        </span>
        {" · "}
        <span style={{ fontWeight: 700 }}>Confidence: </span>
        <span
          style={{
            color: accentColor,
            fontFamily: "JetBrains Mono",
            fontWeight: 700,
          }}
        >
          {sig.confidence}%
        </span>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "var(--bg-secondary)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
        }}
      >
        {(["chart", "roi", "signals"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background:
                activeTab === tab ? `rgba(${accentRgb}, 0.15)` : "transparent",
              color: activeTab === tab ? accentColor : "var(--text-muted)",
              transition: "all 0.15s",
              boxShadow:
                activeTab === tab ? `0 0 10px rgba(${accentRgb}, 0.2)` : "none",
            }}
          >
            {tab === "chart"
              ? "📈 BB Chart"
              : tab === "roi"
                ? "💰 ROI Table"
                : "⚡ All Signals"}
          </button>
        ))}
      </div>

      {/* ── Chart Tab ── */}
      {activeTab === "chart" && (
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
            padding: "16px 8px 8px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 8,
              paddingLeft: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Bollinger Bands · Entry / Target Zones
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="bbAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={palette.accentSecondary}
                    stopOpacity={0.08}
                  />
                  <stop
                    offset="100%"
                    stopColor={palette.accentSecondary}
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
                tickFormatter={(v) => v.slice(5)}
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) =>
                  `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                }
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  borderRadius: 10,
                  fontSize: 11,
                }}
                formatter={(v: any, name: string) => [
                  `₹${Number(v).toFixed(2)}`,
                  name,
                ]}
              />
              {/* BB Bands */}
              <Area
                type="monotone"
                dataKey="upper2"
                stroke={`rgba(${palette.accentSecRgb}, 0.4)`}
                strokeDasharray="4 3"
                strokeWidth={1}
                fill="none"
                name="Upper 2σ"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="lower2"
                stroke={`rgba(${palette.accentSecRgb}, 0.4)`}
                strokeDasharray="4 3"
                strokeWidth={1}
                fill="url(#bbAreaGrad)"
                name="Lower 2σ"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sma"
                stroke={`rgba(${accentRgb}, 0.5)`}
                strokeWidth={1}
                dot={false}
                strokeDasharray="6 3"
                name="SMA20"
              />
              <Line
                type="monotone"
                dataKey="upper1"
                stroke={`rgba(${accentRgb}, 0.3)`}
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 4"
                name="Upper 1σ"
              />
              <Line
                type="monotone"
                dataKey="lower1"
                stroke={`rgba(${accentRgb}, 0.3)`}
                strokeWidth={1}
                dot={false}
                strokeDasharray="2 4"
                name="Lower 1σ"
              />
              {/* Price line */}
              <Line
                type="monotone"
                dataKey="close"
                stroke={accentColor}
                strokeWidth={2}
                dot={false}
                name="Close"
              />
              {/* Signal dots */}
              <Line
                type="monotone"
                dataKey="signal"
                stroke="none"
                dot={(props: any) => {
                  if (!props.value) return <g />;
                  return (
                    <g key={props.index}>
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={6}
                        fill={buyColor}
                        stroke="var(--bg-card)"
                        strokeWidth={2}
                      />
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={10}
                        fill="none"
                        stroke={buyColor}
                        strokeWidth={1}
                        opacity={0.5}
                      />
                    </g>
                  );
                }}
                name="Signal"
              />
              {/* Target reference lines */}
              <ReferenceLine
                y={sig.targetMid}
                stroke={buyColor}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `T₁ ₹${sig.targetMid.toFixed(0)}`,
                  fill: buyColor,
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
              <ReferenceLine
                y={sig.targetMax}
                stroke={accentColor}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `T₂ ₹${sig.targetMax.toFixed(0)}`,
                  fill: accentColor,
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
              <ReferenceLine
                y={sig.stopLoss}
                stroke={sellColor}
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `SL ₹${sig.stopLoss.toFixed(0)}`,
                  fill: sellColor,
                  fontSize: 9,
                  position: "insideBottomRight",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── ROI Tab ── */}
      {activeTab === "roi" && (
        <div>
          {/* Lot selector */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                alignSelf: "center",
              }}
            >
              Select lots:
            </span>
            {LOT_SIZES.map((l) => (
              <button
                key={l}
                onClick={() => setActiveLot(l)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: `1px solid ${activeLot === l ? `rgba(${accentRgb}, 0.5)` : "var(--border-card)"}`,
                  background:
                    activeLot === l
                      ? `rgba(${accentRgb}, 0.12)`
                      : "transparent",
                  color:
                    activeLot === l ? accentColor : "var(--text-secondary)",
                  transition: "all 0.15s",
                  boxShadow:
                    activeLot === l
                      ? `0 0 8px rgba(${accentRgb}, 0.2)`
                      : "none",
                }}
              >
                {l}L
              </button>
            ))}
          </div>

          {/* Highlighted card for selected lot */}
          {selectedLotROI && (
            <div
              style={{
                marginBottom: 16,
                padding: "16px 20px",
                borderRadius: 14,
                background: `linear-gradient(135deg, rgba(${accentRgb}, 0.1) 0%, rgba(${palette.accentSecRgb}, 0.05) 100%)`,
                border: `1px solid rgba(${accentRgb}, 0.25)`,
                boxShadow: `0 0 24px rgba(${accentRgb}, 0.1)`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {activeLot} lot{activeLot > 1 ? "s" : ""} · Invested:{" "}
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "JetBrains Mono",
                  }}
                >
                  ₹
                  {selectedLotROI.invested.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  {
                    label: "Min Target (T₀)",
                    profit: selectedLotROI.profitMin,
                    pct: selectedLotROI.pctMin,
                    total: selectedLotROI.targetMinReturn,
                  },
                  {
                    label: "Mid Target (T₁)",
                    profit: selectedLotROI.profitMid,
                    pct: selectedLotROI.pctMid,
                    total: selectedLotROI.targetMidReturn,
                  },
                  {
                    label: "Max Target (T₂)",
                    profit: selectedLotROI.profitMax,
                    pct: selectedLotROI.pctMax,
                    total: selectedLotROI.targetMaxReturn,
                  },
                ].map(({ label, profit, pct, total }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        fontFamily: "JetBrains Mono",
                        marginBottom: 2,
                        color: profit >= 0 ? buyColor : sellColor,
                        textShadow: `0 0 12px rgba(${profit >= 0 ? palette.buyRgb : palette.sellRgb}, 0.4)`,
                      }}
                    >
                      {profit >= 0 ? "+" : ""}₹
                      {Math.abs(profit).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: profit >= 0 ? buyColor : sellColor,
                        fontFamily: "JetBrains Mono",
                        fontWeight: 700,
                      }}
                    >
                      {profit >= 0 ? "+" : ""}
                      {pct.toFixed(2)}%
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      = ₹
                      {total.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full ROI table */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border-card)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ background: "var(--bg-secondary)" }}>
                  {[
                    "Lots",
                    "Invested",
                    "T₀ Profit",
                    "T₁ Profit",
                    "T₂ Profit",
                    "T₁ ROI%",
                    "T₁ Value",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 12px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        textAlign: h === "Lots" ? "left" : "right",
                        borderBottom: "1px solid var(--border-card)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lotROI.map((row, i) => (
                  <tr
                    key={row.lots}
                    onClick={() => setActiveLot(row.lots)}
                    style={{
                      background:
                        activeLot === row.lots
                          ? `rgba(${accentRgb}, 0.06)`
                          : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: 800,
                        color:
                          activeLot === row.lots
                            ? accentColor
                            : "var(--text-primary)",
                        fontFamily: "JetBrains Mono",
                        borderBottom:
                          i < lotROI.length - 1
                            ? "1px solid var(--border-card)"
                            : "none",
                      }}
                    >
                      {row.lots}L
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        borderBottom:
                          i < lotROI.length - 1
                            ? "1px solid var(--border-card)"
                            : "none",
                      }}
                    >
                      ₹
                      {row.invested.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    {[row.profitMin, row.profitMid, row.profitMax].map(
                      (p, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "10px 12px",
                            textAlign: "right",
                            fontFamily: "JetBrains Mono",
                            fontSize: 12,
                            fontWeight: 700,
                            color: p >= 0 ? buyColor : sellColor,
                            borderBottom:
                              i < lotROI.length - 1
                                ? "1px solid var(--border-card)"
                                : "none",
                          }}
                        >
                          {p >= 0 ? "+" : ""}₹
                          {Math.abs(p).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                      ),
                    )}
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        fontWeight: 800,
                        color: buyColor,
                        borderBottom:
                          i < lotROI.length - 1
                            ? "1px solid var(--border-card)"
                            : "none",
                      }}
                    >
                      {row.pctMid >= 0 ? "+" : ""}
                      {row.pctMid.toFixed(1)}%
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        borderBottom:
                          i < lotROI.length - 1
                            ? "1px solid var(--border-card)"
                            : "none",
                      }}
                    >
                      ₹
                      {row.targetMidReturn.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ROI bar chart */}
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
              padding: "12px 8px 4px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                paddingLeft: 8,
                marginBottom: 6,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Profit by Lot Size (T₁ Mid-Target)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={roiChartData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-card)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="lots"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                  }
                  tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: any) => [
                    `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                    "Profit",
                  ]}
                />
                <Bar dataKey="profitMid" radius={[4, 4, 0, 0]}>
                  {roiChartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`rgba(${accentRgb}, ${0.4 + i * 0.07})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Signals Tab ── */}
      {activeTab === "signals" && (
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid var(--border-card)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)" }}>
                {[
                  "Date",
                  "Type",
                  "Dir",
                  "Entry",
                  "T₁ Target",
                  "Gain",
                  "Stop",
                  "Conf",
                  "R:R",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 12px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      textAlign: "left",
                      borderBottom: "1px solid var(--border-card)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.allSignals.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < data.allSignals.length - 1
                        ? "1px solid var(--border-card)"
                        : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 11,
                      fontFamily: "JetBrains Mono",
                      color: "var(--text-muted)",
                    }}
                  >
                    {s.date}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.type.replace("_", " ")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        padding: "2px 7px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 800,
                        background:
                          s.direction === "BUY"
                            ? `rgba(${palette.buyRgb}, 0.12)`
                            : `rgba(${palette.sellRgb}, 0.12)`,
                        color: s.direction === "BUY" ? buyColor : sellColor,
                      }}
                    >
                      {s.direction}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: "var(--text-primary)",
                    }}
                  >
                    ₹{s.entryPrice.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: buyColor,
                      fontWeight: 700,
                    }}
                  >
                    ₹{s.targetMid.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      fontWeight: 700,
                      color: buyColor,
                    }}
                  >
                    +
                    {(
                      ((s.targetMid - s.entryPrice) / s.entryPrice) *
                      100
                    ).toFixed(1)}
                    %
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: sellColor,
                    }}
                  >
                    ₹{s.stopLoss.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 3,
                          background: "var(--border-primary)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${s.confidence}%`,
                            height: "100%",
                            background: accentColor,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "JetBrains Mono",
                          color: accentColor,
                          fontWeight: 700,
                        }}
                      >
                        {s.confidence}%
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        s.riskRewardRatio >= 2
                          ? buyColor
                          : "var(--text-secondary)",
                    }}
                  >
                    {s.riskRewardRatio}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </DetailOverlay>
  );
}

function DetailOverlay({
  children,
  onClose,
  palette,
}: {
  children: React.ReactNode;
  onClose: () => void;
  palette: any;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 16px",
        overflowY: "auto",
        animation: "overlayIn 0.2s ease",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          background: "var(--bg-card)",
          border: `1px solid rgba(${palette.accentRgb}, 0.15)`,
          borderRadius: 20,
          boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(${palette.accentRgb}, 0.1), 0 0 60px rgba(${palette.accentRgb}, 0.05)`,
          padding: "28px",
          animation: "slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {children}
      </div>
      <style jsx global>{`
        @keyframes overlayIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
