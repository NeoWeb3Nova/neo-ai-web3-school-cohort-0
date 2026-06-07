import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Bot,
  ShieldAlert,
  FileText,
  Wallet,
  Bell,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cards', label: 'Cards', icon: CreditCard },
  { path: '/agent', label: 'Agent Console', icon: Bot },
  { path: '/attack', label: 'Attack Demo', icon: ShieldAlert },
  { path: '/audit', label: 'Audit Report', icon: FileText },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-bg-surface border-r border-border-default flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center border border-accent-green/20">
              <Wallet className="w-[18px] h-[18px] text-accent-green" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">OPC Treasury</h1>
              <p className="text-[10px] text-text-muted leading-tight tracking-wide">Agent Finance OS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-green/8 text-accent-green'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`
                }
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-green" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-accent-green'
                      : 'text-text-muted group-hover:text-text-secondary'
                  }`}
                  strokeWidth={1.5}
                />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom — Owner Profile */}
        <div className="p-4 border-t border-border-default">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-green/80 to-accent-blue/80 flex items-center justify-center text-[11px] font-bold text-bg-primary shrink-0">
              N
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">Neo</p>
              <p className="text-[10px] text-text-muted truncate">OPC Owner</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-accent-green ring-2 ring-bg-surface" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-bg-surface/60 backdrop-blur-md border-b border-border-default flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">
              {navItems.find((n) => n.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-2.5 py-1 rounded-full bg-accent-green/8 border border-accent-green/15 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[11px] font-semibold text-accent-green tracking-wide">All Systems Operational</span>
            </div>
            <div className="h-6 w-px bg-border-default" />
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Treasury</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">3,200.00 USDC</p>
            </div>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative">
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-red ring-2 ring-bg-surface" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
