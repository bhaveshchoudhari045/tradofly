"use client";
import { usePaletteStore } from "@/store/paletteStore";

export default function SkeletonCards({ count = 8 }: { count?: number }) {
  const { getPalette } = usePaletteStore();
  const palette = getPalette();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: 16,
            padding: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            animation: `skeletonPulse 1.8s ease-in-out infinite`,
            animationDelay: `${i * 120}ms`,
            opacity: 0.6,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 80,
                height: 10,
                background: "var(--border-primary)",
                borderRadius: 5,
              }}
            />
            <div
              style={{
                width: 44,
                height: 10,
                background: "var(--border-primary)",
                borderRadius: 5,
              }}
            />
          </div>
          {/* Symbol */}
          <div
            style={{
              width: 120,
              height: 20,
              background: "var(--border-primary)",
              borderRadius: 6,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: 160,
              height: 10,
              background: "var(--border-primary)",
              borderRadius: 5,
              marginBottom: 16,
            }}
          />
          {/* Price */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 90,
                height: 24,
                background: "var(--border-primary)",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                width: 60,
                height: 20,
                background: "var(--border-primary)",
                borderRadius: 999,
              }}
            />
          </div>
          {/* Signal badge */}
          <div
            style={{
              width: "100%",
              height: 32,
              background: "var(--border-primary)",
              borderRadius: 8,
              marginBottom: 12,
            }}
          />
          {/* Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{
                  height: 52,
                  background: "var(--border-primary)",
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
          {/* Confidence */}
          <div
            style={{
              width: "100%",
              height: 3,
              background: "var(--border-primary)",
              borderRadius: 2,
            }}
          />
        </div>
      ))}
      <style jsx global>{`
        @keyframes skeletonPulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
