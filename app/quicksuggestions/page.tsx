"use client";
import { useState, useEffect, useCallback } from "react";
import { usePaletteStore } from "@/store/paletteStore";
import type { CompositeScore } from "@/lib/strategyEngine";
import {
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  ChevronRight,
  Star,
  Flame,
  BarChart2,
  Activity,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Search,
} from "lucide-react";
import PaletteSwitcher from "@/components/recommended/Paletteswitcher";
import AppLayout from "@/components/AppLayout";

const SIGNAL_COLORS: Record<string, string> = {
  STRONG_BUY: "#00FF87",
  BUY: "#4ADE80",
  NEUTRAL: "#F59E0B",
  SELL: "#F87171",
  STRONG_SELL: "#FF2D55",
};

type SortKey =
  | "composite"
  | "gain"
  | "confluence"
  | "momentum"
  | "change"
  | "price_asc"
  | "price_desc"
  | "volume";
type FilterKey = "ALL" | "STRONG_BUY" | "BUY";

export default function QuickSuggestionsPage() {
  const { getPalette, activePalette } = usePaletteStore();
  const [palette, setPalette] = useState(getPalette());
  useEffect(() => {
    setPalette(getPalette());
  }, [activePalette]);

  const [pennyStocks, setPennyStocks] = useState<CompositeScore[]>([]);
  const [midStocks, setMidStocks] = useState<CompositeScore[]>([]);
  const [highStocks, setHighStocks] = useState<CompositeScore[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({
    penny: false,
    mid: false,
    high: false,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<CompositeScore | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  const [filterSignal, setFilterSignal] = useState<FilterKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTier = useCallback(
    async (tier: "penny" | "mid" | "high") => {
      setLoading((p) => ({ ...p, [tier]: true }));
      try {
        const priceParams =
          tier === "penny"
            ? "&minPrice=1&maxPrice=399"
            : tier === "mid"
              ? "&minPrice=400&maxPrice=999"
              : "&minPrice=1000";
        const res = await fetch(
          `/api/scan?tier=${tier}&mode=quick&limit=10&sort=${sortKey}${priceParams}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CompositeScore[] = await res.json();
        if (tier === "penny") setPennyStocks(data);
        else if (tier === "mid") setMidStocks(data);
        else setHighStocks(data);
      } catch (e) {
        console.error(`Failed to fetch ${tier}:`, e);
      }
      setLoading((p) => ({ ...p, [tier]: false }));
    },
    [sortKey],
  );

  const refreshAll = useCallback(() => {
    setLastUpdated(new Date());
    fetchTier("penny");
    fetchTier("mid");
    fetchTier("high");
  }, [fetchTier]);

  useEffect(() => {
    refreshAll();
  }, []);

  // Re-fetch when sort changes
  useEffect(() => {
    refreshAll();
  }, [sortKey]);

  const filterStocks = (stocks: CompositeScore[]) => {
    return stocks.filter((s) => {
      if (filterSignal !== "ALL" && s.overallSignal !== filterSignal)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          (s.name || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  const acc = palette.accent;
  const accRgb = palette.accentRgb;
  const isLoading = Object.values(loading).some(Boolean);

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 24px rgba(${accRgb}, 0.5)`,
              }}
            >
              <Zap size={22} color="white" fill="white" />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "Syne, sans-serif",
                  fontSize: 26,
                  fontWeight: 900,
                  color: "var(--text-primary)",
                }}
              >
                Quick Suggestions
              </h1>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Top 10 high-return candidates per tier · 8-strategy AI scoring
                engine
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <PaletteSwitcher />
            <button
              onClick={refreshAll}
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                background: `rgba(${accRgb}, 0.12)`,
                border: `1px solid rgba(${accRgb}, 0.3)`,
                color: acc,
                cursor: "pointer",
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: isLoading ? "spin 0.8s linear infinite" : "none",
                }}
              />
              {isLoading ? "Analyzing…" : "Refresh All"}
            </button>
          </div>
        </div>

        {/* ── Legend badges ── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            { label: "8 Strategies Combined", icon: BarChart2 },
            {
              label: "BB · MACD · RSI · EMA · Volume · Mean Rev · VWAP · OBV",
              icon: Activity,
            },
            { label: "Research-backed win rates 64–88%", icon: Star },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                background: `rgba(${accRgb}, 0.07)`,
                border: `1px solid rgba(${accRgb}, 0.12)`,
              }}
            >
              <Icon size={11} color={acc} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {label}
              </span>
            </div>
          ))}
          {lastUpdated && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
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
              }}
              placeholder="Search stocks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Signal filter */}
          <div style={{ display: "flex", gap: 3 }}>
            {(["ALL", "STRONG_BUY", "BUY"] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterSignal(f)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1px solid ${filterSignal === f ? `rgba(${accRgb}, 0.3)` : "var(--border-card)"}`,
                  background:
                    filterSignal === f
                      ? `rgba(${accRgb}, 0.12)`
                      : "var(--bg-card)",
                  color: filterSignal === f ? acc : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginLeft: "auto",
            }}
          >
            <ArrowUpDown size={13} color="var(--text-muted)" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: "var(--bg-card)",
                border: `1px solid rgba(${accRgb}, 0.15)`,
                color: "var(--text-secondary)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="composite">↓ AI Score</option>
              <option value="gain">↓ Expected Gain</option>
              <option value="confluence">↓ Confluence</option>
              <option value="momentum">↓ Momentum</option>
              <option value="change">↓ Daily Change</option>
              <option value="price_asc">↑ Price (Low→High)</option>
              <option value="price_desc">↓ Price (High→Low)</option>
              <option value="volume">↓ Volume</option>
            </select>
          </div>
        </div>

        {/* ── 3 Tiers ── */}
        <TierSection
          tier="penny"
          label="🪙 Penny Picks"
          subtitle="₹1 – ₹399 · High risk, high reward · Volume-filtered"
          stocks={filterStocks(pennyStocks)}
          loading={loading.penny}
          palette={palette}
          onSelect={setSelected}
          onRefresh={() => fetchTier("penny")}
        />
        <TierSection
          tier="mid"
          label="📊 Mid-Cap Gems"
          subtitle="₹400 – ₹999 · Balanced risk-reward · MACD+RSI screened"
          stocks={filterStocks(midStocks)}
          loading={loading.mid}
          palette={palette}
          onSelect={setSelected}
          onRefresh={() => fetchTier("mid")}
        />
        <TierSection
          tier="high"
          label="💎 Blue Chip Leaders"
          subtitle="₹1000+ · Lower risk · Trend-confirmed breakouts"
          stocks={filterStocks(highStocks)}
          loading={loading.high}
          palette={palette}
          onSelect={setSelected}
          onRefresh={() => fetchTier("high")}
        />

        {/* Disclaimer */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: `rgba(${accRgb}, 0.04)`,
            border: `1px solid rgba(${accRgb}, 0.1)`,
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          ⚠️ Educational purposes only. Not financial advice. Past patterns ≠
          future returns. Always use stop-losses and do your own research.
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <StockDrawer
          stock={selected}
          onClose={() => setSelected(null)}
          palette={palette}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes skeletonPulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </AppLayout>
  );
}

// ── Tier Section ──────────────────────────────────────────────────────────────
function TierSection({
  tier,
  label,
  subtitle,
  stocks,
  loading,
  palette,
  onSelect,
  onRefresh,
}: any) {
  const acc = palette.accent;
  const accRgb = palette.accentRgb;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "Syne, sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            {label}
          </h2>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {subtitle}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!loading && stocks.length > 0 && (
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: `rgba(${accRgb}, 0.12)`,
                fontSize: 11,
                fontWeight: 700,
                color: acc,
              }}
            >
              {stocks.length} signals
            </span>
          )}
          <button
            onClick={onRefresh}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              background: "var(--bg-card)",
              border: "1px solid var(--border-card)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <RefreshCw
              size={10}
              style={{
                animation: loading ? "spin 0.8s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, rgba(${accRgb}, 0.5), transparent)`,
          marginBottom: 16,
          borderRadius: 1,
        }}
      />

      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 240,
                borderRadius: 14,
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                animation: "skeletonPulse 1.8s infinite",
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}

      {!loading && stocks.length === 0 && (
        <div
          style={{
            padding: "32px",
            textAlign: "center",
            borderRadius: 12,
            border: `1px dashed rgba(${accRgb}, 0.2)`,
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No qualifying signals found for this tier right now. Try refreshing or
          adjusting filters.
        </div>
      )}

      {!loading && stocks.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {stocks.map((s: CompositeScore, i: number) => (
            <QuickCard
              key={s.symbol}
              stock={s}
              rank={i + 1}
              palette={palette}
              onClick={() => onSelect(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick stock card ──────────────────────────────────────────────────────────
function QuickCard({
  stock: s,
  rank,
  palette,
  onClick,
}: {
  stock: CompositeScore;
  rank: number;
  palette: any;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const signalColor = SIGNAL_COLORS[s.overallSignal] || "var(--text-muted)";
  const accRgb = palette.accentRgb;
  const acc = palette.accent;
  const isPositive = s.priceChange >= 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 16,
        padding: "16px",
        background: `linear-gradient(135deg, var(--bg-card) 0%, rgba(${accRgb}, 0.03) 100%)`,
        border: `1px solid ${hovered ? `rgba(${accRgb}, 0.35)` : `rgba(${accRgb}, 0.1)`}`,
        transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: hovered ? "translateY(-4px) scale(1.01)" : "none",
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,0.25), 0 0 28px rgba(${accRgb}, 0.12)`
          : `0 2px 8px rgba(0,0,0,0.1)`,
        animation: "cardReveal 0.45s ease forwards",
        opacity: 0,
        animationDelay: `${(rank - 1) * 70}ms`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background: `radial-gradient(ellipse at 50% 0%, rgba(${accRgb}, ${hovered ? 0.08 : 0}) 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "all 0.3s",
        }}
      />

      {/* Rank + signal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background:
              rank <= 3
                ? `linear-gradient(135deg, ${palette.gradientStart}, ${palette.gradientEnd})`
                : "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: rank <= 3 ? 14 : 10,
            fontWeight: 900,
            color: rank <= 3 ? "white" : "var(--text-muted)",
            boxShadow: rank <= 3 ? `0 0 8px rgba(${accRgb}, 0.4)` : "none",
            fontFamily: "JetBrains Mono",
          }}
        >
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
        </div>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            background: `rgba(${palette.buyRgb}, 0.12)`,
            color: signalColor,
            boxShadow: hovered ? `0 0 6px ${signalColor}40` : "none",
            transition: "box-shadow 0.3s",
          }}
        >
          {s.overallSignal.replace("_", " ")}
        </span>
      </div>

      {/* Symbol + name */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            fontFamily: "Syne, sans-serif",
            color: hovered ? acc : "var(--text-primary)",
            transition: "color 0.2s",
          }}
        >
          {s.symbol.replace(".NS", "").replace(".BO", "")}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}
        >
          {(s as any).name} · {(s as any).sector || ""}
        </div>
      </div>

      {/* Price row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "JetBrains Mono",
            color: "var(--text-primary)",
          }}
        >
          ₹{s.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </span>
        <span
          className={isPositive ? "price-up" : "price-down"}
          style={{ display: "flex", alignItems: "center", gap: 3 }}
        >
          {isPositive ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {isPositive ? "+" : ""}
          {s.priceChange.toFixed(2)}%
        </span>
      </div>

      {/* Score + confluence */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            AI Score
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontFamily: "JetBrains Mono",
              color: acc,
              textShadow: hovered ? `0 0 8px rgba(${accRgb}, 0.5)` : "none",
            }}
          >
            {s.compositeScore}
          </div>
        </div>
        <div
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            Signals
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              fontFamily: "JetBrains Mono",
              color:
                s.confluenceCount >= 5
                  ? palette.buyColor
                  : "var(--text-primary)",
            }}
          >
            {s.confluenceCount}/8
          </div>
        </div>
      </div>

      {/* Target + Expected return */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Target size={11} color={palette.buyColor} />
          <span
            style={{
              fontSize: 12,
              fontFamily: "JetBrains Mono",
              fontWeight: 700,
              color: palette.buyColor,
            }}
          >
            ₹
            {s.bestTarget.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
          </span>
        </div>
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: `rgba(${palette.buyRgb}, 0.1)`,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: "JetBrains Mono",
            color: palette.buyColor,
          }}
        >
          +{s.expectedReturn.toFixed(1)}%
        </div>
      </div>

      {/* Strategy mini-bars */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 9,
            color: "var(--text-muted)",
            fontWeight: 600,
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          {s.confluenceCount} buy / {s.strategies.length} strategies
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {s.strategies.slice(0, 8).map((strat: any, i: number) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 2,
                background: ["BUY", "STRONG_BUY"].includes(strat.signal)
                  ? `rgba(${palette.buyRgb}, 0.8)`
                  : ["SELL", "STRONG_SELL"].includes(strat.signal)
                    ? `rgba(${palette.sellRgb}, 0.8)`
                    : "var(--border-primary)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Risk + CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 700,
            background:
              s.riskLevel === "HIGH"
                ? "rgba(248,113,113,0.1)"
                : s.riskLevel === "MEDIUM"
                  ? "rgba(251,191,36,0.1)"
                  : "rgba(74,222,128,0.1)",
            color:
              s.riskLevel === "HIGH"
                ? "var(--accent-red)"
                : s.riskLevel === "MEDIUM"
                  ? "var(--accent-amber)"
                  : "var(--accent-green)",
          }}
        >
          {s.riskLevel} RISK
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            color: acc,
            opacity: hovered ? 1 : 0.5,
            transition: "opacity 0.2s",
          }}
        >
          Deep Analysis <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function StockDrawer({
  stock: s,
  onClose,
  palette,
}: {
  stock: CompositeScore;
  onClose: () => void;
  palette: any;
}) {
  const acc = palette.accent;
  const accRgb = palette.accentRgb;
  const signalColor = SIGNAL_COLORS[s.overallSignal] || acc;

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 520,
          background: "var(--bg-card)",
          border: `1px solid rgba(${accRgb}, 0.15)`,
          borderRadius: "20px 0 0 20px",
          boxShadow: `-24px 0 80px rgba(0,0,0,0.4)`,
          overflowY: "auto",
          animation: "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div style={{ padding: "24px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "Syne, sans-serif",
                    fontSize: 24,
                    fontWeight: 900,
                    color: "var(--text-primary)",
                  }}
                >
                  {s.symbol.replace(".NS", "").replace(".BO", "")}
                </h2>
                <span
                  style={{
                    padding: "2px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `rgba(${accRgb}, 0.12)`,
                    color: acc,
                  }}
                >
                  {(s as any).sector || "NSE"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {(s as any).name}
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
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {/* Price + signal */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 900,
                fontFamily: "JetBrains Mono",
                color: "var(--text-primary)",
              }}
            >
              ₹{s.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                background: `rgba(${accRgb}, 0.12)`,
                color: signalColor,
              }}
            >
              {s.overallSignal.replace("_", " ")}
            </span>
          </div>

          {/* Key metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "AI Score",
                value: `${s.compositeScore}/100`,
                color: acc,
              },
              {
                label: "Confluence",
                value: `${s.confluenceCount}/8`,
                color:
                  s.confluenceCount >= 5
                    ? palette.buyColor
                    : "var(--text-primary)",
              },
              {
                label: "Expected Gain",
                value: `+${s.expectedReturn.toFixed(1)}%`,
                color: palette.buyColor,
              },
              {
                label: "Target Price",
                value: `₹${s.bestTarget.toFixed(1)}`,
                color: palette.buyColor,
              },
              {
                label: "Stop Loss",
                value: `₹${s.bestStopLoss.toFixed(1)}`,
                color: palette.sellColor,
              },
              {
                label: "Risk:Reward",
                value: `${s.bestRR}x`,
                color:
                  s.bestRR >= 2 ? palette.buyColor : "var(--text-secondary)",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: "JetBrains Mono",
                    color,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* All 8 strategies */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Strategy Breakdown ({s.strategies.length} analyzed)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {s.strategies.map((strat: any) => {
                const isBuy = ["BUY", "STRONG_BUY"].includes(strat.signal);
                const isSell = ["SELL", "STRONG_SELL"].includes(strat.signal);
                const color = isBuy
                  ? palette.buyColor
                  : isSell
                    ? palette.sellColor
                    : "var(--accent-amber)";
                return (
                  <div
                    key={strat.strategyId}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--bg-secondary)",
                      border: `1px solid ${isBuy ? `rgba(${palette.buyRgb}, 0.2)` : "var(--border-card)"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {strat.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            fontFamily: "JetBrains Mono",
                          }}
                        >
                          ~{strat.winRateEstimate}% WR
                        </span>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: 999,
                            fontSize: 9,
                            fontWeight: 800,
                            background: `rgba(${isBuy ? palette.buyRgb : isSell ? palette.sellRgb : "200,150,0"}, 0.12)`,
                            color,
                          }}
                        >
                          {strat.signal.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {strat.reason}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        height: 3,
                        background: "var(--border-primary)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${strat.score}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Momentum + Volume + Risk */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              {
                label: "Momentum",
                value: `${s.momentum > 0 ? "+" : ""}${s.momentum.toFixed(0)}`,
                color: s.momentum > 0 ? palette.buyColor : palette.sellColor,
              },
              {
                label: "Volume",
                value: s.volumeSignal,
                color:
                  s.volumeSignal === "HIGH"
                    ? palette.buyColor
                    : s.volumeSignal === "LOW"
                      ? palette.sellColor
                      : "var(--text-secondary)",
              },
              {
                label: "Risk Level",
                value: s.riskLevel,
                color:
                  s.riskLevel === "HIGH"
                    ? "var(--accent-red)"
                    : s.riskLevel === "MEDIUM"
                      ? "var(--accent-amber)"
                      : "var(--accent-green)",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-card)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            ⚠️ Educational only. Not financial advice. Always use stop-losses.
          </p>
        </div>
      </div>
    </div>
  );
}
