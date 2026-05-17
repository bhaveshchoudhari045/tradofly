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
const DEFAULT_NAME = "Reliance Industries";

export default function Home() {
  const { theme, isAuthenticated, register } = useAppStore();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [loading, setLoading] = useState(true);
  const [showTrade, setShowTrade] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      register("Demo User", "demo@tradofly.com", 1000000);
    }
  }, [isAuthenticated, register]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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

      // Guard: only proceed if valid array
      if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
        console.error("No history data for", sym);
        setLoading(false);
        return;
      }

      const enriched = enrichWithIndicators(rawHistory);
      const sigs = generateSignals(enriched);
      const pats = detectPatterns(enriched);
      setQuote(quoteData);
      setHistory(enriched);
      setSignals(sigs);
      setPatterns(pats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStock(symbol);
  }, [symbol]);

  function handleSelect(sym: string) {
    setSymbol(sym);
  }

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Search */}
        <StockSearch
          onSelect={handleSelect}
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
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <StockChart data={history} symbol={symbol} height={400} />
              </div>
              <TechnicalSignals signals={signals} patterns={patterns} />
            </div>

            {/* Right column */}
            <div>
              <QuoteCard quote={quote} onTrade={() => setShowTrade(true)} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
