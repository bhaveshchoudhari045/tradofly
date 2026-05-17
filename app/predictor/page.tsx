"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppStore } from "@/store/appStore";
import StockSearch from "@/components/StockSearch";
import {
  enrichWithIndicators,
  generateSignals,
  detectPatterns,
  forecastPrice,
} from "@/lib/technicals";
import TechnicalSignals from "@/components/Technicalsignals";
import type {
  HistoricalData,
  TechnicalSignal,
  PatternDetection,
} from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";

export default function PredictorPage() {
  const { isAuthenticated, register } = useAppStore();
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [forecast, setForecast] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) register("Demo User", "demo@tradofly.com", 1000000);
  }, []);

  async function loadData(sym: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stock?symbol=${sym}&type=history&period1=2022-01-01&interval=1d`,
      );
      const raw = await res.json();
      if (Array.isArray(raw) && raw.length > 0) {
        const enriched = enrichWithIndicators(raw);
        const sigs = generateSignals(enriched);
        const pats = detectPatterns(enriched);
        const closes = enriched.map((d) => d.close);
        const fc = forecastPrice(closes, 14);
        setHistory(enriched);
        setSignals(sigs);
        setPatterns(pats);
        setForecast(fc);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) loadData(symbol);
  }, [mounted, symbol]);

  // Build forecast chart data
  const last30 = history
    .slice(-30)
    .map((d) => ({ date: d.date, close: d.close, type: "actual" }));
  const today = history[history.length - 1];
  const forecastData = forecast.map((price, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      date: d.toISOString().split("T")[0],
      forecast: price,
      type: "forecast",
    };
  });
  const chartData = [...last30, ...forecastData];

  const lastPrice = today?.close ?? 0;
  const forecastEnd = forecast[forecast.length - 1] ?? 0;
  const forecastChange =
    lastPrice > 0 ? ((forecastEnd - lastPrice) / lastPrice) * 100 : 0;

  if (!mounted) return null;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--accent-green-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={20} color="var(--accent-green)" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-primary)",
                fontFamily: "Syne, sans-serif",
              }}
            >
              AI Predictor
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Technical analysis + linear regression forecast
            </p>
          </div>
        </div>

        <StockSearch
          onSelect={(sym) => setSymbol(sym)}
          defaultSymbol={symbol}
          placeholder="Select stock to analyze..."
        />

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "var(--text-muted)",
            }}
          >
            Analyzing {symbol}...
          </div>
        ) : (
          history.length > 0 && (
            <>
              {/* Forecast Summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                }}
              >
                {[
                  {
                    label: "Current Price",
                    value: `₹${lastPrice.toFixed(2)}`,
                    color: "var(--text-primary)",
                  },
                  {
                    label: "14-Day Forecast",
                    value: `₹${forecastEnd.toFixed(2)}`,
                    color:
                      forecastChange >= 0
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                  },
                  {
                    label: "Expected Move",
                    value: `${forecastChange >= 0 ? "+" : ""}${forecastChange.toFixed(2)}%`,
                    color:
                      forecastChange >= 0
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="card"
                    style={{ padding: 20, textAlign: "center" }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginBottom: 8,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: "JetBrains Mono, monospace",
                        color: item.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {item.label === "Expected Move" &&
                        (forecastChange >= 0 ? (
                          <TrendingUp size={20} />
                        ) : (
                          <TrendingDown size={20} />
                        ))}
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Forecast Chart */}
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
                  Price History + 14-Day Forecast
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        background: "var(--accent-green)",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Actual
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        background: "#F59E0B",
                        borderTop: "2px dashed #F59E0B",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Forecast
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        `₹${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`
                      }
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-card)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any, name: string) => [
                        `₹${Number(v).toFixed(2)}`,
                        name === "close" ? "Price" : "Forecast",
                      ]}
                    />
                    <ReferenceLine
                      x={last30[last30.length - 1]?.date}
                      stroke="var(--border-card)"
                      strokeDasharray="4 4"
                      label={{
                        value: "Today",
                        fill: "var(--text-muted)",
                        fontSize: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#4ADE80"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  ⚠️ Forecast uses linear regression + smoothing. Educational
                  only — not financial advice.
                </p>
              </div>

              {/* Technical Signals */}
              <TechnicalSignals signals={signals} patterns={patterns} />
            </>
          )
        )}
      </div>
    </AppLayout>
  );
}
