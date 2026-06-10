// OPC Agent Treasury — Backend API Client
// Wraps the FastAPI backend. Falls back to mock data if backend is unreachable.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let _backendAvailable: boolean | null = null;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function checkBackend(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    _backendAvailable = res.ok;
    return _backendAvailable;
  } catch {
    _backendAvailable = false;
    return false;
  }
}

export function resetBackendCheck() {
  _backendAvailable = null;
}

// ─────────────────────────────────────────────────────────────────
// Types (mirroring backend models + mockData)
// ─────────────────────────────────────────────────────────────────

export interface Vendor {
  name: string;
  address: string;
  category: 'api' | 'ads' | 'outsource' | 'infra';
}

export interface Budget {
  currency: string;
  monthly_max: number;
  spent: number;
  single_tx_limit: number;
}

export interface CardPact {
  card_id: string;
  agent_id: string;
  agent_name: string;
  owner: string;
  // CAW can return newer or raw Pact states before the frontend knows about them.
  status: string;
  budget: Budget;
  vendor_whitelist: Vendor[];
  cooldown_hours: number;
  created_at: string;
  expires_at: string;
  api_key: string;
}

export interface Transaction {
  tx_id: string;
  card_id: string;
  agent_id: string;
  timestamp: string;
  vendor: string;
  vendor_address: string;
  amount: number;
  currency: string;
  status: 'APPROVED' | 'DENIED' | 'PENDING_APPROVAL';
  reason: string;
  remaining_budget: number;
  tx_hash: string;
  metadata: Record<string, any>;
  alert_level: 'none' | 'warn' | 'blocked' | 'human_review';
}

export interface MonthlySummary {
  month: string;
  total_income_usd: number;
  total_approved_usd: number;
  total_denied_usd: number;
  denied_count: number;
  transaction_count: number;
  by_agent: Record<string, any>;
  anomalies: Array<any>;
  generated_at: string;
}

export interface PaymentResult {
  status: string;
  reason: string;
  tx_id?: string;
  amount: number;
  vendor: string;
  remaining_budget: number;
  tx_hash?: string;
  alert_level: string;
}

// ─────────────────────────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────────────────────────

export async function fetchCards(): Promise<CardPact[]> {
  return apiFetch<CardPact[]>('/cards');
}

export async function fetchCard(cardId: string): Promise<CardPact> {
  return apiFetch<CardPact>(`/cards/${cardId}`);
}

export async function createCard(data: {
  agent_name: string;
  monthly_budget: number;
  single_tx_limit: number;
  vendor_whitelist: Vendor[];
  cooldown_hours?: number;
  duration_days?: number;
}): Promise<CardPact> {
  return apiFetch<CardPact>('/cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveCard(cardId: string, maxWait?: number): Promise<{ card_id: string; status: string; api_key?: string }> {
  const url = maxWait ? `/cards/${cardId}/approve?max_wait=${maxWait}` : `/cards/${cardId}/approve`;
  return apiFetch(url, { method: 'POST' });
}

export async function revokeCard(cardId: string): Promise<{ card_id: string; status: string }> {
  return apiFetch(`/cards/${cardId}/revoke`, { method: 'POST' });
}

export async function submitPayment(data: {
  card_id: string;
  vendor: string;
  amount: number;
  purpose?: string;
  metadata?: Record<string, any>;
}): Promise<PaymentResult> {
  return apiFetch<PaymentResult>('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchTransactions(cardId?: string): Promise<Transaction[]> {
  const url = cardId ? `/transactions?card_id=${encodeURIComponent(cardId)}` : '/transactions';
  return apiFetch<Transaction[]>(url);
}

export async function fetchDashboard(): Promise<{
  cards: CardPact[];
  transactions: Transaction[];
  summary: MonthlySummary;
}> {
  return apiFetch('/dashboard');
}

export async function fetchAuditSummary(month?: string): Promise<MonthlySummary> {
  const url = month ? `/audit/summary?month=${month}` : '/audit/summary';
  return apiFetch<MonthlySummary>(url);
}

export async function runAttack(attackId: string, cardId: string, metadata?: Record<string, any>): Promise<PaymentResult> {
  return apiFetch<PaymentResult>(`/attacks/${attackId}`, {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId, metadata }),
  });
}

export async function resetDemo(): Promise<{ status: string; reason?: string }> {
  return apiFetch('/demo/reset', { method: 'POST' });
}

export interface WalletBalanceAsset {
  wallet_uuid: string;
  chain_id: string;
  token_id: string;
  amount: number;
  amount_formatted: string;
  currency: string;
  address: string;
  updated_at: string;
}

export interface WalletBalance {
  wallet_uuid: string;
  chain_id: string;
  token_id: string;
  balance: number;
  balance_formatted: string;
  currency: string;
  address: string;
  updated_at: string;
  balances: WalletBalanceAsset[];
}

export async function fetchWalletBalance(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet/balance');
}
