"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppStore } from "@/store/appStore";
import StockSearch from "@/components/StockSearch";
import StockChart from "@/components/StockChart";
import { enrichWithIndicators } from "@/lib/technicals";
import type { StockQuote, HistoricalData } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Target,
  Shield,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
  History,
  DollarSign,
  Percent,
  Clock,
  ArrowUpRight,
  Lock,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

// ── Animated Number ───────────────────────────────────────────────────────────
function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [disp, setDisp] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const from = fromRef.current,
      to = value;
    if (Math.abs(to - from) < 0.001) {
      setDisp(to);
      return;
    }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / 500, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisp(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setDisp(to);
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);
  return (
    <>
      {prefix}
      {disp.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

// ── Target/SL Suggestion chip ─────────────────────────────────────────────────
function SuggestionChip({ label, value, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        cursor: "pointer",
        background: `rgba(${color === "green" ? "34,197,94" : "239,68,68"}, 0.1)`,
        border: `1px solid rgba(${color === "green" ? "34,197,94" : "239,68,68"}, 0.25)`,
        color: color === "green" ? "var(--accent-green)" : "var(--accent-red)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          `rgba(${color === "green" ? "34,197,94" : "239,68,68"}, 0.18)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          `rgba(${color === "green" ? "34,197,94" : "239,68,68"}, 0.1)`;
      }}
    >
      {label}: ₹{value.toFixed(1)}
    </button>
  );
}

