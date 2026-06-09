// OPC Agent Treasury — Backend API client
// Talks to the FastAPI backend (default http://127.0.0.1:8000)

import type { CardPact, Transaction, MonthlySummary } from '../data/mockData';

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
  vendor_whitelist: Array<{ name: string; address: string; category: string }>;
  cooldown_hours?: number;
  duration_days?: number;
};

export type ApproveResponse = {
  card_id: string;
  status: string;
  api_key?: string | null;
};

export type PaymentPayload = {
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

export const cawApi = {
  health: () => api<{ status: string; caw_mode: string }>('/health'),

  listCards: () => api<CardPact[]>('/cards'),
  getCard: (cardId: string) => api<CardPact>(`/cards/${cardId}`),
  createCard: (payload: CreateCardPayload) =>
    api<CardPact>('/cards', { method: 'POST', body: JSON.stringify(payload) }),
  approveCard: (cardId: string) =>
    api<ApproveResponse>(`/cards/${cardId}/approve`, { method: 'POST' }),
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
