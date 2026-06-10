import type React from 'react';
import { AlertCircle, CheckCircle, Clock, Lock, Unlock, XCircle } from 'lucide-react';

export type NormalizedCardStatus =
  | 'ACTIVE'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'UNKNOWN';

export type CardStatusConfig = {
  color: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
};

export function normalizeCardStatus(rawStatus?: string | null): NormalizedCardStatus {
  const normalized = String(rawStatus || 'UNKNOWN').toUpperCase();
  const statusMap: Record<string, NormalizedCardStatus> = {
    ACTIVE: 'ACTIVE',
    APPROVED: 'ACTIVE',
    SUCCESS: 'ACTIVE',
    SUCCEEDED: 'ACTIVE',
    PENDING: 'PENDING_APPROVAL',
    APPROVAL_PENDING: 'PENDING_APPROVAL',
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    COMPLETED: 'COMPLETED',
    REVOKED: 'REVOKED',
    REJECTED: 'REVOKED',
    WITHDRAWN: 'REVOKED',
    EXPIRED: 'EXPIRED',
  };
  return statusMap[normalized] ?? 'UNKNOWN';
}

export function getCardStatusConfig(
  rawStatus: string | undefined | null,
  t: (key: string) => string
): CardStatusConfig {
  const normalized = normalizeCardStatus(rawStatus);
  const configs: Record<NormalizedCardStatus, CardStatusConfig> = {
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
    COMPLETED: {
      color: 'text-accent-patina',
      bg: 'bg-accent-patina/10',
      icon: <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: t('common.completed'),
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
    UNKNOWN: {
      color: 'text-text-muted',
      bg: 'bg-bg-hover',
      icon: <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} />,
      label: rawStatus ? `${t('common.unknown')} (${rawStatus})` : t('common.unknown'),
    },
  };
  return configs[normalized];
}
