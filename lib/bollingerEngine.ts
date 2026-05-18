// lib/bollingerEngine.ts — null-safe, production-grade

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BBResult {
  date: string;
  close: number;
  sma: number;
  upper2: number;
  lower2: number;
  upper1: number;
  lower1: number;
  stdDev: number;
  bandwidth: number;
  percentB: number;
}

export interface SignalMatch {
  date: string;
  index: number;
  type:
    | "SINGLE_DAY"
    | "MULTI_DAY"
    | "SQUEEZE_BREAK"
    | "W_BOTTOM"
    | "UPPER_BREAK";
  direction: "BUY" | "SELL";
  confidence: number;
  entryPrice: number;
  lower2: number;
  upper1: number;
  upper2: number;
  sma: number;
  targetMin: number;
  targetMid: number;
  targetMax: number;
  stopLoss: number;
  riskRewardRatio: number;
  conditionDesc: string;
  percentB: number;
  bandwidth: number;
}

export interface RecommendedStock {
  symbol: string;
  name: string;
  latestSignal: SignalMatch;
  allSignals: SignalMatch[];
  currentPrice: number;
  changePercent: number;
  bbData: BBResult[];
  rawData: OHLCV[];
  potentialGain: number;
  potentialGainMax: number;
  daysSinceSignal: number;
  signalAge: "today" | "fresh" | "recent" | "old";
  lotSize: number;
}

function safeNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

