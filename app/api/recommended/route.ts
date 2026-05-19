import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import {
  calcBB,
  detectBBSignals,
  classifyAge,
  splitLiveSignals,
  type OHLCV,
  type RecommendedStock,
  type SignalMatch,
} from "@/lib/bollingerEngine";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

// Comprehensive NSE stock universe — 200+ stocks across all segments
const SCAN_UNIVERSE = [
  // NIFTY 50
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
  "APOLLOHOSP.NS",
  "ZOMATO.NS",
  "BAJAJ-AUTO.NS",
  "M&M.NS",
  "ADANIPORTS.NS",
  "TRENT.NS",
  "NAUKRI.NS",
  // NIFTY NEXT 50
  "DMART.NS",
  "IRCTC.NS",
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
  "TVSMOTORS.NS",
  "ASHOKLEY.NS",
  "TATAPOWER.NS",
  "ADANIGREEN.NS",
  "LTIM.NS",
  "PERSISTENT.NS",
  "MPHASIS.NS",
  "DIXON.NS",
  "ANGELONE.NS",
  "BSE.NS",
  "CDSL.NS",
  "RECLTD.NS",
  "SAIL.NS",
  "BHEL.NS",
  "VEDL.NS",
  "NMDC.NS",
  "YESBANK.NS",
  "RBLBANK.NS",
  "FEDERALBNK.NS",
  "KARURVYSYA.NS",
  "SUNDARMFIN.NS",
  "MANAPPURAM.NS",
  "LICI.NS",
  "ICICIGI.NS",
  "HDFCAMC.NS",
  "NAUKRI.NS",
  "PAYTM.NS",
  // MID CAP
  "TATAELXSI.NS",
  "COFORGE.NS",
  "LTTS.NS",
  "KPITTECH.NS",
  "CYIENT.NS",
  "HAPPIESTMND.NS",
  "MASTEK.NS",
  "NIITLTD.NS",
  "ROUTE.NS",
  "CAMPUS.NS",
  "POLICYBZR.NS",
  "NYKAA.NS",
  "CARTRADE.NS",
  "ZOMATO.NS",
  "SWIGGY.NS",
  "DELHIVERY.NS",
  "MAPMYINDIA.NS",
  "EASEMYTRIP.NS",
  "IXIGO.NS",
  "YATRA.NS",
  "KALYANKJIL.NS",
  "SENCO.NS",
  "THANGAMAYL.NS",
  "RAJESHEXPO.NS",
  "TITAN.NS",
  "VSTIND.NS",
  "GODFRYPHLP.NS",
  "ITC.NS",
  "UNITDSPR.NS",
  "RADICO.NS",
  "UBL.NS",
  "MCDOWELL-N.NS",
  "GLOBUSSPR.NS",
  "PVRINOX.NS",
  "INOXGREEN.NS",
  "TORNTPHARM.NS",
  "ALKEM.NS",
  "ABBOTINDIA.NS",
  "PFIZER.NS",
  "GLAXO.NS",
  "SANOFI.NS",
  "JBCHEPHARM.NS",
  "GRANULES.NS",
  "LAURUSLABS.NS",
  "SUVEN.NS",
  "NATCOPHARM.NS",
  "AJANTPHARM.NS",
  "IPCALAB.NS",
  "AARTI.NS",
  "AARTIIND.NS",
  "VINATIORGA.NS",
  "NAVINFLUOR.NS",
  "CLEAN.NS",
  "FINEORG.NS",
  "NEOGEN.NS",
  "PIIND.NS",
  "RALLIS.NS",
  "SUMICHEM.NS",
  "GHCL.NS",
  "GNFC.NS",
  "GUJGAS.NS",
  "MGL.NS",
  "IGL.NS",
  "AEGASIND.NS",
  "GSPL.NS",
  "PETRONET.NS",
  "GAIL.NS",
  "HINDPETRO.NS",
  "MRPL.NS",
  "CPCL.NS",
  "CONCOR.NS",
  "GATEWAY.NS",
  "BLUEDART.NS",
  "MAHLOG.NS",
  "VRLLOG.NS",
  "ESCORTS.NS",
  "SWARAJENG.NS",
  "VSTTILLERS.NS",
  "MAHINDCIE.NS",
  "SUPRAJIT.NS",
  "ENDURANCE.NS",
  "MOTHERSON.NS",
  "SUNDRMFAST.NS",
  "BORORENEW.NS",
  "MINDA.NS",
  "CRAFTSMAN.NS",
  "GPPL.NS",
  "MAHSEAMLES.NS",
  "RATNAMANI.NS",
  "WELSPUNIND.NS",
  "HFCL.NS",
  "STLTECH.NS",
  "TEJAS.NS",
  "RAILTEL.NS",
  "IRFC.NS",
  "RVNL.NS",
  "IRCON.NS",
  "NBCC.NS",
  "NHPC.NS",
  "SJVN.NS",
  "NLCINDIA.NS",
  "RITES.NS",
  "BEML.NS",
  "BEL.NS",
  "HAL.NS",
  "COCHINSHIP.NS",
  "GRSE.NS",
  "MAZAGON.NS",
  "GESHIP.NS",
  "SCI.NS",
  "BANKBARODA.NS",
  "UNIONBANK.NS",
  "IOB.NS",
  "CENTRALBK.NS",
  "MAHABANK.NS",
  "BANKINDIA.NS",
  "PSB.NS",
  "INDIANB.NS",
  "UCOBANK.NS",
  "J&KBANK.NS",
  "DCBBANK.NS",
  "CSBBANK.NS",
  "SOUTHBANK.NS",
  "LAKSHVILAS.NS",
  "TMVFINANCE.NS",
  // SMALL CAP & PENNY
  "SUZLON.NS",
  "RPOWER.NS",
  "JPASSOCIAT.NS",
  "UNITECH.NS",
  "ITNL.NS",
  "GMRAIRPORT.NS",
  "GTLINFRA.NS",
  "DBREALTY.NS",
  "HDIL.NS",
  "SUNTECK.NS",
  "ANANTRAJ.NS",
  "KOLTEPATIL.NS",
  "MAHLIFE.NS",
  "BRIGADE.NS",
  "SOBHA.NS",
  "PRESTIGE.NS",
  "PHOENIXLTD.NS",
  "GODREJPROP.NS",
  "OBEROIRLTY.NS",
  "DLF.NS",
  "LODHA.NS",
  "SIGNATURE.NS",
  "INDIABULLS.NS",
  "GRINFRA.NS",
  "KNR.NS",
  "AHLUCONT.NS",
  "PNCINFRA.NS",
  "HGINFRA.NS",
  "CAPACITE.NS",
  "DILIPBLDRS.NS",
  "JKCEMENT.NS",
  "RAMCOCEM.NS",
  "HEIDELBERG.NS",
  "INDIACEM.NS",
  "DALMIABL.NS",
  "JKLAKSHMI.NS",
  "BIRLACORPN.NS",
  "ORIENTCEM.NS",
  "PRISMCEM.NS",
  "SAGAR.NS",
  "TASTYBITE.NS",
  "ZYDUSWELL.NS",
  "EMAMILTD.NS",
  "JYOTHYLAB.NS",
  "BAJAJCON.NS",
  "VBLLTD.NS",
  "VARUNBEV.NS",
  "KRBL.NS",
  "LTFOODS.NS",
  "DAAWAT.NS",
  "AVANTIFEED.NS",
  "WATERBASE.NS",
  "APEX.NS",
  "SATIA.NS",
  "GUJALKALI.NS",
  "DEEPAKFERT.NS",
  "CHAMBALFERT.NS",
  "COROMANDEL.NS",
  "ZUARIAGRO.NS",
  "NFL.NS",
  "PCBL.NS",
  "GRAPHITE.NS",
  "HEG.NS",
  "VENKEYS.NS",
  "SUGAMEDICO.NS",
  "MSTC.NS",
  "NMDC.NS",
  "MOIL.NS",
  "KIOCL.NS",
  "SANDUMA.NS",
  "GOLDIAM.NS",
  "PCJEWELLER.NS",
  "TRIBHOVANDAS.NS",
  "STARHEAL.NS",
  "KAYA.NS",
  // HIGH VALUE (MRF etc)
  "MRF.NS",
  "PAGEIND.NS",
  "SHREECEM.NS",
  "NESTLEIND.NS",
  "HONAUT.NS",
  "3MINDIA.NS",
  "BOSCHLTD.NS",
  "GILLETTE.NS",
  "ABBOTINDIA.NS",
  "SANOFI.NS",
];

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000;

