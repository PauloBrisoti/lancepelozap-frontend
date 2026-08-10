import { useApiQuery, STALE_TIMES } from '../lib/query';

export interface Subscription {
  id: string;
  tenantId?: string;
  plano?: string;
  valorMensalidade: number;
  dataVencimento: string;
  statusPagamento: string;
  tenant?: { razaoSocial: string };
}

export function useSubscription(enabled = true) {
  return useApiQuery<Subscription | null>(
    ['subscriptions', 'me'],
    '/subscriptions/me',
    { enabled, staleTime: STALE_TIMES.NORMAL, retry: false }
  );
}
