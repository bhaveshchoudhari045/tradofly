"use client";
import {
  usePaletteStore,
  PALETTES,
  type PaletteId,
} from "@/store/paletteStore";
import { useEffect, useState } from "react";

export default function PaletteSwitcher() {
  const { activePalette, setPalette, getPalette } = usePaletteStore();
  const palette = getPalette();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Current palette badge */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px 6px 10px",
          borderRadius: 999,
          background: `rgba(${palette.accentRgb}, 0.1)`,
          border: `1px solid rgba(${palette.accentRgb}, 0.3)`,
          cursor: "pointer",
          transition: "all 0.2s",
          boxShadow: expanded
            ? `0 0 16px rgba(${palette.accentRgb}, 0.3)`
            : "none",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
            boxShadow: `0 0 6px rgba(${palette.accentRgb}, 0.7)`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
            background: `linear-gradient(90deg, ${palette.gradientStart}, ${palette.gradientEnd})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {palette.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "none",
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown */}
      {expanded && (
        <>
          <div
            onClick={() => setExpanded(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              zIndex: 50,
              background: "var(--bg-card)",
              border: `1px solid rgba(${palette.accentRgb}, 0.2)`,
              borderRadius: 16,
              padding: 8,
              width: 240,
              boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(${palette.accentRgb}, 0.1)`,
              animation: "dropIn 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                padding: "4px 8px 8px",
              }}
            >
              Color Theme
            </div>
            {Object.values(PALETTES).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPalette(p.id);
                  setExpanded(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 10px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background:
                    activePalette === p.id
                      ? `rgba(${p.accentRgb}, 0.12)`
                      : "transparent",
                  transition: "all 0.15s",
                  outline:
                    activePalette === p.id
                      ? `1px solid rgba(${p.accentRgb}, 0.3)`
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (activePalette !== p.id)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      `rgba(${p.accentRgb}, 0.06)`;
                }}
                onMouseLeave={(e) => {
                  if (activePalette !== p.id)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
              >
                {/* Gradient swatch */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${p.gradientStart}, ${p.gradientEnd})`,
                    boxShadow:
                      activePalette === p.id
                        ? `0 0 10px rgba(${p.accentRgb}, 0.6)`
                        : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {p.emoji}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color:
                        activePalette === p.id
                          ? p.accent
                          : "var(--text-primary)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {p.description}
                  </div>
                </div>
                {activePalette === p.id && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 14,
                      color: p.accent,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <style jsx global>{`
        @keyframes dropIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
