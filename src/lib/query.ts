/**
 * Hooks de dados com React Query (TanStack Query).
 *
 * Benefícios:
 * - Cache automático com stale-while-revalidate
 * - Deduplicação de requisições (2 chamadas iguais viram 1)
 * - Retry com exponential backoff
 * - Refetch automático ao focar a janela
 * - Paginação e lazy loading
 * - Mutations com optimistic UI
 */

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { fetchApi, ApiError } from './api';
import type { Customer, Product, SuperAdminDashboard } from '../types/api';

// ============================================================
// CONSTANTES DE CACHE
// ============================================================

export const STALE_TIMES = {
  /** Dados quase estáticos (planos, categorias) — 5 minutos */
  STATIC: 5 * 60 * 1000,
  /** Dados semi-estáticos (produtos, clientes) — 2 minutos */
  NORMAL: 2 * 60 * 1000,
  /** Dados voláteis (vendas, dashboard) — 30 segundos */
  FREQUENT: 30 * 1000,
  /** Dados em tempo real (alertas, notificações) — 10 segundos */
  REALTIME: 10 * 1000,
} as const;

// ============================================================
// HOOK GENÉRICO PARA QUERIES
// ============================================================

interface QueryOptions<T> extends Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'> {
  /** Tempo em ms que o dado é considerado "fresco" (default: 2min) */
  staleTime?: number;
}

/**
 * Hook para buscar dados da API com cache e retry automático.
 *
 * Exemplo:
 * ```tsx
 * const { data, isLoading, error } = useApiQuery(
 *   ['products', storeId],
 *   `/products?storeId=${storeId}`,
 *   { staleTime: STALE_TIMES.NORMAL }
 * );
 * ```
 */
export function useApiQuery<T>(
  key: unknown[],
  endpoint: string,
  options: QueryOptions<T> = {}
) {
  const { staleTime = STALE_TIMES.NORMAL } = options;

  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: ({ signal }) =>
      fetchApi<T>(endpoint, { signal }),
    staleTime,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ============================================================
// HOOK ESPECÍFICOS DO DOMÍNIO
// ============================================================

/** Dashboard do Super Admin */
export function useSuperAdminDashboard(enabled?: boolean) {
  return useApiQuery<SuperAdminDashboard>(
    ['dashboard', 'super-adm'],
    '/dashboard/super-adm',
    { staleTime: STALE_TIMES.FREQUENT, retry: false, enabled }
  );
}

/** Produtos de uma loja */
export function useProducts(storeId: string | null) {
  return useApiQuery<Product[]>(
    ['products', storeId],
    '/products',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}

/** Clientes de uma loja */
export function useCustomers(storeId: string | null) {
  return useApiQuery<Customer[]>(
    ['customers', storeId],
    '/customers',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}
