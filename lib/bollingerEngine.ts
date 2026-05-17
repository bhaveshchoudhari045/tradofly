// lib/bollingerEngine.ts
// Core Bollinger Band accident-pattern recommendation engine.
// Strategy: Identifies stocks where price has touched/breached the lower Bollinger Band
// and is showing signs of reversal — the "accident recovery" pattern.

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
  upper2: number; // +2σ
  lower2: number; // -2σ
  upper1: number; // +1σ
  lower1: number; // -1σ
  stdDev: number;
  bandwidth: number; // (upper2 - lower2) / sma
  percentB: number; // (close - lower2) / (upper2 - lower2), 0=lower, 1=upper
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
  confidence: number; // 0-100
  entryPrice: number;
  lower2: number;
  upper1: number;
  upper2: number;
  sma: number;
  targetMin: number; // between sma and upper1
  targetMid: number; // between upper1 and upper2 (primary target)
  targetMax: number; // above upper2 (stretch target)
  stopLoss: number; // just below lower2
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
  // computed
  potentialGain: number; // % from entry to targetMid
  potentialGainMax: number; // % from entry to targetMax
  daysSinceSignal: number;
  signalAge: "today" | "fresh" | "recent" | "old";
  // Lot-based ROI
  lotSize: number; // approximate (price-based, using 1 share = 1 unit)
}

/** Calculate Bollinger Bands for a series of closes */
export function calcBB(data: OHLCV[], period = 20, mult = 2): BBResult[] {
  const closes = data.map((d) => d.close);
  const out: BBResult[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push({
        date: data[i].date,
        close: closes[i],
        sma: 0,
        upper2: 0,
        lower2: 0,
        upper1: 0,
        lower1: 0,
        stdDev: 0,
        bandwidth: 0,
        percentB: 0,
      });
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const u2 = mean + mult * std;
    const l2 = mean - mult * std;
    const u1 = mean + std;
    const l1 = mean - std;
    const bw = std > 0 ? (u2 - l2) / mean : 0;
    const pctB = u2 - l2 > 0 ? (closes[i] - l2) / (u2 - l2) : 0.5;
    out.push({
      date: data[i].date,
      close: closes[i],
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

/** Detect all Bollinger-based signals in an enriched dataset */
export function detectBBSignals(
  data: OHLCV[],
  bbData: BBResult[],
): SignalMatch[] {
  const signals: SignalMatch[] = [];
  const MIN = 22; // need enough history

  for (let i = MIN; i < data.length; i++) {
    const d = data[i];
    const bb = bbData[i];
    const bbPrev = bbData[i - 1];
    const bbPrev2 = bbData[i - 2];
    const bbPrev3 = bbData[i - 3];
    const dPrev = data[i - 1];
    const dPrev2 = data[i - 2];
    const dPrev3 = data[i - 3];

    if (!bb.sma || !bbPrev.sma) continue;

    const entry = d.close;
    const targets = calcTargets(bb, entry);

    // ─── SIGNAL 1: Single-day reversal from lower band ───────────────────────
    // Price went below lower band and came back above lower-1σ in same candle
    if (
      dPrev.low < bbPrev.lower2 &&
      d.close > d.open &&
      d.close > bb.lower1 &&
      d.low > bb.lower2 &&
      bb.percentB < 0.25
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
          "Touched lower band, closed above −1σ — single-day reversal",
      });
    }

    // ─── SIGNAL 2: Multi-day recovery ────────────────────────────────────────
    // 3+ consecutive bullish candles after a lower-band touch 10 bars ago
    const lookback = bbData[i - 10];
    if (
      lookback?.sma &&
      data[i - 10].low < lookback.lower2 &&
      dPrev.close > dPrev.open &&
      dPrev2.close > dPrev2.open &&
      dPrev3.close > dPrev3.open &&
      d.close > dPrev.close
    ) {
      signals.push({
        date: d.date,
        index: i,
        type: "MULTI_DAY",
        direction: "BUY",
        confidence: 85,
        entryPrice: entry,
        ...targets,
        conditionDesc:
          "3+ bullish candles recovering from lower band — sustained reversal",
      });
    }

    // ─── SIGNAL 3: Bollinger Squeeze breakout ────────────────────────────────
    // Bandwidth narrowed for 5+ bars then expanded bullishly
    if (i >= MIN + 5) {
      const bwHistory = bbData.slice(i - 6, i).map((b) => b.bandwidth);
      const avgBw = bwHistory.reduce((a, b) => a + b, 0) / bwHistory.length;
      const squeezed = bwHistory.every((bw) => bw < avgBw * 0.85);
      if (
        squeezed &&
        bb.bandwidth > bbPrev.bandwidth * 1.15 &&
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
          conditionDesc:
            "Bollinger squeeze resolved with bullish breakout above midline",
        });
      }
    }

    // ─── SIGNAL 4: W-Bottom (double lower band touch) ────────────────────────
    if (i >= MIN + 8) {
      const firstTouch = bbData
        .slice(i - 8, i - 3)
        .findIndex((b, j) => data[i - 8 + j].low < b.lower2);
      const secondTouch =
        data[i - 2].low < bbPrev2.lower2 || data[i - 1].low < bbPrev.lower2;
      if (
        firstTouch >= 0 &&
        secondTouch &&
        bb.percentB < 0.3 &&
        d.close > dPrev.close
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
            "W-bottom pattern — double lower band touch with confirmed reversal",
        });
      }
    }

    // ─── SIGNAL 5: Upper band break (potential overbought) ────────────────────
    if (bbPrev.close < bbPrev.upper2 && d.close > bb.upper2) {
      const t = calcTargets(bb, entry, true);
      signals.push({
        date: d.date,
        index: i,
        type: "UPPER_BREAK",
        direction: "SELL",
        confidence: 65,
        entryPrice: entry,
        ...t,
        conditionDesc:
          "Price broke above upper band — potential reversal or continuation",
      });
    }
  }

  return signals;
}

