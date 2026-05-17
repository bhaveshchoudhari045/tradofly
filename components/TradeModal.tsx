"use client";
import { useState } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import type { StockQuote } from "@/types";

interface TradeModalProps {
  quote: StockQuote;
  onClose: () => void;
  defaultType?: "BUY" | "SELL";
}

export default function TradeModal({
  quote,
  onClose,
  defaultType = "BUY",
}: TradeModalProps) {
  const [type, setType] = useState<"BUY" | "SELL">(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const { user, buyStock, sellStock, positions } = useAppStore();

  const position = positions.find((p) => p.symbol === quote.symbol);
  const total = quantity * quote.price;
  const canBuy = (user?.balance ?? 0) >= total;
  const canSell = (position?.quantity ?? 0) >= quantity;

  function handleTrade() {
    if (!user) return;
    let res;
    if (type === "BUY") {
      res = buyStock(quote.symbol, quote.name, quantity, quote.price);
    } else {
      res = sellStock(quote.symbol, quantity, quote.price);
    }
    setResult(res);
    if (res.success) {
      setTimeout(onClose, 1800);
    }
  }

  const isBuy = type === "BUY";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box fade-in" style={{ maxWidth: 420 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "Syne, sans-serif",
                color: "var(--text-primary)",
              }}
            >
              Place Order
            </h3>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {quote.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* BUY / SELL toggle */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            background: "var(--bg-secondary)",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(["BUY", "SELL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setResult(null);
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background:
                  type === t
                    ? t === "BUY"
                      ? "var(--accent-green)"
                      : "var(--accent-red)"
                    : "transparent",
                color: type === t ? "#fff" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s",
              }}
            >
              {t === "BUY" ? "↑" : "↓"} {t}
            </button>
          ))}
        </div>

        {/* Quote info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "12px 14px",
            background: "var(--bg-secondary)",
            borderRadius: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Symbol
            </div>
            <div
              style={{
                fontWeight: 700,
                fontFamily: "JetBrains Mono",
                color: "var(--text-primary)",
              }}
            >
              {quote.symbol}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>LTP</div>
            <div
              style={{
                fontWeight: 700,
                fontFamily: "JetBrains Mono",
                color: "var(--text-primary)",
              }}
            >
              ₹{quote.price.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Change
            </div>
            <div
              className={quote.changePercent >= 0 ? "price-up" : "price-down"}
            >
              {quote.changePercent >= 0 ? "+" : ""}
              {quote.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Current position */}
        {position && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "var(--accent-blue-bg)",
              borderRadius: 8,
              border: "1px solid var(--border-card)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--accent-blue)",
                fontWeight: 600,
              }}
            >
              Current Position
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {position.quantity} shares @ ₹{position.avgBuyPrice.toFixed(2)}{" "}
              avg
              {" · "}
              <span
                className={
                  position.pnl >= 0 ? "indicator-bullish" : "indicator-bearish"
                }
              >
                {position.pnl >= 0 ? "+" : ""}₹{position.pnl.toFixed(2)} (
                {position.pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {/* Quantity input */}
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
                padding: "0 14px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 18,
                fontWeight: 300,
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
                fontFamily: "JetBrains Mono",
                fontWeight: 700,
              }}
            />
            <button
              onClick={() => setQuantity((q) => q + 1)}
              style={{
                padding: "0 14px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-card)",
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 18,
                fontWeight: 300,
              }}
            >
              +
            </button>
          </div>
          {/* Quick select */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[1, 5, 10, 25, 50, 100].map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-card)",
                  background:
                    quantity === q ? "var(--accent-green-bg)" : "transparent",
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
            padding: "14px",
            background: "var(--bg-secondary)",
            borderRadius: 10,
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
                fontFamily: "JetBrains Mono",
                color: "var(--text-secondary)",
              }}
            >
              ₹{quote.price.toFixed(2)} × {quantity}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid var(--border-card)",
              paddingTop: 6,
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
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "JetBrains Mono",
                color: isBuy ? "var(--accent-green)" : "var(--accent-red)",
              }}
            >
              ₹
              {total.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Available Balance
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "JetBrains Mono",
                color:
                  (user?.balance ?? 0) >= total
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

        {/* Result */}
        {result && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: result.success
                ? "var(--accent-green-bg)"
                : "var(--accent-red-bg)",
              border: `1px solid ${result.success ? "var(--border-accent)" : "var(--accent-red)"}`,
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

        {/* Not logged in */}
        {!user && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--accent-amber-bg)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} color="var(--accent-amber)" />
            <span
              style={{
                fontSize: 12,
                color: "var(--accent-amber)",
                fontWeight: 600,
              }}
            >
              Please register to paper trade
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleTrade}
          disabled={!user || (isBuy && !canBuy) || (!isBuy && !canSell)}
          className={isBuy ? "btn-primary" : "btn-danger"}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {isBuy ? `Buy ${quantity} shares` : `Sell ${quantity} shares`}
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 10,
          }}
        >
          📌 Paper trading only · No real money involved
        </p>
      </div>
    </div>
  );
}
