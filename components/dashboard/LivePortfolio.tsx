"use client";
// components/dashboard/LivePortfolio.tsx
// Real-time portfolio P&L with animated counters and live price sync.

import { useEffect, useRef, useState, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { usePortfolioPriceSync } from "@/hooks/useRealTimeQuotes";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Activity,
  Percent,
} from "lucide-react";

function AnimatedNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(value);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const from = startRef.current;
    const to = value;
    if (Math.abs(to - from) < 0.001) {
      setDisplayed(to);
      return;
    }

    const duration = 600;
    startTimeRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayed(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else {
        setDisplayed(to);
        startRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const formatted = displayed.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}

export default function LivePortfolio() {
  const { user, positions, isAuthenticated, getTotalPnL, getPortfolioValue } =
    useAppStore();
  const { loading: syncLoading, lastFetchedAt } = usePortfolioPriceSync(30_000);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const portfolioValue = getPortfolioValue();
  const { pnl, pnlPercent } = getTotalPnL();
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0);
  const cashBalance = user?.balance ?? 0;
  const holdingsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  // Flash effect when portfolio value changes
  useEffect(() => {
    if (prevValue !== null && prevValue !== portfolioValue) {
      setFlash(portfolioValue > prevValue ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(t);
    }
    setPrevValue(portfolioValue);
  }, [portfolioValue]);

  if (!isAuthenticated || !user) return null;

  const initialBalance = user.initialBalance ?? 0;
  const overallReturn =
    initialBalance > 0
      ? ((portfolioValue - initialBalance) / initialBalance) * 100
      : 0;
  const isPositive = overallReturn >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Total Portfolio Card ── */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          background: `linear-gradient(135deg, var(--bg-card) 0%, ${isPositive ? "rgba(26,107,60,0.04)" : "rgba(197,48,48,0.04)"} 100%)`,
          transition: "box-shadow 0.3s",
          boxShadow:
            flash === "up"
              ? "0 0 20px rgba(34,197,94,0.2)"
              : flash === "down"
                ? "0 0 20px rgba(239,68,68,0.2)"
                : "var(--shadow-card)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              Total Portfolio Value
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                fontFamily: "JetBrains Mono, monospace",
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              <AnimatedNumber value={portfolioValue} prefix="₹" decimals={0} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {syncLoading && (
              <RefreshCw
                size={12}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--text-muted)",
                }}
              />
            )}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  padding: "4px 12px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: isPositive
                    ? "var(--accent-green-bg)"
                    : "var(--accent-red-bg)",
                  color: isPositive
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
                  fontSize: 14,
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono",
                }}
              >
                {isPositive ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {isPositive ? "+" : ""}
                <AnimatedNumber value={overallReturn} decimals={2} suffix="%" />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  marginTop: 3,
                }}
              >
                vs initial capital
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar showing portfolio vs initial */}
        <div
          style={{
            height: 4,
            background: "var(--border-primary)",
            borderRadius: 2,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, (portfolioValue / (initialBalance * 2)) * 100))}%`,
              background: isPositive
                ? "var(--accent-green)"
                : "var(--accent-red)",
              borderRadius: 2,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* 3-col stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {[
            {
              label: "Invested",
              value: totalInvested,
              icon: DollarSign,
              prefix: "₹",
              decimals: 0,
            },
            {
              label: "Unrealised P&L",
              value: pnl,
              icon: Activity,
              prefix: "₹",
              decimals: 2,
              colored: true,
            },
            {
              label: "Cash Available",
              value: cashBalance,
              icon: Percent,
              prefix: "₹",
              decimals: 0,
            },
          ].map(({ label, value, icon: Icon, prefix, decimals, colored }) => (
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
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono",
                  color: colored
                    ? value >= 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)"
                    : "var(--text-primary)",
                }}
              >
                {colored && value >= 0 ? "+" : ""}
                <AnimatedNumber
                  value={value}
                  prefix={prefix}
                  decimals={decimals}
                />
              </div>
            </div>
          ))}
        </div>

        {lastFetchedAt && (
          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            Prices updated{" "}
            {lastFetchedAt.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* ── Positions table ── */}
      {positions.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Holdings ({positions.length})
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: isPositive ? "var(--accent-green)" : "var(--accent-red)",
                fontWeight: 700,
              }}
            >
              {isPositive ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              P&L: {pnl >= 0 ? "+" : ""}₹
              {Math.abs(pnl).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}{" "}
              ({pnlPercent >= 0 ? "+" : ""}
              {pnlPercent.toFixed(2)}%)
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th style={{ textAlign: "right" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Avg</th>
                <th style={{ textAlign: "right" }}>LTP</th>
                <th style={{ textAlign: "right" }}>P&L</th>
                <th style={{ textAlign: "right" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.symbol}>
                  <td>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: "JetBrains Mono",
                      }}
                    >
                      {pos.symbol.replace(".NS", "").replace(".BO", "")}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 120,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pos.name}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "JetBrains Mono",
                      fontSize: 13,
                    }}
                  >
                    {pos.quantity}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    ₹{pos.avgBuyPrice.toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "JetBrains Mono",
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        pos.currentPrice >= pos.avgBuyPrice
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                    }}
                  >
                    <AnimatedNumber
                      value={pos.currentPrice}
                      prefix="₹"
                      decimals={2}
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontFamily: "JetBrains Mono",
                        fontWeight: 700,
                        color:
                          pos.pnl >= 0
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      {pos.pnl >= 0 ? "+" : ""}
                      <AnimatedNumber value={pos.pnl} prefix="₹" decimals={2} />
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          pos.pnlPercent >= 0
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      {pos.pnlPercent >= 0 ? "+" : ""}
                      <AnimatedNumber
                        value={pos.pnlPercent}
                        decimals={2}
                        suffix="%"
                      />
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "JetBrains Mono",
                      fontSize: 12,
                    }}
                  >
                    <AnimatedNumber
                      value={pos.currentValue}
                      prefix="₹"
                      decimals={0}
                    />
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
    </div>
  );
}
