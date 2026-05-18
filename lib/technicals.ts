// lib/technicals.ts — fixed with full null guards + real-time indicators

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  ema12?: number;
  ema26?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  rsi?: number;
  upperBand?: number;
  lowerBand?: number;
  upperBand1?: number;
  lowerBand1?: number;
  stochK?: number;
  stochD?: number;
  obv?: number;
  vwap?: number;
  adx?: number;
}

export interface TechnicalSignal {
  indicator: string;
  value: number | string;
  signal: "BUY" | "SELL" | "NEUTRAL" | "STRONG_BUY" | "STRONG_SELL";
  description: string;
}

export interface PatternDetection {
  date: string;
  pattern: string;
  signal: "BUY" | "SELL";
  confidence: number;
  description: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function safeNum(v: unknown): number {
  if (
    v === null ||
    v === undefined ||
    isNaN(v as number) ||
    !isFinite(v as number)
  )
    return 0;
  return v as number;
}

// ── SMA ───────────────────────────────────────────────────────────────────────
export function calculateSMA(
  data: number[],
  period: number,
): (number | undefined)[] {
  return data.map((_, i) => {
    if (i < period - 1) return undefined;
    const slice = data.slice(i - period + 1, i + 1);
    if (slice.some((v) => !isFinite(v))) return undefined;
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// ── EMA ───────────────────────────────────────────────────────────────────────
export function calculateEMA(
  data: number[],
  period: number,
): (number | undefined)[] {
  if (data.length < period) return new Array(data.length).fill(undefined);
  const k = 2 / (period + 1);
  const result: (number | undefined)[] = new Array(period - 1).fill(undefined);
  const seed = data.slice(0, period);
  if (seed.some((v) => !isFinite(v)))
    return new Array(data.length).fill(undefined);
  let ema = seed.reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < data.length; i++) {
    if (!isFinite(data[i])) {
      result.push(undefined);
      continue;
    }
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ── MACD ──────────────────────────────────────────────────────────────────────
export function calculateMACD(closes: number[]) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd: (number | undefined)[] = ema12.map((v, i) =>
    v !== undefined && ema26[i] !== undefined ? v - ema26[i]! : undefined,
  );
  const validMacd = macd.filter((v): v is number => v !== undefined);
  const rawSignal = calculateEMA(validMacd, 9);
  const offset = macd.length - validMacd.length;
  const signal: (number | undefined)[] = new Array(offset).fill(undefined);
  rawSignal.forEach((v) => signal.push(v));
  const histogram = macd.map((v, i) =>
    v !== undefined && signal[i] !== undefined ? v - signal[i]! : undefined,
  );
  return { macd, signal, histogram };
}

// ── RSI ───────────────────────────────────────────────────────────────────────
export function calculateRSI(
  closes: number[],
  period = 14,
): (number | undefined)[] {
  if (closes.length < period + 1)
    return new Array(closes.length).fill(undefined);
  const result: (number | undefined)[] = new Array(period).fill(undefined);
  const changes = closes.map((c, i) => (i === 0 ? 0 : c - closes[i - 1]));
  const seed = changes.slice(1, period + 1);
  let avgGain = seed.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
  let avgLoss =
    Math.abs(seed.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;

  const firstRSI = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result.push(firstRSI);

  for (let i = period + 1; i < closes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

// ── Bollinger Bands ──────────────────────────────────────────────────────────
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  mult = 2,
) {
  const sma = calculateSMA(closes, period);
  const upper: (number | undefined)[] = [];
  const lower: (number | undefined)[] = [];
  const upper1: (number | undefined)[] = [];
  const lower1: (number | undefined)[] = [];

  closes.forEach((_, i) => {
    if (i < period - 1 || sma[i] === undefined) {
      upper.push(undefined);
      lower.push(undefined);
      upper1.push(undefined);
      lower1.push(undefined);
      return;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const variance =
      slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + mult * std);
    lower.push(mean - mult * std);
    upper1.push(mean + std);
    lower1.push(mean - std);
  });
  return { sma, upper, lower, upper1, lower1 };
}

// ── Stochastic ────────────────────────────────────────────────────────────────
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
) {
  const kValues: (number | undefined)[] = new Array(kPeriod - 1).fill(
    undefined,
  );
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
  const validK = kValues.filter((v): v is number => v !== undefined);
  const dRaw = calculateSMA(validK, dPeriod);
  const dValues: (number | undefined)[] = new Array(
    kValues.length - validK.length,
  ).fill(undefined);
  dRaw.forEach((v) => dValues.push(v));
  return { k: kValues, d: dValues };
}

// ── OBV ───────────────────────────────────────────────────────────────────────
export function calculateOBV(closes: number[], volumes: number[]): number[] {
  const obv = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv.push(obv[i - 1] + (volumes[i] || 0));
    else if (closes[i] < closes[i - 1])
      obv.push(obv[i - 1] - (volumes[i] || 0));
    else obv.push(obv[i - 1]);
  }
  return obv;
}

// ── VWAP ──────────────────────────────────────────────────────────────────────
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
): number[] {
  let cumulTPV = 0,
    cumulVol = 0;
  return closes.map((_, i) => {
    const tp = ((highs[i] || 0) + (lows[i] || 0) + (closes[i] || 0)) / 3;
    cumulTPV += tp * (volumes[i] || 0);
    cumulVol += volumes[i] || 0;
    return cumulVol === 0 ? closes[i] : cumulTPV / cumulVol;
  });
}

// ── Enrich all indicators ─────────────────────────────────────────────────────
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
  if (!raw || raw.length === 0) return [];
  const closes = raw.map((d) => safeNum(d.close));
  const highs = raw.map((d) => safeNum(d.high));
  const lows = raw.map((d) => safeNum(d.low));
  const volumes = raw.map((d) => safeNum(d.volume));

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
    date: d.date,
    open: safeNum(d.open),
    high: safeNum(d.high),
    low: safeNum(d.low),
    close: safeNum(d.close),
    volume: safeNum(d.volume),
    adjClose: safeNum(d.close),
    ma20: ma20[i],
    ma50: ma50[i],
    ma200: ma200[i],
    ema12: ema12[i],
    ema26: ema26[i],
    macd: macd[i],
    macdSignal: signal[i],
    macdHist: histogram[i],
    rsi: rsi[i],
    upperBand: bb.upper[i],
    lowerBand: bb.lower[i],
    upperBand1: bb.upper1[i],
    lowerBand1: bb.lower1[i],
    stochK: stoch.k[i],
    stochD: stoch.d[i],
    obv: obv[i],
    vwap: vwap[i],
  }));
}

