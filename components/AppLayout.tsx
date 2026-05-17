"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { usePaletteStore } from "@/store/paletteStore";
import Sidebar from "./Sidebar";
import TickerTape from "./TickerTape";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme } = useAppStore();
  const { getPalette, activePalette } = usePaletteStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Apply palette CSS variables to root so whole site uses them
  useEffect(() => {
    const palette = getPalette();
    const root = document.documentElement;
    root.style.setProperty("--palette-accent", palette.accent);
    root.style.setProperty("--palette-accent-rgb", palette.accentRgb);
    root.style.setProperty("--palette-secondary", palette.accentSecondary);
    root.style.setProperty("--palette-secondary-rgb", palette.accentSecRgb);
    root.style.setProperty("--palette-glow", palette.glow);
    root.style.setProperty("--palette-gradient-start", palette.gradientStart);
    root.style.setProperty("--palette-gradient-end", palette.gradientEnd);
    root.style.setProperty("--palette-buy", palette.buyColor);
    root.style.setProperty("--palette-sell", palette.sellColor);
    // Override card shadows with palette glow
    root.style.setProperty(
      "--shadow-card",
      `0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(${palette.accentRgb}, 0.08), 0 0 12px rgba(${palette.accentRgb}, 0.06)`,
    );
    root.style.setProperty(
      "--shadow-md",
      `0 4px 16px rgba(0,0,0,0.2), 0 0 20px rgba(${palette.accentRgb}, 0.08)`,
    );
    root.style.setProperty(
      "--border-accent",
      `rgba(${palette.accentRgb}, 0.25)`,
    );
  }, [activePalette]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      <div
        className="sidebar"
        style={{
          flexShrink: 0,
          overflowY: "auto",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Sidebar />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <TickerTape />
        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
