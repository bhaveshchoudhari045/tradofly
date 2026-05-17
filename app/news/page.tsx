"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useAppStore } from "@/store/appStore";
import StockSearch from "@/components/StockSearch";
import { ExternalLink, RefreshCw } from "lucide-react";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

export default function NewsPage() {
  const { isAuthenticated, register } = useAppStore();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ✅ CORRECT — only registers once, never wipes existing data
useEffect(() => {
  setMounted(true);
}, []);

// Separate effect, only runs if truly not authenticated
useEffect(() => {
  if (mounted && !isAuthenticated) {
    register("Demo User", "demo@tradofly.com", 1000000);
  }
}, [mounted, isAuthenticated]);

  async function fetchNews(sym: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?type=news&symbol=${sym}`);
      const data = await res.json();
      setNews(Array.isArray(data) ? data : []);
    } catch (e) {
      setNews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) fetchNews(symbol);
  }, [mounted, symbol]);

  if (!mounted) return null;

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "Syne, sans-serif",
            }}
          >
            Market News
          </h1>
          <button
            onClick={() => fetchNews(symbol)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-card)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />{" "}
            Refresh
          </button>
        </div>

        <StockSearch
          onSelect={(sym) => setSymbol(sym)}
          defaultSymbol={symbol}
          placeholder="Search news for a stock..."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: 20,
                  height: 140,
                  background: "var(--bg-card)",
                  opacity: 0.5,
                }}
              />
            ))
          ) : news.length === 0 ? (
            <div
              style={{
                gridColumn: "1/-1",
                textAlign: "center",
                padding: 60,
                color: "var(--text-muted)",
              }}
            >
              No news found for {symbol}
            </div>
          ) : (
            news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="card"
                  style={{
                    padding: 20,
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    height: "100%",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "none";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--accent-green)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {item.source}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <span
                        style={{ fontSize: 10, color: "var(--text-muted)" }}
                      >
                        {new Date(item.publishedAt).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short" },
                        )}
                      </span>
                      <ExternalLink size={10} color="var(--text-muted)" />
                    </div>
                  </div>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                      marginBottom: 8,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
