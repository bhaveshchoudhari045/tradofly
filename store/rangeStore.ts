"use client";
// store/rangeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomRange {
  id: string;
  label: string;
  min: number;
  max: number;
  minRsi?: number;
  maxRsi?: number;
  minVolume?: number; // in lakhs
  minPriceChange?: number; // % daily change minimum
  maxPriceChange?: number;
  sectors?: string[];
  createdAt: string;
  color?: string;
}

interface RangeState {
  customRanges: CustomRange[];
  activeRangeId: string; // 'penny' | 'mid' | 'high' | customId
  addRange: (r: Omit<CustomRange, "id" | "createdAt">) => string;
  updateRange: (id: string, r: Partial<CustomRange>) => void;
  deleteRange: (id: string) => void;
  setActiveRange: (id: string) => void;
}

const COLORS = [
  "#4ADE80",
  "#38BDF8",
  "#A78BFA",
  "#F59E0B",
  "#F43F5E",
  "#06B6D4",
  "#FB923C",
];

export const useRangeStore = create<RangeState>()(
  persist(
    (set, get) => ({
      customRanges: [],
      activeRangeId: "all",

      addRange: (r) => {
        const id = `custom_${Date.now()}`;
        const color = COLORS[get().customRanges.length % COLORS.length];
        set((s) => ({
          customRanges: [
            ...s.customRanges,
            { ...r, id, createdAt: new Date().toISOString(), color },
          ],
        }));
        return id;
      },

      updateRange: (id, r) =>
        set((s) => ({
          customRanges: s.customRanges.map((cr) =>
            cr.id === id ? { ...cr, ...r } : cr,
          ),
        })),

      deleteRange: (id) =>
        set((s) => ({
          customRanges: s.customRanges.filter((cr) => cr.id !== id),
          activeRangeId: s.activeRangeId === id ? "all" : s.activeRangeId,
        })),

      setActiveRange: (id) => set({ activeRangeId: id }),
    }),
    { name: "tradofly-ranges" },
  ),
);
