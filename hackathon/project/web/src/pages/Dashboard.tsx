import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { INITIAL_CARDS, INITIAL_TRANSACTIONS, MONTHLY_SUMMARY } from '../data/mockData';
import { CHART, PIE_COLORS } from '../data/chartTheme';
import { fetchDashboard } from '../api/client';

const COLORS = PIE_COLORS;

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUSDC(value: number): string {
  return `$${formatCurrency(value)}`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [liveCards, setLiveCards] = useState<typeof INITIAL_CARDS | null>(null);
  const [liveTxs, setLiveTxs] = useState<typeof INITIAL_TRANSACTIONS | null>(null);
  const [liveSummary, setLiveSummary] = useState<typeof MONTHLY_SUMMARY | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((data) => {
        if (cancelled) return;
        setLiveCards(data.cards);
        setLiveTxs(data.transactions);
        setLiveSummary(data.summary);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[Dashboard] Backend unreachable, using mock data:', err);
        setError(t('common.offline'));
      });
    return () => { cancelled = true; };
  }, [t]);

  const cards = liveCards ?? INITIAL_CARDS;
  const transactions = liveTxs ?? INITIAL_TRANSACTIONS;
  const summary = liveSummary ?? MONTHLY_SUMMARY;

  const stats = useMemo(() => {
    const activeCards = cards.filter((c) => c.status === 'ACTIVE').length;
    const pendingCards = cards.filter((c) => c.status === 'PENDING_APPROVAL').length;
    const approvedTx = transactions.filter((t) => t.status === 'APPROVED');
    const deniedTx = transactions.filter((t) => t.status === 'DENIED');
    const totalApproved = approvedTx.reduce((s, t) => s + t.amount, 0);
    const totalDenied = deniedTx.reduce((s, t) => s + t.amount, 0);
    const anomalyCount = transactions.filter(
      (t) => t.alert_level !== 'none'
    ).length;

    return {
      activeCards,
      pendingCards,
      approvedCount: approvedTx.length,
      deniedCount: deniedTx.length,
      totalApproved,
      totalDenied,
      anomalyCount,
      totalBudget: cards.reduce((s, c) => s + c.budget.monthly_max, 0),
      totalSpent: cards.reduce((s, c) => s + c.budget.spent, 0),
    };
  }, [cards, transactions]);

  const spendingByAgent = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter((t) => t.status === 'APPROVED').forEach((t) => {
      const name = t.agent_id.includes('content')
        ? 'Content Agent'
        : t.agent_id.includes('ad')
        ? 'Ad Agent'
        : 'Design Agent';
      data[name] = (data[name] || 0) + t.amount;
    });
    const agents = ['Content Agent', 'Ad Agent', 'Design Agent'];
    return agents.map((name) => ({ name, value: data[name] || 0 }));
  }, [transactions]);

  const budgetDistribution = useMemo(() => {
    return cards.map((c) => ({
      name: c.agent_name,
      value: c.budget.monthly_max,
      spent: c.budget.spent,
    }));
  }, [cards]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [transactions]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const treasuryBalance = stats.totalBudget - stats.totalSpent;
  const utilizationRate = stats.totalBudget > 0
    ? ((stats.totalApproved / stats.totalBudget) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="rounded-im border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 text-xs text-accent-amber">
          {error}
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Treasury Balance */}
        <div className="glass-card rounded-im p-4 lg:p-5 transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              {t('dashboard.treasuryBalance')}
            </span>
            <div className="w-8 h-8 rounded-im bg-accent-gold/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-accent-gold" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
            {formatCurrency(treasuryBalance)}{' '}
            <span className="text-sm font-medium text-text-muted">{t('common.usdc')}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-accent-gold" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-gold">
              {utilizationRate}{t('dashboard.utilized')}
            </span>
          </div>
        </div>

        {/* Active Cards */}
        <div className="glass-card rounded-im p-4 lg:p-5 transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              {t('dashboard.activeCards')}
            </span>
            <div className="w-8 h-8 rounded-im bg-accent-slate/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-slate" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
            {stats.activeCards}
            <span className="text-sm font-medium text-text-muted ml-1">
              <span className="text-text-muted/60">/</span> {cards.length}
            </span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {stats.pendingCards > 0 ? (
              <button className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-xs font-medium hover:bg-accent-amber/20 transition-colors cursor-pointer">
                <Clock className="w-3 h-3" strokeWidth={2} />
                {stats.pendingCards} {t('dashboard.pendingApproval')}
              </button>
            ) : (
              <span className="text-xs text-text-muted">{t('dashboard.allCardsOperational')}</span>
            )}
          </div>
        </div>

        {/* Approved Volume */}
        <div className="glass-card rounded-im p-4 lg:p-5 transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              {t('dashboard.approvedVolume')}
            </span>
            <div className="w-8 h-8 rounded-im bg-accent-patina/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent-patina" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
            {formatCurrency(stats.totalApproved)}{' '}
            <span className="text-sm font-medium text-text-muted">{t('common.usdc')}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-accent-patina" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-patina">
              {stats.approvedCount} {t('dashboard.transactions')}
            </span>
          </div>
        </div>

        {/* Threats Blocked */}
        <div className="glass-card rounded-im p-4 lg:p-5 transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              {t('dashboard.threatsBlocked')}
            </span>
            <div className="w-8 h-8 rounded-im bg-accent-coral/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-coral" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
            {stats.deniedCount}
            <span className="text-sm font-medium text-text-muted ml-1.5">{t('dashboard.attacks')}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5 text-accent-patina" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-patina">
              {formatCurrency(stats.totalDenied)} {t('dashboard.saved')}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 items-stretch">
        {/* Spending by Agent */}
        <div className="glass-card rounded-im p-4 lg:p-5 lg:col-span-2 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-display">{t('dashboard.spendingByAgent')}</h3>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.approvedOnly')}</p>
            </div>
          </div>
          <div className="flex-1 min-h-[220px] lg:min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spendingByAgent}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: 'Albert Sans, sans-serif' }}
                  axisLine={{ stroke: CHART.grid }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: CHART.axis, fontSize: 11, fontFamily: 'Albert Sans, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: CHART.cursor }}
                  contentStyle={{
                    backgroundColor: CHART.tooltipBg,
                    border: `1px solid ${CHART.tooltipBorder}`,
                    borderRadius: '10px',
                    color: CHART.tooltipText,
                    fontSize: '12px',
                    fontFamily: 'Albert Sans, sans-serif',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  formatter={(value: any) => [formatUSDC(Number(value)), t('dashboard.spent')]}
                  labelStyle={{ color: 'var(--color-ash)', fontSize: '11px', marginBottom: '4px' }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {spendingByAgent.map((_, i) => (
                    <Cell key={i} style={{ fill: COLORS[i % COLORS.length] }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Distribution */}
        <div className="glass-card rounded-im p-4 lg:p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-display">{t('dashboard.budgetDistribution')}</h3>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.monthlyAllocation')}</p>
            </div>
            <Activity className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-h-[160px] lg:min-h-[180px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {budgetDistribution.map((_, i) => (
                    <Cell key={i} style={{ fill: COLORS[i % COLORS.length] }} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART.tooltipBg,
                    border: `1px solid ${CHART.tooltipBorder}`,
                    borderRadius: '10px',
                    color: CHART.tooltipText,
                    fontSize: '12px',
                    fontFamily: 'Albert Sans, sans-serif',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  formatter={(value: any, _name: any, props: any) => {
                    const spent = props?.payload?.spent || 0;
                    return [
                      `${formatUSDC(Number(value))} (${t('dashboard.spent').toLowerCase()} ${formatUSDC(spent)})`,
                      t('dashboard.budget'),
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {budgetDistribution.map((card, i) => {
              const pct = card.value > 0 ? ((card.spent / card.value) * 100).toFixed(0) : '0';
              return (
                <div key={card.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-text-secondary">{card.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 lg:w-16 h-1 rounded-full bg-bg-primary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-primary font-medium tabular-nums w-12 lg:w-14 text-right">
                      {formatUSDC(card.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch">
        {/* Recent Transactions */}
        <div className="glass-card rounded-im p-4 lg:p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-display">{t('dashboard.recentTransactions')}</h3>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.latestActivity')}</p>
            </div>
            <button className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
              {t('common.viewAll')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2 flex-1">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.tx_id}
                  className="flex items-center gap-3 p-2.5 lg:p-3 rounded-im border border-border-default hover:border-border-hover transition-all duration-200 cursor-pointer group"
                >
                  <div
                    className={`w-9 h-9 rounded-im flex items-center justify-center shrink-0 ${
                      tx.status === 'APPROVED'
                        ? 'bg-accent-patina/10'
                        : 'bg-accent-coral/10'
                    }`}
                  >
                    {tx.status === 'APPROVED' ? (
                      <ArrowUpRight className="w-4 h-4 text-accent-patina" strokeWidth={2} />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-accent-coral" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-patina transition-colors">
                        {tx.vendor}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          tx.status === 'APPROVED' ? 'status-approved' : 'status-denied'
                        }`}
                      >
                        {tx.status === 'APPROVED' ? t('common.approved') : t('common.denied')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-text-muted font-mono truncate mr-2">
                        {formatAddr(tx.tx_hash || tx.vendor_address)} · {formatTime(tx.timestamp)}
                      </p>
                      <p className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
                        {formatCurrency(tx.amount)} <span className="text-text-muted text-xs font-normal">{t('common.usdc')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-text-primary">{t('dashboard.noTransactions')}</p>
              <p className="text-xs text-text-muted mt-1 max-w-[200px]">
                {t('dashboard.noTransactionsDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div className="glass-card rounded-im p-4 lg:p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-display">{t('dashboard.anomaliesAlerts')}</h3>
              <p className="text-xs text-text-muted mt-0.5">{t('dashboard.flaggedByPolicy')}</p>
            </div>
            <span className="text-[11px] font-bold text-accent-amber px-2 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/20 shrink-0">
              {summary.anomalies.length} {t('dashboard.flagged')}
            </span>
          </div>
          {summary.anomalies.length > 0 ? (
            <div className="space-y-2 flex-1">
              {summary.anomalies.map((a, i) => (
                <div
                  key={i}
                  className="p-2.5 lg:p-3 rounded-im border border-border-default/40 hover:border-accent-coral/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.alert === 'blocked' ? 'bg-accent-coral' : 'bg-accent-amber'}`} />
                      <span className="text-xs font-semibold text-text-primary">
                        {a.alert === 'blocked' ? t('common.blocked') : t('dashboard.humanReview')}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">{a.tx_id}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1.5 ml-4 leading-relaxed">{a.reason}</p>
                  <div className="flex items-center gap-3 mt-2 ml-4">
                    <span className="text-[11px] text-text-muted">
                      {t('dashboard.agent')}: <span className="text-text-secondary">{a.agent.split('-')[1]}</span>
                    </span>
                    <span className="text-xs font-semibold text-accent-coral tabular-nums">
                      {formatCurrency(a.amount)} {t('common.usdc')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-10 h-10 rounded-full bg-accent-patina/10 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-accent-patina" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-text-primary">{t('dashboard.noAnomalies')}</p>
              <p className="text-xs text-text-muted mt-1 max-w-[200px]">
                {t('dashboard.noAnomaliesDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
