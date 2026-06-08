import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Bot,
  ShieldAlert,
  FileText,
  Wallet,
  Bell,
  Menu,
  X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  const activeLabel = navItems.find((n) => n.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-bg-surface border-r border-border-default flex flex-col shrink-0 transition-transform duration-300 ease-out ${
          isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-patina/15 flex items-center justify-center border border-accent-patina/20">
              <Wallet className="w-[18px] h-[18px] text-accent-patina" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight font-display italic">OPC Treasury</h1>
              <p className="text-[10px] text-text-muted leading-tight tracking-widest uppercase">Agent Finance OS</p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
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
                onClick={() => isMobile && setSidebarOpen(false)}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-accent-gold/8 text-accent-gold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`
                }
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-gold" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive
                      ? 'text-accent-gold'
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
            <div className="w-8 h-8 rounded-full bg-accent-patina flex items-center justify-center text-[11px] font-bold text-bg-primary shrink-0">
              N
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">Neo</p>
              <p className="text-[10px] text-text-muted truncate">OPC Owner</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-accent-patina ring-2 ring-bg-surface" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-bg-surface/60 backdrop-blur-md border-b border-border-default flex items-center justify-between px-4 lg:px-6 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors shrink-0"
              >
                <Menu className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            )}
            <h2 className="text-base font-semibold tracking-tight font-display italic truncate">
              {activeLabel}
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex px-2.5 py-1 rounded-full bg-accent-patina/8 border border-accent-patina/15 items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-patina animate-pulse" />
              <span className="text-[11px] font-semibold text-accent-patina tracking-wide whitespace-nowrap">All Systems Operational</span>
            </div>
            <div className="hidden md:block h-6 w-px bg-border-default" />
            <div className="hidden md:block text-right">
              <p className="text-[10px] text-text-muted">Total treasury</p>
              <p className="text-sm font-bold text-text-primary tabular-nums">3,200.00 USDC</p>
            </div>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors relative shrink-0">
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-coral ring-2 ring-bg-surface" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
