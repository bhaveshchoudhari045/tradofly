"use client";
import { useCallback, useRef } from "react";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppStore } from "@/store/appStore";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart2,
  Clock,
  Plus,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  color,
}: any) {
  const [d, setD] = useState(value);
  const fromRef = useRef(value); // ← track previous value without triggering re-render

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    fromRef.current = to; // ← update ref immediately

    if (Math.abs(to - from) < 0.01) {
      setD(to);
      return;
    }
    const start = performance.now();
    let rafId: number;
    rafId = requestAnimationFrame(function tick(now: number) {
      const t = Math.min((now - start) / 600, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setD(from + (to - from) * e);
      if (t < 1) rafId = requestAnimationFrame(tick);
      else setD(to);
    });
    return () => cancelAnimationFrame(rafId);
  }, [value]); // ← only re-runs when `value` prop changes

  const formatted = d.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span style={{ color }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon: Icon, trend }: any) {
  return (
    <div
      className="card"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--accent-green-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={15} color={color || "var(--accent-green)"} />
        </div>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: color || "var(--text-primary)",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const {
    user,
    positions,
    transactions,
    getPortfolioValue,
    getTotalPnL,
    getTotalRealizedPnL,
    addFunds,
    isAuthenticated,
    register,
    updatePositionPrices,
  } = useAppStore();
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("100000");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated)
      register("Demo User", "demo@tradofly.com", 1_000_000);
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    if (!mounted || positions.length === 0) return;
    async function refreshPrices() {
      const updates = await Promise.allSettled(
        positions.map(async (p) => {
          const res = await fetch(`/api/stock?symbol=${p.symbol}&type=quote`);
          const data = await res.json();
          return { symbol: p.symbol, price: data?.price || 0 };
        }),
      );
      const valid = updates
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as any).value)
        .filter((v) => v.price > 0);
      if (valid.length > 0) updatePositionPrices(valid);
    }
    refreshPrices();
    const iv = setInterval(refreshPrices, 30_000);
    return () => clearInterval(iv);
  }, [mounted, positions.length]);

  if (!mounted) return null;

  const portfolioValue = getPortfolioValue();
  const { pnl, pnlPercent } = getTotalPnL();
  const realizedPnl = getTotalRealizedPnL();
  const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
  const isUp = pnl >= 0;
  const isRealizedUp = realizedPnl >= 0;

  // Portfolio history
  const portfolioHistory = (() => {
    let balance = user?.initialBalance ?? 1_000_000;
    const points: { date: string; value: number; pnl: number }[] = [
      { date: "Start", value: balance, pnl: 0 },
    ];
    let cumPnl = 0;
    [...transactions].reverse().forEach((tx) => {
      if (tx.type === "DEPOSIT") balance += tx.total;
      else if (tx.type === "BUY") balance -= tx.total;
      else if (tx.type === "SELL") {
        balance += tx.total;
        cumPnl += tx.realizedPnl ?? 0;
      }
      points.push({
        date: new Date(tx.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        value: Math.max(0, balance),
        pnl: cumPnl,
      });
    });
    return points.slice(-20);
  })();

  const pieData =
    positions.length > 0
      ? positions.map((p) => ({
          name: p.symbol.replace(".NS", "").replace(".BO", ""),
          value: p.currentValue,
        }))
      : [{ name: "Cash", value: user?.balance ?? 0 }];

  const COLORS = [
    "#4ADE80",
    "#3B82F6",
    "#F59E0B",
    "#EC4899",
    "#8B5CF6",
    "#06B6D4",
    "#F97316",
  ];

  // Trade stats
  const sellTxs = transactions.filter(
    (t) => t.type === "SELL" && t.realizedPnl !== undefined,
  );
  const winners = sellTxs.filter((t) => (t.realizedPnl ?? 0) > 0).length;
  const winRate =
    sellTxs.length > 0 ? ((winners / sellTxs.length) * 100).toFixed(0) : "—";
  const avgWin =
    winners > 0
      ? sellTxs
          .filter((t) => (t.realizedPnl ?? 0) > 0)
          .reduce((s, t) => s + (t.realizedPnlPct ?? 0), 0) / winners
      : 0;
  const avgLoss =
    sellTxs.length - winners > 0
      ? sellTxs
          .filter((t) => (t.realizedPnl ?? 0) <= 0)
          .reduce((s, t) => s + (t.realizedPnlPct ?? 0), 0) /
        (sellTxs.length - winners)
      : 0;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
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
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}
            >
              Portfolio updated ·{" "}
              <span
                className="live-dot"
                style={{
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginRight: 4,
                }}
              />
              Live prices every 30s
            </p>
          </div>
          <button
            onClick={() => setAddingFunds(true)}
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
            }}
          >
            <Plus size={15} /> Add Funds
          </button>
        </div>

        {/* Add Funds Modal */}
        {addingFunds && (
          <div className="modal-overlay" onClick={() => setAddingFunds(false)}>
            <div
              className="modal-box fade-in"
              style={{ maxWidth: 380 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 16,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                Add Paper Money
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                {[50000, 100000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setFundAmount(String(amt))}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--border-card)",
                      background:
                        fundAmount === String(amt)
                          ? "var(--accent-green-bg)"
                          : "transparent",
                      color:
                        fundAmount === String(amt)
                          ? "var(--accent-green)"
                          : "var(--text-muted)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ₹{(amt / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
              <input
                className="input-base"
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                style={{
                  marginBottom: 16,
                  fontFamily: "JetBrains Mono, monospace",
                }}
                placeholder="Enter amount"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    addFunds(Number(fundAmount));
                    setAddingFunds(false);
                  }}
                >
                  Add ₹{Number(fundAmount).toLocaleString("en-IN")}
                </button>
                <button
                  onClick={() => setAddingFunds(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "1px solid var(--border-card)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <StatCard
            label="Portfolio Value"
            value={`₹${portfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub={`Cash: ₹${(user?.balance ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            icon={Wallet}
            color="var(--accent-green)"
          />
          <StatCard
            label="Unrealized P&L"
            value={
              <AnimNumber
                value={pnl}
                prefix={pnl >= 0 ? "+₹" : "-₹"}
                decimals={0}
                color={pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
              />
            }
            sub={`${pnlPercent >= 0 ? "▲" : "▼"} ${Math.abs(pnlPercent).toFixed(2)}% on holdings`}
            icon={pnl >= 0 ? TrendingUp : TrendingDown}
            color={pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)"}
          />
          <StatCard
            label="Realized P&L"
            value={
              <AnimNumber
                value={realizedPnl}
                prefix={realizedPnl >= 0 ? "+₹" : "-₹"}
                decimals={0}
                color={
                  realizedPnl >= 0 ? "var(--accent-green)" : "var(--accent-red)"
                }
              />
            }
            sub={`${sellTxs.length} trades · ${winRate}% win rate`}
            icon={realizedPnl >= 0 ? ArrowUpRight : ArrowDownRight}
            color={
              realizedPnl >= 0 ? "var(--accent-green)" : "var(--accent-red)"
            }
          />
          <StatCard
            label="Invested"
            value={`₹${totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub={`${positions.length} positions open`}
            icon={BarChart2}
            color="var(--accent-blue)"
          />
        </div>

        {/* Trade stats row */}
        {sellTxs.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            {[
              {
                label: "Win Rate",
                value: `${winRate}%`,
                sub: `${winners}W / ${sellTxs.length - winners}L`,
                color: "var(--accent-green)",
              },
              {
                label: "Avg Win",
                value: `+${avgWin.toFixed(1)}%`,
                sub: "per winning trade",
                color: "var(--accent-green)",
              },
              {
                label: "Avg Loss",
                value: `${avgLoss.toFixed(1)}%`,
                sub: "per losing trade",
                color: "var(--accent-red)",
              },
              {
                label: "Total Trades",
                value: transactions.filter(
                  (t) => t.type === "BUY" || t.type === "SELL",
                ).length,
                sub: `${transactions.filter((t) => t.type === "BUY").length} buys · ${transactions.filter((t) => t.type === "SELL").length} sells`,
                color: "var(--accent-amber)",
              },
            ].map(({ label, value, sub, color }) => (
              <div
                key={label}
                className="card"
                style={{ padding: "14px 18px" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    fontFamily: "JetBrains Mono",
                    color,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}
        >
          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Portfolio History
            </div>
            {portfolioHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={portfolioHistory}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--accent-green)"
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent-green)"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      `₹${Number(v).toLocaleString("en-IN")}`,
                      "Value",
                    ]}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-card)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent-green)"
                    strokeWidth={2}
                    fill="url(#portGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Make your first trade to see portfolio history
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Allocation
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => [
                    `₹${Number(v).toLocaleString("en-IN")}`,
                    "",
                  ]}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-card)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                marginTop: 6,
              }}
            >
              {pieData.slice(0, 5).map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {d.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily: "JetBrains Mono",
                    }}
                  >
                    {portfolioValue > 0
                      ? ((d.value / portfolioValue) * 100).toFixed(1)
                      : "0"}
                    %
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Positions Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-card)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Open Positions
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {positions.length} holdings
            </span>
          </div>
          {positions.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No open positions. Go to <strong>Paper Trade</strong> to start
              buying stocks.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Avg</th>
                  <th style={{ textAlign: "right" }}>LTP</th>
                  <th style={{ textAlign: "right" }}>Target</th>
                  <th style={{ textAlign: "right" }}>Stop</th>
                  <th style={{ textAlign: "right" }}>Invested</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const targetHit =
                    p.targetPrice && p.currentPrice >= p.targetPrice;
                  const slHit =
                    p.stopLossPrice && p.currentPrice <= p.stopLossPrice;
                  return (
                    <tr key={p.symbol}>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            fontFamily: "JetBrains Mono",
                            fontSize: 13,
                          }}
                        >
                          {p.symbol.replace(".NS", "").replace(".BO", "")}
                        </div>
                        <div
                          style={{ fontSize: 10, color: "var(--text-muted)" }}
                        >
                          {p.name}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "JetBrains Mono",
                          fontSize: 13,
                        }}
                      >
                        {p.quantity}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "JetBrains Mono",
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        ₹{p.avgBuyPrice.toFixed(2)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "JetBrains Mono",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        ₹{p.currentPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {p.targetPrice ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: "JetBrains Mono",
                              color: targetHit ? "#fff" : "var(--accent-green)",
                              background: targetHit
                                ? "var(--accent-green)"
                                : "var(--accent-green-bg)",
                              padding: "2px 6px",
                              borderRadius: 5,
                              fontWeight: 700,
                            }}
                          >
                            {targetHit ? "🎯" : "▲"} ₹{p.targetPrice.toFixed(0)}
                          </span>
                        ) : (
                          <span
                            style={{ color: "var(--text-muted)", fontSize: 11 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {p.stopLossPrice ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: "JetBrains Mono",
                              color: slHit ? "#fff" : "var(--accent-red)",
                              background: slHit
                                ? "var(--accent-red)"
                                : "var(--accent-red-bg)",
                              padding: "2px 6px",
                              borderRadius: 5,
                              fontWeight: 700,
                            }}
                          >
                            {slHit ? "⚠️" : "▼"} ₹{p.stopLossPrice.toFixed(0)}
                          </span>
                        ) : (
                          <span
                            style={{ color: "var(--text-muted)", fontSize: 11 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "JetBrains Mono",
                          fontSize: 12,
                        }}
                      >
                        ₹
                        {p.totalInvested.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "JetBrains Mono",
                          fontSize: 12,
                        }}
                      >
                        ₹
                        {p.currentValue.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontFamily: "JetBrains Mono",
                            fontWeight: 700,
                            color:
                              p.pnl >= 0
                                ? "var(--accent-green)"
                                : "var(--accent-red)",
                          }}
                        >
                          {p.pnl >= 0 ? "+" : ""}₹
                          {Math.abs(p.pnl).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color:
                              p.pnl >= 0
                                ? "var(--accent-green)"
                                : "var(--accent-red)",
                          }}
                        >
                          {p.pnl >= 0 ? "+" : ""}
                          {p.pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Transactions Table — WITH P&L COLUMN */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-card)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Transaction History
            </span>
            {realizedPnl !== 0 && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: "JetBrains Mono",
                  color:
                    realizedPnl >= 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
                }}
              >
                Total Realized: {realizedPnl >= 0 ? "+" : ""}₹
                {Math.abs(realizedPnl).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
              </span>
            )}
          </div>
          {transactions.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              No transactions yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Buy Avg</th>
                  <th style={{ textAlign: "right" }}>Sell Price</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Realized P&L</th>
                  <th style={{ textAlign: "right" }}>Held</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 30).map((tx) => (
                  <tr key={tx.id}>
                    <td
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "JetBrains Mono",
                      }}
                    >
                      {new Date(tx.date).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          background:
                            tx.type === "BUY"
                              ? "var(--accent-green-bg)"
                              : tx.type === "SELL"
                                ? "var(--accent-red-bg)"
                                : "var(--accent-blue-bg)",
                          color:
                            tx.type === "BUY"
                              ? "var(--accent-green)"
                              : tx.type === "SELL"
                                ? "var(--accent-red)"
                                : "var(--accent-blue)",
                        }}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                      }}
                    >
                      {tx.symbol === "CASH"
                        ? "—"
                        : tx.symbol.replace(".NS", "").replace(".BO", "")}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                      }}
                    >
                      {tx.quantity || "—"}
                    </td>
                    {/* Buy avg — shown on SELL rows only */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {tx.type === "SELL" && tx.avgBuyPrice
                        ? `₹${tx.avgBuyPrice.toFixed(2)}`
                        : tx.type === "BUY"
                          ? `₹${tx.price.toFixed(2)}`
                          : "—"}
                    </td>
                    {/* Sell price — shown on SELL rows only */}
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                      }}
                    >
                      {tx.type === "SELL" ? `₹${tx.price.toFixed(2)}` : "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "JetBrains Mono",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      ₹
                      {tx.total.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    {/* ★ REALIZED P&L COLUMN ★ */}
                    <td style={{ textAlign: "right" }}>
                      {tx.type === "SELL" && tx.realizedPnl !== undefined ? (
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontFamily: "JetBrains Mono",
                              fontWeight: 800,
                              color:
                                tx.realizedPnl >= 0
                                  ? "var(--accent-green)"
                                  : "var(--accent-red)",
                            }}
                          >
                            {tx.realizedPnl >= 0 ? "+" : ""}₹
                            {Math.abs(tx.realizedPnl).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </div>
                          {tx.realizedPnlPct !== undefined && (
                            <div
                              style={{
                                fontSize: 10,
                                color:
                                  tx.realizedPnl >= 0
                                    ? "var(--accent-green)"
                                    : "var(--accent-red)",
                                fontWeight: 700,
                                fontFamily: "JetBrains Mono",
                              }}
                            >
                              {tx.realizedPnl >= 0 ? "+" : ""}
                              {tx.realizedPnlPct.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 11 }}
                        >
                          {tx.type === "BUY" ? (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                fontStyle: "italic",
                              }}
                            >
                              Open
                            </span>
                          ) : (
                            "—"
                          )}
                        </span>
                      )}
                    </td>
                    {/* Days held */}
                    <td
                      style={{
                        textAlign: "right",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "JetBrains Mono",
                      }}
                    >
                      {tx.type === "SELL" && tx.holdingDays !== undefined
                        ? `${tx.holdingDays}d`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
