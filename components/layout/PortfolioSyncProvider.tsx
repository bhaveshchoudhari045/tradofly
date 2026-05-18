"use client";
// components/layout/PortfolioSyncProvider.tsx
// Invisible component that keeps portfolio prices live.
// Drop this into the root layout or dashboard layout.

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { usePortfolioPriceSync } from "@/hooks/useRealTimeQuotes";

export default function PortfolioSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, positions } = useAppStore();
  // Only sync when logged in + have positions
  usePortfolioPriceSync(30_000);
  return <>{children}</>;
}
