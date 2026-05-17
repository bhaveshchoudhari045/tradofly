"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppStore } from "@/store/appStore";
import StockSearch from "@/components/StockSearch";
import { TrendingUp, TrendingDown, Trash2, RefreshCw } from "lucide-react";
import type { StockQuote } from "@/types";
import { useRouter } from "next/navigation";

export default function WatchlistPage() {
  const {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isAuthenticated,
    register,
  } = useAppStore();
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) register("Demo User", "demo@tradofly.com", 1000000);
  }, []);

  async function fetchAll() {
    if (watchlist.length === 0) return;
    setLoading(true);
    const results = await Promise.allSettled(
      watchlist.map(async (w) => {
        const res = await fetch(`/api/stock?symbol=${w.symbol}&type=quote`);
        const data: StockQuote = await res.json();
        return { symbol: w.symbol, data };
      }),
    );
    const map: Record<string, StockQuote> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") map[r.value.symbol] = r.value.data;
    });
    setQuotes(map);
    setLoading(false);
  }

  useEffect(() => {
    if (mounted) fetchAll();
  }, [mounted, watchlist.length]);

  // Default watchlist symbols
  const DEFAULT = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS"];

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
            Watchlist
          </h1>
          <button
            onClick={fetchAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-card)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />{" "}
            Refresh
          </button>
        </div>

        <StockSearch
          onSelect={(sym, name) => addToWatchlist(sym)}
          placeholder="Add stock to watchlist..."
        />

        {/* Quick add defaults */}
        {watchlist.length === 0 && (
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Quick add popular stocks:
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DEFAULT.map((sym) => (
                <button
                  key={sym}
                  onClick={() => addToWatchlist(sym)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--border-card)",
                    background: "var(--accent-green-bg)",
                    color: "var(--accent-green)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + {sym.replace(".NS", "")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Watchlist Table */}
        {watchlist.length > 0 && (
          <div className="card" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Change %</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Volume</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((w) => {
                  const q = quotes[w.symbol];
                  const isUp = (q?.changePercent ?? 0) >= 0;
                  return (
                    <tr key={w.symbol}>
                      <td
                        style={{
                          fontWeight: 700,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {w.symbol.replace(".NS", "").replace(".BO", "")}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {q?.name || "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                        }}
                      >
                        {q ? `₹${q.price.toFixed(2)}` : loading ? "..." : "—"}
                      </td>
                      <td
                        className={isUp ? "price-up" : "price-down"}
                        style={{ fontFamily: "JetBrains Mono, monospace" }}
                      >
                        {q ? `${isUp ? "+" : ""}₹${q.change.toFixed(2)}` : "—"}
                      </td>
                      <td>
                        {q ? (
                          <span
                            className={isUp ? "price-up" : "price-down"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {isUp ? (
                              <TrendingUp size={11} />
                            ) : (
                              <TrendingDown size={11} />
                            )}
                            {isUp ? "+" : ""}
                            {q.changePercent.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--accent-green)",
                        }}
                      >
                        {q ? `₹${q.high.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--accent-red)",
                        }}
                      >
                        {q ? `₹${q.low.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11,
                        }}
                      >
                        {q ? `${(q.volume / 1e6).toFixed(2)}M` : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() =>
                              router.push(`/trading?symbol=${w.symbol}`)
                            }
                            className="btn-primary"
                            style={{ padding: "5px 10px", fontSize: 11 }}
                          >
                            Trade
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(w.symbol)}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "1px solid var(--accent-red-bg)",
                              background: "var(--accent-red-bg)",
                              color: "var(--accent-red)",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
