// app/api/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { enrichWithIndicators } from "@/lib/technicals";
import { analyzeStock, classifyTier } from "@/lib/strategyEngine";
import { calcBB, detectBBSignals } from "@/lib/bollingerEngine";
import {
  PENNY_STOCKS,
  MID_STOCKS,
  HIGH_STOCKS,
  ALL_STOCKS,
  type StockMeta,
} from "@/lib/stockUniverse";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const histCache = new Map<string, { data: any[]; ts: number }>();
const quoteCache = new Map<string, { data: any; ts: number }>();
const HIST_TTL = 20 * 60_000;
const QUOTE_TTL = 2 * 60_000;

async function getHistory(symbol: string): Promise<any[]> {
  const key = `h:${symbol}`;
  const c = histCache.get(key);
  if (c && Date.now() - c.ts < HIST_TTL) return c.data;
  try {
    const p1 = new Date();
    p1.setFullYear(p1.getFullYear() - 1);
    const result = await yf.chart(symbol, {
      period1: p1.toISOString().split("T")[0],
      period2: new Date().toISOString().split("T")[0],
      interval: "1d",
    });
    const quotes = result.quotes || [];
    const data = quotes
      .filter((d: any) => d?.close > 0)
      .map((d: any) => ({
        date: new Date(d.date).toISOString().split("T")[0],
        open: d.open ?? 0,
        high: d.high ?? 0,
        low: d.low ?? 0,
        close: d.close ?? 0,
        volume: d.volume ?? 0,
      }));
    histCache.set(key, { data, ts: Date.now() });
    return data;
  } catch {
    return [];
  }
}

async function getQuote(symbol: string): Promise<any> {
  const c = quoteCache.get(symbol);
  if (c && Date.now() - c.ts < QUOTE_TTL) return c.data;
  try {
    const q = await yf.quote(symbol);
    const data = {
      price: q.regularMarketPrice ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      name: (q as any).shortName || (q as any).longName || symbol,
      volume: q.regularMarketVolume ?? 0,
    };
    quoteCache.set(symbol, { data, ts: Date.now() });
    return data;
  } catch {
    return { price: 0, changePercent: 0, name: symbol, volume: 0 };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") || "all";
  const mode = searchParams.get("mode") || "recommended";
  const minPrice = parseFloat(searchParams.get("minPrice") || "1");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999");
  const minRsi = parseFloat(searchParams.get("minRsi") || "0");
  const maxRsi = parseFloat(searchParams.get("maxRsi") || "100");
  const minVolume = parseFloat(searchParams.get("minVolume") || "0");
  const sortBy = searchParams.get("sort") || "composite";
  const limit = parseInt(searchParams.get("limit") || "50");
  const signalFilter = searchParams.get("signal") || "ALL"; // ALL | BUY | STRONG_BUY

  // Choose universe based on tier
  let universe: StockMeta[];
  if (tier === "penny") universe = PENNY_STOCKS;
  else if (tier === "mid") universe = MID_STOCKS;
  else if (tier === "high") universe = HIGH_STOCKS;
  else universe = ALL_STOCKS;

  // Deduplicate
  const seen = new Set<string>();
  const dedupedUniverse = universe.filter((s) => {
    if (seen.has(s.symbol)) return false;
    seen.add(s.symbol);
    return true;
  });

  const results: any[] = [];
  const BATCH = 6; // smaller batch to avoid rate limiting

  for (let i = 0; i < Math.min(dedupedUniverse.length, 150); i += BATCH) {
    const batch = dedupedUniverse.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (meta): Promise<any | null> => {
        const [rawData, quote] = await Promise.all([
          getHistory(meta.symbol),
          getQuote(meta.symbol),
        ]);
        if (!rawData.length || !quote.price) return null;

        const price = quote.price;

        // Price filter
        if (price < minPrice || price > maxPrice) return null;

        // Volume filter
        if (minVolume > 0 && quote.volume < minVolume * 100000) return null;

        const enriched = enrichWithIndicators(rawData);
        if (enriched.length < 20) return null;

        const latest = enriched[enriched.length - 1];

        // RSI filter
        if (latest.rsi !== undefined) {
          if (latest.rsi < minRsi || latest.rsi > maxRsi) return null;
        }

        const actualTier = classifyTier(price);
        const composite = analyzeStock(
          meta.symbol,
          meta.name || quote.name,
          enriched,
          price,
          quote.changePercent,
          actualTier,
        );

        // Signal filter
        if (signalFilter !== "ALL" && composite.overallSignal !== signalFilter)
          return null;

        // For recommended mode, only include BUY signals
        if (
          mode === "recommended" &&
          !["BUY", "STRONG_BUY"].includes(composite.overallSignal)
        )
          return null;

        // For quick mode, need decent composite score
        if (mode === "quick" && composite.compositeScore < 55) return null;

        // BB signals for recommended page
        const bbData = calcBB(rawData.slice(-90));
        const bbSignals =
          mode !== "watchlist"
            ? detectBBSignals(rawData.slice(-90), bbData)
            : [];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const recentBBSignals = bbSignals.filter(
          (s) => s.direction === "BUY" && s.date >= thirtyDaysAgo,
        );

        return {
          ...composite,
          symbol: meta.symbol,
          name: meta.name || quote.name,
          sector: meta.sector,
          bbSignalCount: recentBBSignals.length,
          latestBBSignal: recentBBSignals.at(-1) || null,
          hasBBSignal: recentBBSignals.length > 0,
          price,
          priceChange: quote.changePercent,
          volume: quote.volume,
        };
      }),
    );

    settled.forEach((r) => {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    });
  }

  // Sort results
  results.sort((a, b) => {
    switch (sortBy) {
      case "gain":
        return b.expectedReturn - a.expectedReturn;
      case "confluence":
        return b.confluenceCount - a.confluenceCount;
      case "momentum":
        return b.momentum - a.momentum;
      case "change":
        return b.priceChange - a.priceChange;
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "volume":
        return (b.volume || 0) - (a.volume || 0);
      case "composite":
      default:
        return b.compositeScore - a.compositeScore;
    }
  });

  return NextResponse.json(results.slice(0, limit), {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
