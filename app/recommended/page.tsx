"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePaletteStore } from "@/store/paletteStore";
import PaletteSwitcher from "@/components/recommended/Paletteswitcher";
import RecommendationCard from "@/components/recommended/Recommendationcard";
import StockDetailPanel from "@/components/recommended/Stockdetailpanel";
import SkeletonCards from "@/components/recommended/Skeletoncards";
import ParticleBackground from "@/components/recommended/Particlebackground";
import type { RecommendedStock } from "@/lib/bollingerEngine";
import {
  Zap,
  History,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  Filter,
  ChevronDown,
  Info,
  Sparkles,
  Target,
} from "lucide-react";

type Mode = "live" | "previous";
type Period = "1d" | "1w" | "1m";
type SortKey = "confidence" | "gain" | "age" | "rr";
type FilterDirection = "ALL" | "BUY" | "SELL";
type FilterType =
  | "ALL"
  | "SINGLE_DAY"
  | "MULTI_DAY"
  | "SQUEEZE_BREAK"
  | "W_BOTTOM"
  | "UPPER_BREAK";

export default function RecommendedPage() {
  const { getPalette, activePalette } = usePaletteStore();
  const [palette, setPalette] = useState(getPalette());

  // Sync palette
  useEffect(() => {
    setPalette(getPalette());
  }, [activePalette]);

  const [mode, setMode] = useState<Mode>("live");
  const [period, setPeriod] = useState<Period>("1w");
  const [stocks, setStocks] = useState<RecommendedStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [filterDir, setFilterDir] = useState<FilterDirection>("BUY");
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (m: Mode, p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/recommended?mode=${m}&period=${p}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const data: RecommendedStock[] = await res.json();
      setStocks(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(mode, period);
    // Auto-refresh every 5 min in live mode
    if (mode === "live") {
      refreshTimer.current = setInterval(
        () => fetchData(mode, period),
        5 * 60 * 1000,
      );
    }
    return () => clearInterval(refreshTimer.current);
  }, [mode, period, fetchData]);

  // Apply filters + sort
  const filteredStocks = stocks
    .filter((s) => {
      if (filterDir !== "ALL" && s.latestSignal.direction !== filterDir)
        return false;
      if (filterType !== "ALL" && s.latestSignal.type !== filterType)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "confidence")
        return b.latestSignal.confidence - a.latestSignal.confidence;
      if (sortKey === "gain") return b.potentialGain - a.potentialGain;
      if (sortKey === "age") return a.daysSinceSignal - b.daysSinceSignal;
      if (sortKey === "rr")
        return b.latestSignal.riskRewardRatio - a.latestSignal.riskRewardRatio;
      return 0;
    });

  // Live mode: separate confirmed vs approaching
  const confirmedToday =
    mode === "live"
      ? filteredStocks.filter((s) => s.signalAge === "today")
      : [];
  const approaching =
    mode === "live"
      ? filteredStocks.filter((s) => s.signalAge !== "today")
      : [];

  const acc = palette.accent;
  const accRgb = palette.accentRgb;
  const secRgb = palette.accentSecRgb;

  // Stats
  const buyCount = filteredStocks.filter(
    (s) => s.latestSignal.direction === "BUY",
  ).length;
  const avgConfidence = filteredStocks.length
    ? Math.round(
        filteredStocks.reduce((sum, s) => sum + s.latestSignal.confidence, 0) /
          filteredStocks.length,
      )
    : 0;
  const avgGain = filteredStocks.length
    ? (
        filteredStocks.reduce((sum, s) => sum + s.potentialGain, 0) /
        filteredStocks.length
      ).toFixed(1)
    : "0";

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* ── Particle / atmospheric bg ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <ParticleBackground />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: palette.bgPattern,
          }}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 16px rgba(${accRgb}, 0.4)`,
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={18} color="white" strokeWidth={2} />
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "Syne, sans-serif",
                    fontSize: 28,
                    fontWeight: 900,
                    background: `linear-gradient(135deg, ${palette.gradientStart} 0%, ${palette.gradientEnd} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Recommended
                </h1>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-muted)",
                  maxWidth: 480,
                }}
              >
                AI-powered Bollinger Band scanner — live signals &amp;
                historical patterns across 80+ NSE stocks
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PaletteSwitcher />
              <button
                onClick={() => fetchData(mode, period)}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  background: `rgba(${accRgb}, 0.1)`,
                  border: `1px solid rgba(${accRgb}, 0.25)`,
                  color: acc,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <RefreshCw
                  size={13}
                  style={{
                    animation: loading ? "spin 1s linear infinite" : "none",
                  }}
                />
                {loading ? "Scanning…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              {
                icon: Target,
                label: "Signals Found",
                value: filteredStocks.length,
                suffix: "",
              },
              {
                icon: TrendingUp,
                label: "Buy Setups",
                value: buyCount,
                suffix: "",
              },
              {
                icon: Zap,
                label: "Avg Confidence",
                value: avgConfidence,
                suffix: "%",
              },
              {
                icon: Sparkles,
                label: "Avg Gain Potential",
                value: avgGain,
                suffix: "%",
              },
            ].map(({ icon: Icon, label, value, suffix }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: `rgba(${accRgb}, 0.07)`,
                  border: `1px solid rgba(${accRgb}, 0.15)`,
                }}
              >
                <Icon size={12} color={acc} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {label}:
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "JetBrains Mono",
                    color: acc,
                    textShadow: `0 0 8px rgba(${accRgb}, 0.4)`,
                  }}
                >
                  {value}
                  {suffix}
                </span>
              </div>
            ))}
            {lastUpdated && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 12px",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                <Clock size={11} />
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Mode toggle ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {/* Live / Previous segmented toggle */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              borderRadius: 12,
              padding: 4,
              gap: 3,
              boxShadow: `0 2px 12px rgba(0,0,0,0.15)`,
            }}
          >
            {(
              [
                {
                  id: "live",
                  icon: Zap,
                  label: "Live Mode",
                  sub: "Today's signals",
                },
                {
                  id: "previous",
                  icon: History,
                  label: "Historical",
                  sub: "Past patterns",
                },
              ] as const
            ).map(({ id, icon: Icon, label, sub }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  background:
                    mode === id
                      ? `linear-gradient(135deg, rgba(${accRgb}, 0.18) 0%, rgba(${secRgb}, 0.08) 100%)`
                      : "transparent",
                  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow:
                    mode === id
                      ? `0 0 16px rgba(${accRgb}, 0.2), inset 0 0 0 1px rgba(${accRgb}, 0.2)`
                      : "none",
                }}
              >
                <Icon
                  size={14}
                  color={mode === id ? acc : "var(--text-muted)"}
                  style={{
                    filter:
                      mode === id ? `drop-shadow(0 0 4px ${acc})` : "none",
                  }}
                />
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: mode === id ? acc : "var(--text-secondary)",
                      lineHeight: 1,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {sub}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Period selector — only in previous mode */}
          {mode === "previous" && (
            <div
              style={{
                display: "flex",
                gap: 3,
                padding: 4,
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 10,
              }}
            >
              {(["1d", "1w", "1m"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background:
                      period === p ? `rgba(${accRgb}, 0.14)` : "transparent",
                    color: period === p ? acc : "var(--text-muted)",
                    transition: "all 0.15s",
                    boxShadow:
                      period === p ? `0 0 8px rgba(${accRgb}, 0.15)` : "none",
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <input
              style={{
                background: "var(--bg-card)",
                border: `1px solid rgba(${accRgb}, 0.15)`,
                borderRadius: 10,
                color: "var(--text-primary)",
                padding: "8px 14px 8px 32px",
                fontSize: 12,
                outline: "none",
                width: 180,
                transition: "all 0.2s",
              }}
              placeholder="Search symbol…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  `rgba(${accRgb}, 0.4)`;
                (e.target as HTMLInputElement).style.boxShadow =
                  `0 0 8px rgba(${accRgb}, 0.15)`;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor =
                  `rgba(${accRgb}, 0.15)`;
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              ⌕
            </span>
          </div>

          {/* Filter button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setFilterOpen((f) => !f)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                background:
                  filterDir !== "BUY" || filterType !== "ALL"
                    ? `rgba(${accRgb}, 0.12)`
                    : "var(--bg-card)",
                border: `1px solid ${filterDir !== "BUY" || filterType !== "ALL" ? `rgba(${accRgb}, 0.3)` : "var(--border-card)"}`,
                color:
                  filterDir !== "BUY" || filterType !== "ALL"
                    ? acc
                    : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Filter size={12} />
              Filters
              {(filterDir !== "BUY" || filterType !== "ALL") && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: acc,
                    boxShadow: `0 0 4px ${acc}`,
                  }}
                />
              )}
              <ChevronDown
                size={10}
                style={{
                  transform: filterOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {filterOpen && (
              <>
                <div
                  onClick={() => setFilterOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 30 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 40,
                    width: 260,
                    background: "var(--bg-card)",
                    border: `1px solid rgba(${accRgb}, 0.2)`,
                    borderRadius: 14,
                    padding: 14,
                    boxShadow: `0 16px 40px rgba(0,0,0,0.3)`,
                    animation: "dropIn 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Direction
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {(["ALL", "BUY", "SELL"] as FilterDirection[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setFilterDir(d)}
                        style={{
                          flex: 1,
                          padding: "6px",
                          borderRadius: 7,
                          fontSize: 11,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          background:
                            filterDir === d
                              ? `rgba(${accRgb}, 0.15)`
                              : "var(--bg-secondary)",
                          color: filterDir === d ? acc : "var(--text-muted)",
                          transition: "all 0.15s",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    Signal Type
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {(
                      [
                        "ALL",
                        "SINGLE_DAY",
                        "MULTI_DAY",
                        "SQUEEZE_BREAK",
                        "W_BOTTOM",
                        "UPPER_BREAK",
                      ] as FilterType[]
                    ).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 7,
                          fontSize: 11,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          background:
                            filterType === t
                              ? `rgba(${accRgb}, 0.12)`
                              : "transparent",
                          color:
                            filterType === t ? acc : "var(--text-secondary)",
                          transition: "all 0.1s",
                        }}
                      >
                        {t === "ALL"
                          ? "⬡ All Types"
                          : t === "SINGLE_DAY"
                            ? "⚡ 1-Day Reversal"
                            : t === "MULTI_DAY"
                              ? "🔄 Multi-Day Recovery"
                              : t === "SQUEEZE_BREAK"
                                ? "🎯 Squeeze Breakout"
                                : t === "W_BOTTOM"
                                  ? "Ⓦ W-Bottom"
                                  : "↑ Upper Break"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              background: "var(--bg-card)",
              border: `1px solid rgba(${accRgb}, 0.15)`,
              color: "var(--text-secondary)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="confidence">↓ Confidence</option>
            <option value="gain">↓ Gain %</option>
            <option value="age">↑ Freshest</option>
            <option value="rr">↓ Risk:Reward</option>
          </select>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              marginBottom: 20,
              background: `rgba(${palette.sellRgb}, 0.08)`,
              border: `1px solid rgba(${palette.sellRgb}, 0.2)`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Info size={16} color={palette.sellColor} />
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: palette.sellColor,
                }}
              >
                Scanner Error
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {error} — Yahoo Finance may be rate-limiting. Try refreshing in
                30s.
              </div>
            </div>
          </div>
        )}

        {/* ── LIVE MODE ── */}
        {mode === "live" && !loading && (
          <>
            {/* Confirmed today section */}
            <SectionHeader
              title="✅ Condition Satisfied Today"
              subtitle="Signals triggered from market open to current time"
              count={confirmedToday.length}
              palette={palette}
              glowColor={`rgba(${accRgb}, 0.2)`}
            />
            {confirmedToday.length === 0 ? (
              <EmptyState
                message="No confirmed signals yet today. Market may still be developing setups."
                palette={palette}
              />
            ) : (
              <StockGrid stocks={confirmedToday} onSelect={setSelectedSymbol} />
            )}

            {/* Approaching section */}
            <SectionHeader
              title="⏳ Setup Forming — Approaching Condition"
              subtitle="Stocks near lower Bollinger band — signal may trigger soon"
              count={approaching.length}
              palette={palette}
              glowColor={`rgba(${palette.accentSecRgb}, 0.15)`}
              style={{ marginTop: 32 }}
            />
            {approaching.length === 0 ? (
              <EmptyState
                message="No approaching setups detected currently."
                palette={palette}
              />
            ) : (
              <StockGrid
                stocks={approaching}
                onSelect={setSelectedSymbol}
                startIndex={confirmedToday.length}
              />
            )}
          </>
        )}

        {/* ── PREVIOUS MODE ── */}
        {mode === "previous" && !loading && (
          <>
            <SectionHeader
              title={`📊 Historical Signals — ${period === "1d" ? "Last 24 Hours" : period === "1w" ? "Last 7 Days" : "Last 30 Days"}`}
              subtitle={`${filteredStocks.length} Bollinger Band patterns detected across NSE universe`}
              count={filteredStocks.length}
              palette={palette}
              glowColor={`rgba(${accRgb}, 0.15)`}
            />
            {filteredStocks.length === 0 ? (
              <EmptyState
                message={`No signals in the past ${period}. Try extending the time range.`}
                palette={palette}
              />
            ) : (
              <StockGrid stocks={filteredStocks} onSelect={setSelectedSymbol} />
            )}
          </>
        )}

        {/* ── Loading skeletons ── */}
        {loading && (
          <>
            <SectionHeader
              title="Scanning NSE Universe…"
              subtitle="Running Bollinger Band algorithms across 80+ stocks"
              count={0}
              palette={palette}
              glowColor={`rgba(${accRgb}, 0.1)`}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              <SkeletonCards count={8} />
            </div>
          </>
        )}

        {/* ── Info footer ── */}
        <div
          style={{
            marginTop: 40,
            padding: "16px 20px",
            borderRadius: 12,
            background: `rgba(${accRgb}, 0.04)`,
            border: `1px solid rgba(${accRgb}, 0.1)`,
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          <b style={{ color: "var(--text-secondary)" }}>📌 Disclaimer</b> —
          Signals are based on Bollinger Band mathematical patterns and are for
          educational purposes only. Not financial advice. Past pattern
          performance does not guarantee future results. Always do your own
          research before investing. Data sourced from Yahoo Finance (15-min
          delayed). Targets are estimated from band geometry.
        </div>
      </div>

      {/* ── Stock detail overlay ── */}
      {selectedSymbol && (
        <StockDetailPanel
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes dropIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  count,
  palette,
  glowColor,
  style: extraStyle,
}: any) {
  return (
    <div style={{ marginBottom: 16, ...extraStyle }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 12,
          background: glowColor,
          border: `1px solid rgba(${palette.accentRgb}, 0.12)`,
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "Syne, sans-serif",
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        </div>
        {count > 0 && (
          <div
            style={{
              marginLeft: "auto",
              padding: "4px 12px",
              borderRadius: 999,
              background: `rgba(${palette.accentRgb}, 0.14)`,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "JetBrains Mono",
              color: palette.accent,
              boxShadow: `0 0 8px rgba(${palette.accentRgb}, 0.2)`,
            }}
          >
            {count}
          </div>
        )}
      </div>
    </div>
  );
}

function StockGrid({
  stocks,
  onSelect,
  startIndex = 0,
}: {
  stocks: RecommendedStock[];
  onSelect: (s: string) => void;
  startIndex?: number;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}
    >
      {stocks.map((stock, i) => (
        <RecommendationCard
          key={stock.symbol}
          stock={stock}
          index={startIndex + i}
          onClick={() => onSelect(stock.symbol)}
        />
      ))}
    </div>
  );
}

function EmptyState({ message, palette }: { message: string; palette: any }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        borderRadius: 16,
        background: `rgba(${palette.accentRgb}, 0.03)`,
        border: `1px dashed rgba(${palette.accentRgb}, 0.12)`,
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{message}</div>
    </div>
  );
}
