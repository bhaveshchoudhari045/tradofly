import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

const INDICES = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
  { symbol: "^NSEBANK", name: "BANK NIFTY" },
  { symbol: "GC=F", name: "GOLD" },
  { symbol: "CL=F", name: "CRUDE OIL" },
];

const TOP_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "HINDUNILVR.NS",
  "ITC.NS",
  "SBIN.NS",
  "BHARTIARTL.NS",
  "KOTAKBANK.NS",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "indices";

  try {
    if (type === "indices") {
      const results = await Promise.allSettled(
        INDICES.map(({ symbol, name }) =>
          yf.quote(symbol).then((q) => ({
            symbol,
            name,
            value: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
          })),
        ),
      );
      const data = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as any).value);
      return NextResponse.json(data);
    }

    if (type === "top_stocks") {
      const results = await Promise.allSettled(
        TOP_STOCKS.map((sym) =>
          yf.quote(sym).then((q) => ({
            symbol: sym,
            name: (q as any).longName || (q as any).shortName || sym,
            price: q.regularMarketPrice ?? 0,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
          })),
        ),
      );
      const data = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as any).value);
      return NextResponse.json(data);
    }

    if (type === "news") {
      const symbol = searchParams.get("symbol") || "RELIANCE.NS";
      const results = await yf.search(symbol, { newsCount: 10 });
      const news = ((results as any).news || []).map((n: any) => ({
        title: n.title,
        description: n.summary || n.title,
        url: n.link,
        source: n.publisher,
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : new Date().toISOString(),
      }));
      return NextResponse.json(news);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: any) {
    console.error("News API error:", err?.message);
    return NextResponse.json([], { status: 200 });
  }
}
