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
} from 'lucide-react';
import { INITIAL_CARDS, type CardPact } from '../data/mockData';

export default function Cards() {
  const [cards, setCards] = useState<CardPact[]>(INITIAL_CARDS);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardBudget, setNewCardBudget] = useState('200');
  const [newCardLimit, setNewCardLimit] = useState('50');

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
  };

  const handleCreateCard = () => {
    if (!newCardName.trim()) return;
    const card: CardPact = {
      card_id: `card-${Math.random().toString(36).slice(2, 8)}`,
      agent_id: `agent-${newCardName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
      agent_name: newCardName,
      owner: '0xOPCBossNe0001',
      status: 'PENDING_APPROVAL',
      budget: {
        currency: 'USDC',
        monthly_max: parseFloat(newCardBudget) || 200,
        spent: 0,
        single_tx_limit: parseFloat(newCardLimit) || 50,
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
  };

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: {
      color: 'text-accent-green',
      bg: 'bg-accent-green/10',
      icon: <Unlock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Active',
    },
    PENDING_APPROVAL: {
      color: 'text-accent-orange',
      bg: 'bg-accent-orange/10',
      icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: 'Pending',
    },
    REVOKED: {
      color: 'text-accent-red',
      bg: 'bg-accent-red/10',
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
    <div className="space-y-6 animate-fade-in">
      {/* Header Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Agent Cards</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage payment cards for your AI agents
          </p>
        </div>
        <button
          onClick={() => setShowNewCard(!showNewCard)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-green text-bg-primary rounded-lg text-sm font-semibold hover:bg-accent-green/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Issue New Card
        </button>
      </div>

      {/* New Card Form */}
      {showNewCard && (
        <div className="glass-card rounded-xl p-5 border-accent-green/30 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Issue New Agent Card</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Agent Name</label>
              <input
                type="text"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="e.g. Design Agent"
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-accent-green focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Monthly Budget (USDC)</label>
              <input
                type="number"
                value={newCardBudget}
                onChange={(e) => setNewCardBudget(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Single Tx Limit (USDC)</label>
              <input
                type="number"
                value={newCardLimit}
                onChange={(e) => setNewCardLimit(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCreateCard}
              className="px-4 py-2 bg-accent-green text-bg-primary rounded-lg text-sm font-semibold hover:bg-accent-green/90"
            >
              Create Card
            </button>
            <button
              onClick={() => setShowNewCard(false)}
              className="px-4 py-2 border border-border-default text-text-secondary rounded-lg text-sm hover:bg-bg-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                className="p-5 cursor-pointer"
                onClick={() => toggleExpand(card.card_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-accent-green" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        {card.agent_name}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">{card.card_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
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
                        pct > 80 ? 'text-accent-red' : pct > 50 ? 'text-accent-orange' : 'text-accent-green'
                      }`}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct > 80
                          ? 'bg-accent-red'
                          : pct > 50
                          ? 'bg-accent-orange'
                          : 'bg-accent-green'
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
                <div className="border-t border-border-default p-5 animate-fade-in space-y-4">
                  {/* Vendor Whitelist */}
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Vendor Whitelist
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {card.vendor_whitelist.map((v) => (
                        <span
                          key={v.name}
                          className="px-2.5 py-1 rounded-md bg-accent-blue/10 text-accent-blue text-xs font-medium border border-accent-blue/20"
                        >
                          {v.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Time Window */}
                  <div className="flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>
                        {new Date(card.time_window.start).toLocaleDateString()} —{' '}
                        {new Date(card.time_window.end).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>
                        {card.time_window.allowed_hours_start} — {card.time_window.allowed_hours_end}
                      </span>
                    </div>
                  </div>

                  {/* API Key */}
                  {card.api_key && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-primary border border-border-default">
                      <Wallet className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.5} />
                      <span className="text-xs font-mono text-text-muted">
                        {card.api_key.slice(0, 20)}...
                      </span>
                      <span className="text-[10px] text-accent-green ml-auto">Active</span>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/10 text-accent-green rounded-lg text-xs font-semibold hover:bg-accent-green/20 border border-accent-green/30"
                      >
                        <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                        Approve
                      </button>
                    )}
                    {card.status === 'ACTIVE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevoke(card.card_id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red/10 text-accent-red rounded-lg text-xs font-semibold hover:bg-accent-red/20 border border-accent-red/30"
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
