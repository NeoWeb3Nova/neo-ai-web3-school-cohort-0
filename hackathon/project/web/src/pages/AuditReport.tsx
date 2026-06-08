import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  User,
  Hash,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { INITIAL_TRANSACTIONS, MONTHLY_SUMMARY } from '../data/mockData';
import { CHART, COLORS } from '../data/chartTheme';

export default function AuditReport() {
  const { t } = useTranslation();
  const [format, setFormat] = useState<'markdown' | 'csv'>('markdown');

  const spendingTrend = [
    { day: 'Jun 01', approved: 0, denied: 0 },
    { day: 'Jun 02', approved: 0, denied: 0 },
    { day: 'Jun 03', approved: 0, denied: 0 },
    { day: 'Jun 04', approved: 0, denied: 0 },
    { day: 'Jun 05', approved: 0, denied: 0 },
    { day: 'Jun 06', approved: 0, denied: 0 },
    { day: 'Jun 07', approved: 275, denied: 1499 },
  ];

  const byVendor = [
    { name: 'OpenAI', amount: 10 },
    { name: 'Midjourney', amount: 30 },
    { name: 'Unsplash', amount: 5 },
    { name: 'Google Ads', amount: 180 },
    { name: 'Twitter Ads', amount: 50 },
  ];

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const generateMarkdown = () => {
    const lines: string[] = [];
    lines.push('# OPC Agent Treasury \u2014 ' + t('audit.title'));
    lines.push(`**${t('audit.metric')}**: ${MONTHLY_SUMMARY.month} `);
    lines.push(`**${t('audit.generatedAt')}**: ${MONTHLY_SUMMARY.generated_at} `);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## ${t('audit.financialOverview')}`);
    lines.push('');
    lines.push(`| ${t('audit.metric')} | ${t('audit.value')} |`);
    lines.push('|---|---|');
    lines.push(`| ${t('audit.monthlyIncome')} | ${MONTHLY_SUMMARY.total_income_usd.toFixed(2)} USDC |`);
    lines.push(`| ${t('audit.totalApproved')} | ${MONTHLY_SUMMARY.total_approved_usd.toFixed(2)} USDC |`);
    lines.push(`| ${t('audit.totalDenied')} | ${MONTHLY_SUMMARY.total_denied_usd.toFixed(2)} USDC |`);
    lines.push(`| ${t('audit.deniedCount')} | ${MONTHLY_SUMMARY.denied_count} |`);
    lines.push(`| ${t('audit.transactionCount')} | ${MONTHLY_SUMMARY.transaction_count} |`);
    lines.push('');
    lines.push(`## ${t('audit.spendingByAgent')}`);
    lines.push('');
    lines.push(`| ${t('audit.agent')} | ${t('audit.spent')} | ${t('audit.txCount')} | ${t('audit.vendorList')} | ${t('common.denied')} |`);
    lines.push('|---|---|---|---|---|');
    Object.entries(MONTHLY_SUMMARY.by_agent).forEach(([agent, data]) => {
      const name = agent.split('-')[1] || agent;
      lines.push(`| ${name} | ${data.spent.toFixed(2)} USDC | ${data.tx_count} | ${data.vendors.join(', ')} | ${data.denied} |`);
    });
    lines.push('');
    lines.push(`## ${t('audit.anomaliesAlerts')}`);
    lines.push('');
    if (MONTHLY_SUMMARY.anomalies.length > 0) {
      lines.push(`| ${t('agent.txId')} | ${t('audit.agent')} | ${t('common.amount')} | ${t('audit.alert')} | ${t('audit.reason')} |`);
      lines.push('|---|---|---|---|---|');
      MONTHLY_SUMMARY.anomalies.forEach((a) => {
        const name = a.agent.split('-')[1] || a.agent;
        lines.push(`| ${a.tx_id} | ${name} | ${a.amount.toFixed(2)} | ${a.alert} | ${a.reason} |`);
      });
    } else {
      lines.push(t('audit.noAnomalies'));
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`> ${t('audit.reportFooter')}`);
    return lines.join('\n');
  };

  const handleExport = () => {
    const content = format === 'markdown' ? generateMarkdown() : 'csv export placeholder';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${MONTHLY_SUMMARY.month}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Report Header */}
      <div className="glass-card rounded-im p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-im bg-accent-slate/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-accent-slate" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary font-display">
                {t('audit.title')}
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {MONTHLY_SUMMARY.month} \u00b7 {t('audit.generatedAt')} {new Date(MONTHLY_SUMMARY.generated_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center bg-bg-card rounded-im border border-border-default p-0.5">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  format === 'markdown'
                    ? 'bg-accent-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {t('audit.markdown')}
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  format === 'csv'
                    ? 'bg-accent-gold text-bg-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {t('audit.csv')}
              </button>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-im text-sm btn-gold"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              {t('common.export')}
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="glass-card rounded-im p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{t('audit.income')}</span>
            <TrendingUp className="w-4 h-4 text-accent-patina" strokeWidth={1.5} />
          </div>
          <p className="text-lg lg:text-xl font-bold text-text-primary">
            {MONTHLY_SUMMARY.total_income_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
          </p>
        </div>
        <div className="glass-card rounded-im p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{t('audit.approved')}</span>
            <CheckCircle className="w-4 h-4 text-accent-patina" strokeWidth={1.5} />
          </div>
          <p className="text-lg lg:text-xl font-bold text-accent-patina">
            {MONTHLY_SUMMARY.total_approved_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
          </p>
          <p className="text-xs text-text-muted mt-1">{MONTHLY_SUMMARY.transaction_count - MONTHLY_SUMMARY.denied_count} {t('dashboard.transactions')}</p>
        </div>
        <div className="glass-card rounded-im p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{t('audit.denied')}</span>
            <XCircle className="w-4 h-4 text-accent-coral" strokeWidth={1.5} />
          </div>
          <p className="text-lg lg:text-xl font-bold text-accent-coral">
            {MONTHLY_SUMMARY.total_denied_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
          </p>
          <p className="text-xs text-text-muted mt-1">{MONTHLY_SUMMARY.denied_count} {t('common.blocked')}</p>
        </div>
        <div className="glass-card rounded-im p-4 lg:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary">{t('audit.savingsRate')}</span>
            <TrendingDown className="w-4 h-4 text-accent-slate" strokeWidth={1.5} />
          </div>
          <p className="text-lg lg:text-xl font-bold text-accent-slate">
            {((MONTHLY_SUMMARY.total_denied_usd / (MONTHLY_SUMMARY.total_approved_usd + MONTHLY_SUMMARY.total_denied_usd)) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted mt-1">{t('audit.threatsPrevented')}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Spending Trend */}
        <div className="glass-card rounded-im p-4 lg:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2 font-display">
            <Calendar className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
            {t('audit.dailyActivity')}
          </h3>
          <div className="h-52 lg:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrend}>
                <defs>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: '8px', color: CHART.tooltipText }}
                />
                <Area type="monotone" dataKey="approved" stroke={COLORS.gold} fillOpacity={1} fill="url(#colorApproved)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Vendor */}
        <div className="glass-card rounded-im p-4 lg:p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">{t('audit.spendingByVendor')}</h3>
          <div className="h-52 lg:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: '8px', color: CHART.tooltipText }}
                  formatter={(value: any) => [`$${value}`, t('dashboard.spent')]}
                />
                <Bar dataKey="amount" style={{ fill: COLORS.gold }} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="glass-card rounded-im overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary font-display">{t('audit.transactionLedger')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted">{t('common.status')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted">{t('agent.txId')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted hidden sm:table-cell">{t('audit.agent')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted hidden md:table-cell">{t('agent.vendor')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted text-right">{t('common.amount')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted hidden lg:table-cell">{t('common.time')}</th>
                <th className="px-3 md:px-5 py-3 text-xs font-medium text-text-muted hidden md:table-cell">{t('audit.alert')}</th>
              </tr>
            </thead>
            <tbody>
              {[...INITIAL_TRANSACTIONS]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((tx) => (
                  <tr key={tx.tx_id} className="border-b border-border-default/50 hover:bg-bg-hover/50 transition-colors">
                    <td className="px-3 md:px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'APPROVED' ? 'status-approved' : 'status-denied'
                        }`}
                      >
                        {tx.status === 'APPROVED' ? (
                          <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                        ) : (
                          <XCircle className="w-3 h-3" strokeWidth={1.5} />
                        )}
                        {tx.status === 'APPROVED' ? t('common.approved') : t('common.denied')}
                      </span>
                    </td>
                    <td className="px-3 md:px-5 py-3 font-mono text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-text-muted hidden sm:inline" strokeWidth={1.5} />
                        {tx.tx_id}
                      </div>
                    </td>
                    <td className="px-3 md:px-5 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                        <span className="text-text-primary">{tx.agent_id.split('-')[1]}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-5 py-3 text-text-primary hidden md:table-cell">{tx.vendor}</td>
                    <td className="px-3 md:px-5 py-3 text-right font-medium text-text-primary">
                      {tx.amount.toFixed(2)} USDC
                    </td>
                    <td className="px-3 md:px-5 py-3 text-xs text-text-muted hidden lg:table-cell">{formatTime(tx.timestamp)}</td>
                    <td className="px-3 md:px-5 py-3 hidden md:table-cell">
                      {tx.alert_level !== 'none' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                          <AlertTriangle className="w-3 h-3" />
                          {tx.alert_level}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">\u2014</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalies Section */}
      {MONTHLY_SUMMARY.anomalies.length > 0 && (
        <div className="glass-card rounded-im p-4 lg:p-5 border-accent-amber/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2 font-display">
            <AlertTriangle className="w-4 h-4 text-accent-amber" />
            {t('audit.anomaliesTitle')}
          </h3>
          <div className="space-y-2">
            {MONTHLY_SUMMARY.anomalies.map((a, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-im border border-border-default gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      a.alert === 'blocked'
                        ? 'bg-accent-coral/10 text-accent-coral'
                        : 'bg-accent-amber/10 text-accent-amber'
                    }`}
                  >
                    {a.alert}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{a.reason}</p>
                    <p className="text-xs text-text-muted">
                      {a.tx_id} \u00b7 {a.agent.split('-')[1]}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent-coral shrink-0 sm:text-right">{a.amount.toFixed(2)} USDC</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
