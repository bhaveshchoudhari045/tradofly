"use client";
import { TrendingUp, TrendingDown, Plus, Minus, Eye } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import type { StockQuote } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/technicals";

interface QuoteCardProps {
  quote: StockQuote;
  onTrade?: () => void;
}

export default function QuoteCard({ quote, onTrade }: QuoteCardProps) {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useAppStore();
  const inWatchlist = isInWatchlist(quote.symbol);
  const isUp = quote.changePercent >= 0;

  const metrics = [
    { label: "Open", value: `₹${quote.open?.toFixed(2)}` },
    {
      label: "High",
      value: `₹${quote.high?.toFixed(2)}`,
      color: "var(--accent-green)",
    },
    {
      label: "Low",
      value: `₹${quote.low?.toFixed(2)}`,
      color: "var(--accent-red)",
    },
    { label: "Prev Close", value: `₹${quote.prevClose?.toFixed(2)}` },
    { label: "Volume", value: formatNumber(quote.volume) },
    {
      label: "Avg Vol",
      value: quote.avgVolume ? formatNumber(quote.avgVolume) : "N/A",
    },
    {
      label: "Market Cap",
      value: quote.marketCap ? formatCurrency(quote.marketCap) : "N/A",
    },
    { label: "P/E Ratio", value: quote.pe ? quote.pe.toFixed(2) : "N/A" },
    { label: "EPS", value: quote.eps ? `₹${quote.eps.toFixed(2)}` : "N/A" },
    {
      label: "Div Yield",
      value: quote.dividendYield
        ? `${(quote.dividendYield * 100).toFixed(2)}%`
        : "N/A",
    },
    {
      label: "52W High",
      value: quote.fiftyTwoWeekHigh
        ? `₹${quote.fiftyTwoWeekHigh.toFixed(2)}`
        : "N/A",
      color: "var(--accent-green)",
    },
    {
      label: "52W Low",
      value: quote.fiftyTwoWeekLow
        ? `₹${quote.fiftyTwoWeekLow.toFixed(2)}`
        : "N/A",
      color: "var(--accent-red)",
    },
  ];

  // 52W progress
  const range52w = (quote.fiftyTwoWeekHigh || 0) - (quote.fiftyTwoWeekLow || 0);
  const priceFromLow = quote.price - (quote.fiftyTwoWeekLow || 0);
  const rangePct =
    range52w > 0
      ? Math.min(100, Math.max(0, (priceFromLow / range52w) * 100))
      : 50;

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header */}
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
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 2,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {quote.exchange || "NSE"} · {quote.currency || "INR"}
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 2,
              fontFamily: "Syne, sans-serif",
            }}
          >
            {quote.symbol}
          </h3>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {quote.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() =>
              inWatchlist
                ? removeFromWatchlist(quote.symbol)
                : addToWatchlist(quote.symbol)
            }
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-card)",
              background: inWatchlist
                ? "var(--accent-amber-bg)"
                : "transparent",
              color: inWatchlist ? "var(--accent-amber)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <Eye size={12} />
            {inWatchlist ? "Watching" : "Watch"}
          </button>
          {onTrade && (
            <button
              onClick={onTrade}
              className="btn-primary"
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              Trade
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "JetBrains Mono, monospace",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          ₹
          {quote.price.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div style={{ paddingBottom: 4 }}>
          <span
            className={isUp ? "price-up" : "price-down"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
            }}
          >
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isUp ? "+" : ""}
            {quote.change.toFixed(2)} ({isUp ? "+" : ""}
            {quote.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 52-week range */}
      {quote.fiftyTwoWeekHigh && quote.fiftyTwoWeekLow && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              52W Low: ₹{quote.fiftyTwoWeekLow.toFixed(0)}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              52W Range
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              52W High: ₹{quote.fiftyTwoWeekHigh.toFixed(0)}
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "var(--border-primary)",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${rangePct}%`,
                background:
                  "linear-gradient(90deg, var(--accent-red) 0%, var(--accent-amber) 50%, var(--accent-green) 100%)",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--text-primary)",
                left: `calc(${rangePct}% - 4px)`,
                border: "2px solid var(--bg-card)",
              }}
            />
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1,
          background: "var(--border-card)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{ padding: "10px 12px", background: "var(--bg-card)" }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginBottom: 3,
                letterSpacing: "0.04em",
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: m.color || "var(--text-primary)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
