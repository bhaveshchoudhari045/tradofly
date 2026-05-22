"use client";
import { useState } from "react";
import { usePaletteStore } from "@/store/paletteStore";
import type { RecommendedStock } from "@/lib/bollingerEngine";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Target,
  Shield,
  ChevronRight,
  Flame,
} from "lucide-react";
import { useRouter } from "next/navigation";
interface RecommendationCardProps {
  stock: RecommendedStock;
  index: number;
  onClick: () => void;
}

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  SINGLE_DAY: "1-Day Reversal",
  MULTI_DAY: "Multi-Day Recovery",
  SQUEEZE_BREAK: "Squeeze Breakout",
  W_BOTTOM: "W-Bottom",
  UPPER_BREAK: "Upper Break",
};

const AGE_CONFIG = {
  today: { label: "TODAY", color: "#00FF87", pulse: true },
  fresh: { label: "FRESH", color: "#38BDF8", pulse: true },
  recent: { label: "RECENT", color: "#F59E0B", pulse: false },
  old: { label: "PAST", color: "#9A9794", pulse: false },
};

export default function RecommendationCard({
  stock,
  index,
  onClick,
}: RecommendationCardProps) {
  const { getPalette } = usePaletteStore();
  const palette = getPalette();
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const sig = stock.latestSignal;
  const isBuy = sig.direction === "BUY";
  const ageConf = AGE_CONFIG[stock.signalAge];
  const confPct = sig.confidence;

  const accentColor = isBuy ? palette.buyColor : palette.sellColor;
  const accentRgb = isBuy ? palette.buyRgb : palette.sellRgb;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 16,
        overflow: "hidden",
        background: `linear-gradient(135deg, var(--bg-card) 0%, rgba(${accentRgb}, 0.04) 100%)`,
        border: `1px solid ${hovered ? `rgba(${accentRgb}, 0.35)` : `rgba(${accentRgb}, 0.12)`}`,
        padding: "16px",
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: hovered ? "translateY(-4px) scale(1.01)" : "none",
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(${accentRgb}, 0.2), 0 0 30px rgba(${accentRgb}, 0.12)`
          : `0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(${accentRgb}, 0.05)`,
        animationDelay: `${index * 60}ms`,
        animation: "cardReveal 0.5s ease forwards",
        opacity: 0,
      }}
    >
      {/* Glow overlay on hover */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background: `radial-gradient(ellipse at 50% 0%, rgba(${accentRgb}, ${hovered ? 0.07 : 0}) 0%, transparent 70%)`,
          transition: "all 0.3s",
          pointerEvents: "none",
        }}
      />

      {/* Rank badge */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: `rgba(${accentRgb}, 0.15)`,
          border: `1px solid rgba(${accentRgb}, 0.3)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          color: accentColor,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {index + 1}
      </div>

      {/* Age badge (top right) */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 999,
          background: `rgba(${ageConf.pulse ? accentRgb : "100,100,100"}, 0.12)`,
          border: `1px solid rgba(${ageConf.pulse ? accentRgb : "100,100,100"}, 0.2)`,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: ageConf.color,
        }}
      >
        {ageConf.pulse && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: ageConf.color,
              display: "inline-block",
              animation: "pulseDot 1.5s infinite",
              boxShadow: `0 0 4px ${ageConf.color}`,
            }}
          />
        )}
        {ageConf.label}
      </div>

      {/* Symbol + name */}
      <div style={{ paddingTop: 4, paddingLeft: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              fontFamily: "Syne, sans-serif",
              color: hovered ? accentColor : "var(--text-primary)",
              transition: "color 0.2s",
            }}
          >
            {stock.symbol.replace(".NS", "").replace(".BO", "")}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            NSE
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 160,
          }}
        >
          {stock.name}
        </div>
      </div>

      {/* Price row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-primary)",
            }}
          >
            ₹
            {stock.currentPrice.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 6,
            background:
              stock.changePercent >= 0
                ? `rgba(${palette.buyRgb}, 0.1)`
                : `rgba(${palette.sellRgb}, 0.1)`,
            color:
              stock.changePercent >= 0 ? palette.buyColor : palette.sellColor,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {stock.changePercent >= 0 ? (
            <TrendingUp size={10} />
          ) : (
            <TrendingDown size={10} />
          )}
          {stock.changePercent >= 0 ? "+" : ""}
          {stock.changePercent.toFixed(2)}%
        </div>
      </div>

      {/* Signal type */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
          padding: "6px 10px",
          borderRadius: 8,
          background: `rgba(${accentRgb}, 0.08)`,
          border: `1px solid rgba(${accentRgb}, 0.15)`,
        }}
      >
        <Zap size={12} color={accentColor} fill={accentColor} />
        <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
          {SIGNAL_TYPE_LABELS[sig.type] || sig.type}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {stock.daysSinceSignal === 0
            ? "Today"
            : `${stock.daysSinceSignal}d ago`}
        </span>
      </div>

      {/* Target & Gain */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {[
          {
            icon: Target,
            label: "Target",
            value: `₹${sig.targetMid.toFixed(1)}`,
            color: accentColor,
          },
          {
            icon: Flame,
            label: "Gain",
            value: `+${stock.potentialGain.toFixed(1)}%`,
            color: accentColor,
          },
          {
            icon: Shield,
            label: "Stop",
            value: `₹${sig.stopLoss.toFixed(1)}`,
            color: palette.sellColor,
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            style={{
              padding: "7px 8px",
              borderRadius: 8,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-card)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginBottom: 3,
              }}
            >
              <Icon size={9} color={color} />
              <span
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence bar */}
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
              fontSize: 10,
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            CONFIDENCE
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: accentColor,
              fontFamily: "JetBrains Mono",
            }}
          >
            {confPct}%
          </span>
        </div>
        <div
          style={{
            height: 3,
            background: "var(--border-primary)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${confPct}%`,
              background: `linear-gradient(90deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
              borderRadius: 2,
              boxShadow: hovered ? `0 0 6px ${accentColor}` : "none",
              transition: "box-shadow 0.3s",
            }}
          />
        </div>
      </div>

      {/* RR ratio + View CTA */}
      {/* RR ratio + Analyze + Trade */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          R:R{" "}
          <span
            style={{
              fontFamily: "JetBrains Mono",
              fontWeight: 700,
              color:
                sig.riskRewardRatio >= 2
                  ? accentColor
                  : "var(--text-secondary)",
            }}
          >
            {sig.riskRewardRatio}x
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: accentColor,
              opacity: hovered ? 1 : 0.6,
              transition: "opacity 0.2s",
            }}
          >
            Analyze <ChevronRight size={12} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/trading?symbol=${stock.symbol}`);
            }}
            style={{
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 11,
              background: palette.buyColor,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: `0 2px 8px rgba(${palette.buyRgb}, 0.35)`,
              transition: "all 0.15s",
              opacity: hovered ? 1 : 0.85,
              flexShrink: 0,
            }}
          >
            ↑ Trade
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseDot {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
