"use client";
import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import AppLayout from "@/components/AppLayout";
import QuoteCard from "@/components/Quotecard";
import StockChart from "@/components/StockChart";
import TechnicalSignals from "@/components/Technicalsignals";
import StockSearch from "@/components/StockSearch";
import type {
  StockQuote,
  HistoricalData,
  TechnicalSignal,
  PatternDetection,
} from "@/types";
import {
  enrichWithIndicators,
  generateSignals,
  detectPatterns,
} from "@/lib/technicals";

const DEFAULT_SYMBOL = "RELIANCE.NS";

// Maps chart range to API params
const RANGE_CONFIG: Record<string, { period1: string; interval: string }> = {
  "1H": { period1: getDateDaysAgo(1), interval: "5m" },
  "1D": { period1: getDateDaysAgo(1), interval: "15m" },
  "5D": { period1: getDateDaysAgo(5), interval: "30m" },
  "1W": { period1: getDateDaysAgo(7), interval: "60m" },
  "1M": { period1: getDateDaysAgo(30), interval: "1d" },
  "3M": { period1: getDateDaysAgo(90), interval: "1d" },
  "6M": { period1: getDateDaysAgo(180), interval: "1d" },
  "1Y": { period1: getDateDaysAgo(365), interval: "1d" },
  "2Y": { period1: getDateDaysAgo(730), interval: "1d" },
  ALL: { period1: "2018-01-01", interval: "1d" },
};

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export default function Home() {
  const { theme, isAuthenticated, register } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState("3M");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      register("Demo User", "demo@tradofly.com", 1000000);
    }
  }, [mounted, isAuthenticated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const loadStock = useCallback(async (sym: string, range: string) => {
    setLoading(true);
    try {
      const { period1, interval } = RANGE_CONFIG[range] ?? RANGE_CONFIG["3M"];

      // For intraday ranges, period1 is relative (e.g. "1d", "5d")
      // For daily ranges, period1 is an absolute date
      const isIntraday = ["1H", "1D", "5D", "1W"].includes(range);

      const [quoteRes, histRes] = await Promise.all([
        fetch(`/api/stock?symbol=${sym}&type=quote`),
        fetch(
          `/api/stock?symbol=${sym}&type=history&period1=${period1}&interval=${interval}`,
        ),
      ]);

      const quoteData: StockQuote = await quoteRes.json();
      const rawHistory = await histRes.json();

      if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
        setLoading(false);
        return;
      }

      // For intraday data, skip technical indicator enrichment
      // (enrichWithIndicators needs 200+ daily bars)
      if (isIntraday) {
        setQuote(quoteData);
        setHistory(rawHistory);
        setSignals([]);
        setPatterns([]);
      } else {
        const enriched = enrichWithIndicators(rawHistory);
        setQuote(quoteData);
        setHistory(enriched);
        setSignals(generateSignals(enriched));
        setPatterns(detectPatterns(enriched));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when symbol or range changes
  useEffect(() => {
    if (mounted) loadStock(symbol, chartRange);
  }, [symbol, chartRange, mounted]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <StockSearch
          onSelect={(sym) => setSymbol(sym)}
          defaultSymbol={symbol}
          placeholder="Search NSE/BSE stocks..."
        />

        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-muted)",
            }}
          >
            Loading {symbol}...
          </div>
        )}

        {!loading && quote && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <StockChart
                  data={history}
                  symbol={symbol}
                  height={400}
                  onRangeChange={(range) => setChartRange(range)}
                />
              </div>
              <TechnicalSignals signals={signals} patterns={patterns} />
            </div>
            <div>
              <QuoteCard quote={quote} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
