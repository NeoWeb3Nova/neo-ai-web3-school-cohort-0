import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
 LayoutDashboard,
 CreditCard,
 Bot,
 ShieldAlert,
 FileText,
 Wallet,
 Sun,
 Moon,
 Monitor,
} from 'lucide-react';

const navItems = [
 { path: '/', label: 'Dashboard', icon: LayoutDashboard },
 { path: '/cards', label: 'Cards', icon: CreditCard },
 { path: '/agent', label: 'Agent', icon: Bot },
 { path: '/attack', label: 'Attack', icon: ShieldAlert },
 { path: '/audit', label: 'Audit', icon: FileText },
];

type ThemeMode = 'auto' | 'light' | 'dark';

function getSystemTheme(): boolean {
 return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode): boolean {
 if (mode === 'auto') return getSystemTheme();
 return mode === 'dark';
}

export default function Layout() {
 const location = useLocation();
 const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
 return (localStorage.getItem('theme') as ThemeMode) || 'auto';
 });
 const [mobileNavOpen, setMobileNavOpen] = useState(false);

 useEffect(() => {
 const isDark = resolveTheme(themeMode);
 if (isDark) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 localStorage.setItem('theme', themeMode);
 }, [themeMode]);

 useEffect(() => {
 if (themeMode === 'auto') {
 const mq = window.matchMedia('(prefers-color-scheme: dark)');
 const handler = (e: MediaQueryListEvent) => {
 if (e.matches) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 };
 mq.addEventListener('change', handler);
 return () => mq.removeEventListener('change', handler);
 }
 }, [themeMode]);

 useEffect(() => {
 setMobileNavOpen(false);
 }, [location.pathname]);

 const cycleTheme = () => {
 setThemeMode((prev) => {
 if (prev === 'auto') return 'light';
 if (prev === 'light') return 'dark';
 return 'auto';
 });
 };

 const themeLabel = themeMode === 'auto' ? 'Auto' : themeMode === 'light' ? 'Light' : 'Dark';
 const ThemeIcon = themeMode === 'auto' ? Monitor : themeMode === 'light' ? Sun : Moon;

 return (
 <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
 {/* Site Header — impeccable style */}
 <header
 className="fixed top-0 inset-x-0 z-50 border-b border-border-default"
 style={{
 height: 'var(--site-header-height)',
 backgroundColor: 'var(--color-bg)',
 backdropFilter: 'blur(12px)',
 WebkitBackdropFilter: 'blur(12px)',
 }}
 >
 <div className="mx-auto h-full flex items-center justify-between" style={{ maxWidth: 'var(--width-page)', padding: '0 24px' }}>
 {/* Wordmark */}
 <NavLink to="/" className="flex items-center gap-2 shrink-0 group">
 <Wallet className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--color-kinpaku)' }} />
 <span
 className="font-wordmark font-medium tracking-widest select-none"
 style={{ fontSize: '1.15rem', letterSpacing: '0.28em', color: 'var(--color-text)' }}
 >
 OPC TREASURY
 </span>
 </NavLink>

 {/* Desktop Navigation */}
 <nav className="hidden md:flex items-center" style={{ gap: '6px' }}>
 {navItems.map((item) => {
 const Icon = item.icon;
 const isActive = location.pathname === item.path;
 return (
 <NavLink
 key={item.path}
 to={item.path}
 className={({ isActive }) =>
 `relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
 isActive
 ? ''
 : 'hover:opacity-80'
 }`
 }
 style={{
 color: isActive ? 'var(--color-kinpaku)' : 'var(--color-ash)',
 borderRadius: '2px',
 }}
 >
 <Icon className="w-[15px] h-[15px]" strokeWidth={1.5} />
 <span>{item.label}</span>
 {isActive && (
 <span
 className="absolute bottom-0 left-3 right-3 h-px"
 style={{ backgroundColor: 'var(--color-kinpaku)' }}
 />
 )}
 </NavLink>
 );
 })}
 </nav>

 {/* Right actions */}
 <div className="flex items-center gap-2">
 {/* Theme toggle */}
 <button
 onClick={cycleTheme}
 className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 hover:opacity-80"
 style={{
 color: 'var(--color-ash)',
 border: '1px solid var(--color-rule)',
 borderRadius: '2px',
 }}
 title={`Theme: ${themeLabel}`}
 >
 <ThemeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
 <span className="hidden sm:inline">{themeLabel}</span>
 </button>

 {/* Mobile menu toggle */}
 <button
 onClick={() => setMobileNavOpen(!mobileNavOpen)}
 className="md:hidden flex items-center justify-center w-8 h-8 transition-colors"
 style={{ color: 'var(--color-ash)' }}
 aria-label="Toggle navigation"
 >
 <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
 {mobileNavOpen ? (
 <>
 <path d="M2 2l12 12M14 2L2 14" />
 </>
 ) : (
 <>
 <path d="M1 4h14M1 8h14M1 12h14" />
 </>
 )}
 </svg>
 </button>
 </div>
 </div>
 </header>

 {/* Mobile Navigation */}
 {mobileNavOpen && (
 <div
 className="fixed inset-0 z-40 md:hidden"
 style={{ top: 'var(--site-header-height)', backgroundColor: 'var(--color-bg)' }}
 >
 <nav className="flex flex-col p-6" style={{ gap: '4px' }}>
 {navItems.map((item) => {
 const Icon = item.icon;
 const isActive = location.pathname === item.path;
 return (
 <NavLink
 key={item.path}
 to={item.path}
 onClick={() => setMobileNavOpen(false)}
 className="flex items-center gap-3 px-3 py-3 text-base font-medium transition-colors"
 style={{
 color: isActive ? 'var(--color-kinpaku)' : 'var(--color-ash)',
 borderRadius: '2px',
 }}
 >
 <Icon className="w-5 h-5" strokeWidth={1.5} />
 {item.label}
 </NavLink>
 );
 })}
 </nav>
 </div>
 )}

 {/* Main content */}
 <main
 className="mx-auto w-full"
 style={{
 maxWidth: 'var(--width-page)',
 paddingTop: 'calc(var(--site-header-height) + 32px)',
 paddingLeft: '24px',
 paddingRight: '24px',
 paddingBottom: '80px',
 }}
 >
 <div style={{ maxWidth: 'var(--width-content)' }} className="mx-auto">
 <Outlet />
 </div>
 </main>
 </div>
 );
}
