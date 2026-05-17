'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, TrendingUp, Eye, Brain, Newspaper,
  CandlestickChart, Sun, Moon, LogOut, User, Wallet, ChevronRight,
} from 'lucide-react';

const navLinks = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/watchlist', icon: Eye, label: 'Watchlist' },
  { href: '/trading', icon: CandlestickChart, label: 'Paper Trade' },
  { href: '/predictor', icon: Brain, label: 'Predictor' },
  { href: '/news', icon: Newspaper, label: 'News' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme, user, isAuthenticated, logout, getPortfolioValue } = useAppStore();

  const portfolioValue = isAuthenticated ? getPortfolioValue() : 0;

  return (
    <aside className="sidebar flex flex-col h-full py-4" style={{ minHeight: '100vh' }}>
      {/* Logo */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--gradient-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={16} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            ProfitPulse
          </span>
        </div>
        <div style={{
          marginTop: 4, fontSize: 11, color: 'var(--text-muted)',
          letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          NSE/BSE Analytics
        </div>
      </div>

      {/* User card */}
      {isAuthenticated && user && (
        <div className="mx-3 mb-4 p-3 rounded-xl" style={{ background: 'var(--accent-green-bg)', border: '1px solid var(--border-accent)' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'white', fontWeight: 700,
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Paper Trader</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portfolio</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'JetBrains Mono, monospace' }}>
              ₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5">
        {navLinks.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${pathname === href || pathname.startsWith(href + '/') ? 'active' : ''}`}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
            {pathname === href && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 mt-4 flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          className="nav-item w-full border-0"
          style={{ background: 'none' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {isAuthenticated ? (
          <button onClick={logout} className="nav-item w-full" style={{ background: 'none', color: 'var(--accent-red)', border: 0 }}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link href="/trading" className="nav-item">
            <User size={16} />
            <span>Sign In / Register</span>
          </Link>
        )}
      </div>

      {/* Version */}
      <div style={{ padding: '12px 20px 4px', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
        v2.0.0 · Educational Only
      </div>
    </aside>
  );
}