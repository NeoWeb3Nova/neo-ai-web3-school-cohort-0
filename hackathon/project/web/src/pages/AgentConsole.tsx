import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Send,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  X,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { type CardPact, type Transaction } from '../data/mockData';
import { cawApi, type PaymentResponse } from '../api/caw';
import { getCardStatusConfig, normalizeCardStatus } from '../utils/cardStatus';

interface PaymentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
}

const emptySteps = (t: (key: string) => string): PaymentStep[] => [
  { id: 's1', label: t('agent.permissionCheck'), status: 'pending' },
  { id: 's2', label: t('agent.budgetValidation'), status: 'pending' },
  { id: 's3', label: t('agent.vendorWhitelist'), status: 'pending' },
  { id: 's4', label: t('agent.timeWindow'), status: 'pending' },
  { id: 's5', label: t('agent.cooldownPeriod'), status: 'pending' },
  { id: 's6', label: t('agent.anomalyDetection'), status: 'pending' },
];

function formatTime(ts: string): string {
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? ts : date.toLocaleString();
}

export default function AgentConsole() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCardId = searchParams.get('card_id') || '';
  const [cards, setCards] = useState<CardPact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCard, setSelectedCard] = useState(searchParams.get('card_id') || '');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('10');
  const [purpose, setPurpose] = useState('GPT-4 API tokens');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    status: 'APPROVED' | 'DENIED' | 'PENDING_APPROVAL';
    reason: string;
    response?: PaymentResponse;
    steps: PaymentStep[];
  } | null>(null);

  const activeCards = useMemo(
    () => cards.filter((c) => normalizeCardStatus(c.status) === 'ACTIVE'),
    [cards]
  );
  const selectedCardId = selectedCard || requestedCardId;
  const card = activeCards.find((c) => c.card_id === selectedCardId) || activeCards[0] || null;
  const cardStatus = getCardStatusConfig(card?.status, t);
  const vendorOptions = card?.vendor_whitelist.map((v) => v.name) ?? [];
  const effectiveVendor = vendorOptions.includes(vendor) ? vendor : vendorOptions[0] || '';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextCards, nextTransactions] = await Promise.all([
        cawApi.listCards(),
        cawApi.listTransactions(),
      ]);
      setCards(nextCards);
      setTransactions(nextTransactions);
      setOffline(false);
    } catch (err) {
      console.warn('[AgentConsole] Backend unreachable:', err);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([cawApi.listCards(), cawApi.listTransactions()])
      .then(([nextCards, nextTransactions]) => {
        if (cancelled) return;
        setCards(nextCards);
        setTransactions(nextTransactions);
        setOffline(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[AgentConsole] Backend unreachable:', err);
        setOffline(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentTransactions = useMemo(() => {
    if (!card) return [];
    return transactions
      .filter((tx) => tx.card_id === card.card_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [transactions, card]);

  const errors = (() => {
    const errs: Record<string, string> = {};
    if (!card) return errs;
    const amt = parseFloat(amount) || 0;
    if (touched.amount || touched.submit) {
      if (amt <= 0) errs.amount = t('agent.amountError');
      else if (amt > card.budget.single_tx_limit) {
        errs.amount = t('agent.amountExceedsLimit', { limit: card.budget.single_tx_limit });
      } else if (amt > card.budget.monthly_max - card.budget.spent) {
        errs.amount = t('agent.amountExceedsBudget', { budget: (card.budget.monthly_max - card.budget.spent).toFixed(2) });
      }
    }
    if ((touched.purpose || touched.submit) && !purpose.trim()) {
      errs.purpose = t('agent.purposeRequired');
    }
    if ((touched.vendor || touched.submit) && !effectiveVendor) {
      errs.vendor = t('agent.vendorRequired');
    }
    return errs;
  })();

  const isFormValid = !!card && Object.keys(errors).length === 0 && parseFloat(amount) > 0 && purpose.trim().length > 0 && !!effectiveVendor;

  const friendlyReason = (raw: string): string => {
    if (raw.includes('scope_denied')) return t('agent.vendorNotWhitelist');
    if (raw.includes('per_tx_exceeded')) return t('agent.perTxExceeded');
    if (raw.includes('budget_exceeded')) return t('agent.budgetExceeded');
    if (raw.includes('amount must be positive')) return t('agent.amountPositive');
    if (raw.includes('PERMISSION_DENIED') || raw.includes('INSUFFICIENT_PERMISSION')) return t('agent.permissionDenied');
    return raw;
  };

  const submitPayment = async () => {
    setTouched((prev) => ({ ...prev, amount: true, purpose: true, vendor: true, submit: true }));
    if (!isFormValid || !card) return;

    setIsProcessing(true);
    const runningSteps = emptySteps(t).map((step) => ({ ...step, status: 'success' as const }));
    setResult({ status: 'PENDING_APPROVAL', reason: '', steps: runningSteps });

    try {
      const response = await cawApi.submitPayment({
        card_id: card.card_id,
        vendor: effectiveVendor,
        amount: parseFloat(amount),
        purpose: purpose.trim(),
        metadata: { source: 'agent_console' },
      });
      const status = response.status === 'APPROVED' ? 'APPROVED' : 'DENIED';
      setResult({
        status,
        reason: response.reason,
        response,
        steps: runningSteps.map((step, index) => ({
          ...step,
          status: status === 'APPROVED' || index < 3 ? 'success' : 'error',
        })),
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error');
      setResult({
        status: 'DENIED',
        reason: message,
        steps: runningSteps.map((step, index) => ({ ...step, status: index < 2 ? 'success' : 'error' })),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => setResult(null);
  const handleRetry = () => {
    setResult(null);
    submitPayment();
  };

  const handleCardChange = (cardId: string) => {
    setSelectedCard(cardId);
    setSearchParams(cardId ? { card_id: cardId } : {});
    setResult(null);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-im p-8 text-center max-w-5xl mx-auto">
        <RefreshCw className="w-6 h-6 text-accent-patina animate-spin mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
        {offline && (
          <div className="rounded-im border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 text-xs text-accent-amber">
            {t('common.offline')}
          </div>
        )}
        <div className="glass-card rounded-im p-8 text-center">
          <div className="w-12 h-12 rounded-im bg-accent-patina/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-accent-patina" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-text-primary">{t('agent.noActiveCards')}</h2>
          <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">
            {t('agent.noActiveCardsDesc')}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link to="/cards" className="inline-flex items-center gap-2 px-4 py-2 rounded-im text-sm btn-gold">
              <CreditCard className="w-4 h-4" strokeWidth={1.5} />
              {t('agent.goToCards')}
            </Link>
            <button onClick={loadData} className="inline-flex items-center gap-2 px-4 py-2 rounded-im text-sm btn-ghost">
              <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      {offline && (
        <div className="rounded-im border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 text-xs text-accent-amber">
          {t('common.offline')}
        </div>
      )}

      {/* Agent Persona */}
      <div className="glass-card rounded-im p-4 lg:p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-im bg-accent-slate/10 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-accent-slate" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {card.agent_name}
          </h2>
          <p className="text-sm text-text-secondary truncate">
            {t('agent.subtitle')}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cardStatus.bg} ${cardStatus.color}`}>
            {cardStatus.icon}
            {cardStatus.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
        {/* Left: Payment Form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card rounded-im p-4 lg:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-gold" strokeWidth={1.5} />
              {t('agent.newPaymentRequest')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.selectCard')}</label>
                <select
                  value={card.card_id}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
                >
                  {activeCards.map((c) => (
                    <option key={c.card_id} value={c.card_id}>
                      {c.agent_name} — ${c.budget.spent.toFixed(0)} / ${c.budget.monthly_max} {t('common.usdc')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.vendor')}</label>
                <select
                  value={effectiveVendor}
                  onChange={(e) => {
                    setVendor(e.target.value);
                    setTouched((prev) => ({ ...prev, vendor: true }));
                  }}
                  className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${errors.vendor ? 'error' : ''}`}
                >
                  {vendorOptions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                {errors.vendor && (
                  <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" strokeWidth={2} />
                    {errors.vendor}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.amount')}</label>
                  <input
                    type="number"
                    value={amount}
                    min={0.01}
                    step={0.01}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setTouched((prev) => ({ ...prev, amount: true }));
                    }}
                    className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${errors.amount ? 'error' : ''}`}
                  />
                  {errors.amount && (
                    <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" strokeWidth={2} />
                      {errors.amount}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.purpose')}</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      setTouched((prev) => ({ ...prev, purpose: true }));
                    }}
                    placeholder={t('agent.purposePlaceholder')}
                    className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${errors.purpose ? 'error' : ''}`}
                  />
                  {errors.purpose && (
                    <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" strokeWidth={2} />
                      {errors.purpose}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={submitPayment}
                disabled={isProcessing || !card}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-im text-sm btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" strokeWidth={1.5} />
                    {t('agent.submitPaymentRequest')}
                  </>
                )}
              </button>
            </div>
          </div>

          {result && !isProcessing && (
            <div
              className={`glass-card rounded-im p-4 lg:p-5 border ${
                result.status === 'APPROVED'
                  ? 'border-accent-patina/30 bg-accent-patina/5'
                  : 'border-accent-coral/30 bg-accent-coral/5'
              } animate-slide-in`}
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {result.status === 'APPROVED' ? (
                    <CheckCircle className="w-6 h-6 text-accent-patina shrink-0" strokeWidth={1.5} />
                  ) : (
                    <XCircle className="w-6 h-6 text-accent-coral shrink-0" strokeWidth={1.5} />
                  )}
                  <div className="min-w-0">
                    <h3 className={`text-base font-semibold ${result.status === 'APPROVED' ? 'text-accent-patina' : 'text-accent-coral'}`}>
                      {result.status === 'APPROVED' ? t('agent.paymentApproved') : t('agent.paymentDenied')}
                    </h3>
                    <p className="text-xs text-text-secondary">{friendlyReason(result.reason)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {result.status === 'DENIED' && (
                    <button onClick={handleRetry} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-im text-xs btn-ghost" title="Retry with same values">
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t('common.retry')}
                    </button>
                  )}
                  <button onClick={handleDismiss} className="flex items-center justify-center w-7 h-7 rounded-im text-text-muted hover:text-text-primary btn-ghost" aria-label="Dismiss result">
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
              {result.response && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {result.response.tx_id && (
                    <div className="p-2 rounded-im">
                      <span className="text-text-muted">{t('agent.txId')}</span>
                      <p className="font-mono text-text-primary mt-0.5">{result.response.tx_id}</p>
                    </div>
                  )}
                  <div className="p-2 rounded-im">
                    <span className="text-text-muted">{t('common.amount')}</span>
                    <p className="text-text-primary mt-0.5">{result.response.amount.toFixed(2)} {t('common.usdc')}</p>
                  </div>
                  {result.response.tx_hash && (
                    <div className="p-2 rounded-im col-span-1 sm:col-span-2">
                      <span className="text-text-muted">{t('agent.txHash')}</span>
                      <p className="font-mono text-text-primary mt-0.5 break-all">{result.response.tx_hash}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="glass-card rounded-im p-4 lg:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3 font-display">{t('agent.recentTransactions')}</h3>
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-text-muted">{t('agent.noRecentTransactions')}</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div key={tx.tx_id} className="flex items-center justify-between gap-3 p-2 rounded-im bg-bg-primary border border-border-default text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{tx.vendor} · {tx.amount.toFixed(2)} {tx.currency}</p>
                      <p className="text-text-muted truncate">{formatTime(tx.timestamp)} · {tx.reason}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full ${tx.status === 'APPROVED' ? 'bg-accent-patina/10 text-accent-patina' : 'bg-accent-coral/10 text-accent-coral'}`}>
                      {tx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Policy Pipeline */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-im p-4 lg:p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
              {t('agent.policyEnginePipeline')}
            </h3>
            <div className="space-y-3">
              {(result?.steps || emptySteps(t)).map((step, i, arr) => (
                <div key={step.id} className="relative">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        step.status === 'success'
                          ? 'bg-accent-patina/20 text-accent-patina'
                          : step.status === 'running'
                          ? 'bg-accent-slate/20 text-accent-slate animate-pulse'
                          : step.status === 'error'
                          ? 'bg-accent-coral/20 text-accent-coral'
                          : 'bg-bg-hover text-text-muted'
                      }`}
                    >
                      {step.status === 'success' ? (
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      ) : step.status === 'running' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      ) : step.status === 'error' ? (
                        <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${step.status === 'success' ? 'text-accent-patina' : step.status === 'running' ? 'text-accent-slate' : step.status === 'error' ? 'text-accent-coral' : 'text-text-secondary'}`}>
                        {step.label}
                      </p>
                    </div>
                    {step.status === 'running' && <ArrowRight className="w-3.5 h-3.5 text-accent-slate animate-pulse shrink-0" strokeWidth={1.5} />}
                  </div>
                  {i < arr.length - 1 && <div className="ml-3.5 w-px h-3 bg-border-default mt-1" />}
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-border-default">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-text-secondary">{t('cards.cardBudget')}</span>
                <span className="text-text-primary font-medium">
                  ${card.budget.spent.toFixed(0)} / ${card.budget.monthly_max}
                </span>
              </div>
              <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-patina rounded-full transition-all"
                  style={{ width: `${Math.min((card.budget.spent / (card.budget.monthly_max || 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">
                {t('agent.singleTxLimit')}: ${card.budget.single_tx_limit} {t('common.usdc')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.vendor_whitelist.map((v) => (
                  <span key={v.address} className="px-2 py-0.5 rounded-md bg-accent-slate/10 text-accent-slate text-[10px] border border-accent-slate/20">
                    {v.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
