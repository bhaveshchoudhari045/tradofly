"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export default function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    async function fetchTicker() {
      try {
        const res = await fetch("/api/news?type=indices");
        const indices = await res.json();
        const stockRes = await fetch("/api/news?type=top_stocks");
        const stocks = await stockRes.json();
        const all: TickerItem[] = [
          ...indices.map((i: any) => ({
            symbol: i.symbol,
            name: i.name,
            value: i.value,
            change: i.change,
            changePercent: i.changePercent,
          })),
          ...stocks
            .slice(0, 10)
            .map((s: any) => ({
              symbol: s.symbol,
              name: s.name,
              value: s.price,
              change: s.change,
              changePercent: s.changePercent,
            })),
        ];
        setItems(all);
      } catch {
        // fallback silently
      }
    }
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000); // refresh every min
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  const repeated = [...items, ...items]; // for seamless loop

  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-card)",
        height: 36,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Live indicator */}
      <div
        style={{
          padding: "0 12px",
          borderRight: "1px solid var(--border-card)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: "100%",
          flexShrink: 0,
        }}
      >
        <div className="live-dot" />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--accent-green)",
            textTransform: "uppercase",
          }}
        >
          Live
        </span>
      </div>

      {/* Scrolling tape */}
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div
          className="ticker-tape"
          style={{ display: "flex", whiteSpace: "nowrap" }}
        >
          {repeated.map((item, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "0 20px",
                borderRight: "1px solid var(--border-card)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-primary)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {item.value.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={item.changePercent >= 0 ? "price-up" : "price-down"}
                style={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                {item.changePercent >= 0 ? (
                  <TrendingUp size={9} />
                ) : (
                  <TrendingDown size={9} />
                )}
                {Math.abs(item.changePercent).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
