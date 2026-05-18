"use client";
// hooks/useRealtimeQuotes.ts
// Polls /api/stock?type=batch every N seconds and returns live prices.
// Uses a smart dedup strategy: only re-renders when prices actually change.

import { useState, useEffect, useRef, useCallback } from "react";

export interface LiveQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  prevClose?: number;
  high?: number;
  low?: number;
  open?: number;
  name?: string;
  lastUpdated: number; // timestamp
}

interface UseRealtimeQuotesOptions {
  symbols: string[];
  intervalMs?: number; // default 30s
  enabled?: boolean;
}

export function useRealtimeQuotes({
  symbols,
  intervalMs = 30_000,
  enabled = true,
}: UseRealtimeQuotesOptions) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const symbolsKey = symbols.join(",");

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length || !enabled) return;
    setLoading(true);
    try {
      // Batch fetch up to 20 at a time
      const batches: string[][] = [];
      for (let i = 0; i < symbols.length; i += 20) {
        batches.push(symbols.slice(i, i + 20));
      }
      const results = await Promise.allSettled(
        batches.map((batch) =>
          fetch(
            `/api/stock?type=batch&symbols=${encodeURIComponent(batch.join(","))}`,
          ).then((r) => r.json()),
        ),
      );

      const newQuotes: Record<string, LiveQuote> = {};
      results.forEach((r) => {
        if (r.status !== "fulfilled" || !Array.isArray(r.value)) return;
        r.value.forEach((q: any) => {
          if (!q?.symbol) return;
          newQuotes[q.symbol] = {
            symbol: q.symbol,
            price: q.price ?? 0,
            change: q.change ?? 0,
            changePercent: q.changePercent ?? 0,
            volume: q.volume ?? 0,
            prevClose: q.prevClose,
            high: q.high,
            low: q.low,
            open: q.open,
            name: q.name,
            lastUpdated: Date.now(),
          };
        });
      });

      setQuotes((prev) => {
        // Merge: only update if value changed (prevent unnecessary re-renders)
        let changed = false;
        const next = { ...prev };
        Object.entries(newQuotes).forEach(([sym, q]) => {
          if (!prev[sym] || prev[sym].price !== q.price) {
            next[sym] = q;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setLastFetchedAt(new Date());
    } catch (err) {
      console.warn("[useRealtimeQuotes] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [symbolsKey, enabled]);

  useEffect(() => {
    fetchQuotes();
    if (enabled) {
      timerRef.current = setInterval(fetchQuotes, intervalMs);
    }
    return () => clearInterval(timerRef.current!);
  }, [fetchQuotes, intervalMs, enabled]);

  return { quotes, loading, lastFetchedAt, refresh: fetchQuotes };
}

// ── Single symbol hook ───────────────────────────────────────────────────────
export function useRealtimeQuote(symbol: string | null, intervalMs = 20_000) {
  const { quotes, loading, lastFetchedAt, refresh } = useRealtimeQuotes({
    symbols: symbol ? [symbol] : [],
    intervalMs,
    enabled: !!symbol,
  });
  return {
    quote: symbol ? (quotes[symbol] ?? null) : null,
    loading,
    lastFetchedAt,
    refresh,
  };
}

// ── Portfolio price sync hook ────────────────────────────────────────────────
// Polls prices for all held positions and updates the store automatically.
import { useAppStore } from "@/store/appStore";

export function usePortfolioPriceSync(intervalMs = 30_000) {
  const { positions, updatePositionPrices, isAuthenticated } = useAppStore();
  const symbols = positions.map((p) => p.symbol);

  const { quotes, loading, lastFetchedAt } = useRealtimeQuotes({
    symbols,
    intervalMs,
    enabled: isAuthenticated && symbols.length > 0,
  });

  // When quotes update, push new prices into the store
  useEffect(() => {
    if (!Object.keys(quotes).length) return;
    const updates = Object.values(quotes).map((q) => ({
      symbol: q.symbol,
      price: q.price,
    }));
    if (updates.length) updatePositionPrices(updates);
  }, [quotes]);

  return { loading, lastFetchedAt };
}
