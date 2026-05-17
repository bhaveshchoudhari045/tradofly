import type {
  HistoricalData,
  TechnicalSignal,
  PatternDetection,
} from "@/types";

// Simple Moving Average
export function calculateSMA(
  data: number[],
  period: number,
): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return sum / period;
  });
}

// Exponential Moving Average
export function calculateEMA(
  data: number[],
  period: number,
): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(period - 1).fill(null);
  if (data.length < period) return new Array(data.length).fill(null);

  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);

  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// MACD
export function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12.map((v, i) =>
    v !== null && ema26[i] !== null ? v - ema26[i]! : null,
  );
  const validMacd = macd.filter((v): v is number => v !== null);
  const signalRaw = calculateEMA(validMacd, 9);
  const signal: (number | null)[] = new Array(
    macd.length - validMacd.length,
  ).fill(null);
  signalRaw.forEach((v) => signal.push(v));
  const histogram = macd.map((v, i) =>
    v !== null && signal[i] !== null ? v - signal[i]! : null,
  );
  return { macd, signal, histogram };
}

// RSI
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null);
  const changes = closes.map((c, i) => (i === 0 ? 0 : c - closes[i - 1]));

  let avgGain =
    changes
      .slice(1, period + 1)
      .filter((c) => c > 0)
      .reduce((a, b) => a + b, 0) / period;
  let avgLoss =
    Math.abs(
      changes
        .slice(1, period + 1)
        .filter((c) => c < 0)
        .reduce((a, b) => a + b, 0),
    ) / period;

  if (avgLoss === 0) {
    result.push(100);
  } else {
    result.push(100 - 100 / (1 + avgGain / avgLoss));
  }

  for (let i = period + 1; i < closes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    if (avgLoss === 0) result.push(100);
    else result.push(100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// Bollinger Bands
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
) {
  const sma = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const upper1: (number | null)[] = [];
  const lower1: (number | null)[] = [];

  closes.forEach((_, i) => {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      upper1.push(null);
      lower1.push(null);
      return;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const variance =
      slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + stdDevMultiplier * std);
    lower.push(mean - stdDevMultiplier * std);
    upper1.push(mean + std);
    lower1.push(mean - std);
  });
  return { sma, upper, lower, upper1, lower1 };
}

// Stochastic Oscillator
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
) {
  const kValues: (number | null)[] = new Array(kPeriod - 1).fill(null);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    kValues.push(
      highest === lowest
        ? 50
        : ((closes[i] - lowest) / (highest - lowest)) * 100,
    );
  }
  const validK = kValues.filter((v): v is number => v !== null);
  const dRaw = calculateSMA(validK, dPeriod);
  const dValues: (number | null)[] = new Array(
    kValues.length - validK.length,
  ).fill(null);
  dRaw.forEach((v) => dValues.push(v));
  return { k: kValues, d: dValues };
}

// OBV
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  const obv = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv.push(obv[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) obv.push(obv[i - 1] - volumes[i]);
    else obv.push(obv[i - 1]);
  }
  return obv;
}

// VWAP (daily approx from OHLCV)
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
): number[] {
  let cumulativeTPV = 0,
    cumulativeVol = 0;
  return closes.map((_, i) => {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += tp * volumes[i];
    cumulativeVol += volumes[i];
    return cumulativeVol === 0 ? closes[i] : cumulativeTPV / cumulativeVol;
  });
}

// Enrich historical data with all indicators
export function enrichWithIndicators(
  raw: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[],
): HistoricalData[] {
  const closes = raw.map((d) => d.close);
  const highs = raw.map((d) => d.high);
  const lows = raw.map((d) => d.low);
  const volumes = raw.map((d) => d.volume);

  const ma20 = calculateSMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);
  const ma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const { macd, signal, histogram } = calculateMACD(closes);
  const rsi = calculateRSI(closes);
  const bb = calculateBollingerBands(closes);
  const stoch = calculateStochastic(highs, lows, closes);
  const obv = calculateOBV(closes, volumes);
  const vwap = calculateVWAP(highs, lows, closes, volumes);

  return raw.map((d, i) => ({
    ...d,
    adjClose: d.close,
    ma20: ma20[i] ?? undefined,
    ma50: ma50[i] ?? undefined,
    ma200: ma200[i] ?? undefined,
    ema12: ema12[i] ?? undefined,
    ema26: ema26[i] ?? undefined,
    macd: macd[i] ?? undefined,
    macdSignal: signal[i] ?? undefined,
    macdHist: histogram[i] ?? undefined,
    rsi: rsi[i] ?? undefined,
    upperBand: bb.upper[i] ?? undefined,
    lowerBand: bb.lower[i] ?? undefined,
    upperBand1: bb.upper1[i] ?? undefined,
    lowerBand1: bb.lower1[i] ?? undefined,
    stochK: stoch.k[i] ?? undefined,
    stochD: stoch.d[i] ?? undefined,
    obv: obv[i],
    vwap: vwap[i],
  }));
}

