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
import type { Wallet } from '../hooks/useFinanceiroDashboard';

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
// FÁBRICA DE QUERY KEYS CANÔNICAS
// ============================================================
// Toda query de dados escopados por loja DEVE incluir o storeId na
// chave, senão o cache do React Query colide entre lojas (mostra dados
// da loja anterior após trocar de workspace). Use estas fábricas em
// vez de keys literais para garantir o isolamento.

export const queryKeys = {
  /** Clientes de uma loja — compartilhada por Clientes/Agenda/Campanhas/PDV/OS */
  customers: (storeId: string | null) => ['customers', storeId] as const,
  /** Produtos de uma loja (status opcional: 'ATIVO', etc.) */
  products: (storeId: string | null, status?: string) =>
    ['products', storeId, status ?? 'todos'] as const,
  /** Vendas de uma loja (filtro de período aplicado no servidor) */
  sales: (storeId: string | null, dateFilter?: string, start?: string, end?: string) =>
    ['sales', storeId, dateFilter ?? 'todos', start ?? 'todos', end ?? 'todos'] as const,
  /** Contas a receber de uma loja — compartilhada por Fiado e Relatórios */
  receivables: (storeId: string | null) => ['receivables', storeId] as const,
  /** Taxas de pagamento de uma loja */
  paymentFees: (storeId: string | null) => ['payment-fees', storeId] as const,
  /** Config dos cards do dashboard de uma loja */
  storeDashboardConfig: (storeId: string | null) => ['store-dashboard-config', storeId] as const,
  /** Ordens de serviço de uma loja (sub-opcional para listas derivadas) */
  serviceOrders: (storeId: string | null) => ['service-orders', storeId] as const,
  /** Painel financeiro pessoal (PF) — compartilhada entre FinanceiroPF e PersonalDashboardPage */
  personal: {
    categories: () => ['personal', 'categories'] as const,
    wallets: () => ['personal', 'wallets'] as const,
    transactions: (mes: string | number, ano: string | number) =>
      ['personal', 'transactions', mes, ano] as const,
    dashboard: (mes: string | number, ano: string | number) =>
      ['personal', 'dashboard', mes, ano] as const,
    aiAnalysis: (mes: string | number, ano: string | number) =>
      ['personal', 'ai-analysis', mes, ano] as const,
  },
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
  key: readonly unknown[],
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
export function useProducts(storeId: string | null, status?: string) {
  return useApiQuery<Product[]>(
    queryKeys.products(storeId, status),
    status ? `/products?status=${status}` : '/products',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}

/** Clientes de uma loja (T permite estender o tipo base com campos locais) */
export function useCustomers<T extends Customer = Customer>(storeId: string | null, enabled = true) {
  return useApiQuery<T[]>(
    queryKeys.customers(storeId),
    '/customers',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId && enabled }
  );
}

/**
 * Carteiras financeiras de uma loja (via dashboard financeiro).
 * Compartilhada pelos modais de lançamento e baixa para deduplicar
 * a requisição e o cache entre eles.
 */
export function useWallets(storeId: string | null, enabled = true) {
  return useApiQuery<{ wallets: Wallet[] }>(
    ['finance-dashboard', storeId],
    '/finance/dashboard',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId && enabled }
  );
}

/**
 * Config dos cards do dashboard da loja.
 * Compartilhada por ConfigCardMachinePage e useFinanceiroDashboard para
 * deduplicar a requisição e manter o cache coerente entre as páginas.
 */
export function useStoreDashboardConfig(storeId: string | null) {
  return useApiQuery<{ cards?: string[] } | null>(
    queryKeys.storeDashboardConfig(storeId),
    storeId ? `/store/my/${storeId}/dashboard-config` : '',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId, retry: false }
  );
}

export interface PaymentFee {
  id: string;
  formaPagamento: string;
  parcelas: number;
  taxaPercentual: number;
  taxaFixa: number;
  prazoRecebimento: number;
}

/**
 * Taxas de pagamento de uma loja.
 * Compartilhada entre PDV (leitura) e as páginas de configuração (CRUD via
 * useCrudList com a mesma queryKey) — alterações invalidam o cache em todos.
 */
export function usePaymentFees<T extends PaymentFee = PaymentFee>(storeId: string | null) {
  return useApiQuery<T[]>(
    queryKeys.paymentFees(storeId),
    '/payment-fees',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}