function calcTargets(bb: BBResult, entry: number, isSell = false) {
  if (isSell) {
    return {
      lower2: bb.lower2,
      upper1: bb.upper1,
      upper2: bb.upper2,
      sma: bb.sma,
      targetMin: bb.upper1,
      targetMid: bb.sma,
      targetMax: bb.lower1,
      stopLoss: entry * 1.04,
      riskRewardRatio: parseFloat(
        ((entry - bb.sma) / (bb.upper2 * 1.04 - entry)).toFixed(2),
      ),
      percentB: bb.percentB,
      bandwidth: bb.bandwidth,
    };
  }
  const tMin = (bb.sma + bb.upper1) / 2;
  const tMid = bb.upper1;
  const tMax = bb.upper2;
  const reward = tMid - entry;
  const risk = entry - bb.lower2 * 0.98;
  return {
    lower2: bb.lower2,
    upper1: bb.upper1,
    upper2: bb.upper2,
    sma: bb.sma,
    targetMin: tMin,
    targetMid: tMid,
    targetMax: tMax,
    stopLoss: bb.lower2 * 0.98,
    riskRewardRatio: risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0,
    percentB: bb.percentB,
    bandwidth: bb.bandwidth,
  };
}

/** Compute lot-based ROI table */
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
  stopLoss: number,
): LotROI[] {
  const LOT_SIZES = [1, 5, 10, 25, 50, 100, 500, 1000];
  return LOT_SIZES.map((lots) => {
    const invested = entry * lots;
    const tMinReturn = targetMin * lots;
    const tMidReturn = targetMid * lots;
    const tMaxReturn = targetMax * lots;
    const profitMin = tMinReturn - invested;
    const profitMid = tMidReturn - invested;
    const profitMax = tMaxReturn - invested;
    return {
      lots,
      invested,
      targetMinReturn: tMinReturn,
      targetMidReturn: tMidReturn,
      targetMaxReturn: tMaxReturn,
      profitMin,
      profitMid,
      profitMax,
      pctMin: invested > 0 ? (profitMin / invested) * 100 : 0,
      pctMid: invested > 0 ? (profitMid / invested) * 100 : 0,
      pctMax: invested > 0 ? (profitMax / invested) * 100 : 0,
    };
  });
}

/** Classify signal age */
export function classifyAge(signalDate: string): {
  daysSince: number;
  age: "today" | "fresh" | "recent" | "old";
} {
  const now = new Date();
  const sd = new Date(signalDate);
  const diffMs = now.getTime() - sd.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const age =
    daysSince === 0
      ? "today"
      : daysSince <= 2
        ? "fresh"
        : daysSince <= 7
          ? "recent"
          : "old";
  return { daysSince, age };
}

/** Filter signals by period */
export function filterByPeriod(
  signals: SignalMatch[],
  period: "1d" | "1w" | "1m",
): SignalMatch[] {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "1d") cutoff.setDate(now.getDate() - 1);
  else if (period === "1w") cutoff.setDate(now.getDate() - 7);
  else cutoff.setDate(now.getDate() - 30);
  return signals.filter((s) => new Date(s.date) >= cutoff);
}

/** Live mode: split today's signals into "confirmed" vs "approaching" */
export function splitLiveSignals(
  signals: SignalMatch[],
  bbData: BBResult[],
): { confirmed: SignalMatch[]; approaching: SignalMatch[] } {
  // Confirmed = signals from last 3 trading days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const confirmed = signals.filter((s) => s.date >= cutoffStr);

  // Approaching = latest bar near lower band but no confirmed signal
  const latestBB = bbData[bbData.length - 1];
  const approaching: SignalMatch[] = [];

  if (latestBB?.sma > 0) {
    const pctB = latestBB.percentB;
    if (pctB < 0.3 && confirmed.length === 0) {
      const targets = calcTargets(latestBB, latestBB.close);
      const today = new Date().toISOString().split("T")[0];
      approaching.push({
        date: today,
        index: bbData.length - 1,
        type: "SINGLE_DAY",
        direction: "BUY",
        confidence: Math.round(40 + (0.3 - pctB) * 200),
        entryPrice: latestBB.close,
        ...targets,
        conditionDesc: `Price approaching lower band — %B at ${(pctB * 100).toFixed(1)}%, setup forming`,
      });
    }
  }
  return { confirmed, approaching };
}