// Generate technical signals
export function generateSignals(data: HistoricalData[]): TechnicalSignal[] {
  if (data.length < 5) return [];
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  const signals: TechnicalSignal[] = [];

  // RSI
  if (latest.rsi !== undefined) {
    const rsiVal = latest.rsi;
    signals.push({
      indicator: "RSI (14)",
      value: rsiVal.toFixed(2),
      signal:
        rsiVal < 30
          ? "STRONG_BUY"
          : rsiVal < 45
            ? "BUY"
            : rsiVal > 70
              ? "STRONG_SELL"
              : rsiVal > 55
                ? "SELL"
                : "NEUTRAL",
      description:
        rsiVal < 30
          ? "Oversold — potential reversal"
          : rsiVal > 70
            ? "Overbought — consider selling"
            : "Neutral momentum",
    });
  }

  // MACD
  if (
    latest.macd !== undefined &&
    latest.macdSignal !== undefined &&
    prev?.macd !== undefined &&
    prev?.macdSignal !== undefined
  ) {
    const crossed =
      latest.macd > latest.macdSignal && prev.macd < prev.macdSignal;
    const crossedDown =
      latest.macd < latest.macdSignal && prev.macd > prev.macdSignal;
    signals.push({
      indicator: "MACD",
      value: latest.macd.toFixed(3),
      signal: crossed
        ? "BUY"
        : crossedDown
          ? "SELL"
          : latest.macd > latest.macdSignal
            ? "BUY"
            : "SELL",
      description: crossed
        ? "Bullish crossover"
        : crossedDown
          ? "Bearish crossover"
          : latest.macd > latest.macdSignal
            ? "Above signal line"
            : "Below signal line",
    });
  }

  // Moving Average Trend
  if (latest.ma20 && latest.ma50) {
    signals.push({
      indicator: "MA 20/50",
      value: `${latest.ma20.toFixed(2)} / ${latest.ma50.toFixed(2)}`,
      signal:
        latest.close > latest.ma20 && latest.ma20 > latest.ma50
          ? "STRONG_BUY"
          : latest.close > latest.ma20
            ? "BUY"
            : latest.close < latest.ma20 && latest.ma20 < latest.ma50
              ? "STRONG_SELL"
              : "SELL",
      description:
        latest.close > latest.ma50
          ? "Price above long-term MA (uptrend)"
          : "Price below long-term MA (downtrend)",
    });
  }

  // Bollinger Bands
  if (latest.upperBand && latest.lowerBand) {
    const bbWidth =
      (latest.upperBand - latest.lowerBand) / (latest.ma20 || latest.close);
    signals.push({
      indicator: "Bollinger Bands",
      value: bbWidth.toFixed(4),
      signal:
        latest.close < latest.lowerBand
          ? "BUY"
          : latest.close > latest.upperBand
            ? "SELL"
            : "NEUTRAL",
      description:
        latest.close < latest.lowerBand
          ? "Price below lower band — oversold"
          : latest.close > latest.upperBand
            ? "Price above upper band — overbought"
            : `Bandwidth: ${(bbWidth * 100).toFixed(1)}% — volatility ${bbWidth < 0.03 ? "low (squeeze)" : "normal"}`,
    });
  }

  // Stochastic
  if (latest.stochK !== undefined && latest.stochD !== undefined) {
    signals.push({
      indicator: "Stochastic (14,3)",
      value: `${latest.stochK.toFixed(1)} / ${latest.stochD.toFixed(1)}`,
      signal:
        latest.stochK < 20
          ? "BUY"
          : latest.stochK > 80
            ? "SELL"
            : latest.stochK > latest.stochD
              ? "BUY"
              : "SELL",
      description:
        latest.stochK < 20
          ? "Oversold zone"
          : latest.stochK > 80
            ? "Overbought zone"
            : latest.stochK > latest.stochD
              ? "Momentum increasing"
              : "Momentum decreasing",
    });
  }

  // VWAP
  if (latest.vwap) {
    signals.push({
      indicator: "VWAP",
      value: latest.vwap.toFixed(2),
      signal: latest.close > latest.vwap ? "BUY" : "SELL",
      description:
        latest.close > latest.vwap
          ? "Price above VWAP — institutional buying"
          : "Price below VWAP — institutional selling",
    });
  }

  return signals;
}

