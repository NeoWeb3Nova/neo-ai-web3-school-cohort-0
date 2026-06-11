import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
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
  Shield,
} from 'lucide-react';
import { ERC8004_TRUST_REQUIREMENTS, DIGITAL_EMPLOYEES, type CardPact, type DigitalEmployee, type Transaction } from '../data/mockData';
import EmployeeAvatar from '../components/EmployeeAvatar';
import { cawApi, type PaymentResponse } from '../api/caw';
import { getCardStatusConfig, normalizeCardStatus } from '../utils/cardStatus';

interface PaymentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
}

const emptySteps = (): PaymentStep[] => [
  { id: 's1', label: 'x402 payment challenge received', status: 'pending' },
  { id: 's2', label: 'CAW policy card permission check', status: 'pending' },
  { id: 's3', label: 'ERC-8004 Identity Registry check', status: 'pending' },
  { id: 's4', label: 'ERC-8004 Reputation Registry threshold', status: 'pending' },
  { id: 's5', label: 'ERC-8004 Validation Registry requirement', status: 'pending' },
  { id: 's6', label: 'Budget, signature and audit record', status: 'pending' },
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
  const [employees, setEmployees] = useState<DigitalEmployee[]>(DIGITAL_EMPLOYEES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCard, setSelectedCard] = useState(searchParams.get('card_id') || '');
  const [assignmentCardId, setAssignmentCardId] = useState(searchParams.get('card_id') || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(DIGITAL_EMPLOYEES[0]?.agent_id || '');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('10');
  const [purpose, setPurpose] = useState('x402 pay-per-call request');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
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
  const selectedEmployee = employees.find((employee) => employee.agent_id === selectedEmployeeId) || employees[0] || null;
  const cardsForSelectedEmployee = useMemo(
    () => activeCards.filter((c) => c.assigned_agent_id === selectedEmployeeId),
    [activeCards, selectedEmployeeId]
  );
  const assignableCards = useMemo(
    () => activeCards.filter((c) => !c.assigned_agent_id || c.assigned_agent_id === selectedEmployeeId),
    [activeCards, selectedEmployeeId]
  );
  const selectedCardId = selectedCard || requestedCardId || cardsForSelectedEmployee[0]?.card_id || '';
  const card = cardsForSelectedEmployee.find((c) => c.card_id === selectedCardId) || cardsForSelectedEmployee[0] || null;
  const displayCard = card || assignableCards.find((c) => c.card_id === (assignmentCardId || requestedCardId)) || assignableCards[0] || activeCards[0] || null;
  const cardStatus = getCardStatusConfig(displayCard?.status, t);
  const vendorOptions = card?.vendor_whitelist.map((v) => v.name) ?? [];
  const effectiveVendor = vendorOptions.includes(vendor) ? vendor : vendorOptions[0] || '';
  const selectedVendorMeta = card?.vendor_whitelist.find((v) => v.name === effectiveVendor) || card?.vendor_whitelist[0];
  const trustRequirements = displayCard?.trust_requirements?.length ? displayCard.trust_requirements : ERC8004_TRUST_REQUIREMENTS;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextCards, nextTransactions, nextEmployees] = await Promise.all([
        cawApi.listCards(),
        cawApi.listTransactions(),
        cawApi.listDigitalEmployees().catch(() => []),
      ]);
      setCards(nextCards);
      setTransactions(nextTransactions);
      if (nextEmployees.length > 0) {
        setEmployees(nextEmployees);
        if (!nextEmployees.some((employee) => employee.agent_id === selectedEmployeeId)) {
          setSelectedEmployeeId(nextEmployees[0].agent_id);
        }
      }
      setOffline(false);
    } catch (err) {
      console.warn('[AgentConsole] Backend unreachable:', err);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cawApi.listCards(),
      cawApi.listTransactions(),
      cawApi.listDigitalEmployees().catch(() => []),
    ])
      .then(([nextCards, nextTransactions, nextEmployees]) => {
        if (cancelled) return;
        setCards(nextCards);
        setTransactions(nextTransactions);
        if (nextEmployees.length > 0) {
          setEmployees(nextEmployees);
          if (!nextEmployees.some((employee) => employee.agent_id === selectedEmployeeId)) {
            setSelectedEmployeeId(nextEmployees[0].agent_id);
          }
        }
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
  }, [selectedEmployeeId]);

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

  const isFormValid = !!selectedEmployee && !!card && Object.keys(errors).length === 0 && parseFloat(amount) > 0 && purpose.trim().length > 0 && !!effectiveVendor;

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
    const runningSteps = emptySteps().map((step) => ({ ...step, status: 'success' as const }));
    setResult({ status: 'PENDING_APPROVAL', reason: '', steps: runningSteps });

    try {
      const response = await cawApi.submitPayment({
        agent_id: selectedEmployee?.agent_id || '',
        card_id: card.card_id,
        vendor: effectiveVendor,
        amount: parseFloat(amount),
        purpose: purpose.trim(),
        metadata: {
          source: 'agent_console',
          assigned_employee_id: selectedEmployee?.agent_id,
          assigned_employee_name: selectedEmployee?.name,
        },
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

  const handleAssignCard = async () => {
    if (!selectedEmployee || !assignmentCardId) return;
    setAssignmentLoading(true);
    setResult(null);
    try {
      await cawApi.assignCard(assignmentCardId, {
        agent_id: selectedEmployee.agent_id,
        agent_name: selectedEmployee.name,
      });
      setSelectedCard(assignmentCardId);
      setSearchParams({ card_id: assignmentCardId });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-im p-8 text-center max-w-5xl mx-auto">
        <RefreshCw className="w-6 h-6 text-accent-patina animate-spin mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (activeCards.length === 0) {
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

      {/* Agent Assignment */}
      <div className="glass-card rounded-im p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary font-display">{t('agent.assignCardTitle')}</h3>
            <p className="text-xs text-text-secondary mt-1">{t('agent.assignCardDesc')}</p>
          </div>
          {selectedEmployee && (
            <span className="shrink-0 px-2.5 py-1 rounded-full text-xs bg-accent-patina/10 text-accent-patina">
              {selectedEmployee.code}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.selectEmployee')}</label>
            <select
              value={selectedEmployee?.agent_id || ''}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setSelectedCard('');
                setResult(null);
              }}
              className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
            >
              {employees.map((employee) => (
                <option key={employee.agent_id} value={employee.agent_id}>
                  {employee.name} — {employee.role}
                </option>
              ))}
            </select>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {employees.map((employee) => {
                const active = employee.agent_id === selectedEmployee?.agent_id;
                return (
                  <button
                    key={employee.agent_id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(employee.agent_id);
                      setSelectedCard('');
                      setResult(null);
                    }}
                    className={`flex items-center gap-2 rounded-im border p-2 text-left transition-colors ${
                      active
                        ? 'border-accent-gold bg-accent-gold/10'
                        : 'border-border-default bg-bg-primary hover:border-border-hover'
                    }`}
                    aria-pressed={active}
                  >
                    <EmployeeAvatar employee={employee} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-text-primary">{employee.code}</span>
                      <span className="block truncate text-[10px] text-text-muted">{employee.risk_tier} risk</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.assignableCard')}</label>
            <div className="flex gap-2">
              <select
                value={assignmentCardId}
                onChange={(e) => setAssignmentCardId(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 rounded-im text-sm input-kinpaku"
              >
                <option value="">{t('agent.selectCardToAssign')}</option>
                {assignableCards.map((c) => {
                  const fullLabel = `${c.card_name || c.agent_name} — $${c.budget.spent.toFixed(0)} / $${c.budget.monthly_max}${c.assigned_agent_id === selectedEmployeeId ? ` · ${t('agent.alreadyAssigned')}` : ''}`;
                  return (
                    <option key={c.card_id} value={c.card_id} title={fullLabel}>
                      {c.card_name || c.agent_name}
                      {c.assigned_agent_id === selectedEmployeeId ? ` (${t('agent.alreadyAssigned')})` : ''}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={handleAssignCard}
                disabled={!selectedEmployee || !assignmentCardId || assignmentLoading}
                className="px-3 py-2 rounded-im text-sm btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignmentLoading ? t('common.processing') : t('agent.confirmAssignment')}
              </button>
            </div>
            <div className="mt-3 rounded-im bg-bg-primary border border-border-default p-3 text-xs text-text-secondary flex items-center gap-3">
              <EmployeeAvatar employee={selectedEmployee} label={selectedEmployee?.name} size="sm" />
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{t('agent.assignedCards')}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cardsForSelectedEmployee.length > 0 ? (
                    cardsForSelectedEmployee.map((c) => (
                      <span
                        key={c.card_id}
                        className="inline-block px-1.5 py-0.5 rounded bg-bg-elevated text-text-primary text-[11px]"
                      >
                        {c.card_name || c.agent_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-text-muted">{t('agent.noAssignedCardsForEmployee')}</span>
                  )}
                </div>
                {selectedEmployee && (
                  <p className="mt-1 text-text-muted truncate">ERC-8004: {selectedEmployee.erc8004_agent_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Persona */}
      <div className="glass-card rounded-im p-4 lg:p-5 flex items-center gap-4">
        <EmployeeAvatar employee={selectedEmployee} label={displayCard?.card_name || displayCard?.agent_name} size="lg" className="shadow-sm" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {selectedEmployee?.name || displayCard?.card_name || displayCard?.agent_name || t('agent.subtitle')}
          </h2>
          <p className="text-sm text-text-secondary truncate">
            {selectedEmployee ? selectedEmployee.role : t('agent.subtitle')}
          </p>
          {(displayCard?.x402_url || displayCard?.erc8004_agent_id) && (
            <p className="text-xs text-text-muted truncate mt-1">
              {displayCard?.x402_url ? `x402: ${displayCard?.x402_url}` : 'x402 enabled'}
              {displayCard?.erc8004_agent_id ? ` · ERC-8004: ${displayCard?.erc8004_agent_id}` : ''}
            </p>
          )}
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
              {!card && (
                <div className="rounded-im border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-xs text-accent-amber">
                  {t('agent.noAssignedCardsDesc')}
                </div>
              )}
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.selectCard')}</label>
                <select
                  value={card?.card_id || ''}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
                >
                  {cardsForSelectedEmployee.map((c) => (
                    <option key={c.card_id} value={c.card_id}>
                      {(c.card_name || c.agent_name)} — ${c.budget.spent.toFixed(0)} / ${c.budget.monthly_max} {t('common.usdc')}
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
                {selectedVendorMeta && (
                  <div className="mt-2 rounded-im border border-border-default bg-bg-primary p-2 text-[10px] text-text-muted">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">{selectedVendorMeta.x402_url ? 'x402 provider' : 'Legacy provider'}</span>
                      <span className={selectedVendorMeta.erc8004_agent_id ? 'text-accent-patina' : 'text-accent-amber'}>
                        {selectedVendorMeta.erc8004_agent_id ? 'ERC-8004 identity present' : 'No registry identity'}
                      </span>
                    </div>
                    <p className="mt-1 truncate">Endpoint: {selectedVendorMeta.x402_url || 'not declared'}</p>
                    <p className="truncate">Identity: {selectedVendorMeta.erc8004_agent_id || 'manual whitelist only'}</p>
                  </div>
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
                disabled={isProcessing || !isFormValid}
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
              {(result?.steps || emptySteps()).map((step, i, arr) => (
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
                  ${(displayCard?.budget.spent || 0).toFixed(0)} / ${displayCard?.budget.monthly_max || 0}
                </span>
              </div>
              <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-patina rounded-full transition-all"
                  style={{ width: `${Math.min(((displayCard?.budget.spent || 0) / (displayCard?.budget.monthly_max || 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5">
                {t('agent.singleTxLimit')}: ${displayCard?.budget.single_tx_limit || 0} {t('common.usdc')}
              </p>
              <div className="mt-4 pt-3 border-t border-border-default">
                <p className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent-patina" strokeWidth={1.5} />
                  ERC-8004 trust gates
                </p>
                <div className="mt-2 space-y-1.5">
                  {trustRequirements.map((item) => (
                    <div key={item.registry} className="flex items-center justify-between gap-2 rounded-im bg-bg-primary border border-border-default px-2 py-1.5 text-[10px]">
                      <span className="text-text-secondary">{item.protocol_name}</span>
                      <span className={item.required ? 'text-accent-patina' : 'text-text-muted'}>{item.required ? 'required' : item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(displayCard?.vendor_whitelist || []).map((v) => (
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
