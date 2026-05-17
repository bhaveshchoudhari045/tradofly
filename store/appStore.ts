"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Position, Transaction, WatchlistItem } from "@/types";

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

  // Trading actions
  buyStock: (
    symbol: string,
    name: string,
    quantity: number,
    price: number,
  ) => { success: boolean; message: string };
  sellStock: (
    symbol: string,
    quantity: number,
    price: number,
  ) => { success: boolean; message: string };
  updatePositionPrices: (updates: { symbol: string; price: number }[]) => void;

  // Watchlist
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;

  // Portfolio stats
  getPortfolioValue: () => number;
  getTotalPnL: () => { pnl: number; pnlPercent: number };
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

      register: (name, email, initialBalance = 1000000) => {
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

      buyStock: (symbol, name, quantity, price) => {
        const { user, positions } = get();
        if (!user) return { success: false, message: "Not logged in" };
        const total = quantity * price;
        if (user.balance < total)
          return {
            success: false,
            message: `Insufficient funds. Need ₹${total.toFixed(2)}, have ₹${user.balance.toFixed(2)}`,
          };

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
        if (position.quantity < quantity)
          return {
            success: false,
            message: `Only ${position.quantity} shares available`,
          };

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
              },
            ];
          }
          const proceeds = quantity * price;
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
          };
          return {
            user: { ...s.user!, balance: s.user!.balance + proceeds },
            positions: newPositions,
            transactions: [tx, ...s.transactions],
          };
        });
        return {
          success: true,
          message: `Sold ${quantity} shares of ${symbol} @ ₹${price.toFixed(2)}`,
        };
      },

      updatePositionPrices: (updates) =>
        set((s) => ({
          positions: s.positions.map((pos) => {
            const upd = updates.find((u) => u.symbol === pos.symbol);
            if (!upd) return pos;
            const currentValue = upd.price * pos.quantity;
            const pnl = (upd.price - pos.avgBuyPrice) * pos.quantity;
            const pnlPercent =
              ((upd.price - pos.avgBuyPrice) / pos.avgBuyPrice) * 100;
            return {
              ...pos,
              currentPrice: upd.price,
              currentValue,
              pnl,
              pnlPercent,
            };
          }),
        })),

      addToWatchlist: (symbol) =>
        set((s) => {
          if (s.watchlist.find((w) => w.symbol === symbol)) return s;
          return {
            watchlist: [
              ...s.watchlist,
              { symbol, addedAt: new Date().toISOString() },
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
        const pnlPercent =
          totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        return { pnl: totalPnl, pnlPercent };
      },
    }),
    {
      name: "profitpulse-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        positions: state.positions,
        transactions: state.transactions,
        watchlist: state.watchlist,
      }),
    },
  ),
);
