"use client";
import { useEffect, useState } from "react";
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

export default function Home() {
  const { theme, isAuthenticated, register } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(true);

  // Step 1 — mark mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Step 2 — register only if not already authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      register("Demo User", "demo@tradofly.com", 1000000);
    }
  }, [mounted, isAuthenticated]);

  // Step 3 — sync theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Step 4 — load stock data
  async function loadStock(sym: string) {
    setLoading(true);
    try {
      const [quoteRes, histRes] = await Promise.all([
        fetch(`/api/stock?symbol=${sym}&type=quote`),
        fetch(
          `/api/stock?symbol=${sym}&type=history&period1=2022-01-01&interval=1d`,
        ),
      ]);
      const quoteData: StockQuote = await quoteRes.json();
      const rawHistory = await histRes.json();
      if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
        setLoading(false);
        return;
      }
      const enriched = enrichWithIndicators(rawHistory);
      setQuote(quoteData);
      setHistory(enriched);
      setSignals(generateSignals(enriched));
      setPatterns(detectPatterns(enriched));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) loadStock(symbol);
  }, [symbol, mounted]);

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
                <StockChart data={history} symbol={symbol} height={400} />
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
