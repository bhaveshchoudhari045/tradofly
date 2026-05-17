// app/api/recommended/route.ts
import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import {
  calcBB,
  detectBBSignals,
  classifyAge,
  filterByPeriod,
  splitLiveSignals,
  type OHLCV,
  type RecommendedStock,
} from "@/lib/bollingerEngine";

// Tier-1 liquid NSE stocks scanned for BB signals (fast, < 50 per call)
const SCAN_UNIVERSE = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "INFOSYS.NS",
  "SBIN.NS",
  "BHARTIARTL.NS",
  "ITC.NS",
  "LT.NS",
  "KOTAKBANK.NS",
  "AXISBANK.NS",
  "BAJFINANCE.NS",
  "MARUTI.NS",
  "TITAN.NS",
  "SUNPHARMA.NS",
  "WIPRO.NS",
  "HCLTECH.NS",
  "NTPC.NS",
  "ONGC.NS",
  "POWERGRID.NS",
  "ADANIENT.NS",
  "TATAMOTORS.NS",
  "TATASTEEL.NS",
  "JSWSTEEL.NS",
  "HINDALCO.NS",
  "ULTRACEMCO.NS",
  "ASIANPAINT.NS",
  "BAJAJFINSV.NS",
  "DRREDDY.NS",
  "DIVISLAB.NS",
  "EICHERMOT.NS",
  "GRASIM.NS",
  "HEROMOTOCO.NS",
  "INDUSINDBK.NS",
  "NESTLEIND.NS",
  "TATACONSUM.NS",
  "TECHM.NS",
  "BRITANNIA.NS",
  "CIPLA.NS",
  "COALINDIA.NS",
  "HDFCLIFE.NS",
  "SBILIFE.NS",
  "BPCL.NS",
  "M&M.NS",
  "APOLLOHOSP.NS",
  "ZOMATO.NS",
  "NAUKRI.NS",
  "DMART.NS",
  "IRCTC.NS",
  "TRENT.NS",
  "GODREJCP.NS",
  "DABUR.NS",
  "MARICO.NS",
  "PIDILITIND.NS",
  "VOLTAS.NS",
  "AUROPHARMA.NS",
  "LUPIN.NS",
  "BIOCON.NS",
  "GLENMARK.NS",
  "IDFCFIRSTB.NS",
  "BANKBARODA.NS",
  "PNB.NS",
  "CANBK.NS",
  "INDIGO.NS",
  "JUBLFOOD.NS",
  "HAVELLS.NS",
  "SIEMENS.NS",
  "ABB.NS",
  "BOSCHLTD.NS",
  "CHOLAFIN.NS",
  "MUTHOOTFIN.NS",
  "BAJAJ-AUTO.NS",
  "TVSMOTORS.NS",
  "ASHOKLEY.NS",
  "TATAPOWER.NS",
  "ADANIPORTS.NS",
  "ADANIGREEN.NS",
  "LTIM.NS",
  "PERSISTENT.NS",
  "MPHASIS.NS",
  "DIXON.NS",
  "AMBER.NS",
  "ANGELONE.NS",
  "BSE.NS",
  "CDSL.NS",
  "IRCON.NS",
  "NBCC.NS",
  "NHPC.NS",
  "RECLTD.NS",
  "SAIL.NS",
  "BHEL.NS",
  "NATIONALUM.NS",
  "VEDL.NS",
  "HINDALCO.NS",
  "NMDC.NS",
  "YESBANK.NS",
  "RBLBANK.NS",
  "FEDERALBNK.NS",
  "KARURVYSYA.NS",
  "UJJIVANSF.NS",
];

