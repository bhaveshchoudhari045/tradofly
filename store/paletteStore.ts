"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PaletteId = "emerald" | "aurora" | "crimson" | "solar" | "cosmic";

export interface Palette {
  id: PaletteId;
  name: string;
  emoji: string;
  description: string;
  // CSS variable values
  accent: string; // main accent colour (hex)
  accentRgb: string; // "r, g, b" for rgba()
  accentSecondary: string;
  accentSecRgb: string;
  glow: string; // glow colour (rgba string)
  glowStrong: string;
  gradientStart: string;
  gradientEnd: string;
  cardBorderColor: string;
  buyColor: string;
  buyRgb: string;
  sellColor: string;
  sellRgb: string;
  particleColor: string;
  bgPattern: string; // subtle pattern CSS
}

export const PALETTES: Record<PaletteId, Palette> = {
  emerald: {
    id: "emerald",
    name: "Emerald Flux",
    emoji: "💚",
    description: "Deep forest greens with electric lime highlights",
    accent: "#00FF87",
    accentRgb: "0, 255, 135",
    accentSecondary: "#00D4FF",
    accentSecRgb: "0, 212, 255",
    glow: "rgba(0, 255, 135, 0.25)",
    glowStrong: "rgba(0, 255, 135, 0.5)",
    gradientStart: "#00FF87",
    gradientEnd: "#00D4FF",
    cardBorderColor: "rgba(0, 255, 135, 0.15)",
    buyColor: "#00FF87",
    buyRgb: "0, 255, 135",
    sellColor: "#FF4D6D",
    sellRgb: "255, 77, 109",
    particleColor: "#00FF87",
    bgPattern:
      "radial-gradient(ellipse at 20% 50%, rgba(0,255,135,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,212,255,0.03) 0%, transparent 50%)",
  },
  aurora: {
    id: "aurora",
    name: "Aurora Borealis",
    emoji: "🌌",
    description: "Violet-teal northern lights with ice white accents",
    accent: "#A855F7",
    accentRgb: "168, 85, 247",
    accentSecondary: "#06B6D4",
    accentSecRgb: "6, 182, 212",
    glow: "rgba(168, 85, 247, 0.25)",
    glowStrong: "rgba(168, 85, 247, 0.55)",
    gradientStart: "#A855F7",
    gradientEnd: "#06B6D4",
    cardBorderColor: "rgba(168, 85, 247, 0.18)",
    buyColor: "#06B6D4",
    buyRgb: "6, 182, 212",
    sellColor: "#F43F5E",
    sellRgb: "244, 63, 94",
    particleColor: "#A855F7",
    bgPattern:
      "radial-gradient(ellipse at 30% 40%, rgba(168,85,247,0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(6,182,212,0.04) 0%, transparent 50%)",
  },
  crimson: {
    id: "crimson",
    name: "Crimson Pulse",
    emoji: "🔴",
    description: "Blood red intensity with amber fire accents",
    accent: "#FF2D55",
    accentRgb: "255, 45, 85",
    accentSecondary: "#FF9500",
    accentSecRgb: "255, 149, 0",
    glow: "rgba(255, 45, 85, 0.25)",
    glowStrong: "rgba(255, 45, 85, 0.5)",
    gradientStart: "#FF2D55",
    gradientEnd: "#FF9500",
    cardBorderColor: "rgba(255, 45, 85, 0.15)",
    buyColor: "#FF9500",
    buyRgb: "255, 149, 0",
    sellColor: "#FF2D55",
    sellRgb: "255, 45, 85",
    particleColor: "#FF2D55",
    bgPattern:
      "radial-gradient(ellipse at 20% 30%, rgba(255,45,85,0.05) 0%, transparent 60%), radial-gradient(ellipse at 75% 60%, rgba(255,149,0,0.04) 0%, transparent 50%)",
  },
  solar: {
    id: "solar",
    name: "Solar Wind",
    emoji: "☀️",
    description: "Golden plasma with hot white corona",
    accent: "#F59E0B",
    accentRgb: "245, 158, 11",
    accentSecondary: "#FBBF24",
    accentSecRgb: "251, 191, 36",
    glow: "rgba(245, 158, 11, 0.3)",
    glowStrong: "rgba(245, 158, 11, 0.6)",
    gradientStart: "#F59E0B",
    gradientEnd: "#FCD34D",
    cardBorderColor: "rgba(245, 158, 11, 0.2)",
    buyColor: "#4ADE80",
    buyRgb: "74, 222, 128",
    sellColor: "#FB7185",
    sellRgb: "251, 113, 133",
    particleColor: "#F59E0B",
    bgPattern:
      "radial-gradient(ellipse at 50% 10%, rgba(245,158,11,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(251,191,36,0.04) 0%, transparent 50%)",
  },
  cosmic: {
    id: "cosmic",
    name: "Cosmic Ice",
    emoji: "🧊",
    description: "Arctic blue with deep space indigo shimmer",
    accent: "#38BDF8",
    accentRgb: "56, 189, 248",
    accentSecondary: "#818CF8",
    accentSecRgb: "129, 140, 248",
    glow: "rgba(56, 189, 248, 0.25)",
    glowStrong: "rgba(56, 189, 248, 0.5)",
    gradientStart: "#38BDF8",
    gradientEnd: "#818CF8",
    cardBorderColor: "rgba(56, 189, 248, 0.15)",
    buyColor: "#38BDF8",
    buyRgb: "56, 189, 248",
    sellColor: "#F472B6",
    sellRgb: "244, 114, 182",
    particleColor: "#38BDF8",
    bgPattern:
      "radial-gradient(ellipse at 10% 60%, rgba(56,189,248,0.05) 0%, transparent 60%), radial-gradient(ellipse at 90% 20%, rgba(129,140,248,0.04) 0%, transparent 50%)",
  },
};

interface PaletteState {
  activePalette: PaletteId;
  setPalette: (id: PaletteId) => void;
  getPalette: () => Palette;
}

export const usePaletteStore = create<PaletteState>()(
  persist(
    (set, get) => ({
      activePalette: "emerald",
      setPalette: (id) => set({ activePalette: id }),
      getPalette: () => PALETTES[get().activePalette],
    }),
    { name: "tradofly-palette" },
  ),
);
