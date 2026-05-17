"use client";
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
} from "recharts";

function StatCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div
      className="card"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}
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
            fontSize: 12,
            color: "var(--text-muted)",
            fontWeight: 600,
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
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
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
    addFunds,
    isAuthenticated,
    register,
  } = useAppStore();
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState("100000");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) register("Demo User", "demo@tradofly.com", 1000000);
  }, []);

  if (!mounted) return null;

  const portfolioValue = getPortfolioValue();
  const { pnl, pnlPercent } = getTotalPnL();
  const totalInvested = positions.reduce((s, p) => s + p.totalInvested, 0);
  const isUp = pnl >= 0;

  // Build portfolio history from transactions
  const portfolioHistory = (() => {
    let balance = user?.initialBalance ?? 1000000;
    const points: { date: string; value: number }[] = [
      { date: "Start", value: balance },
    ];
    [...transactions].reverse().forEach((tx) => {
      if (tx.type === "DEPOSIT") balance += tx.total;
      else if (tx.type === "BUY") balance -= tx.total;
      else if (tx.type === "SELL") balance += tx.total;
      points.push({
        date: new Date(tx.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        value: Math.max(0, balance),
      });
    });
    return points.slice(-20);
  })();

  // Pie chart data
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
              }}
            >
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
            <p
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}
            >
              Here's your portfolio summary
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
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 16,
                }}
              >
                Add virtual funds to your paper trading account.
              </p>
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
            gap: 16,
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
            label="Total P&L"
            value={`${isUp ? "+" : ""}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub={`${isUp ? "▲" : "▼"} ${Math.abs(pnlPercent).toFixed(2)}% overall`}
            icon={isUp ? TrendingUp : TrendingDown}
            color={isUp ? "var(--accent-green)" : "var(--accent-red)"}
          />
          <StatCard
            label="Invested"
            value={`₹${totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub={`${positions.length} positions`}
            icon={BarChart2}
            color="var(--accent-blue)"
          />
          <StatCard
            label="Transactions"
            value={
              transactions.filter((t) => t.type === "BUY" || t.type === "SELL")
                .length
            }
            sub={`${transactions.filter((t) => t.type === "BUY").length} buys · ${transactions.filter((t) => t.type === "SELL").length} sells`}
            icon={Clock}
            color="var(--accent-amber)"
          />
        </div>

        {/* Charts Row */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}
        >
          {/* Portfolio Value Chart */}
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
              Portfolio History
            </div>
            {portfolioHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={portfolioHistory}>
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
                    width={60}
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
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent-green)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
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

          {/* Allocation Pie */}
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
              Allocation
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
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
                gap: 6,
                marginTop: 8,
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
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {((d.value / portfolioValue) * 100).toFixed(1)}%
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
                fontSize: 13,
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
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>Current</th>
                  <th>Invested</th>
                  <th>Value</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol}>
                    <td
                      style={{
                        fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {p.symbol.replace(".NS", "").replace(".BO", "")}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {p.quantity}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹{p.avgBuyPrice.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹{p.currentPrice.toFixed(2)}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹
                      {p.totalInvested.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      ₹
                      {p.currentValue.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td
                      className={p.pnl >= 0 ? "price-up" : "price-down"}
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {p.pnl >= 0 ? "+" : ""}₹
                      {Math.abs(p.pnl).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td
                      className={p.pnl >= 0 ? "price-up" : "price-down"}
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      {p.pnl >= 0 ? "+" : ""}
                      {p.pnlPercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-card)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Recent Transactions
            </span>
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
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id}>
                    <td
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        fontFamily: "JetBrains Mono, monospace",
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
                        fontWeight: 600,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {tx.symbol}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {tx.quantity || "—"}
                    </td>
                    <td style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      {tx.price > 0 ? `₹${tx.price.toFixed(2)}` : "—"}
                    </td>
                    <td
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 600,
                      }}
                    >
                      ₹
                      {tx.total.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td>
                      <span
                        className="tag"
                        style={{
                          background: "var(--accent-green-bg)",
                          color: "var(--accent-green)",
                        }}
                      >
                        {tx.status}
                      </span>
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