async function fetchHistoryWithCache(
  symbol: string,
  period1: string,
  interval: "1d" | "1wk" | "1mo" = "1d",
): Promise<OHLCV[]> {
  const key = `${symbol}_${period1}_${interval}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  try {
    const result = await yf.chart(symbol, {
      period1,
      period2: new Date().toISOString().split("T")[0],
      interval,
    });
    const quotes = result.quotes || [];
    const data: OHLCV[] = quotes
      .filter((d: any) => d.close !== null && d.close > 0)
      .map((d: any) => ({
        date: new Date(d.date).toISOString().split("T")[0],
        open: d.open ?? 0,
        high: d.high ?? 0,
        low: d.low ?? 0,
        close: d.close ?? 0,
        volume: d.volume ?? 0,
      }));
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
    const q = await yf.quote(symbol);
    cache.set(key, { data: q, ts: Date.now() });
    return q;
  } catch {
    return null;
  }
}

// Filter signals by how many candles back (timeframe-aware)
function filterByCandles(
  signals: SignalMatch[],
  rawData: OHLCV[],
  period: "1d" | "1w" | "1m",
): SignalMatch[] {
  if (rawData.length === 0) return [];
  // 1d = last 5 trading days (1 week), 1w = last 8 weekly candles, 1m = last 6 monthly candles
  const candlesBack = period === "1d" ? 5 : period === "1w" ? 8 : 6;
  const cutoffIdx = Math.max(0, rawData.length - candlesBack);
  const cutoffDate = rawData[cutoffIdx].date;
  return signals.filter((s) => s.date >= cutoffDate);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "previous";
  const period = (searchParams.get("period") || "1w") as "1d" | "1w" | "1m";
  const symbol = searchParams.get("symbol");

  // Map period to Yahoo Finance interval
  const interval: "1d" | "1wk" | "1mo" =
    period === "1m" ? "1mo" : period === "1w" ? "1wk" : "1d";

  // ── Single stock detail ──────────────────────────────────────────────────
  if (symbol) {
    const p1 = new Date();
    p1.setFullYear(p1.getFullYear() - 2);
    const p1Str = p1.toISOString().split("T")[0];
    const [rawData, quote] = await Promise.all([
      fetchHistoryWithCache(symbol, p1Str, "1d"),
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

  // ── Determine lookback period ────────────────────────────────────────────
  const p1 = new Date();
  if (mode === "live") {
    p1.setDate(p1.getDate() - 90); // live always daily, 90 days back
  } else if (period === "1d") {
    p1.setDate(p1.getDate() - 90);
  } else if (period === "1w") {
    p1.setDate(p1.getDate() - 250); // ~35 weekly candles
  } else {
    p1.setMonth(p1.getMonth() - 36); // 36 monthly candles
  }
  const p1Str = p1.toISOString().split("T")[0];

  // Live mode always uses daily candles for precision
  const fetchInterval: "1d" | "1wk" | "1mo" = mode === "live" ? "1d" : interval;

  // ── Scan universe in batches ─────────────────────────────────────────────
  const results: RecommendedStock[] = [];
  const BATCH = 8;
  const universe = [...new Set(SCAN_UNIVERSE)]; // deduplicate

  for (let i = 0; i < universe.length; i += BATCH) {
    const batch = universe.slice(i, i + BATCH);
    const batchResults = await Promise.allSettled(
      batch.map(async (sym) => {
        const [rawData, quote] = await Promise.all([
          fetchHistoryWithCache(sym, p1Str, fetchInterval),
          fetchQuoteWithCache(sym),
        ]);
        if (rawData.length < 20) return null;

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
          relevantSignals = filterByCandles(allSignals, rawData, period);
        }
        if (!relevantSignals.length) return null;

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
          bbData: bbData.slice(-60),
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

  results.sort((a, b) => {
    const confDiff = b.latestSignal.confidence - a.latestSignal.confidence;
    if (confDiff !== 0) return confDiff;
    return a.daysSinceSignal - b.daysSinceSignal;
  });

  return NextResponse.json(results.slice(0, 50));
}
