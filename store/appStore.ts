"use client";
// store/appStore.ts — enhanced with P&L on transactions + target/stop-loss orders

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
  avatar?: string;
}

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  buyDate: string;
  // Target/SL tracking
  targetPrice?: number;
  stopLossPrice?: number;
  targetHit?: boolean;
  stopLossHit?: boolean;
  notes?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW";
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  // P&L fields (populated on SELL)
  avgBuyPrice?: number; // the average buy price at time of sale
  realizedPnl?: number; // actual profit/loss in ₹
  realizedPnlPct?: number; // actual profit/loss in %
  holdingDays?: number; // how many days stock was held
  targetPrice?: number; // target that was set
  stopLossPrice?: number; // stop-loss that was set
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  addedAt: string;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface AppState {
  // Theme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  register: (name: string, email: string, initialBalance?: number) => User;
  addFunds: (amount: number) => void;

  // Portfolio
  positions: Position[];
  transactions: Transaction[];
  watchlist: WatchlistItem[];

  // Trading
  buyStock: (
    symbol: string,
    name: string,
    quantity: number,
    price: number,
    opts?: { targetPrice?: number; stopLossPrice?: number; notes?: string },
  ) => { success: boolean; message: string };
  sellStock: (
    symbol: string,
    quantity: number,
    price: number,
  ) => { success: boolean; message: string };
  updatePositionPrices: (updates: { symbol: string; price: number }[]) => void;
  updatePositionTargets: (
    symbol: string,
    opts: { targetPrice?: number; stopLossPrice?: number; notes?: string },
  ) => void;

  // Watchlist
  addToWatchlist: (symbol: string, name?: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;

  // Portfolio stats
  getPortfolioValue: () => number;
  getTotalPnL: () => { pnl: number; pnlPercent: number };
  getTotalRealizedPnL: () => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      user: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          positions: [],
          transactions: [],
          watchlist: [],
        }),

      register: (name, email, initialBalance = 1_000_000) => {
        const user: User = {
          id: generateId(),
          name,
          email,
          balance: initialBalance,
          initialBalance,
          createdAt: new Date().toISOString(),
        };
        const depositTx: Transaction = {
          id: generateId(),
          userId: user.id,
          symbol: "CASH",
          name: "Initial Deposit",
          type: "DEPOSIT",
          quantity: 0,
          price: 0,
          total: initialBalance,
          date: new Date().toISOString(),
          status: "COMPLETED",
        };
        set({
          user,
          isAuthenticated: true,
          positions: [],
          transactions: [depositTx],
          watchlist: [],
        });
        return user;
      },

      addFunds: (amount) =>
        set((s) => {
          if (!s.user) return s;
          const tx: Transaction = {
            id: generateId(),
            userId: s.user.id,
            symbol: "CASH",
            name: "Deposit",
            type: "DEPOSIT",
            quantity: 0,
            price: 0,
            total: amount,
            date: new Date().toISOString(),
            status: "COMPLETED",
          };
          return {
            user: { ...s.user, balance: s.user.balance + amount },
            transactions: [tx, ...s.transactions],
          };
        }),

      positions: [],
      transactions: [],
      watchlist: [],

      buyStock: (symbol, name, quantity, price, opts = {}) => {
        const { user, positions } = get();
        if (!user) return { success: false, message: "Not logged in" };
        const total = quantity * price;
        if (user.balance < total) {
          return {
            success: false,
            message: `Insufficient funds. Need ₹${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}, have ₹${user.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
          };
        }

        set((s) => {
          const existingIdx = s.positions.findIndex((p) => p.symbol === symbol);
          let newPositions = [...s.positions];

          if (existingIdx >= 0) {
            const existing = newPositions[existingIdx];
            const newQty = existing.quantity + quantity;
            const newAvg =
              (existing.avgBuyPrice * existing.quantity + price * quantity) /
              newQty;
            newPositions[existingIdx] = {
              ...existing,
              quantity: newQty,
              avgBuyPrice: newAvg,
              totalInvested: newAvg * newQty,
              currentValue: price * newQty,
              currentPrice: price,
              pnl: (price - newAvg) * newQty,
              pnlPercent: ((price - newAvg) / newAvg) * 100,
              // Update targets if provided
              targetPrice: opts.targetPrice ?? existing.targetPrice,
              stopLossPrice: opts.stopLossPrice ?? existing.stopLossPrice,
              notes: opts.notes ?? existing.notes,
            };
          } else {
            newPositions.push({
              id: generateId(),
              userId: user.id,
              symbol,
              name,
              quantity,
              avgBuyPrice: price,
              currentPrice: price,
              totalInvested: total,
              currentValue: total,
              pnl: 0,
              pnlPercent: 0,
              buyDate: new Date().toISOString(),
              targetPrice: opts.targetPrice,
              stopLossPrice: opts.stopLossPrice,
              notes: opts.notes,
            });
          }

          const tx: Transaction = {
            id: generateId(),
            userId: user.id,
            symbol,
            name,
            type: "BUY",
            quantity,
            price,
            total,
            date: new Date().toISOString(),
            status: "COMPLETED",
            targetPrice: opts.targetPrice,
            stopLossPrice: opts.stopLossPrice,
          };

          return {
            user: { ...s.user!, balance: s.user!.balance - total },
            positions: newPositions,
            transactions: [tx, ...s.transactions],
          };
        });

        return {
          success: true,
          message: `Bought ${quantity} shares of ${symbol} @ ₹${price.toFixed(2)}`,
        };
      },

      sellStock: (symbol, quantity, price) => {
        const { user, positions } = get();
        if (!user) return { success: false, message: "Not logged in" };
        const position = positions.find((p) => p.symbol === symbol);
        if (!position) return { success: false, message: "Position not found" };
        if (position.quantity < quantity) {
          return {
            success: false,
            message: `Only ${position.quantity} shares available`,
          };
        }

        // Calculate realized P&L
        const avgBuyPrice = position.avgBuyPrice;
        const realizedPnl = (price - avgBuyPrice) * quantity;
        const realizedPnlPct =
          avgBuyPrice > 0 ? ((price - avgBuyPrice) / avgBuyPrice) * 100 : 0;
        const holdingDays = Math.floor(
          (Date.now() - new Date(position.buyDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const proceeds = quantity * price;

        set((s) => {
          let newPositions = s.positions.filter((p) => p.symbol !== symbol);

          if (position.quantity > quantity) {
            const remQty = position.quantity - quantity;
            newPositions = [
              ...newPositions,
              {
                ...position,
                quantity: remQty,
                currentValue: price * remQty,
                pnl: (price - position.avgBuyPrice) * remQty,
                pnlPercent:
                  ((price - position.avgBuyPrice) / position.avgBuyPrice) * 100,
                currentPrice: price,
                totalInvested: position.avgBuyPrice * remQty,
              },
            ];
          }

          const tx: Transaction = {
            id: generateId(),
            userId: user.id,
            symbol,
            name: position.name,
            type: "SELL",
            quantity,
            price,
            total: proceeds,
            date: new Date().toISOString(),
            status: "COMPLETED",
            avgBuyPrice,
            realizedPnl,
            realizedPnlPct,
            holdingDays,
            targetPrice: position.targetPrice,
            stopLossPrice: position.stopLossPrice,
          };

          return {
            user: { ...s.user!, balance: s.user!.balance + proceeds },
            positions: newPositions,
            transactions: [tx, ...s.transactions],
          };
        });

        return {
          success: true,
          message: `Sold ${quantity} shares @ ₹${price.toFixed(2)} · P&L: ${realizedPnl >= 0 ? "+" : ""}₹${realizedPnl.toFixed(2)} (${realizedPnlPct.toFixed(2)}%)`,
        };
      },

      updatePositionPrices: (updates) =>
        set((s) => ({
          positions: s.positions.map((pos) => {
            const upd = updates.find((u) => u.symbol === pos.symbol);
            if (!upd || upd.price <= 0) return pos;
            const currentValue = upd.price * pos.quantity;
            const pnl = (upd.price - pos.avgBuyPrice) * pos.quantity;
            const pnlPercent =
              pos.avgBuyPrice > 0
                ? ((upd.price - pos.avgBuyPrice) / pos.avgBuyPrice) * 100
                : 0;
            return {
              ...pos,
              currentPrice: upd.price,
              currentValue,
              pnl,
              pnlPercent,
            };
          }),
        })),

      updatePositionTargets: (symbol, opts) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.symbol !== symbol
              ? p
              : {
                  ...p,
                  targetPrice: opts.targetPrice ?? p.targetPrice,
                  stopLossPrice: opts.stopLossPrice ?? p.stopLossPrice,
                  notes: opts.notes ?? p.notes,
                },
          ),
        })),

      addToWatchlist: (symbol, name) =>
        set((s) => {
          if (s.watchlist.find((w) => w.symbol === symbol)) return s;
          return {
            watchlist: [
              ...s.watchlist,
              { symbol, name, addedAt: new Date().toISOString() },
            ],
          };
        }),
      removeFromWatchlist: (symbol) =>
        set((s) => ({
          watchlist: s.watchlist.filter((w) => w.symbol !== symbol),
        })),
      isInWatchlist: (symbol) =>
        get().watchlist.some((w) => w.symbol === symbol),

      getPortfolioValue: () => {
        const { positions, user } = get();
        return (
          positions.reduce((sum, p) => sum + p.currentValue, 0) +
          (user?.balance ?? 0)
        );
      },

      getTotalPnL: () => {
        const { positions, user } = get();
        if (!user) return { pnl: 0, pnlPercent: 0 };
        const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
        const totalInvested = positions.reduce(
          (sum, p) => sum + p.totalInvested,
          0,
        );
        return {
          pnl: totalPnl,
          pnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
        };
      },

      getTotalRealizedPnL: () => {
        const { transactions } = get();
        return transactions
          .filter((t) => t.type === "SELL" && t.realizedPnl !== undefined)
          .reduce((sum, t) => sum + (t.realizedPnl ?? 0), 0);
      },
    }),
    {
      name: "tradofly-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        positions: s.positions,
        transactions: s.transactions,
        watchlist: s.watchlist,
      }),
    },
  ),
);
