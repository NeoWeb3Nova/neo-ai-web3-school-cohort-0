import { useState } from 'react';
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
} from 'lucide-react';
import { INITIAL_CARDS, type CardPact } from '../data/mockData';

export default function Cards() {
  const [cards, setCards] = useState<CardPact[]>(INITIAL_CARDS);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardBudget, setNewCardBudget] = useState('200');
  const [newCardLimit, setNewCardLimit] = useState('50');
  const [newCardTouched, setNewCardTouched] = useState<Record<string, boolean>>({});
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const toggleExpand = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleApprove = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.card_id === cardId
          ? { ...c, status: 'ACTIVE', api_key: `caw_sk_${Math.random().toString(36).slice(2, 14)}` }
          : c
      )
    );
  };

  const handleRevoke = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.card_id === cardId ? { ...c, status: 'REVOKED', api_key: '' } : c))
    );
    setConfirmRevoke(null);
  };

  const newCardErrors = (() => {
    const errs: Record<string, string> = {};
    const budget = parseFloat(newCardBudget);
    const limit = parseFloat(newCardLimit);
    if (newCardTouched.name && !newCardName.trim()) errs.name = 'Agent name is required';
    if (newCardTouched.budget) {
      if (Number.isNaN(budget) || budget <= 0) errs.budget = 'Budget must be greater than 0';
    }
    if (newCardTouched.limit) {
      if (Number.isNaN(limit) || limit <= 0) errs.limit = 'Limit must be greater than 0';
      if (!Number.isNaN(limit) && !Number.isNaN(budget) && limit > budget) {
        errs.limit = 'Cannot exceed monthly budget';
      }
    }
    return errs;
  })();

  const isNewCardValid =
    newCardName.trim().length > 0 &&
    parseFloat(newCardBudget) > 0 &&
    parseFloat(newCardLimit) > 0 &&
    parseFloat(newCardLimit) <= parseFloat(newCardBudget);

  const handleCreateCard = () => {
    setNewCardTouched({ name: true, budget: true, limit: true });
    if (!isNewCardValid) return;
    const card: CardPact = {
      card_id: `card-${Math.random().toString(36).slice(2, 8)}`,
      agent_id: `agent-${newCardName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
      agent_name: newCardName.trim(),
      owner: '0xOPCBossNe0001',
      status: 'PENDING_APPROVAL',
      budget: {
        currency: 'USDC',
        monthly_max: parseFloat(newCardBudget),
        spent: 0,
        single_tx_limit: parseFloat(newCardLimit),
      },
      vendor_whitelist: [
        { name: 'OpenAI', address: '0xOpenAI...', category: 'api' },
        { name: 'Midjourney', address: '0xMidjourney...', category: 'api' },
      ],
      cooldown_hours: 12,
      time_window: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        allowed_hours_start: '00:00',
        allowed_hours_end: '23:59',
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      api_key: '',
    };
    setCards((prev) => [...prev, card]);
    setShowNewCard(false);
    setNewCardName('');
    setNewCardBudget('200');
    setNewCardLimit('50');
    setNewCardTouched({});
  };

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: {
      color: 'text-accent-patina',
      bg: 'bg-accent-patina/10',
      icon: <Unlock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Active',
    },
    PENDING_APPROVAL: {
      color: 'text-accent-amber',
      bg: 'bg-accent-amber/10',
      icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Pending',
    },
    REVOKED: {
      color: 'text-accent-coral',
      bg: 'bg-accent-coral/10',
      icon: <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Revoked',
    },
    EXPIRED: {
      color: 'text-text-muted',
      bg: 'bg-bg-hover',
      icon: <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Expired',
    },
  };

  const progressPct = (spent: number, max: number) =>
    Math.min((spent / max) * 100, 100);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary font-display italic">Agent Cards</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage payment cards for your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowNewCard(!showNewCard)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm btn-gold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Issue New Card
        </button>
      </div>

      {/* New Card Form */}
      {showNewCard && (
        <div className="glass-card rounded-xl p-4 lg:p-5 border-accent-patina/30 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-4 font-display italic">Issue New Agent Card</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Agent Name</label>
              <input
                type="text"
                value={newCardName}
                onChange={(e) => {
                  setNewCardName(e.target.value);
                  setNewCardTouched((t) => ({ ...t, name: true }));
                }}
                placeholder="e.g. Design Agent"
                className={`w-full px-3 py-2 rounded-lg text-sm input-kinpaku ${
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
              <label className="text-xs text-text-secondary mb-1.5 block">Monthly Budget (USDC)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={newCardBudget}
                onChange={(e) => {
                  setNewCardBudget(e.target.value);
                  setNewCardTouched((t) => ({ ...t, budget: true }));
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm input-kinpaku ${
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
              <label className="text-xs text-text-secondary mb-1.5 block">Single Tx Limit (USDC)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={newCardLimit}
                onChange={(e) => {
                  setNewCardLimit(e.target.value);
                  setNewCardTouched((t) => ({ ...t, limit: true }));
                }}
                className={`w-full px-3 py-2 rounded-lg text-sm input-kinpaku ${
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
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCreateCard}
              className="px-4 py-2 rounded-lg text-sm btn-gold"
            >
              Create Card
            </button>
            <button
              onClick={() => {
                setShowNewCard(false);
                setNewCardTouched({});
              }}
              className="px-4 py-2 rounded-lg text-sm btn-ghost"
            >
              Cancel
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
            className="glass-card rounded-xl p-6 max-w-sm w-full border border-border-default shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent-coral/10 flex items-center justify-center border border-accent-coral/20">
                <Trash2 className="w-5 h-5 text-accent-coral" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Revoke Card</h3>
                <p className="text-xs text-text-secondary">
                  {cards.find((c) => c.card_id === confirmRevoke)?.agent_name}
                </p>
              </div>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              This will permanently invalidate the API key for this agent. Any running services using this key will fail immediately. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRevoke(confirmRevoke)}
                className="flex-1 px-4 py-2 bg-accent-coral text-white rounded-lg text-sm font-semibold hover:bg-accent-coral/90 transition-colors"
              >
                Revoke Card
              </button>
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 && !showNewCard && (
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-patina/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-accent-patina" strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">No agent cards yet</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            Issue a payment card to give your agents controlled access to treasury funds
          </p>
          <button
            onClick={() => setShowNewCard(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm btn-gold"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Issue First Card
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
              className="glass-card rounded-xl overflow-hidden hover:border-border-hover transition-all duration-200"
            >
              {/* Card Header */}
              <div
                className="p-4 lg:p-5 cursor-pointer"
                onClick={() => toggleExpand(card.card_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent-patina/10 flex items-center justify-center shrink-0">
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
                      ${card.budget.spent.toFixed(2)} / ${card.budget.monthly_max.toFixed(2)} USDC
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
                  <div className="text-center p-2 rounded-lg bg-bg-primary/50">
                    <p className="text-xs text-text-muted">Single Tx</p>
                    <p className="text-sm font-semibold text-text-primary">
                      ${card.budget.single_tx_limit}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-bg-primary/50">
                    <p className="text-xs text-text-muted">Cooldown</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {card.cooldown_hours}h
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-bg-primary/50">
                    <p className="text-xs text-text-muted">Vendors</p>
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
                      Vendor Whitelist
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
                  </div>

                  {/* API Key */}
                  {card.api_key && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-primary border border-border-default overflow-hidden">
                      <Wallet className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
                      <span className="text-xs font-mono text-text-muted truncate">
                        {card.api_key.slice(0, 20)}...
                      </span>
                      <span className="text-[10px] text-accent-patina ml-auto shrink-0">Active</span>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-patina/10 text-accent-patina rounded-lg text-xs font-semibold hover:bg-accent-patina/20 border border-accent-patina/30 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Approve
                      </button>
                    )}
                    {card.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRevoke(card.card_id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-coral/10 text-accent-coral rounded-lg text-xs font-semibold hover:bg-accent-coral/20 border border-accent-coral/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Revoke
                      </button>
                    )}
                    {card.status === 'REVOKED' && (
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Card revoked — API key invalidated
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
