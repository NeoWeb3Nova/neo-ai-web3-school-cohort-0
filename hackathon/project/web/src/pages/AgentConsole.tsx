import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { INITIAL_CARDS, type Transaction } from '../data/mockData';

interface PaymentStep {
 id: string;
 label: string;
 status: 'pending' | 'running' | 'success' | 'error';
 detail?: string;
}

function friendlyReason(raw: string): string {
 if (raw.includes('scope_denied')) return 'Vendor not on card whitelist';
 if (raw.includes('per_tx_exceeded')) return 'Amount exceeds single-transaction limit';
 if (raw.includes('budget_exceeded')) return 'Amount exceeds remaining monthly budget';
 if (raw.includes('amount must be positive')) return 'Amount must be greater than zero';
 if (raw.includes('PERMISSION_DENIED')) return 'Card does not have permission for this request';
 return raw;
}

export default function AgentConsole() {
 const [selectedCard, setSelectedCard] = useState(INITIAL_CARDS[0].card_id);
 const [vendor, setVendor] = useState('OpenAI');
 const [amount, setAmount] = useState('10');
 const [purpose, setPurpose] = useState('GPT-4 API tokens');
 const [touched, setTouched] = useState<Record<string, boolean>>({});
 const [isProcessing, setIsProcessing] = useState(false);
 const [result, setResult] = useState<{
 status: 'APPROVED' | 'DENIED';
 reason: string;
 tx?: Transaction;
 steps: PaymentStep[];
 } | null>(null);

 const activeCards = INITIAL_CARDS.filter((c) => c.status === 'ACTIVE');
 const card = activeCards.find((c) => c.card_id === selectedCard) || activeCards[0];

 const vendorOptions = ['OpenAI', 'Midjourney', 'Unsplash', 'Google Ads', 'Twitter Ads'];

 const errors = useMemo(() => {
 const errs: Record<string, string> = {};
 const amt = parseFloat(amount) || 0;
 if (touched.amount || touched.submit) {
 if (amt <= 0) errs.amount = 'Amount must be greater than 0';
 else if (amt > card.budget.single_tx_limit) {
 errs.amount = `Exceeds single-tx limit of $${card.budget.single_tx_limit}`;
 } else if (amt > card.budget.monthly_max - card.budget.spent) {
 errs.amount = `Exceeds remaining budget of $${(card.budget.monthly_max - card.budget.spent).toFixed(2)}`;
 }
 }
 if ((touched.purpose || touched.submit) && !purpose.trim()) {
 errs.purpose = 'Purpose is required';
 }
 return errs;
 }, [amount, purpose, touched, card]);

 const isFormValid = Object.keys(errors).length === 0 && parseFloat(amount) > 0 && purpose.trim().length > 0;

 const simulatePayment = () => {
 setTouched((t) => ({ ...t, amount: true, purpose: true, submit: true }));
 if (!isFormValid) return;

 setIsProcessing(true);
 setResult(null);

 const amt = parseFloat(amount) || 0;
 const steps: PaymentStep[] = [
 { id: 's1', label: 'Permission Check', status: 'pending' },
 { id: 's2', label: 'Budget Validation', status: 'pending' },
 { id: 's3', label: 'Vendor Whitelist', status: 'pending' },
 { id: 's4', label: 'Time Window', status: 'pending' },
 { id: 's5', label: 'Cooldown Period', status: 'pending' },
 { id: 's6', label: 'Anomaly Detection', status: 'pending' },
 ];

 const runStep = (index: number) => {
 if (index >= steps.length) {
 const isInWhitelist = card.vendor_whitelist.some((v) => v.name === vendor);
 const isBudgetOk = card.budget.spent + amt <= card.budget.monthly_max;
 const isPerTxOk = amt <= card.budget.single_tx_limit;
 const isAmountOk = amt > 0;

 let finalStatus: 'APPROVED' | 'DENIED' = 'APPROVED';
 let reason = 'All checks passed';

 if (!isAmountOk) {
 finalStatus = 'DENIED';
 reason = 'Amount must be greater than zero';
 } else if (!isInWhitelist) {
 finalStatus = 'DENIED';
 reason = 'Vendor not on card whitelist';
 } else if (!isPerTxOk) {
 finalStatus = 'DENIED';
 reason = 'Amount exceeds single-transaction limit';
 } else if (!isBudgetOk) {
 finalStatus = 'DENIED';
 reason = 'Amount exceeds remaining monthly budget';
 }

 const tx: Transaction = {
 tx_id: `tx-${Math.random().toString(36).slice(2, 12)}`,
 card_id: card.card_id,
 agent_id: card.agent_id,
 timestamp: new Date().toISOString(),
 vendor,
 vendor_address: '0xVendor...',
 amount: amt,
 currency: 'USDC',
 status: finalStatus,
 reason,
 remaining_budget: card.budget.monthly_max - card.budget.spent - (finalStatus === 'APPROVED' ? amt : 0),
 tx_hash: finalStatus === 'APPROVED' ? `0x${Math.random().toString(36).slice(2, 14)}` : '',
 metadata: { purpose },
 alert_level: 'none',
 };

 setResult({ status: finalStatus, reason, tx, steps });
 setIsProcessing(false);
 return;
 }

 setTimeout(() => {
 setResult((prev) => {
 if (!prev) {
 const updated = [...steps];
 updated[index] = { ...updated[index], status: 'running' };
 return { status: 'APPROVED', reason: '', steps: updated };
 }
 const updated = [...prev.steps];
 updated[index] = { ...updated[index], status: 'running' };
 return { ...prev, steps: updated };
 });

 setTimeout(() => {
 setResult((prev) => {
 if (!prev) return null;
 const updated = [...prev.steps];
 updated[index] = { ...updated[index], status: 'success' };
 return { ...prev, steps: updated };
 });
 runStep(index + 1);
 }, 400);
 }, 300);
 };

 runStep(0);
 };

 const handleDismiss = () => setResult(null);
 const handleRetry = () => {
 setResult(null);
 simulatePayment();
 };

 return (
 <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
 {/* Agent Persona */}
 <div className="glass-card rounded-im p-4 lg:p-5 flex items-center gap-4">
 <div className="w-12 h-12 rounded-im bg-accent-slate/10 flex items-center justify-center shrink-0">
 <Bot className="w-6 h-6 text-accent-slate" strokeWidth={1.5} />
 </div>
 <div className="min-w-0">
 <h2 className="text-base font-semibold text-text-primary truncate">
 {card?.agent_name || 'Agent Console'}
 </h2>
 <p className="text-sm text-text-secondary truncate">
 Autonomous payment request interface — CAW Policy Engine enforced
 </p>
 </div>
 <div className="ml-auto flex items-center gap-2 shrink-0">
 <span
 className={`w-2 h-2 rounded-full ${
 card?.status === 'ACTIVE' ? 'bg-accent-patina animate-pulse' : 'bg-accent-amber'
 }`}
 />
 <span className="text-xs text-text-muted">{card?.status}</span>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-4">
 {/* Left: Payment Form */}
 <div className="lg:col-span-3 space-y-4">
 <div className="glass-card rounded-im p-4 lg:p-5">
 <h3 className="text-sm font-semibold text-text-primary mb-4 font-display flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-accent-gold" strokeWidth={1.5} />
 New Payment Request
 </h3>

 <div className="space-y-4">
 {/* Card Selector */}
 <div>
 <label className="text-xs text-text-secondary mb-1.5 block">Select Card</label>
 <select
 value={selectedCard}
 onChange={(e) => setSelectedCard(e.target.value)}
 className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
 >
 {activeCards.map((c) => (
 <option key={c.card_id} value={c.card_id}>
 {c.agent_name} — ${c.budget.spent.toFixed(0)} / ${c.budget.monthly_max} USDC
 </option>
 ))}
 </select>
 </div>

 {/* Vendor */}
 <div>
 <label className="text-xs text-text-secondary mb-1.5 block">Vendor</label>
 <select
 value={vendor}
 onChange={(e) => setVendor(e.target.value)}
 className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
 >
 {vendorOptions.map((v) => (
 <option key={v} value={v}>
 {v}
 </option>
 ))}
 </select>
 </div>

 {/* Amount + Purpose */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-xs text-text-secondary mb-1.5 block">Amount (USDC)</label>
 <input
 type="number"
 value={amount}
 min={0.01}
 step={0.01}
 onChange={(e) => {
 setAmount(e.target.value);
 setTouched((t) => ({ ...t, amount: true }));
 }}
 className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${
 errors.amount ? 'error' : ''
 }`}
 />
 {errors.amount && (
 <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
 <AlertCircle className="w-3 h-3" strokeWidth={2} />
 {errors.amount}
 </p>
 )}
 </div>
 <div>
 <label className="text-xs text-text-secondary mb-1.5 block">Purpose</label>
 <input
 type="text"
 value={purpose}
 onChange={(e) => {
 setPurpose(e.target.value);
 setTouched((t) => ({ ...t, purpose: true }));
 }}
 placeholder="e.g. API tokens"
 className={`w-full px-3 py-2 rounded-im text-sm input-kinpaku ${
 errors.purpose ? 'error' : ''
 }`}
 />
 {errors.purpose && (
 <p className="mt-1.5 text-[11px] text-accent-coral flex items-center gap-1">
 <AlertCircle className="w-3 h-3" strokeWidth={2} />
 {errors.purpose}
 </p>
 )}
 </div>
 </div>

 {/* Submit */}
 <button
 onClick={simulatePayment}
 disabled={isProcessing}
 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-im text-sm btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isProcessing ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
 Processing...
 </>
 ) : (
 <>
 <Send className="w-4 h-4" strokeWidth={1.5} />
 Submit Payment Request
 </>
 )}
 </button>
 </div>
 </div>

 {/* Result */}
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
 <h3
 className={`text-base font-semibold ${
 result.status === 'APPROVED' ? 'text-accent-patina' : 'text-accent-coral'
 }`}
 >
 {result.status === 'APPROVED' ? 'Payment Approved' : 'Payment Denied'}
 </h3>
 <p className="text-xs text-text-secondary">{friendlyReason(result.reason)}</p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {result.status === 'DENIED' && (
 <button
 onClick={handleRetry}
 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-im text-xs btn-ghost"
 title="Retry with same values"
 >
 <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
 Retry
 </button>
 )}
 <button
 onClick={handleDismiss}
 className="flex items-center justify-center w-7 h-7 rounded-im text-text-muted hover:text-text-primary btn-ghost"
 aria-label="Dismiss result"
 >
 <X className="w-3.5 h-3.5" strokeWidth={2} />
 </button>
 </div>
 </div>
 {result.tx && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
 <div className="p-2 rounded-im">
 <span className="text-text-muted">Tx ID</span>
 <p className="font-mono text-text-primary mt-0.5">{result.tx.tx_id}</p>
 </div>
 <div className="p-2 rounded-im">
 <span className="text-text-muted">Amount</span>
 <p className="text-text-primary mt-0.5">{result.tx.amount.toFixed(2)} USDC</p>
 </div>
 {result.tx.tx_hash && (
 <div className="p-2 rounded-im col-span-1 sm:col-span-2">
 <span className="text-text-muted">Tx Hash</span>
 <p className="font-mono text-text-primary mt-0.5">{result.tx.tx_hash}</p>
 </div>
 )}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Right: Policy Pipeline */}
 <div className="lg:col-span-2">
 <div className="glass-card rounded-im p-4 lg:p-5">
 <h3 className="text-sm font-semibold text-text-primary mb-4 font-display">
 Policy Engine Pipeline
 </h3>
 <div className="space-y-3">
 {(result?.steps || [
 { id: 's1', label: 'Permission Check', status: 'pending' },
 { id: 's2', label: 'Budget Validation', status: 'pending' },
 { id: 's3', label: 'Vendor Whitelist', status: 'pending' },
 { id: 's4', label: 'Time Window', status: 'pending' },
 { id: 's5', label: 'Cooldown Period', status: 'pending' },
 { id: 's6', label: 'Anomaly Detection', status: 'pending' },
 ]).map((step, i, arr) => (
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
 <p
 className={`text-xs font-medium truncate ${
 step.status === 'success'
 ? 'text-accent-patina'
 : step.status === 'running'
 ? 'text-accent-slate'
 : step.status === 'error'
 ? 'text-accent-coral'
 : 'text-text-secondary'
 }`}
 >
 {step.label}
 </p>
 </div>
 {step.status === 'running' && (
 <ArrowRight className="w-3.5 h-3.5 text-accent-slate animate-pulse shrink-0" strokeWidth={1.5} />
 )}
 </div>
 {i < arr.length - 1 && (
 <div className="ml-3.5 w-px h-3 bg-border-default mt-1" />
 )}
 </div>
 ))}
 </div>

 {/* Card Budget Mini */}
 <div className="mt-5 pt-4 border-t border-border-default">
 <div className="flex items-center justify-between text-xs mb-2">
 <span className="text-text-secondary">Card Budget</span>
 <span className="text-text-primary font-medium">
 ${card?.budget.spent.toFixed(0)} / ${card?.budget.monthly_max}
 </span>
 </div>
 <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
 <div
 className="h-full bg-accent-patina rounded-full transition-all"
 style={{
 width: `${Math.min(
 ((card?.budget.spent || 0) / (card?.budget.monthly_max || 1)) * 100,
 100
 )}%`,
 }}
 />
 </div>
 <p className="text-[10px] text-text-muted mt-1.5">
 Single tx limit: ${card?.budget.single_tx_limit} USDC
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
