import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Wallet,
  Calendar,
  X,
  ExternalLink,
  Shield,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Send,
} from 'lucide-react';
import {
  type CardPact,
  type Vendor,
  ERC8004_TRUST_REQUIREMENTS,
  ALL_VENDORS,
} from '../data/mockData';
import { cawApi } from '../api/caw';
import { getCardStatusConfig, normalizeCardStatus } from '../utils/cardStatus';

export default function Cards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardPact[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState('General Policy Card');
  const [newCardBudget, setNewCardBudget] = useState('500');
  const [newCardLimit, setNewCardLimit] = useState('75');
  const [newCardCooldown, setNewCardCooldown] = useState('6');
  const [newCardDuration, setNewCardDuration] = useState('30');
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set(['BlockRun AI Gateway', 'StableEnrich']));
  const [availableVendors, setAvailableVendors] = useState(ALL_VENDORS);
  const [newCardTouched, setNewCardTouched] = useState<Record<string, boolean>>({});
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [erc8004DetailsVendor, setErc8004DetailsVendor] = useState<Vendor | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const [data, providers] = await Promise.all([
        cawApi.listCards(),
        cawApi.listX402Providers().catch(() => []),
      ]);
      setCards(data);
      if (providers.length > 0) {
        setAvailableVendors(providers);
      }
      setOffline(false);
    } catch {
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
      const vendorWhitelist = availableVendors.filter((v) => selectedVendors.has(v.name));
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
      setNewCardName('General Policy Card');
      setNewCardBudget('500');
      setNewCardLimit('75');
      setNewCardCooldown('6');
      setNewCardDuration('30');
      setSelectedVendors(new Set(['BlockRun AI Gateway', 'StableEnrich']));
      setNewCardTouched({});
    } catch {
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const progressPct = (spent: number, max: number) =>
    Math.min((spent / max) * 100, 100);

  const renderErc8004CoreInfo = (vendor: Vendor) => {
    const [registryChain, registryAgentId] = (vendor.erc8004_agent_id || '').split(':');
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-text-primary font-display truncate">{vendor.name}</p>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {vendor.description || 'ERC-8004 registered x402 service provider'}
            </p>
          </div>
          <span className="shrink-0 px-2 py-1 rounded-full text-[10px] bg-accent-patina/10 text-accent-patina border border-accent-patina/20">
            Active
          </span>
        </div>

        <div className="p-3 rounded-im bg-bg-primary border border-accent-gold/20">
          <p className="text-[10px] uppercase tracking-[0.2em] text-accent-gold">Statistics Overview</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            <div className="rounded-im border border-border-default p-2">
              <p className="text-sm font-semibold text-text-primary">5.0/5.0</p>
              <p className="mt-0.5 text-[10px] text-text-muted">Average Score</p>
            </div>
            <div className="rounded-im border border-border-default p-2">
              <p className="text-sm font-semibold text-text-primary">621</p>
              <p className="mt-0.5 text-[10px] text-text-muted">Total Feedback</p>
            </div>
            <div className="rounded-im border border-border-default p-2">
              <p className="text-sm font-semibold text-text-primary">93.83</p>
              <p className="mt-0.5 text-[10px] text-text-muted">Overall Score</p>
              <p className="mt-0.5 text-[10px] text-accent-patina">(99/100)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Chain</p>
            <p className="mt-1 text-xs font-semibold text-text-primary">{registryChain || vendor.chain || 'Base'}</p>
          </div>
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Agent ID</p>
            <p className="mt-1 text-xs font-semibold text-text-primary truncate">{registryAgentId || vendor.erc8004_agent_id}</p>
          </div>
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Service</p>
            <p className="mt-1 text-xs font-semibold text-text-primary">{vendor.category || 'CUSTOM'}</p>
          </div>
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Source</p>
            <p className="mt-1 text-xs font-semibold text-text-primary">{vendor.source || '8004scan'}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">ERC-8004 Identity</p>
            <p className="mt-1 font-mono text-text-primary break-all">{vendor.erc8004_agent_id}</p>
          </div>
          <div className="p-3 rounded-im bg-bg-primary border border-border-default">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">Agent Wallet / Payee</p>
            <p className="mt-1 font-mono text-text-primary break-all">{vendor.address}</p>
          </div>
          {vendor.x402_url && (
            <div className="p-3 rounded-im bg-bg-primary border border-border-default">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">x402 Endpoint</p>
              <p className="mt-1 text-text-primary break-all">{vendor.x402_url}</p>
            </div>
          )}
          {vendor.erc8004_registry_url && (
            <a
              href={vendor.erc8004_registry_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2 p-3 rounded-im bg-accent-patina/10 border border-accent-patina/20 text-accent-patina hover:bg-accent-patina/15 transition-colors"
            >
              <span className="truncate">Open on 8004scan</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    );
  };

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
          <div className="space-y-4">
            <div className="p-3 rounded-im bg-bg-primary border border-border-default text-xs text-text-secondary">
              <p className="font-medium text-text-primary">{t('cards.unassignedNoticeTitle')}</p>
              <p className="mt-1">{t('cards.unassignedNoticeDesc')}</p>
            </div>

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
          </div>

          {/* Vendor whitelist */}
          <div className="mt-4">
            <label className="text-xs text-text-secondary mb-2 block">x402 Provider Whitelist</label>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {availableVendors.map((v) => {
                const checked = selectedVendors.has(v.name);
                const verified = Boolean(v.erc8004_agent_id);
                return (
                  <label
                    key={v.name}
                    className={`block p-3 rounded-im text-xs border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-accent-patina/10 border-accent-patina/40 text-text-primary'
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary truncate">{v.name}</p>
                        <p className="mt-1 text-text-muted line-clamp-2">{v.description || v.category}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${verified ? 'bg-accent-patina/10 text-accent-patina' : 'bg-accent-amber/10 text-accent-amber'}`}>
                          {verified ? 'ERC-8004 verified' : 'manual trust'}
                        </span>
                        {verified && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setErc8004DetailsVendor(v);
                            }}
                            className="text-[10px] text-accent-gold hover:underline"
                          >
                            View 8004 info
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-text-muted">
                      <span>Chain: {v.chain || 'n/a'}</span>
                      <span>Price: {v.pricing_usdc ? `$${v.pricing_usdc}/call` : 'custom'}</span>
                      <span className="col-span-2 truncate">x402: {v.x402_url || 'legacy provider'}</span>
                      <span className="col-span-2 truncate">Payee: {v.address}</span>
                      {v.erc8004_agent_id && <span className="col-span-2 text-accent-gold truncate">Identity: {v.erc8004_agent_id}</span>}
                    </div>
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

          <div className="mt-4 p-3 rounded-im bg-bg-primary border border-border-default">
            <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent-patina" strokeWidth={1.5} />
              ERC-8004 Trust Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              {ERC8004_TRUST_REQUIREMENTS.map((item) => (
                <div key={item.registry} className="rounded-im border border-border-default p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary">{item.registry}</p>
                    <span className="text-[10px] text-text-muted">{item.required ? 'required' : item.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-muted">{item.description}</p>
                </div>
              ))}
            </div>
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

      {/* ERC-8004 Provider Details Modal */}
      {erc8004DetailsVendor && createPortal(
        <div
          className="fixed inset-0 z-[1000] grid place-items-center bg-black/60 p-4 overflow-y-auto"
          onClick={() => setErc8004DetailsVendor(null)}
        >
          <div
            className="glass-card rounded-im p-5 max-w-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto border border-border-default shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent-gold">ERC-8004 Agent Registry</p>
                <h3 className="text-sm font-semibold text-text-primary mt-1">Core identity information</h3>
              </div>
              <button
                type="button"
                onClick={() => setErc8004DetailsVendor(null)}
                className="w-8 h-8 rounded-im bg-bg-primary border border-border-default flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-hover"
                aria-label="Close ERC-8004 details"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            {renderErc8004CoreInfo(erc8004DetailsVendor)}
          </div>
        </div>,
        document.body
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
          const status = getCardStatusConfig(card.status, t);
          const normalizedStatus = normalizeCardStatus(card.status);
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
                {/* Selected Vendors Preview */}
                {card.vendor_whitelist.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {card.vendor_whitelist.slice(0, 3).map((v) => (
                      <span
                        key={`${card.card_id}-${v.address || v.name}`}
                        className="px-2 py-0.5 rounded-md bg-accent-slate/10 text-accent-slate text-[10px] border border-accent-slate/20"
                      >
                        {v.name}
                        {v.x402_url && <span className="ml-1 text-accent-gold">x402</span>}
                      </span>
                    ))}
                    {card.vendor_whitelist.length > 3 && (
                      <span className="px-2 py-0.5 rounded-md bg-bg-primary text-text-muted text-[10px] border border-border-default">
                        +{card.vendor_whitelist.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {isExpanded && (
                <div className="border-t border-border-default p-4 lg:p-5 animate-fade-in space-y-4">
                  {/* Vendor Whitelist */}
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t('cards.vendorWhitelist')}
                    </h4>
                    <div className="space-y-2">
                      {card.vendor_whitelist.map((v) => (
                        <div
                          key={v.name}
                          className="p-2.5 rounded-md bg-accent-slate/10 text-xs border border-accent-slate/20"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-text-primary">{v.name}</span>
                            {v.erc8004_agent_id ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] text-accent-patina">ERC-8004 verified</span>
                                <button
                                  type="button"
                                  onClick={() => setErc8004DetailsVendor(v)}
                                  className="text-[10px] text-accent-gold hover:underline"
                                >
                                  View 8004 info
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-accent-amber">manual trust</span>
                            )}
                          </div>
                          <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-text-muted">
                            <span>Category: {v.category}</span>
                            <span>Chain: {v.chain || 'n/a'}</span>
                            {v.x402_url && <span className="truncate">x402: {v.x402_url}</span>}
                            {v.pricing_usdc && <span>Price: ${v.pricing_usdc}/call</span>}
                            {v.erc8004_agent_id && <span className="sm:col-span-2 text-accent-gold truncate">Identity: {v.erc8004_agent_id}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                      ERC-8004 Trust Layer
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {(card.trust_requirements?.length ? card.trust_requirements : ERC8004_TRUST_REQUIREMENTS).map((item) => (
                        <div key={item.registry} className="rounded-im border border-border-default p-2 text-xs">
                          <p className="font-medium text-text-primary">{item.protocol_name}</p>
                          <p className="mt-1 text-[10px] text-text-muted">{item.required ? 'Required' : item.status}</p>
                        </div>
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
                    {normalizedStatus === 'PENDING_APPROVAL' && (
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
                    {normalizedStatus === 'ACTIVE' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/agent?card_id=${encodeURIComponent(card.card_id)}`);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-patina/10 text-accent-patina rounded-im text-xs font-semibold hover:bg-accent-patina/20 border border-accent-patina/30 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                          {t('cards.useInAgent')}
                        </button>
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
                      </>
                    )}
                    {normalizedStatus === 'REVOKED' && (
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