// ── Generate signals ──────────────────────────────────────────────────────────
export function generateSignals(data: HistoricalData[]): TechnicalSignal[] {
  if (!data || data.length < 5) return [];
  const latest = data[data.length - 1];
  const prev = data[data.length - 2];
  if (!latest || !prev) return [];
  const signals: TechnicalSignal[] = [];

  // 1. RSI
  if (latest.rsi !== undefined) {
    const r = latest.rsi;
    signals.push({
      indicator: "RSI (14)",
      value: r.toFixed(2),
      signal:
        r < 30
          ? "STRONG_BUY"
          : r < 45
            ? "BUY"
            : r > 70
              ? "STRONG_SELL"
              : r > 55
                ? "SELL"
                : "NEUTRAL",
      description:
        r < 30
          ? "Oversold — strong reversal candidate"
          : r > 70
            ? "Overbought — consider exit"
            : "Neutral momentum zone",
    });
  }

  // 2. MACD
  if (
    latest.macd !== undefined &&
    latest.macdSignal !== undefined &&
    prev.macd !== undefined &&
    prev.macdSignal !== undefined
  ) {
    const crossed =
      latest.macd > latest.macdSignal && prev.macd <= prev.macdSignal;
    const crossedDown =
      latest.macd < latest.macdSignal && prev.macd >= prev.macdSignal;
    signals.push({
      indicator: "MACD (12,26,9)",
      value: latest.macd.toFixed(3),
      signal: crossed
        ? "STRONG_BUY"
        : crossedDown
          ? "STRONG_SELL"
          : latest.macd > latest.macdSignal
            ? "BUY"
            : "SELL",
      description: crossed
        ? "Bullish crossover — momentum shift"
        : crossedDown
          ? "Bearish crossover — momentum turning"
          : latest.macd > latest.macdSignal
            ? "Above signal — positive momentum"
            : "Below signal — negative momentum",
    });
  }

  // 3. MA Trend
  if (latest.ma20 !== undefined && latest.ma50 !== undefined) {
    const aboveBoth = latest.close > latest.ma20 && latest.ma20 > latest.ma50;
    const belowBoth = latest.close < latest.ma20 && latest.ma20 < latest.ma50;
    signals.push({
      indicator: "MA 20/50",
      value: `${latest.ma20.toFixed(2)} / ${latest.ma50.toFixed(2)}`,
      signal: aboveBoth
        ? "STRONG_BUY"
        : latest.close > latest.ma20
          ? "BUY"
          : belowBoth
            ? "STRONG_SELL"
            : "SELL",
      description: aboveBoth
        ? "Price above both MAs — strong uptrend"
        : belowBoth
          ? "Price below both MAs — strong downtrend"
          : "Mixed MA signals",
    });
  }

  // 4. Bollinger Bands
  if (
    latest.upperBand !== undefined &&
    latest.lowerBand !== undefined &&
    latest.ma20 !== undefined
  ) {
    const bw =
      latest.ma20 > 0 ? (latest.upperBand - latest.lowerBand) / latest.ma20 : 0;
    signals.push({
      indicator: "Bollinger Bands",
      value: bw.toFixed(4),
      signal:
        latest.close <= latest.lowerBand
          ? "STRONG_BUY"
          : latest.close >= latest.upperBand
            ? "STRONG_SELL"
            : "NEUTRAL",
      description:
        latest.close <= latest.lowerBand
          ? "At lower band — oversold reversal zone"
          : latest.close >= latest.upperBand
            ? "At upper band — overbought zone"
            : `Bandwidth ${(bw * 100).toFixed(1)}% — ${bw < 0.03 ? "squeeze building" : "normal range"}`,
    });
  }

  // 5. Stochastic
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
              ? "K above D — bullish"
              : "K below D — bearish",
    });
  }

  // 6. VWAP
  if (latest.vwap !== undefined && latest.vwap > 0) {
    signals.push({
      indicator: "VWAP",
      value: latest.vwap.toFixed(2),
      signal: latest.close > latest.vwap ? "BUY" : "SELL",
      description:
        latest.close > latest.vwap
          ? "Above VWAP — institutional demand zone"
          : "Below VWAP — distribution zone",
    });
  }

  // 7. OBV Trend
  if (latest.obv !== undefined && prev.obv !== undefined) {
    const obvTrend = latest.obv > prev.obv;
    signals.push({
      indicator: "OBV",
      value: formatNumber(latest.obv),
      signal: obvTrend ? "BUY" : "SELL",
      description: obvTrend
        ? "Volume confirming price — accumulation"
        : "Volume diverging from price — distribution",
    });
  }

  // 8. Price vs MA200
  if (latest.ma200 !== undefined) {
    const pct =
      latest.ma200 > 0
        ? ((latest.close - latest.ma200) / latest.ma200) * 100
        : 0;
    signals.push({
      indicator: "MA 200 (LT Trend)",
      value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
      signal:
        pct > 10
          ? "STRONG_BUY"
          : pct > 0
            ? "BUY"
            : pct < -10
              ? "STRONG_SELL"
              : "SELL",
      description:
        pct >= 0
          ? `${pct.toFixed(1)}% above 200MA — long-term bull trend`
          : `${Math.abs(pct).toFixed(1)}% below 200MA — long-term bear trend`,
    });
  }

  // 9. EMA crossover
  if (
    latest.ema12 !== undefined &&
    latest.ema26 !== undefined &&
    prev.ema12 !== undefined &&
    prev.ema26 !== undefined
  ) {
    const crossed = latest.ema12 > latest.ema26 && prev.ema12 <= prev.ema26;
    const crossedDown = latest.ema12 < latest.ema26 && prev.ema12 >= prev.ema26;
    signals.push({
      indicator: "EMA 12/26",
      value: `${latest.ema12.toFixed(2)} / ${latest.ema26.toFixed(2)}`,
      signal: crossed
        ? "STRONG_BUY"
        : crossedDown
          ? "STRONG_SELL"
          : latest.ema12 > latest.ema26
            ? "BUY"
            : "SELL",
      description: crossed
        ? "EMA bullish crossover"
        : crossedDown
          ? "EMA bearish crossover"
          : latest.ema12 > latest.ema26
            ? "Short EMA above long — bullish"
            : "Short EMA below long — bearish",
    });
  }

  // 10. BB %B momentum squeeze
  if (latest.upperBand !== undefined && latest.lowerBand !== undefined) {
    const pctB =
      latest.upperBand - latest.lowerBand > 0
        ? (latest.close - latest.lowerBand) /
          (latest.upperBand - latest.lowerBand)
        : 0.5;
    signals.push({
      indicator: "BB %B",
      value: pctB.toFixed(3),
      signal:
        pctB < 0.05
          ? "STRONG_BUY"
          : pctB < 0.2
            ? "BUY"
            : pctB > 0.95
              ? "STRONG_SELL"
              : pctB > 0.8
                ? "SELL"
                : "NEUTRAL",
      description:
        pctB < 0.2
          ? `Near lower band (${(pctB * 100).toFixed(0)}%B) — reversal zone`
          : pctB > 0.8
            ? `Near upper band (${(pctB * 100).toFixed(0)}%B) — overbought`
            : `Mid-band (${(pctB * 100).toFixed(0)}%B)`,
    });
  }

  return signals;
}

