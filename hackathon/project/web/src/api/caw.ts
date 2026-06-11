// OPC Agent Treasury — Backend API client
// Talks to the FastAPI backend (default http://127.0.0.1:8000)

import type { CardPact, DigitalEmployee, Transaction, MonthlySummary } from '../data/mockData';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type CreateCardPayload = {
  agent_name: string;
  monthly_budget: number;
  single_tx_limit: number;
  vendor_whitelist: Array<Record<string, any>>;
  cooldown_hours?: number;
  duration_days?: number;
  agent_id?: string;
  erc8004_agent_id?: string;
  erc8004_registry_url?: string;
};

export type ApproveResponse = {
  card_id: string;
  status: string;
  api_key?: string | null;
};

export type AssignCardPayload = {
  agent_id: string;
  agent_name: string;
};

export type AssignCardResponse = {
  card_id: string;
  status: string;
  assigned_agent_id: string;
  assigned_agent_name: string;
  assigned_at: string;
};

export type PaymentPayload = {
  agent_id: string;
  card_id: string;
  vendor: string;
  amount: number;
  purpose?: string;
  metadata?: Record<string, any>;
};

export type PaymentResponse = {
  status: string;
  reason: string;
  tx_id?: string;
  amount: number;
  vendor: string;
  remaining_budget: number;
  tx_hash?: string;
  alert_level: string;
};

export type X402Provider = {
  name: string;
  address: string;
  category: string;
  x402_url: string;
  description: string;
  pricing_usdc: number;
  chain: string;
  source: string;
  erc8004_agent_id?: string | null;
  erc8004_registry_url?: string | null;
  erc8004_name?: string | null;
  erc8004_description?: string | null;
  average_score?: number | null;
  total_feedback?: number | null;
  overall_score?: number | null;
  stars?: number | null;
  health_score?: number | null;
  rank?: number | null;
  network_rank?: number | null;
  is_verified?: boolean | null;
  token_id?: string | null;
  contract_address?: string | null;
};

export type ERC8004Agent = {
  agent_id: string;
  name: string;
  chain: string;
  service: string;
  owner: string;
  score: number;
  feedback: number;
  stars: number;
  x402_enabled: boolean;
  registry_url: string;
  source: string;
  description?: string | null;
  average_score?: number | null;
  health_score?: number | null;
  rank?: number | null;
  network_rank?: number | null;
  is_verified?: boolean | null;
  contract_address?: string | null;
  token_id?: string | null;
  chain_id?: number | null;
};

export const cawApi = {
  health: () => api<{ status: string; caw_mode: string }>('/health'),
  listX402Providers: () => api<X402Provider[]>('/providers/x402'),
  listERC8004Agents: () => api<ERC8004Agent[]>('/erc8004/agents'),
  listDigitalEmployees: () => api<DigitalEmployee[]>('/agents/digital-employees'),
  marketplaceContext: () => api<Record<string, any>>('/marketplace/context'),

  listCards: () => api<CardPact[]>('/cards'),
  getCard: (cardId: string) => api<CardPact>(`/cards/${cardId}`),
  createCard: (payload: CreateCardPayload) =>
    api<CardPact>('/cards', { method: 'POST', body: JSON.stringify(payload) }),
  approveCard: (cardId: string) =>
    api<ApproveResponse>(`/cards/${cardId}/approve`, { method: 'POST' }),
  assignCard: (cardId: string, payload: AssignCardPayload) =>
    api<AssignCardResponse>(`/cards/${cardId}/assign`, { method: 'POST', body: JSON.stringify(payload) }),
  revokeCard: (cardId: string) =>
    api<ApproveResponse>(`/cards/${cardId}/revoke`, { method: 'POST' }),

  listTransactions: (cardId?: string) =>
    api<Transaction[]>(`/transactions${cardId ? `?card_id=${encodeURIComponent(cardId)}` : ''}`),
  submitPayment: (payload: PaymentPayload) =>
    api<PaymentResponse>('/payments', { method: 'POST', body: JSON.stringify(payload) }),

  auditSummary: (month = '2026-06') =>
    api<MonthlySummary>(`/audit/summary?month=${encodeURIComponent(month)}`),

  dashboard: () => api<{ cards: CardPact[]; transactions: Transaction[]; summary: MonthlySummary }>('/dashboard'),

  runAttack: (attackId: string, cardId: string) =>
    api<PaymentResponse>(`/attacks/${attackId}`, {
      method: 'POST',
      body: JSON.stringify({ card_id: cardId }),
    }),

  resetDemo: () => api<{ status: string }>('/demo/reset', { method: 'POST' }),
};
