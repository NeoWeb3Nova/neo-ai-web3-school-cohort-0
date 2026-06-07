import { useMemo, useState } from 'react';
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

const COLORS = ['#00D26A', '#3B82F6', '#F59E0B', '#8B5CF6', '#FF4D4D'];

const TIME_RANGES = ['24H', '7D', '30D', 'ALL'] as const;

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
  const [timeRange, setTimeRange] = useState<(typeof TIME_RANGES)[number]>('ALL');

  const stats = useMemo(() => {
    const activeCards = INITIAL_CARDS.filter((c) => c.status === 'ACTIVE').length;
    const pendingCards = INITIAL_CARDS.filter((c) => c.status === 'PENDING_APPROVAL').length;
    const approvedTx = INITIAL_TRANSACTIONS.filter((t) => t.status === 'APPROVED');
    const deniedTx = INITIAL_TRANSACTIONS.filter((t) => t.status === 'DENIED');
    const totalApproved = approvedTx.reduce((s, t) => s + t.amount, 0);
    const totalDenied = deniedTx.reduce((s, t) => s + t.amount, 0);
    const anomalyCount = INITIAL_TRANSACTIONS.filter(
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
      totalBudget: INITIAL_CARDS.reduce((s, c) => s + c.budget.monthly_max, 0),
      totalSpent: INITIAL_CARDS.reduce((s, c) => s + c.budget.spent, 0),
    };
  }, []);

  const spendingByAgent = useMemo(() => {
    const data: Record<string, number> = {};
    INITIAL_TRANSACTIONS.filter((t) => t.status === 'APPROVED').forEach((t) => {
      const name = t.agent_id.includes('content')
        ? 'Content Agent'
        : t.agent_id.includes('ad')
        ? 'Ad Agent'
        : 'Design Agent';
      data[name] = (data[name] || 0) + t.amount;
    });
    // Ensure all agents appear even with 0
    const agents = ['Content Agent', 'Ad Agent', 'Design Agent'];
    return agents.map((name) => ({ name, value: data[name] || 0 }));
  }, []);

  const budgetDistribution = useMemo(() => {
    return INITIAL_CARDS.map((c) => ({
      name: c.agent_name,
      value: c.budget.monthly_max,
      spent: c.budget.spent,
    }));
  }, []);

  const recentTransactions = useMemo(() => {
    return [...INITIAL_TRANSACTIONS]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, []);

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
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Treasury Balance */}
        <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
              Treasury Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-accent-green" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {formatCurrency(treasuryBalance)}{' '}
            <span className="text-sm font-medium text-text-muted">USDC</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-accent-green" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-green">
              {utilizationRate}% utilized
            </span>
          </div>
        </div>

        {/* Active Cards */}
        <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
              Active Cards
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent-blue" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {stats.activeCards}
            <span className="text-sm font-medium text-text-muted ml-1">
              <span className="text-text-muted/60">/</span> {INITIAL_CARDS.length}
            </span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {stats.pendingCards > 0 ? (
              <button className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs font-medium hover:bg-accent-orange/20 transition-colors cursor-pointer">
                <Clock className="w-3 h-3" strokeWidth={2} />
                {stats.pendingCards} pending approval
              </button>
            ) : (
              <span className="text-xs text-text-muted">All cards operational</span>
            )}
          </div>
        </div>

        {/* Approved Volume */}
        <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
              Approved Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent-green" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {formatCurrency(stats.totalApproved)}{' '}
            <span className="text-sm font-medium text-text-muted">USDC</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-accent-green" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-green">
              {stats.approvedCount} transactions
            </span>
          </div>
        </div>

        {/* Threats Blocked */}
        <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-black/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
              Threats Blocked
            </span>
            <div className="w-8 h-8 rounded-lg bg-accent-red/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-red" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {stats.deniedCount}
            <span className="text-sm font-medium text-text-muted ml-1.5">attacks</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5 text-accent-green" strokeWidth={2} />
            <span className="text-xs font-medium text-accent-green">
              {formatCurrency(stats.totalDenied)} USDC saved
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Spending by Agent */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Spending by Agent</h3>
              <p className="text-xs text-text-muted mt-0.5">Approved transactions only</p>
            </div>
            <div className="flex items-center gap-1 bg-bg-primary rounded-lg p-0.5 border border-border-default">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    timeRange === range
                      ? 'bg-bg-card text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spendingByAgent}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2E3640" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#8B949E', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                  axisLine={{ stroke: '#2E3640' }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fill: '#8B949E', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: '#1C2128',
                    border: '1px solid #2E3640',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  formatter={(value: any) => [formatUSDC(Number(value)), 'Spent']}
                  labelStyle={{ color: '#8B949E', fontSize: '11px', marginBottom: '4px' }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {spendingByAgent.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Distribution */}
        <div className="glass-card rounded-xl p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Budget Distribution</h3>
              <p className="text-xs text-text-muted mt-0.5">Monthly allocation</p>
            </div>
            <Activity className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-h-[180px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={budgetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {budgetDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1C2128',
                    border: '1px solid #2E3640',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontFamily: 'Inter, sans-serif',
                    padding: '10px 14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                  formatter={(value: any, _name: any, props: any) => {
                    const spent = props?.payload?.spent || 0;
                    return [
                      `${formatUSDC(Number(value))} (spent ${formatUSDC(spent)})`,
                      'Budget',
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
                    <div className="w-16 h-1 rounded-full bg-bg-primary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-primary font-medium tabular-nums w-14 text-right">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Recent Transactions */}
        <div className="glass-card rounded-xl p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
              <p className="text-xs text-text-muted mt-0.5">Latest activity across all cards</p>
            </div>
            <button className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 flex-1">
            {recentTransactions.map((tx) => (
              <div
                key={tx.tx_id}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-primary/40 border border-border-default/40 hover:border-border-hover hover:bg-bg-primary/60 transition-all duration-200 cursor-pointer group"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    tx.status === 'APPROVED'
                      ? 'bg-accent-green/10'
                      : 'bg-accent-red/10'
                  }`}
                >
                  {tx.status === 'APPROVED' ? (
                    <ArrowUpRight className="w-4 h-4 text-accent-green" strokeWidth={2} />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-accent-red" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-green transition-colors">
                      {tx.vendor}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        tx.status === 'APPROVED' ? 'status-approved' : 'status-denied'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-text-muted font-mono">
                      {formatAddr(tx.tx_hash || tx.vendor_address)} · {formatTime(tx.timestamp)}
                    </p>
                    <p className="text-sm font-semibold text-text-primary tabular-nums">
                      {formatCurrency(tx.amount)} <span className="text-text-muted text-xs font-normal">USDC</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomalies */}
        <div className="glass-card rounded-xl p-5 flex flex-col transition-all duration-200 hover:border-border-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Anomalies & Alerts</h3>
              <p className="text-xs text-text-muted mt-0.5">Flagged by policy engine</p>
            </div>
            <span className="text-[11px] font-bold text-accent-orange px-2 py-0.5 rounded-full bg-accent-orange/10 border border-accent-orange/20">
              {MONTHLY_SUMMARY.anomalies.length} flagged
            </span>
          </div>
          <div className="space-y-2 flex-1">
            {MONTHLY_SUMMARY.anomalies.map((a, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-bg-primary/40 border border-border-default/40 hover:border-accent-red/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.alert === 'blocked' ? 'bg-accent-red' : 'bg-accent-orange'}`} />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                      {a.alert === 'blocked' ? 'Blocked' : 'Human Review'}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">{a.tx_id}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 ml-4 leading-relaxed">{a.reason}</p>
                <div className="flex items-center gap-3 mt-2 ml-4">
                  <span className="text-[11px] text-text-muted">
                    Agent: <span className="text-text-secondary">{a.agent.split('-')[1]}</span>
                  </span>
                  <span className="text-xs font-semibold text-accent-red tabular-nums">
                    {formatCurrency(a.amount)} USDC
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