// ── Pattern detection ─────────────────────────────────────────────────────────
export function detectPatterns(data: HistoricalData[]): PatternDetection[] {
  if (!data || data.length < 15) return [];
  const patterns: PatternDetection[] = [];

  for (let i = 12; i < data.length; i++) {
    const d = data[i];
    const d1 = data[i - 1];
    const d2 = data[i - 2];
    const d3 = data[i - 3];
    const d10 = data[i - 10];
    if (!d || !d1 || !d2 || !d3 || !d10) continue;

    // 1. Single-day Bollinger reversal
    if (
      d10.lowerBand &&
      d10.low < d10.lowerBand &&
      d.open < d.close &&
      d.lowerBand &&
      d.low > d.lowerBand &&
      d.lowerBand1 &&
      d.close > d.lowerBand1
    ) {
      patterns.push({
        date: d.date,
        pattern: "Bollinger Reversal",
        signal: "BUY",
        confidence: 72,
        description:
          "Price breached lower band then recovered — accident pattern",
      });
    }

    // 2. Multi-day recovery
    if (
      d10.lowerBand &&
      d10.low < d10.lowerBand &&
      d1.close > d1.open &&
      d2.close > d2.open &&
      d3.close > d3.open &&
      d.close > d1.close
    ) {
      patterns.push({
        date: d.date,
        pattern: "Multi-Day Recovery",
        signal: "BUY",
        confidence: 85,
        description: "Sustained 3-bar recovery from lower Bollinger band",
      });
    }

    // 3. Bearish upper break
    if (
      d.upperBand &&
      d.close > d.upperBand &&
      d1.upperBand &&
      d1.close < d1.upperBand
    ) {
      patterns.push({
        date: d.date,
        pattern: "Upper Band Breakout",
        signal: "SELL",
        confidence: 68,
        description: "Price broke above upper BB — potential reversal",
      });
    }

    // 4. Golden Cross
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
        description: "MA20 crossed above MA50 — bullish trend confirmation",
      });
    }

    // 5. Death Cross
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
        description: "MA20 crossed below MA50 — bearish trend confirmation",
      });
    }

    // 6. RSI Divergence
    if (i >= 7 && d.rsi !== undefined && data[i - 6]?.rsi !== undefined) {
      if (d.close < data[i - 6].close && d.rsi > data[i - 6].rsi!) {
        patterns.push({
          date: d.date,
          pattern: "Bullish RSI Divergence",
          signal: "BUY",
          confidence: 75,
          description:
            "Price making lower lows but RSI higher — hidden strength",
        });
      }
    }

    // 7. MACD Histogram increasing
    if (
      d.macdHist !== undefined &&
      d1.macdHist !== undefined &&
      d2.macdHist !== undefined
    ) {
      if (
        d.macdHist > 0 &&
        d.macdHist > d1.macdHist &&
        d1.macdHist > d2.macdHist
      ) {
        patterns.push({
          date: d.date,
          pattern: "MACD Acceleration",
          signal: "BUY",
          confidence: 70,
          description: "MACD histogram rising 3 bars — accelerating momentum",
        });
      }
    }
  }

  return patterns.slice(-20).reverse();
}

