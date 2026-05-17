"use client";
import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

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
  const [symbol, setSymbol] = useState("RELIANCE.NS");
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

  // ✅ CORRECT — only registers once, never wipes existing data
useEffect(() => {
  setMounted(true);
}, []);

// Separate effect, only runs if truly not authenticated
useEffect(() => {
  if (mounted && !isAuthenticated) {
    register("Demo User", "demo@tradofly.com", 1000000);
  }
}, [mounted, isAuthenticated]);

  const fetchQuote = useCallback(
    async (sym: string, silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/stock?symbol=${sym}&type=quote`);
        const data: StockQuote = await res.json();
        if (data.price) {
          setQuote(data);
          updatePositionPrices([{ symbol: sym, price: data.price }]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [updatePositionPrices],
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
    fetchQuote(symbol);
    fetchHistory(symbol);
    // Auto-refresh every 60s
    const interval = setInterval(() => fetchQuote(symbol, true), 60000);
    return () => clearInterval(interval);
  }, [symbol, mounted]);

  // Also refresh all position prices every 2 min
  useEffect(() => {
    if (!mounted || positions.length === 0) return;
    const interval = setInterval(async () => {
      const updates = await Promise.allSettled(
        positions.map(async (p) => {
          const res = await fetch(`/api/stock?symbol=${p.symbol}&type=quote`);
          const d: StockQuote = await res.json();
          return { symbol: p.symbol, price: d.price };
        }),
      );
      const valid = updates
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as any).value);
      if (valid.length > 0) updatePositionPrices(valid);
    }, 120000);
    return () => clearInterval(interval);
  }, [mounted, positions.length]);

  function handleTrade() {
    if (!quote) return;
    setResult(null);
    const res =
      orderType === "BUY"
        ? buyStock(symbol, quote.name, quantity, quote.price)
        : sellStock(symbol, quantity, quote.price);
    setResult(res);
    if (res.success) setTimeout(() => setResult(null), 3000);
  }

  const position = positions.find((p) => p.symbol === symbol);
  const total = (quote?.price ?? 0) * quantity;
  const canAfford = (user?.balance ?? 0) >= total;
  const canSell = (position?.quantity ?? 0) >= quantity;

  if (!mounted) return null;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "Syne, sans-serif",
            }}
          >
            Paper Trading Terminal
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Balance:{" "}
            <strong
              style={{
                color: "var(--accent-green)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              ₹
              {(user?.balance ?? 0).toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}
            </strong>
          </div>
        </div>

        <StockSearch
          onSelect={(sym) => setSymbol(sym)}
          defaultSymbol={symbol}
          placeholder="Search any stock..."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Chart */}
          <div className="card" style={{ padding: 20 }}>
            {quote && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {symbol} · {quote.exchange}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: "JetBrains Mono, monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      ₹{quote.price.toFixed(2)}
                    </div>
                    <span
                      className={
                        quote.changePercent >= 0 ? "price-up" : "price-down"
                      }
                    >
                      {quote.changePercent >= 0 ? (
                        <TrendingUp size={11} style={{ display: "inline" }} />
                      ) : (
                        <TrendingDown size={11} style={{ display: "inline" }} />
                      )}{" "}
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
            {loading ? (
              <div
                style={{
                  height: 350,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                Loading chart...
              </div>
            ) : history.length > 0 ? (
              <StockChart data={history} symbol={symbol} height={350} />
            ) : (
              <div
                style={{
                  height: 350,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                No chart data available
              </div>
            )}
          </div>

          {/* Order Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Order Form */}
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: 16,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Place Order
              </div>

              {/* BUY/SELL toggle */}
              <div
                style={{
                  display: "flex",
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: 4,
                  marginBottom: 16,
                }}
              >
                {(["BUY", "SELL"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 13,
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

              {/* Price display */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Market Price
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      fontFamily: "JetBrains Mono, monospace",
                      color: "var(--text-primary)",
                    }}
                  >
                    {quote ? `₹${quote.price.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: 6,
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
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 700,
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
                    }}
                  >
                    +
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {[1, 5, 10, 25, 50, 100].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      style={{
                        padding: "4px 10px",
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
                      }}
                    >
                      ×{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  padding: "14px",
                  marginBottom: 16,
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
                    style={{
                      fontSize: 12,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    ₹{(quote?.price ?? 0).toFixed(2)} × {quantity}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-card)",
                    paddingTop: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: "JetBrains Mono, monospace",
                      color:
                        orderType === "BUY"
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                    }}
                  >
                    ₹
                    {total.toLocaleString("en-IN", {
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
                    Available
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "JetBrains Mono, monospace",
                      color: canAfford
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                    }}
                  >
                    ₹
                    {(user?.balance ?? 0).toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>

              {result && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: result.success
                      ? "var(--accent-green-bg)"
                      : "var(--accent-red-bg)",
                    border: `1px solid ${result.success ? "var(--accent-green)" : "var(--accent-red)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {result.success ? (
                    <CheckCircle size={14} color="var(--accent-green)" />
                  ) : (
                    <AlertCircle size={14} color="var(--accent-red)" />
                  )}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: result.success
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
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
                  fontSize: 14,
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
                }}
              >
                {orderType === "BUY"
                  ? `Buy ${quantity} share${quantity > 1 ? "s" : ""}`
                  : `Sell ${quantity} share${quantity > 1 ? "s" : ""}`}
              </button>
              <p
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  marginTop: 8,
                }}
              >
                📌 Paper trading only · No real money
              </p>
            </div>

            {/* Current Position */}
            {position && (
              <div className="card" style={{ padding: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Your Position
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    { label: "Shares", value: position.quantity },
                    {
                      label: "Avg Price",
                      value: `₹${position.avgBuyPrice.toFixed(2)}`,
                    },
                    {
                      label: "Invested",
                      value: `₹${position.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                    },
                    {
                      label: "Current Value",
                      value: `₹${position.currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        background: "var(--bg-secondary)",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginBottom: 3,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    background:
                      position.pnl >= 0
                        ? "var(--accent-green-bg)"
                        : "var(--accent-red-bg)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Unrealized P&L
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      fontFamily: "JetBrains Mono, monospace",
                      color:
                        position.pnl >= 0
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                    }}
                  >
                    {position.pnl >= 0 ? "+" : ""}₹{position.pnl.toFixed(2)} (
                    {position.pnlPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