// In-memory cache to avoid hammering Yahoo Finance
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchHistoryWithCache(
  symbol: string,
  period1: string,
): Promise<OHLCV[]> {
  const key = `${symbol}_${period1}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const history = await yahooFinance.historical(symbol, {
      period1,
      interval: "1d",
    });
    const data: OHLCV[] = history
      .map((d: any) => ({
        date: d.date.toISOString().split("T")[0],
        open: d.open ?? 0,
        high: d.high ?? 0,
        low: d.low ?? 0,
        close: d.close ?? 0,
        volume: d.volume ?? 0,
      }))
      .filter((d: OHLCV) => d.close > 0);
    cache.set(key, { data, ts: Date.now() });
    return data;
  } catch {
    return [];
  }
}

async function fetchQuoteWithCache(symbol: string): Promise<any> {
  const key = `quote_${symbol}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;
  try {
    const q = await yahooFinance.quote(symbol);
    cache.set(key, { data: q, ts: Date.now() });
    return q;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "previous"; // 'live' | 'previous'
  const period = (searchParams.get("period") || "1w") as "1d" | "1w" | "1m";
  const symbol = searchParams.get("symbol"); // if fetching single stock detail

  // ── Single stock detail ─────────────────────────────────────────────────────
  if (symbol) {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 2);
    const p1Str = period1.toISOString().split("T")[0];
    const [rawData, quote] = await Promise.all([
      fetchHistoryWithCache(symbol, p1Str),
      fetchQuoteWithCache(symbol),
    ]);
    if (!rawData.length)
      return NextResponse.json({ error: "No data" }, { status: 404 });
    const bbData = calcBB(rawData);
    const allSignals = detectBBSignals(rawData, bbData);
    const currentPrice =
      quote?.regularMarketPrice ?? rawData[rawData.length - 1]?.close ?? 0;
    const changePercent = quote?.regularMarketChangePercent ?? 0;
    return NextResponse.json({
      symbol,
      rawData,
      bbData,
      allSignals,
      currentPrice,
      changePercent,
    });
  }

  // ── Scan universe ──────────────────────────────────────────────────────────
  // Limit concurrent requests to avoid rate-limiting
  const period1 = new Date();
  if (mode === "live" || period === "1d")
    period1.setDate(period1.getDate() - 60);
  else if (period === "1w") period1.setDate(period1.getDate() - 90);
  else period1.setDate(period1.getDate() - 180);
  const p1Str = period1.toISOString().split("T")[0];

  const results: RecommendedStock[] = [];
  const BATCH = 10;

  for (let i = 0; i < Math.min(SCAN_UNIVERSE.length, 80); i += BATCH) {
    const batch = SCAN_UNIVERSE.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const [rawData, quote] = await Promise.all([
          fetchHistoryWithCache(sym, p1Str),
          fetchQuoteWithCache(sym),
        ]);
        if (rawData.length < 25) return null;
        const bbData = calcBB(rawData);
        const allSignals = detectBBSignals(rawData, bbData);
        if (!allSignals.length) return null;

        const currentPrice =
          quote?.regularMarketPrice ?? rawData[rawData.length - 1]?.close ?? 0;
        const changePercent = quote?.regularMarketChangePercent ?? 0;

        let relevantSignals: typeof allSignals;
        if (mode === "live") {
          const { confirmed, approaching } = splitLiveSignals(
            allSignals,
            bbData,
          );
          relevantSignals = [...confirmed, ...approaching];
        } else {
          relevantSignals = filterByPeriod(allSignals, period);
        }
        if (!relevantSignals.length) return null;

        // Latest buy signal only
        const buySignals = relevantSignals.filter((s) => s.direction === "BUY");
        if (!buySignals.length) return null;
        const latestSignal = buySignals[buySignals.length - 1];
        const { daysSince, age } = classifyAge(latestSignal.date);
        const name =
          quote?.shortName || quote?.longName || sym.replace(".NS", "");

        return {
          symbol: sym,
          name,
          latestSignal,
          allSignals: relevantSignals,
          currentPrice,
          changePercent,
          bbData: bbData.slice(-60), // send only last 60 bars for bandwidth
          rawData: rawData.slice(-60),
          potentialGain:
            latestSignal.entryPrice > 0
              ? ((latestSignal.targetMid - latestSignal.entryPrice) /
                  latestSignal.entryPrice) *
                100
              : 0,
          potentialGainMax:
            latestSignal.entryPrice > 0
              ? ((latestSignal.targetMax - latestSignal.entryPrice) /
                  latestSignal.entryPrice) *
                100
              : 0,
          daysSinceSignal: daysSince,
          signalAge: age,
          lotSize: 1,
        } as RecommendedStock;
      }),
    );
    batchResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    });
  }

  // Sort by confidence desc, then recency
  results.sort((a, b) => {
    const confDiff = b.latestSignal.confidence - a.latestSignal.confidence;
    if (confDiff !== 0) return confDiff;
    return a.daysSinceSignal - b.daysSinceSignal;
  });

  return NextResponse.json(results.slice(0, 40));
}