export function calcBB(data: OHLCV[], period = 20, mult = 2): BBResult[] {
  if (!data || data.length === 0) return [];
  const closes = data.map((d) => safeNum(d.close));
  const out: BBResult[] = [];

  for (let i = 0; i < closes.length; i++) {
    const close = closes[i];
    if (i < period - 1 || !isFinite(close) || close <= 0) {
      out.push({
        date: data[i].date,
        close,
        sma: 0,
        upper2: 0,
        lower2: 0,
        upper1: 0,
        lower1: 0,
        stdDev: 0,
        bandwidth: 0,
        percentB: 0.5,
      });
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    if (slice.some((v) => !isFinite(v) || v <= 0)) {
      out.push({
        date: data[i].date,
        close,
        sma: 0,
        upper2: 0,
        lower2: 0,
        upper1: 0,
        lower1: 0,
        stdDev: 0,
        bandwidth: 0,
        percentB: 0.5,
      });
      continue;
    }
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const u2 = mean + mult * std;
    const l2 = mean - mult * std;
    const u1 = mean + std;
    const l1 = mean - std;
    const bw = mean > 0 ? (u2 - l2) / mean : 0;
    const pctB = u2 - l2 > 0 ? (close - l2) / (u2 - l2) : 0.5;
    out.push({
      date: data[i].date,
      close,
      sma: mean,
      upper2: u2,
      lower2: l2,
      upper1: u1,
      lower1: l1,
      stdDev: std,
      bandwidth: bw,
      percentB: pctB,
    });
  }
  return out;
}

function calcTargets(bb: BBResult, entry: number) {
  const tMin = bb.sma > 0 ? (bb.sma + bb.upper1) / 2 : entry * 1.02;
  const tMid = bb.upper1 > 0 ? bb.upper1 : entry * 1.04;
  const tMax = bb.upper2 > 0 ? bb.upper2 : entry * 1.07;
  const sl = bb.lower2 > 0 ? bb.lower2 * 0.98 : entry * 0.95;
  const reward = tMid - entry;
  const risk = entry - sl;
  return {
    lower2: bb.lower2,
    upper1: bb.upper1,
    upper2: bb.upper2,
    sma: bb.sma,
    targetMin: tMin,
    targetMid: tMid,
    targetMax: tMax,
    stopLoss: sl,
    riskRewardRatio: risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0,
    percentB: bb.percentB,
    bandwidth: bb.bandwidth,
  };
}

export function detectBBSignals(
  data: OHLCV[],
  bbData: BBResult[],
): SignalMatch[] {
  if (!data || !bbData || data.length < 25) return [];
  const signals: SignalMatch[] = [];
  const MIN = 22;

  for (let i = MIN; i < data.length; i++) {
    const d = data[i];
    const bb = bbData[i];
    const bbPrev = bbData[i - 1];
    const d1 = data[i - 1];
    const d2 = data[i - 2];
    const d3 = data[i - 3];

    if (!bb?.sma || !bbPrev?.sma || bb.sma <= 0) continue;
    if (!d?.close || !d1?.close || !d2?.close || !d3?.close) continue;

    const entry = safeNum(d.close);
    if (entry <= 0) continue;

    const targets = calcTargets(bb, entry);

    // Signal 1: single-day reversal
    if (i >= 10) {
      const d10 = data[i - 10];
      const bb10 = bbData[i - 10];
      if (
        d10 &&
        bb10?.lower2 > 0 &&
        safeNum(d10.low) < bb10.lower2 &&
        d.close > d.open &&
        bb.lower2 > 0 &&
        safeNum(d.low) > bb.lower2 &&
        bb.lower1 > 0 &&
        d.close > bb.lower1 &&
        bb.percentB < 0.3
      ) {
        signals.push({
          date: d.date,
          index: i,
          type: "SINGLE_DAY",
          direction: "BUY",
          confidence: 72,
          entryPrice: entry,
          ...targets,
          conditionDesc:
            "Touched lower band, recovered above −1σ — single-day reversal",
        });
      }
    }

    // Signal 2: multi-day recovery
    if (i >= 12) {
      const bb10 = bbData[i - 10];
      const d10 = data[i - 10];
      if (
        d10 &&
        bb10?.lower2 > 0 &&
        safeNum(d10.low) < bb10.lower2 &&
        d1.close > d1.open &&
        d2.close > d2.open &&
        d3.close > d3.open &&
        d.close > d1.close
      ) {
        signals.push({
          date: d.date,
          index: i,
          type: "MULTI_DAY",
          direction: "BUY",
          confidence: 85,
          entryPrice: entry,
          ...targets,
          conditionDesc: "3+ consecutive bullish bars after lower band touch",
        });
      }
    }

    // Signal 3: squeeze breakout
    if (i >= MIN + 5) {
      const bwHist = bbData
        .slice(i - 6, i)
        .map((b) => b.bandwidth)
        .filter((v) => v > 0);
      if (bwHist.length >= 4) {
        const avgBw = bwHist.reduce((a, b) => a + b, 0) / bwHist.length;
        const squeezed = bwHist.slice(0, -1).every((bw) => bw < avgBw * 0.9);
        if (
          squeezed &&
          bb.bandwidth > bbPrev.bandwidth * 1.1 &&
          d.close > bb.sma
        ) {
          signals.push({
            date: d.date,
            index: i,
            type: "SQUEEZE_BREAK",
            direction: "BUY",
            confidence: 80,
            entryPrice: entry,
            ...targets,
            conditionDesc: "Bollinger squeeze resolved with bullish expansion",
          });
        }
      }
    }

    // Signal 4: W-bottom
    if (i >= MIN + 8) {
      const slice8 = bbData.slice(i - 8, i - 3);
      const firstTouch = slice8.some(
        (b, j) => b.lower2 > 0 && safeNum(data[i - 8 + j]?.low) < b.lower2,
      );
      const bb2 = bbData[i - 2];
      const bb1 = bbData[i - 1];
      const secondTouch =
        (bb2?.lower2 > 0 && safeNum(d2.low) < bb2.lower2) ||
        (bb1?.lower2 > 0 && safeNum(d1.low) < bb1.lower2);
      if (
        firstTouch &&
        secondTouch &&
        bb.percentB < 0.35 &&
        d.close > d1.close
      ) {
        signals.push({
          date: d.date,
          index: i,
          type: "W_BOTTOM",
          direction: "BUY",
          confidence: 88,
          entryPrice: entry,
          ...targets,
          conditionDesc:
            "W-bottom — double lower band test with confirmed reversal",
        });
      }
    }

    // Signal 5: upper break (sell)
    if (
      bb.upper2 > 0 &&
      bbPrev.upper2 > 0 &&
      d.close > bb.upper2 &&
      d1.close < bbPrev.upper2
    ) {
      const sellTargets = {
        lower2: bb.lower2,
        upper1: bb.upper1,
        upper2: bb.upper2,
        sma: bb.sma,
        targetMin: bb.upper1,
        targetMid: bb.sma,
        targetMax: bb.lower1,
        stopLoss: entry * 1.04,
        riskRewardRatio: 1.0,
        percentB: bb.percentB,
        bandwidth: bb.bandwidth,
      };
      signals.push({
        date: d.date,
        index: i,
        type: "UPPER_BREAK",
        direction: "SELL",
        confidence: 65,
        entryPrice: entry,
        ...sellTargets,
        conditionDesc:
          "Price broke above upper BB — potential overbought reversal",
      });
    }
  }

  return signals;
}

export interface LotROI {
  lots: number;
  invested: number;
  targetMinReturn: number;
  targetMidReturn: number;
  targetMaxReturn: number;
  profitMin: number;
  profitMid: number;
  profitMax: number;
  pctMin: number;
  pctMid: number;
  pctMax: number;
}

export function calcLotROI(
  entry: number,
  targetMin: number,
  targetMid: number,
  targetMax: number,
): LotROI[] {
  const LOT_SIZES = [1, 5, 10, 25, 50, 100, 500, 1000];
  const e = safeNum(entry);
  const tMin = safeNum(targetMin);
  const tMid = safeNum(targetMid);
  const tMax = safeNum(targetMax);
  if (e <= 0)
    return LOT_SIZES.map((lots) => ({
      lots,
      invested: 0,
      targetMinReturn: 0,
      targetMidReturn: 0,
      targetMaxReturn: 0,
      profitMin: 0,
      profitMid: 0,
      profitMax: 0,
      pctMin: 0,
      pctMid: 0,
      pctMax: 0,
    }));

  return LOT_SIZES.map((lots) => {
    const invested = e * lots;
    const tMinRet = tMin * lots;
    const tMidRet = tMid * lots;
    const tMaxRet = tMax * lots;
    const pMin = tMinRet - invested;
    const pMid = tMidRet - invested;
    const pMax = tMaxRet - invested;
    return {
      lots,
      invested,
      targetMinReturn: tMinRet,
      targetMidReturn: tMidRet,
      targetMaxReturn: tMaxRet,
      profitMin: pMin,
      profitMid: pMid,
      profitMax: pMax,
      pctMin: (pMin / invested) * 100,
      pctMid: (pMid / invested) * 100,
      pctMax: (pMax / invested) * 100,
    };
  });
}

export function classifyAge(signalDate: string): {
  daysSince: number;
  age: "today" | "fresh" | "recent" | "old";
} {
  try {
    const now = new Date();
    const sd = new Date(signalDate);
    const diffMs = now.getTime() - sd.getTime();
    const daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const age =
      daysSince === 0
        ? "today"
        : daysSince <= 2
          ? "fresh"
          : daysSince <= 7
            ? "recent"
            : "old";
    return { daysSince, age };
  } catch {
    return { daysSince: 999, age: "old" };
  }
}

export function filterByPeriod(
  signals: SignalMatch[],
  period: "1d" | "1w" | "1m",
): SignalMatch[] {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "1d") cutoff.setDate(now.getDate() - 1);
  else if (period === "1w") cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(now.getDate() - 30);
  return signals.filter((s) => {
    try {
      return new Date(s.date) >= cutoff;
    } catch {
      return false;
    }
  });
}

export function splitLiveSignals(
  signals: SignalMatch[],
  bbData: BBResult[],
): { confirmed: SignalMatch[]; approaching: SignalMatch[] } {
  const today = new Date().toISOString().split("T")[0];
  const confirmed = signals.filter((s) => s.date === today);
  const approaching: SignalMatch[] = [];

  if (!confirmed.length && bbData.length > 0) {
    const latestBB = bbData[bbData.length - 1];
    if (latestBB?.sma > 0 && latestBB.percentB < 0.2) {
      const entry = latestBB.close;
      if (entry > 0) {
        const targets = calcTargets(latestBB, entry);
        const conf = Math.round(
          Math.min(80, 40 + (0.2 - latestBB.percentB) * 200),
        );
        approaching.push({
          date: today,
          index: bbData.length - 1,
          type: "SINGLE_DAY",
          direction: "BUY",
          confidence: conf,
          entryPrice: entry,
          ...targets,
          conditionDesc: `Near lower band (${(latestBB.percentB * 100).toFixed(1)}%B) — setup forming`,
        });
      }
    }
  }

  return { confirmed, approaching };
}
