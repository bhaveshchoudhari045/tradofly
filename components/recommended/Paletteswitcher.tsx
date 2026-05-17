"use client";
import {
  usePaletteStore,
  PALETTES,
  type PaletteId,
} from "@/store/paletteStore";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export default function PaletteSwitcher() {
  const { activePalette, setPalette, getPalette } = usePaletteStore();
  const [open, setOpen] = useState(false);
  const palette = getPalette();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: 8,
          border: "1px solid var(--border-card)",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: palette.accent,
          }}
        />
        {palette.name}
        <ChevronDown size={12} color="var(--text-muted)" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 50,
            minWidth: 180,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          {Object.values(PALETTES).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPalette(p.id);
                setOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background:
                  activePalette === p.id
                    ? "var(--bg-secondary)"
                    : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "1px solid var(--border-card)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: p.accent,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-primary)",
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
                  style={{ marginLeft: "auto", fontSize: 10, color: p.accent }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