export default function TradingPage() {
  const {
    user,
    positions,
    buyStock,
    sellStock,
    updatePositionPrices,
    isAuthenticated,
    register,
  } = useAppStore();
  const searchParams = useSearchParams();
  const prefillSymbol = searchParams?.get("symbol");

  const [symbol, setSymbol] = useState(prefillSymbol || "RELIANCE.NS");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Advanced order options
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [orderTab, setOrderTab] = useState<"order" | "position" | "history">(
    "order",
  );

  useEffect(() => {
    setMounted(true);
  }, []);
  // After line 168
  useEffect(() => {
    targetPriceRef.current = targetPrice;
  }, [targetPrice]);
  useEffect(() => {
    stopLossPriceRef.current = stopLossPrice;
  }, [stopLossPrice]);
  useEffect(() => {
    if (mounted && !isAuthenticated)
      register("Demo User", "demo@tradofly.com", 1_000_000);
  }, [mounted, isAuthenticated]);
  // Line ~161 — add after the mounted useState
  const targetPriceRef = useRef(targetPrice);
  const stopLossPriceRef = useRef(stopLossPrice);
  // Prefill symbol from URL query (e.g. from recommendation cards)
  useEffect(() => {
    if (prefillSymbol) setSymbol(prefillSymbol);
  }, [prefillSymbol]);

  const fetchQuote = useCallback(
    async (sym: string, silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/stock?symbol=${sym}&type=quote`);
        const data: StockQuote = await res.json();
        if (data?.price) {
          setQuote(data);
          updatePositionPrices([{ symbol: sym, price: data.price }]);
          if (!targetPriceRef.current && data.price > 0) {
            setTargetPrice((data.price * 1.07).toFixed(2));
          }
          if (!stopLossPriceRef.current && data.price > 0) {
            setStopLossPrice((data.price * 0.955).toFixed(2));
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [updatePositionPrices], // ← fixed: removed targetPrice, stopLossPrice
  );

  const fetchHistory = useCallback(async (sym: string) => {
    try {
      const res = await fetch(
        `/api/stock?symbol=${sym}&type=history&period1=2023-01-01&interval=1d`,
      );
      const raw = await res.json();
      if (Array.isArray(raw) && raw.length > 0)
        setHistory(enrichWithIndicators(raw));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setTargetPrice("");
    setStopLossPrice("");
    fetchQuote(symbol);
    fetchHistory(symbol);
    const iv = setInterval(() => fetchQuote(symbol, true), 30_000);
    return () => clearInterval(iv);
  }, [symbol, mounted]);

  // Auto-update position prices every 2 min
  useEffect(() => {
    if (!mounted || positions.length === 0) return;
    const iv = setInterval(async () => {
      const updates = await Promise.allSettled(
        positions.map(async (p) => {
          const res = await fetch(`/api/stock?symbol=${p.symbol}&type=quote`);
          const d = await res.json();
          return { symbol: p.symbol, price: d?.price || 0 };
        }),
      );
      const valid = updates
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as any).value)
        .filter((v) => v.price > 0);
      if (valid.length) updatePositionPrices(valid);
    }, 120_000);
    return () => clearInterval(iv);
  }, [mounted, positions.length]);

  function handleTrade() {
    if (!quote) return;
    setResult(null);
    const opts = {
      targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      notes: notes || undefined,
    };
    const res =
      orderType === "BUY"
        ? buyStock(symbol, quote.name, quantity, quote.price, opts)
        : sellStock(symbol, quantity, quote.price);
    setResult(res);
    if (res.success) setTimeout(() => setResult(null), 4000);
  }

  const position = positions.find((p) => p.symbol === symbol);
  const total = (quote?.price ?? 0) * quantity;
  const canAfford = (user?.balance ?? 0) >= total;
  const canSell = (position?.quantity ?? 0) >= quantity;

  const price = quote?.price ?? 0;

  // Target/SL quick suggestions based on price
  const targetSuggestions =
    price > 0
      ? [
          { label: "+3%", value: price * 1.03 },
          { label: "+5%", value: price * 1.05 },
          { label: "+7%", value: price * 1.07 },
          { label: "+10%", value: price * 1.1 },
          { label: "+15%", value: price * 1.15 },
        ]
      : [];

  const slSuggestions =
    price > 0
      ? [
          { label: "-2%", value: price * 0.98 },
          { label: "-3%", value: price * 0.97 },
          { label: "-5%", value: price * 0.95 },
          { label: "-7%", value: price * 0.93 },
          { label: "-10%", value: price * 0.9 },
        ]
      : [];

  // R:R ratio
  const targetNum = parseFloat(targetPrice);
  const slNum = parseFloat(stopLossPrice);
  const rrRatio =
    targetNum > 0 && slNum > 0 && price > 0
      ? ((targetNum - price) / (price - slNum)).toFixed(2)
      : null;

  // Target/SL reach calculation
  const pctToTarget =
    targetNum > 0 && price > 0
      ? (((targetNum - price) / price) * 100).toFixed(2)
      : null;
  const pctToSL =
    slNum > 0 && price > 0
      ? (((slNum - price) / price) * 100).toFixed(2)
      : null;

  // History for this symbol

  const allTransactions = useAppStore((s) => s.transactions);
  const symbolHistory = allTransactions.filter(
    (t) => t.symbol === symbol && (t.type === "BUY" || t.type === "SELL"),
  );
  if (!mounted) return null;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-primary)",
                fontFamily: "Syne, sans-serif",
                margin: 0,
              }}
            >
              Paper Trading Terminal
            </h1>
            <p
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
            >
              Realistic simulation · No real money · Live prices
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Cash Balance
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono",
                  color: "var(--accent-green)",
                }}
              >
                <AnimatedNumber
                  value={user?.balance ?? 0}
                  prefix="₹"
                  decimals={0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Stock Search ── */}
        <StockSearch
          onSelect={(sym) => setSymbol(sym)}
          defaultSymbol={symbol}
          placeholder="Search any stock…"
        />

        {/* ── Main layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Chart panel ── */}
          <div className="card" style={{ padding: 20 }}>
            {quote && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    {quote.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {symbol} · {quote.exchange || "NSE"} ·{" "}
                    {quote.currency || "INR"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span className="live-dot" />
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          fontFamily: "JetBrains Mono",
                          color: "var(--text-primary)",
                        }}
                      >
                        ₹
                        {price.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <span
                      className={
                        quote.changePercent >= 0 ? "price-up" : "price-down"
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        marginTop: 4,
                      }}
                    >
                      {quote.changePercent >= 0 ? (
                        <TrendingUp size={11} />
                      ) : (
                        <TrendingDown size={11} />
                      )}
                      {quote.changePercent >= 0 ? "+" : ""}
                      {quote.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  <button
                    onClick={() => fetchQuote(symbol, true)}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-card)",
                      borderRadius: 8,
                      padding: 8,
                      cursor: "pointer",
                      color: "var(--text-muted)",
                    }}
                  >
                    <RefreshCw
                      size={14}
                      style={{
                        animation: refreshing
                          ? "spin 1s linear infinite"
                          : "none",
                      }}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* OHLC mini row */}
            {quote && (
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                }}
              >
                {[
                  { label: "Open", value: quote.open },
                  {
                    label: "High",
                    value: quote.high,
                    color: "var(--accent-green)",
                  },
                  {
                    label: "Low",
                    value: quote.low,
                    color: "var(--accent-red)",
                  },
                  { label: "Prev Close", value: quote.prevClose },
                  {
                    label: "Volume",
                    value: null,
                    text:
                      quote.volume > 0
                        ? `${(quote.volume / 1e6).toFixed(2)}M`
                        : "—",
                  },
                ].map(({ label, value, color, text }) => (
                  <div key={label}>
                    <div
                      style={{
                        fontSize: 9,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono",
                        color: color || "var(--text-primary)",
                      }}
                    >
                      {text || (value != null ? `₹${value.toFixed(2)}` : "—")}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div
                style={{
                  height: 380,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 12,
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "3px solid var(--border-primary)",
                    borderTop: "3px solid var(--accent-green)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: 13 }}>Loading chart…</span>
              </div>
            ) : history.length > 0 ? (
              <StockChart
                data={history}
                symbol={symbol}
                height={380}
                showLivePrice={true}
              />
            ) : (
              <div
                style={{
                  height: 380,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                No chart data available
              </div>
            )}
          </div>

          {/* ── RIGHT: Order panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: 12,
                padding: 4,
                gap: 3,
              }}
            >
              {(
                [
                  { id: "order", icon: Zap, label: "Order" },
                  { id: "position", icon: BarChart2Icon, label: "Position" },
                  { id: "history", icon: History, label: "History" },
                ] as const
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setOrderTab(id as any)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: "8px",
                    borderRadius: 9,
                    border: "none",
                    cursor: "pointer",
                    background:
                      orderTab === id
                        ? "var(--accent-green-bg)"
                        : "transparent",
                    color:
                      orderTab === id
                        ? "var(--accent-green)"
                        : "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: 12,
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* ── ORDER TAB ── */}
            {orderTab === "order" && (
              <div className="card" style={{ padding: 20 }}>
                {/* BUY/SELL toggle */}
                <div
                  style={{
                    display: "flex",
                    background: "var(--bg-secondary)",
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 18,
                    gap: 4,
                  }}
                >
                  {(["BUY", "SELL"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 14,
                        transition: "all 0.2s",
                        background:
                          orderType === t
                            ? t === "BUY"
                              ? "var(--accent-green)"
                              : "var(--accent-red)"
                            : "transparent",
                        color: orderType === t ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {t === "BUY" ? "↑ BUY" : "↓ SELL"}
                    </button>
                  ))}
                </div>

                {/* Market price */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Market Price
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="live-dot" />
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "JetBrains Mono",
                        color: "var(--text-primary)",
                      }}
                    >
                      {price > 0 ? `₹${price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Quantity
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{
                        padding: "0 16px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-card)",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        fontSize: 20,
                        fontWeight: 300,
                      }}
                    >
                      −
                    </button>
                    <input
                      className="input-base"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      style={{
                        textAlign: "center",
                        fontFamily: "JetBrains Mono",
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    />
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      style={{
                        padding: "0 16px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-card)",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: "var(--text-primary)",
                        fontSize: 20,
                        fontWeight: 300,
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {[1, 5, 10, 25, 50, 100, 500].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        style={{
                          padding: "3px 9px",
                          borderRadius: 6,
                          border: "1px solid var(--border-card)",
                          background:
                            quantity === q
                              ? "var(--accent-green-bg)"
                              : "transparent",
                          color:
                            quantity === q
                              ? "var(--accent-green)"
                              : "var(--text-muted)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        ×{q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── ADVANCED: Target & Stop Loss ── */}
                {orderType === "BUY" && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={() => setShowAdvanced((p) => !p)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border-card)",
                        background: showAdvanced
                          ? "var(--accent-green-bg)"
                          : "var(--bg-secondary)",
                        cursor: "pointer",
                        marginBottom: showAdvanced ? 12 : 0,
                        transition: "all 0.15s",
                      }}
                    >
                      <Target
                        size={13}
                        color={
                          showAdvanced
                            ? "var(--accent-green)"
                            : "var(--text-muted)"
                        }
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: showAdvanced
                            ? "var(--accent-green)"
                            : "var(--text-muted)",
                          flex: 1,
                          textAlign: "left",
                        }}
                      >
                        Target & Stop Loss
                      </span>
                      {showAdvanced ? (
                        <ChevronUp size={13} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={13} color="var(--text-muted)" />
                      )}
                    </button>

                    {showAdvanced && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          padding: "12px",
                          background: "var(--bg-secondary)",
                          borderRadius: 10,
                          border: "1px solid var(--border-card)",
                        }}
                      >
                        {/* Target Price */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 5,
                            }}
                          >
                            <label
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--accent-green)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Target size={11} /> Target Price
                              {pctToTarget && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                    textTransform: "none",
                                    letterSpacing: 0,
                                  }}
                                >
                                  ({parseFloat(pctToTarget) >= 0 ? "+" : ""}
                                  {pctToTarget}%)
                                </span>
                              )}
                            </label>
                          </div>
                          <input
                            className="input-base"
                            type="number"
                            step="0.01"
                            min="0"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            placeholder={
                              price > 0
                                ? `e.g. ₹${(price * 1.07).toFixed(2)}`
                                : "Enter target…"
                            }
                            style={{
                              fontFamily: "JetBrains Mono",
                              fontWeight: 700,
                              fontSize: 13,
                              marginBottom: 6,
                              borderColor: targetPrice
                                ? "var(--accent-green)"
                                : undefined,
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            {targetSuggestions.map((s) => (
                              <SuggestionChip
                                key={s.label}
                                label={s.label}
                                value={s.value}
                                color="green"
                                onClick={() =>
                                  setTargetPrice(s.value.toFixed(2))
                                }
                              />
                            ))}
                          </div>
                        </div>

                        {/* Stop Loss */}
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 5,
                            }}
                          >
                            <label
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--accent-red)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Shield size={11} /> Stop Loss
                              {pctToSL && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                    textTransform: "none",
                                    letterSpacing: 0,
                                  }}
                                >
                                  ({parseFloat(pctToSL).toFixed(2)}%)
                                </span>
                              )}
                            </label>
                          </div>
                          <input
                            className="input-base"
                            type="number"
                            step="0.01"
                            min="0"
                            value={stopLossPrice}
                            onChange={(e) => setStopLossPrice(e.target.value)}
                            placeholder={
                              price > 0
                                ? `e.g. ₹${(price * 0.955).toFixed(2)}`
                                : "Enter stop loss…"
                            }
                            style={{
                              fontFamily: "JetBrains Mono",
                              fontWeight: 700,
                              fontSize: 13,
                              marginBottom: 6,
                              borderColor: stopLossPrice
                                ? "var(--accent-red)"
                                : undefined,
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            {slSuggestions.map((s) => (
                              <SuggestionChip
                                key={s.label}
                                label={s.label}
                                value={s.value}
                                color="red"
                                onClick={() =>
                                  setStopLossPrice(s.value.toFixed(2))
                                }
                              />
                            ))}
                          </div>
                        </div>

                        {/* R:R Ratio */}
                        {rrRatio && parseFloat(rrRatio) > 0 && (
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              background:
                                parseFloat(rrRatio) >= 2
                                  ? "var(--accent-green-bg)"
                                  : "var(--accent-amber-bg)",
                              border: `1px solid ${parseFloat(rrRatio) >= 2 ? "var(--border-accent)" : "rgba(217,119,6,0.2)"}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                fontWeight: 600,
                              }}
                            >
                              Risk:Reward Ratio
                            </span>
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 900,
                                fontFamily: "JetBrains Mono",
                                color:
                                  parseFloat(rrRatio) >= 2
                                    ? "var(--accent-green)"
                                    : "var(--accent-amber)",
                              }}
                            >
                              {rrRatio}x {parseFloat(rrRatio) >= 2 ? "✓" : ""}
                            </span>
                          </div>
                        )}

                        {/* Notes */}
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Trade notes (optional)…"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-card)",
                            borderRadius: 8,
                            color: "var(--text-primary)",
                            padding: "8px 12px",
                            fontSize: 12,
                            resize: "none",
                            height: 56,
                            outline: "none",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Order summary */}
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 10,
                    padding: "14px",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Price × Qty
                    </span>
                    <span
                      style={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
                    >
                      ₹{price.toFixed(2)} × {quantity}
                    </span>
                  </div>
                  {targetPrice && parseFloat(targetPrice) > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--accent-green)",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Target size={9} /> Target
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "JetBrains Mono",
                          color: "var(--accent-green)",
                          fontWeight: 700,
                        }}
                      >
                        ₹{parseFloat(targetPrice).toFixed(2)} (+
                        {(
                          ((parseFloat(targetPrice) - price) / price) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    </div>
                  )}
                  {stopLossPrice && parseFloat(stopLossPrice) > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--accent-red)",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Shield size={9} /> Stop Loss
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "JetBrains Mono",
                          color: "var(--accent-red)",
                          fontWeight: 700,
                        }}
                      >
                        ₹{parseFloat(stopLossPrice).toFixed(2)} (
                        {(
                          ((parseFloat(stopLossPrice) - price) / price) *
                          100
                        ).toFixed(1)}
                        %)
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-card)",
                      paddingTop: 8,
                      marginTop: 6,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Total</span>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: "JetBrains Mono",
                        color:
                          orderType === "BUY"
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      ₹
                      {total.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Available balance
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "JetBrains Mono",
                        color: canAfford
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                        fontWeight: 700,
                      }}
                    >
                      ₹
                      {(user?.balance ?? 0).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>

                {/* Result */}
                {result && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: result.success
                        ? "var(--accent-green-bg)"
                        : "var(--accent-red-bg)",
                      border: `1px solid ${result.success ? "var(--border-accent)" : "var(--accent-red)"}`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    {result.success ? (
                      <CheckCircle
                        size={14}
                        color="var(--accent-green)"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                    ) : (
                      <AlertCircle
                        size={14}
                        color="var(--accent-red)"
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: result.success
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                        lineHeight: 1.4,
                      }}
                    >
                      {result.message}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleTrade}
                  disabled={
                    !quote ||
                    (orderType === "BUY" && !canAfford) ||
                    (orderType === "SELL" && !canSell)
                  }
                  style={{
                    width: "100%",
                    padding: "13px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 15,
                    background:
                      orderType === "BUY"
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                    color: "#fff",
                    opacity:
                      !quote ||
                      (orderType === "BUY" && !canAfford) ||
                      (orderType === "SELL" && !canSell)
                        ? 0.5
                        : 1,
                    transition: "all 0.2s",
                    boxShadow:
                      orderType === "BUY"
                        ? "0 4px 14px rgba(34,197,94,0.3)"
                        : "0 4px 14px rgba(239,68,68,0.3)",
                  }}
                >
                  {orderType === "BUY"
                    ? `Buy ${quantity} share${quantity > 1 ? "s" : ""} · ₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                    : `Sell ${quantity} share${quantity > 1 ? "s" : ""} · ₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                </button>
                <p
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    color: "var(--text-muted)",
                    marginTop: 8,
                  }}
                >
                  📌 Paper trading only · No real money involved
                </p>
              </div>
            )}

            {/* ── POSITION TAB ── */}
            {orderTab === "position" && (
              <div className="card" style={{ padding: 20 }}>
                {position ? (
                  <PositionDetail position={position} currentPrice={price} />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Target
                      size={32}
                      style={{ marginBottom: 12, opacity: 0.3 }}
                    />
                    <div
                      style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                    >
                      No position in {symbol.replace(".NS", "")}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Buy shares to open a position
                    </div>
                    <button
                      onClick={() => setOrderTab("order")}
                      className="btn-secondary"
                      style={{ marginTop: 16, padding: "8px 20px" }}
                    >
                      Place Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {orderTab === "history" && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--border-card)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {symbol.replace(".NS", "")} Trade History
                </div>
                {symbolHistory.length === 0 ? (
                  <div
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 13,
                    }}
                  >
                    No trades for this symbol yet.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th style={{ textAlign: "right" }}>Price</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                        <th style={{ textAlign: "right" }}>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolHistory.map((tx) => (
                        <tr key={tx.id}>
                          <td
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              fontFamily: "JetBrains Mono",
                            }}
                          >
                            {new Date(tx.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td>
                            <span
                              className="tag"
                              style={{
                                background:
                                  tx.type === "BUY"
                                    ? "var(--accent-green-bg)"
                                    : "var(--accent-red-bg)",
                                color:
                                  tx.type === "BUY"
                                    ? "var(--accent-green)"
                                    : "var(--accent-red)",
                              }}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "JetBrains Mono",
                              fontSize: 12,
                            }}
                          >
                            {tx.quantity}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "JetBrains Mono",
                              fontSize: 12,
                            }}
                          >
                            ₹{tx.price.toFixed(2)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "JetBrains Mono",
                              fontSize: 12,
                            }}
                          >
                            ₹
                            {tx.total.toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {tx.type === "SELL" &&
                            tx.realizedPnl !== undefined ? (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontFamily: "JetBrains Mono",
                                    fontWeight: 700,
                                    color:
                                      tx.realizedPnl >= 0
                                        ? "var(--accent-green)"
                                        : "var(--accent-red)",
                                  }}
                                >
                                  {tx.realizedPnl >= 0 ? "+" : ""}₹
                                  {Math.abs(tx.realizedPnl).toFixed(0)}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color:
                                      tx.realizedPnl >= 0
                                        ? "var(--accent-green)"
                                        : "var(--accent-red)",
                                  }}
                                >
                                  {tx.realizedPnlPct !== undefined
                                    ? `${tx.realizedPnlPct >= 0 ? "+" : ""}${tx.realizedPnlPct.toFixed(2)}%`
                                    : ""}
                                </div>
                              </div>
                            ) : (
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: 11,
                                }}
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </AppLayout>
  );
}

// ── Position Detail sub-component ─────────────────────────────────────────────
function PositionDetail({
  position: p,
  currentPrice,
}: {
  position: any;
  currentPrice: number;
}) {
  const targetHit = p.targetPrice && currentPrice >= p.targetPrice;
  const slHit = p.stopLossPrice && currentPrice <= p.stopLossPrice;
  const pctFromTarget = p.targetPrice
    ? (((p.targetPrice - currentPrice) / currentPrice) * 100).toFixed(2)
    : null;
  const pctFromSL = p.stopLossPrice
    ? (((currentPrice - p.stopLossPrice) / currentPrice) * 100).toFixed(2)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Alerts */}
      {targetHit && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--accent-green-bg)",
            border: "1px solid var(--border-accent)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Target size={14} color="var(--accent-green)" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent-green)",
            }}
          >
            🎯 Target reached! Consider taking profits.
          </span>
        </div>
      )}
      {slHit && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--accent-red-bg)",
            border: "1px solid var(--accent-red)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Shield size={14} color="var(--accent-red)" />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent-red)",
            }}
          >
            ⚠️ Stop loss triggered! Consider exiting.
          </span>
        </div>
      )}

      {/* P&L card */}
      <div
        style={{
          padding: "14px",
          borderRadius: 12,
          background:
            p.pnl >= 0 ? "var(--accent-green-bg)" : "var(--accent-red-bg)",
          border: `1px solid ${p.pnl >= 0 ? "var(--border-accent)" : "var(--accent-red)"}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Unrealized P&L
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            fontFamily: "JetBrains Mono",
            color: p.pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          {p.pnl >= 0 ? "+" : ""}₹
          {Math.abs(p.pnl).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}
        </div>
        <div
          style={{
            fontSize: 13,
            fontFamily: "JetBrains Mono",
            color: p.pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)",
            fontWeight: 700,
          }}
        >
          {p.pnl >= 0 ? "+" : ""}
          {p.pnlPercent.toFixed(2)}%
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Shares", value: p.quantity },
          { label: "Avg Buy", value: `₹${p.avgBuyPrice.toFixed(2)}` },
          {
            label: "Invested",
            value: `₹${p.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          },
          {
            label: "Current Value",
            value: `₹${p.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          },
        ].map(({ label, value }) => (
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
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 600,
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "JetBrains Mono",
                color: "var(--text-primary)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Target/SL meters */}
      {(p.targetPrice || p.stopLossPrice) && (
        <div
          style={{
            padding: "12px",
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-card)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Target / Stop Loss Tracker
          </div>

          {p.targetPrice && (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--accent-green)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Target size={10} /> Target: ₹{p.targetPrice.toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "JetBrains Mono",
                    color: "var(--accent-green)",
                  }}
                >
                  {pctFromTarget !== null
                    ? `${parseFloat(pctFromTarget) >= 0 ? "+" : ""}${pctFromTarget}% away`
                    : ""}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: "var(--border-primary)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--accent-green)",
                    width: `${Math.min(100, Math.max(0, ((currentPrice - p.avgBuyPrice) / (p.targetPrice - p.avgBuyPrice)) * 100))}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}

          {p.stopLossPrice && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--accent-red)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Shield size={10} /> Stop: ₹{p.stopLossPrice.toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "JetBrains Mono",
                    color: "var(--text-muted)",
                  }}
                >
                  {pctFromSL !== null
                    ? `${parseFloat(pctFromSL) >= 0 ? "+" : ""}${pctFromSL}% buffer`
                    : ""}
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  background: "var(--border-primary)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: "var(--accent-red)",
                    width: `${Math.min(100, Math.max(0, ((currentPrice - p.stopLossPrice) / (p.avgBuyPrice - p.stopLossPrice)) * 100))}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarChart2Icon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
