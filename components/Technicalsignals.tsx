"use client";
import type { TechnicalSignal, PatternDetection } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface TechnicalSignalsProps {
  signals: TechnicalSignal[];
  patterns: PatternDetection[];
}

const SignalBadge = ({ signal }: { signal: string }) => {
  const config: Record<
    string,
    { color: string; bg: string; icon: any; label: string }
  > = {
    STRONG_BUY: {
      color: "#4ADE80",
      bg: "rgba(74,222,128,0.15)",
      icon: TrendingUp,
      label: "Strong Buy",
    },
    BUY: {
      color: "var(--accent-green)",
      bg: "var(--accent-green-bg)",
      icon: TrendingUp,
      label: "Buy",
    },
    NEUTRAL: {
      color: "var(--accent-amber)",
      bg: "var(--accent-amber-bg)",
      icon: Minus,
      label: "Neutral",
    },
    SELL: {
      color: "var(--accent-red)",
      bg: "var(--accent-red-bg)",
      icon: TrendingDown,
      label: "Sell",
    },
    STRONG_SELL: {
      color: "#F87171",
      bg: "rgba(248,113,113,0.15)",
      icon: TrendingDown,
      label: "Strong Sell",
    },
  };
  const c = config[signal] || config.NEUTRAL;
  const Icon = c.icon;
  return (
    <span className="tag" style={{ background: c.bg, color: c.color }}>
      <Icon size={9} strokeWidth={3} />
      {c.label}
    </span>
  );
};

export default function TechnicalSignals({
  signals,
  patterns,
}: TechnicalSignalsProps) {
  // Compute overall consensus
  const scoreMap: Record<string, number> = {
    STRONG_BUY: 2,
    BUY: 1,
    NEUTRAL: 0,
    SELL: -1,
    STRONG_SELL: -2,
  };
  const totalScore = signals.reduce(
    (sum, s) => sum + (scoreMap[s.signal] ?? 0),
    0,
  );
  const maxScore = signals.length * 2;
  const pct =
    maxScore > 0 ? ((totalScore + maxScore) / (maxScore * 2)) * 100 : 50;
  const consensus =
    totalScore > signals.length
      ? "STRONG_BUY"
      : totalScore > 0
        ? "BUY"
        : totalScore < -signals.length
          ? "STRONG_SELL"
          : totalScore < 0
            ? "SELL"
            : "NEUTRAL";

  const buyCount = signals.filter(
    (s) => s.signal === "BUY" || s.signal === "STRONG_BUY",
  ).length;
  const sellCount = signals.filter(
    (s) => s.signal === "SELL" || s.signal === "STRONG_SELL",
  ).length;
  const neutralCount = signals.filter((s) => s.signal === "NEUTRAL").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Consensus Gauge */}
      <div className="card" style={{ padding: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Technical Consensus
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--accent-red)",
              fontWeight: 600,
            }}
          >
            {sellCount} Sell
          </span>
          <div style={{ textAlign: "center" }}>
            <SignalBadge signal={consensus} />
          </div>
          <span
            style={{
              fontSize: 12,
              color: "var(--accent-green)",
              fontWeight: 600,
            }}
          >
            {buyCount} Buy
          </span>
        </div>
        {/* Progress bar */}
        <div
          style={{
            height: 6,
            background: "var(--border-primary)",
            borderRadius: 3,
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
              width: `${pct}%`,
              background:
                pct > 60
                  ? "var(--accent-green)"
                  : pct < 40
                    ? "var(--accent-red)"
                    : "var(--accent-amber)",
              borderRadius: 3,
              transition: "width 0.5s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 1,
              background: "var(--border-primary)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Strong Sell
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            {neutralCount} Neutral
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Strong Buy
          </span>
        </div>
      </div>

      {/* Signals table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-card)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Technical Indicators (10 Strategies)
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Value</th>
              <th>Signal</th>
              <th>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, fontSize: 12 }}>{s.indicator}</td>
                <td
                  style={{
                    fontFamily: "JetBrains Mono",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {s.value}
                </td>
                <td>
                  <SignalBadge signal={s.signal} />
                </td>
                <td
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    maxWidth: 200,
                  }}
                >
                  {s.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-card)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Pattern Detections (Accident Pattern Algorithm)
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pattern</th>
                <th>Signal</th>
                <th>Confidence</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {patterns.slice(0, 10).map((p, i) => (
                <tr key={i}>
                  <td
                    style={{
                      fontFamily: "JetBrains Mono",
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.date}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{p.pattern}</td>
                  <td>
                    <span
                      className="tag"
                      style={{
                        background:
                          p.signal === "BUY"
                            ? "var(--accent-green-bg)"
                            : "var(--accent-red-bg)",
                        color:
                          p.signal === "BUY"
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      {p.signal === "BUY" ? (
                        <CheckCircle size={9} />
                      ) : (
                        <XCircle size={9} />
                      )}
                      {p.signal}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 4,
                          background: "var(--border-primary)",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p.confidence}%`,
                            height: "100%",
                            background:
                              p.confidence > 75
                                ? "var(--accent-green)"
                                : "var(--accent-amber)",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "JetBrains Mono",
                          color: "var(--text-muted)",
                        }}
                      >
                        {p.confidence}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {p.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