// Pattern detection (Bollinger Band accident pattern from original code)
export function detectPatterns(data: HistoricalData[]): PatternDetection[] {
  const patterns: PatternDetection[] = [];
  const MIN_IDX = 11;
  for (let i = MIN_IDX; i < data.length; i++) {
    const d = data[i]; // day 0 (most recent in window)
    const d1 = data[i - 1];
    const d2 = data[i - 2];
    const d3 = data[i - 3];
    const d10 = data[i - 10];

    // Single-day Bollinger reversal
    if (
      d10.lowerBand &&
      d10.low < d10.lowerBand &&
      d.open < d.close &&
      d.low > d.lowerBand! &&
      d.lowerBand1 &&
      d.close > d.lowerBand1
    ) {
      patterns.push({
        date: d.date,
        pattern: "Bollinger Reversal (1-day)",
        signal: "BUY",
        confidence: 72,
        description: "Price breached lower band then recovered above 1σ",
      });
    }

    // Multi-day recovery pattern
    if (
      d10.lowerBand &&
      d10.low < d10.lowerBand &&
      d1.open < d1.close &&
      d2.open < d2.close &&
      d3.open < d3.close &&
      d.close > d1.close
    ) {
      patterns.push({
        date: d.date,
        pattern: "Multi-day Bollinger Recovery",
        signal: "BUY",
        confidence: 85,
        description: "Sustained recovery from lower band over 3+ days",
      });
    }

    // Bearish break above upper band
    if (d.upperBand && d.close > d.upperBand && d1.close < d1.upperBand!) {
      patterns.push({
        date: d.date,
        pattern: "Upper Band Breakout",
        signal: "SELL",
        confidence: 68,
        description:
          "Price broke above upper Bollinger Band — potential reversal",
      });
    }

    // Golden Cross (MA20 crosses MA50 upward)
    if (
      d.ma20 &&
      d.ma50 &&
      d1.ma20 &&
      d1.ma50 &&
      d.ma20 > d.ma50 &&
      d1.ma20 < d1.ma50
    ) {
      patterns.push({
        date: d.date,
        pattern: "Golden Cross",
        signal: "BUY",
        confidence: 80,
        description: "MA20 crossed above MA50 — bullish trend signal",
      });
    }

    // Death Cross
    if (
      d.ma20 &&
      d.ma50 &&
      d1.ma20 &&
      d1.ma50 &&
      d.ma20 < d.ma50 &&
      d1.ma20 > d1.ma50
    ) {
      patterns.push({
        date: d.date,
        pattern: "Death Cross",
        signal: "SELL",
        confidence: 78,
        description: "MA20 crossed below MA50 — bearish trend signal",
      });
    }

    // RSI Divergence (price makes new low but RSI doesn't)
    if (i >= 5 && d.rsi && data[i - 5].rsi) {
      if (d.close < data[i - 5].close && d.rsi > data[i - 5].rsi!) {
        patterns.push({
          date: d.date,
          pattern: "Bullish RSI Divergence",
          signal: "BUY",
          confidence: 75,
          description: "Price at lower level but RSI higher — hidden strength",
        });
      }
    }
  }
  // Return last 20 patterns (most recent)
  return patterns.slice(-20).reverse();
}

// Forecast using simple linear regression + Holt-Winters-like smoothing
export function forecastPrice(closes: number[], days = 10): number[] {
  const n = Math.min(closes.length, 60);
  const recent = closes.slice(-n);

  // Linear regression
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b) / n;
  const slope =
    recent.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0) /
    recent.reduce((sum, _, x) => sum + Math.pow(x - xMean, 2), 0);

  // Add some mean-reversion tendency
  const forecast = [];
  const lastPrice = closes[closes.length - 1];
  const alpha = 0.3; // smoothing
  let current = lastPrice;

  for (let i = 1; i <= days; i++) {
    const linear = lastPrice + slope * i;
    const smoothed = alpha * linear + (1 - alpha) * current;
    // Add slight volatility noise based on recent std dev
    const std = Math.sqrt(
      recent.slice(-20).reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0) /
        20,
    );
    const noise = (Math.random() - 0.5) * std * 0.1;
    current = smoothed + noise;
    forecast.push(Math.max(0, current));
  }
  return forecast;
}

export function formatCurrency(value: number, currency = "INR"): string {
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  return `₹${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}
