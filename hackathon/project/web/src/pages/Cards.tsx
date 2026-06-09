import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Wallet,
  Calendar,
  Shield,
  AlertCircle,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { type CardPact, ALL_VENDORS } from '../data/mockData';
import { cawApi } from '../api/caw';

export default function Cards() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<CardPact[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardBudget, setNewCardBudget] = useState('200');
  const [newCardLimit, setNewCardLimit] = useState('50');
  const [newCardCooldown, setNewCardCooldown] = useState('12');
  const [newCardDuration, setNewCardDuration] = useState('30');
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set(['OpenAI', 'Midjourney']));
  const [newCardTouched, setNewCardTouched] = useState<Record<string, boolean>>({});
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cawApi.listCards();
      setCards(data);
      setOffline(false);
    } catch (e) {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const toggleExpand = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleApprove = async (cardId: string) => {
    setActionLoading(cardId);
    try {
      await cawApi.approveCard(cardId);
      await loadCards();
    } catch {
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (cardId: string) => {
    setActionLoading(cardId);
    try {
      await cawApi.revokeCard(cardId);
      await loadCards();
    } catch {
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
      setConfirmRevoke(null);
    }
  };

  const newCardErrors = (() => {
    const errs: Record<string, string> = {};
    const budget = parseFloat(newCardBudget);
    const limit = parseFloat(newCardLimit);
    if (newCardTouched.name && !newCardName.trim()) errs.name = t('cards.agentNameRequired');
    if (newCardTouched.budget) {
      if (Number.isNaN(budget) || budget <= 0) errs.budget = t('cards.budgetError');
    }
    if (newCardTouched.limit) {
      if (Number.isNaN(limit) || limit <= 0) errs.limit = t('cards.limitError');
      if (!Number.isNaN(limit) && !Number.isNaN(budget) && limit > budget) {
        errs.limit = t('cards.limitExceedsBudget');
      }
    }
    if (selectedVendors.size === 0) errs.vendors = t('cards.vendorWhitelist');
    return errs;
  })();

  const isNewCardValid =
    newCardName.trim().length > 0 &&
    parseFloat(newCardBudget) > 0 &&
    parseFloat(newCardLimit) > 0 &&
    parseFloat(newCardLimit) <= parseFloat(newCardBudget) &&
    selectedVendors.size > 0;

  const handleCreateCard = async () => {
    setNewCardTouched({ name: true, budget: true, limit: true });
    if (!isNewCardValid) return;
    setActionLoading('create');
    try {
      const vendorWhitelist = ALL_VENDORS.filter((v) => selectedVendors.has(v.name));
      await cawApi.createCard({
        agent_name: newCardName.trim(),
        monthly_budget: parseFloat(newCardBudget),
        single_tx_limit: parseFloat(newCardLimit),
        vendor_whitelist: vendorWhitelist,
        cooldown_hours: parseInt(newCardCooldown, 10) || 12,
        duration_days: parseInt(newCardDuration, 10) || 30,
      });
      await loadCards();
      setShowNewCard(false);
      setNewCardName('');
      setNewCardBudget('200');
      setNewCardLimit('50');
      setNewCardCooldown('12');
      setNewCardDuration('30');
      setSelectedVendors(new Set(['OpenAI', 'Midjourney']));
      setNewCardTouched({});
    } catch {
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: {
      color: 'text-accent-patina',
      bg: 'bg-accent-patina/10',
      icon: <Unlock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: t('common.active'),
    },
    PENDING_APPROVAL: {
      color: 'text-accent-amber',
      bg: 'bg-accent-amber/10',
      icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: t('common.pending'),
    },
    REVOKED: {
      color: 'text-accent-coral',
      bg: 'bg-accent-coral/10',
      icon: <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: t('common.revoked'),
    },
    EXPIRED: {
      color: 'text-text-muted',
      bg: 'bg-bg-hover',
      icon: <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: t('common.expired'),
    },
  };

  const progressPct = (spent: number, max: number) =>
    Math.min((spent / max) * 100, 100);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Offline banner */}
      {offline && (
        <div className="flex items-center gap-2 p-3 rounded-im bg-accent-amber/10 border border-accent-amber/20 text-accent-amber text-sm">
          <WifiOff className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>{t('common.offline')}</span>
          <button
            onClick={loadCards}
            className="ml-auto flex items-center gap-1 text-xs hover:underline"
          >
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Header Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary font-display">{t('cards.title')}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {t('cards.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowNewCard(!showNewCard)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-im text-sm btn-gold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          {t('cards.issueNewCard')}
        </button>
      </div>

      {/* New Card Form */}
      {showNewCard && (
        <div className="glass-card rounded-im p-4 lg:p-5 border-accent-patina/30 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">{t('cards.issueCardTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">{t('cards.agentName')}</label>
              <input
                type="text"
                value={newCardName}
                onChange={(e) => {
                  setNewCardName(e.target.value);
                  setNewCardTouched((t) => ({ ...t, name: true }));
                }}
                placeholder={t('cards.agentNamePlaceholder')}
                className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${
                  newCardErrors.name ? 'error' : ''
                }`}
              />
              {newCardErrors.name && (
                <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" strokeWidth={2} />
                  {newCardErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">{t('cards.monthlyBudget')}</label>
              <input
                type="number"
                min={1}
                step={1}
                value={newCardBudget}
                onChange={(e) => {
                  setNewCardBudget(e.target.value);
                  setNewCardTouched((t) => ({ ...t, budget: true }));
                }}
                className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${
                  newCardErrors.budget ? 'error' : ''
                }`}
              />
              {newCardErrors.budget && (
                <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" strokeWidth={2} />
                  {newCardErrors.budget}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">{t('cards.singleTxLimit')}</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={newCardLimit}
                onChange={(e) => {
                  setNewCardLimit(e.target.value);
                  setNewCardTouched((t) => ({ ...t, limit: true }));
                }}
                className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${
                  newCardErrors.limit ? 'error' : ''
                }`}
              />
              {newCardErrors.limit && (
                <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" strokeWidth={2} />
                  {newCardErrors.limit}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">{t('cards.cooldownHours')}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={newCardCooldown}
                onChange={(e) => setNewCardCooldown(e.target.value)}
                className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">{t('cards.durationDays')}</label>
              <input
                type="number"
                min={1}
                step={1}
                value={newCardDuration}
                onChange={(e) => setNewCardDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
              />
            </div>
          </div>

          {/* Vendor whitelist */}
          <div className="mt-4">
            <label className="text-xs text-text-secondary mb-2 block">{t('cards.selectVendors')}</label>
            <div className="flex flex-wrap gap-2">
              {ALL_VENDORS.map((v) => {
                const checked = selectedVendors.has(v.name);
                return (
                  <label
                    key={v.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-im text-xs font-medium border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-accent-patina/10 border-accent-patina/40 text-accent-patina'
                        : 'bg-bg-primary border-border-default text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selectedVendors);
                        if (next.has(v.name)) next.delete(v.name);
                        else next.add(v.name);
                        setSelectedVendors(next);
                      }}
                    />
                    <Shield className="w-3 h-3" strokeWidth={1.5} />
                    {v.name}
                  </label>
                );
              })}
            </div>
            {newCardErrors.vendors && (
              <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
                <AlertCircle className="w-3 h-3" strokeWidth={2} />
                {newCardErrors.vendors}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCreateCard}
              disabled={actionLoading === 'create'}
              className="px-4 py-2 rounded-im text-sm btn-gold disabled:opacity-50"
            >
              {actionLoading === 'create' ? t('common.processing') : t('cards.createCard')}
            </button>
            <button
              onClick={() => {
                setShowNewCard(false);
                setNewCardTouched({});
              }}
              className="px-4 py-2 rounded-im text-sm btn-ghost"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {confirmRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmRevoke(null)}
        >
          <div
            className="glass-card rounded-im p-6 max-w-sm w-full border border-border-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-im bg-accent-coral/10 flex items-center justify-center border border-accent-coral/20">
                <Trash2 className="w-5 h-5 text-accent-coral" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{t('cards.revokeConfirmTitle')}</h3>
                <p className="text-xs text-text-secondary">
                  {cards.find((c) => c.card_id === confirmRevoke)?.agent_name}
                </p>
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              {t('cards.revokeConfirmDesc')}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                disabled={!!actionLoading}
                className="flex-1 px-4 py-2 bg-accent-coral text-white rounded-im text-sm font-semibold hover:bg-accent-coral/90 transition-colors disabled:opacity-50"
              >
                {t('cards.revokeCard')}
              </button>
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 rounded-im text-sm btn-ghost"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-card rounded-im p-8 text-center">
          <RefreshCw className="w-6 h-6 text-accent-patina animate-spin mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">{t('common.loading')}</p>
        </div>
      )}

      {!loading && cards.length === 0 && !showNewCard && (
        <div className="glass-card rounded-im p-8 text-center">
          <div className="w-12 h-12 rounded-im bg-accent-patina/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-accent-patina" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">{t('cards.noCards')}</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {t('cards.noCardsDesc')}
          </p>
          <button
            onClick={() => setShowNewCard(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-im text-sm btn-gold"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            {t('cards.issueFirstCard')}
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
        {cards.map((card) => {
          const status = statusConfig[card.status];
          const isExpanded = expandedCard === card.card_id;
          const pct = progressPct(card.budget.spent, card.budget.monthly_max);

          return (
            <div
              key={card.card_id}
              className="glass-card rounded-im overflow-hidden hover:border-border-hover transition-all duration-200"
            >
              {/* Card Header */}
              <div
                className="p-4 lg:p-5 cursor-pointer"
                onClick={() => toggleExpand(card.card_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-im bg-accent-patina/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-accent-patina" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">
                        {card.agent_name}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">{card.card_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      {status.icon}
                      <span className="hidden sm:inline">{status.label}</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
                    )}
                  </div>
                </div>

                {/* Budget Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-secondary">
                      ${card.budget.spent.toFixed(2)} / ${card.budget.monthly_max.toFixed(2)} {t('common.usdc')}
                    </span>
                    <span
                      className={`font-medium ${
                        pct > 80 ? 'text-accent-coral' : pct > 50 ? 'text-accent-amber' : 'text-accent-patina'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 80
                          ? 'bg-accent-coral'
                          : pct > 50
                          ? 'bg-accent-amber'
                          : 'bg-accent-patina'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 rounded-im">
                    <p className="text-xs text-text-muted">{t('cards.singleTx')}</p>
                    <p className="text-sm font-semibold text-text-primary">
                      ${card.budget.single_tx_limit}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-im">
                    <p className="text-xs text-text-muted">{t('cards.cooldown')}</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {card.cooldown_hours}h
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-im">
                    <p className="text-xs text-text-muted">{t('cards.vendors')}</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {card.vendor_whitelist.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-border-default p-4 lg:p-5 animate-fade-in space-y-4">
                  {/* Vendor Whitelist */}
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t('cards.vendorWhitelist')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {card.vendor_whitelist.map((v) => (
                        <span
                          key={v.name}
                          className="px-2.5 py-1 rounded-md bg-accent-slate/10 text-accent-slate text-xs font-medium border border-accent-slate/20"
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Time Window */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs">
                    {card.time_window ? (
                      <>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                          <span>
                            {new Date(card.time_window.start).toLocaleDateString()} —{' '}
                            {new Date(card.time_window.end).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                          <span>
                            {card.time_window.allowed_hours_start} — {card.time_window.allowed_hours_end}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                        <span>{t('cards.cooldownPeriod')}: {card.cooldown_hours}h</span>
                      </div>
                    )}
                  </div>

                  {/* API Key */}
                  {card.api_key && (
                    <div className="flex items-center gap-2 p-2.5 rounded-im bg-bg-primary border border-border-default overflow-hidden">
                      <Wallet className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
                      <span className="text-xs font-mono text-text-muted truncate">
                        {card.api_key.slice(0, 20)}...
                      </span>
                      <span className="text-[10px] text-accent-patina ml-auto shrink-0">{t('common.active')}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    {card.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(card.card_id);
                        }}
                        disabled={actionLoading === card.card_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-patina/10 text-accent-patina rounded-im text-xs font-semibold hover:bg-accent-patina/20 border border-accent-patina/30 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {actionLoading === card.card_id ? t('common.processing') : t('cards.approve')}
                      </button>
                    )}
                    {card.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRevoke(card.card_id);
                        }}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-coral/10 text-accent-coral rounded-im text-xs font-semibold hover:bg-accent-coral/20 border border-accent-coral/30 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {t('cards.revokeCard')}
                      </button>
                    )}
                    {card.status === 'REVOKED' && (
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {t('cards.cardRevoked')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