// ── Price forecast ────────────────────────────────────────────────────────────
export function forecastPrice(closes: number[], days = 10): number[] {
  if (!closes || closes.length < 10) return [];
  const recent = closes
    .slice(-Math.min(closes.length, 60))
    .filter((v) => isFinite(v) && v > 0);
  if (recent.length < 5) return [];

  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b, 0) / n;
  const ssX = recent.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);
  const slope =
    ssX > 0
      ? recent.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0) / ssX
      : 0;

  const std = Math.sqrt(
    recent.slice(-20).reduce((sum, v) => sum + (v - yMean) ** 2, 0) /
      Math.min(20, recent.length),
  );
  const alpha = 0.3;
  let current = recent[recent.length - 1];
  const forecast: number[] = [];

  for (let i = 1; i <= days; i++) {
    const linear = recent[recent.length - 1] + slope * i;
    const smoothed = alpha * linear + (1 - alpha) * current;
    const noise = (Math.random() - 0.5) * std * 0.08;
    current = Math.max(0.01, smoothed + noise);
    forecast.push(current);
  }
  return forecast;
}

// ── Safe formatters ───────────────────────────────────────────────────────────
export function formatCurrency(value: unknown): string {
  const v = safeNum(value);
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `₹${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toFixed(2)}`;
}

export function formatNumber(value: unknown): string {
  const v = safeNum(value);
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

export function formatPrice(value: unknown, decimals = 2): string {
  const v = safeNum(value);
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function safePct(value: unknown, decimals = 2): string {
  const v = safeNum(value);
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}
