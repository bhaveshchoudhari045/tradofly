import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type") || "quote";
  const period1 = searchParams.get("period1") || "2022-01-01";
  const interval = (searchParams.get("interval") || "1d") as
    | "1d"
    | "1wk"
    | "1mo";
  // Batch quotes
  if (type === "batch") {
    const symbols = searchParams.get("symbols")?.split(",") ?? [];
    if (!symbols.length) return NextResponse.json([]);
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const q = await yf.quote(sym.trim());
        return {
          symbol: q.symbol,
          name: (q as any).longName || (q as any).shortName || sym,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          open: q.regularMarketOpen ?? 0,
          high: q.regularMarketDayHigh ?? 0,
          low: q.regularMarketDayLow ?? 0,
          prevClose: q.regularMarketPreviousClose ?? 0,
          volume: q.regularMarketVolume ?? 0,
        };
      }),
    );
    const data = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as any).value);
    return NextResponse.json(data);
  }
  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    if (type === "quote") {
      const quote = await yf.quote(symbol);
      return NextResponse.json({
        symbol: quote.symbol,
        name: (quote as any).longName || (quote as any).shortName || symbol,
        price: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        open: quote.regularMarketOpen ?? 0,
        high: quote.regularMarketDayHigh ?? 0,
        low: quote.regularMarketDayLow ?? 0,
        prevClose: quote.regularMarketPreviousClose ?? 0,
        volume: quote.regularMarketVolume ?? 0,
        marketCap: quote.marketCap,
        pe: (quote as any).trailingPE,
        eps: (quote as any).epsTrailingTwelveMonths,
        dividendYield: (quote as any).trailingAnnualDividendYield,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        avgVolume: quote.averageDailyVolume3Month,
        exchange: quote.fullExchangeName,
        currency: quote.currency,
      });
    }

    if (type === "history") {
      const result = await yf.chart(symbol, {
        period1,
        period2: new Date().toISOString().split("T")[0],
        interval: interval as "1d" | "1wk" | "1mo",
      });
      const quotes = result.quotes || [];
      const data = quotes
        .filter((d: any) => d.close !== null)
        .map((d: any) => ({
          date: new Date(d.date).toISOString().split("T")[0],
          open: d.open ?? 0,
          high: d.high ?? 0,
          low: d.low ?? 0,
          close: d.close ?? 0,
          volume: d.volume ?? 0,
          adjClose: d.adjClose ?? d.close ?? 0,
        }));
      return NextResponse.json(data);
    }

    if (type === "search") {
      const results = await yf.search(symbol, { newsCount: 0 });
      const quotes = (results.quotes || []).slice(0, 20).map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange,
        type: q.typeDisp || q.quoteType,
      }));
      return NextResponse.json(quotes);
    }

    if (type === "summary") {
      const summary = await yf.quoteSummary(symbol, {
        modules: [
          "assetProfile",
          "financialData",
          "defaultKeyStatistics",
          "summaryDetail",
        ],
      });
      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    console.error("Yahoo Finance error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed" },
      { status: 500 },
    );
  }
}
