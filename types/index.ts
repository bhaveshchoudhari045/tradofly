export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  avgVolume?: number;
  exchange?: string;
  sector?: string;
  industry?: string;
  currency?: string;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
  // Indicators
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
  adx?: number;
  stochK?: number;
  stochD?: number;
  obv?: number;
  vwap?: number;
}

export interface TechnicalSignal {
  indicator: string;
  value: number | string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL' | 'STRONG_BUY' | 'STRONG_SELL';
  description: string;
}

export interface PatternDetection {
  date: string;
  pattern: string;
  signal: 'BUY' | 'SELL';
  confidence: number;
  description: string;
}

// Paper Trading Types
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
}

export interface Transaction {
  pnl: number;
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';
  quantity: number;
  price: number;
  total: number;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface WatchlistItem {
  symbol: string;
  addedAt: string;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  positions: Position[];
}