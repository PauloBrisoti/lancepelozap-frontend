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
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { fetchApi, ApiError } from './api';
import type { Sale, Customer, Category, Product, DashboardMetrics, Receivable, SuperAdminDashboard } from '../types/api';

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
// HOOK GENÉRICO PARA MUTATIONS (POST, PUT, DELETE)
// ============================================================

interface MutationOptions<TData, TVars>
  extends Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'> {
  /** Query keys para invalidar após sucesso */
  invalidateKeys?: unknown[][];
}

/**
 * Hook para mutações com invalidação de cache automática.
 *
 * Exemplo:
 * ```tsx
 * const mutation = useApiMutation(
 *   (data) => fetchApi('/sales', { method: 'POST', body: JSON.stringify(data) }),
 *   { invalidateKeys: [['sales'], ['dashboard']] }
 * );
 * ```
 */
export function useApiMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  options: MutationOptions<TData, TVars> = {}
) {
  const queryClient = useQueryClient();
  const { invalidateKeys, ...mutationOptions } = options;

  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    onSuccess: (data, variables, context, mutation) => {
      // Invalida caches relacionados automaticamente
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      mutationOptions?.onSuccess?.(data, variables, context, mutation);
    },
    retry: 1,
    retryDelay: 1000,
    ...mutationOptions,
  });
}

// ============================================================
// MUTATION COM OPTIMISTIC UI
// ============================================================

/**
 * Hook para mutações com atualização otimista da UI.
 *
 * Exemplo:
 * ```tsx
 * const { mutate } = useOptimisticMutation({
 *   mutationFn: (id) => fetchApi(`/sales/${id}/cancel`, { method: 'PUT' }),
 *   queryKey: ['sales'],
 *   optimisticUpdate: (oldData, saleId) =>
 *     oldData.map(s => s.id === saleId ? { ...s, status: 'CANCELADA' } : s),
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVars>(
  options: {
    mutationFn: (vars: TVars) => Promise<TData>;
    queryKey: unknown[];
    optimisticUpdate: (oldData: TData | undefined, vars: TVars) => TData;
  } & MutationOptions<TData, TVars>
) {
  const queryClient = useQueryClient();
  const { mutationFn, queryKey, optimisticUpdate, invalidateKeys, ...rest } = options;

  return useMutation<TData, ApiError, TVars>({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: TData | undefined) => optimisticUpdate(old, variables));

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      const ctx = context as { previousData: TData | undefined } | undefined;
      if (ctx?.previousData) {
        queryClient.setQueryData(queryKey, ctx.previousData);
      }
    },
    onSettled: () => {
      // Revalida com o servidor
      queryClient.invalidateQueries({ queryKey });
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
    },
    retry: 1,
    ...rest,
  });
}

// ============================================================
// HOOK ESPECÍFICOS DO DOMÍNIO
// ============================================================

/** Dashboard do tenant (lojista) */
export function useDashboard(storeId: string | null, startDate: string, endDate: string) {
  return useApiQuery<DashboardMetrics>(
    ['dashboard', storeId, startDate, endDate],
    `/dashboard/tenant?startDate=${startDate}&endDate=${endDate}`,
    {
      staleTime: STALE_TIMES.FREQUENT,
      enabled: !!storeId,
    }
  );
}

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

/** Vendas de uma loja */
export function useSales(storeId: string | null, params?: string) {
  return useApiQuery<Sale[]>(
    ['sales', storeId, params],
    `/sales${params || ''}`,
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Categorias */
export function useCategories(storeId: string | null) {
  return useApiQuery<Category[]>(
    ['categories', storeId],
    '/categories',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}

/** Fornecedores */
export function useSuppliers(storeId: string | null) {
  return useApiQuery<{ id: string; nome: string; telefone: string }[]>(
    ['suppliers', storeId],
    '/suppliers',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}

/** Compras/Purchase Orders */
export function usePurchases(storeId: string | null, page = 1, status = '') {
  const params = `?page=${page}&limit=20${status ? `&status=${status}` : ''}`;
  return useApiQuery<any>(
    ['purchases', storeId, page, status],
    `/purchases${params}`,
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Orçamentos */
export function useQuotes(storeId: string | null, page = 1, statusFilter = '') {
  const params = `?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`;
  return useApiQuery<any>(
    ['quotes', storeId, page, statusFilter],
    `/quotes${params}`,
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Contas a Receber (Fiado) */
export function useReceivables(storeId: string | null) {
  return useApiQuery<Receivable[]>(
    ['receivables', storeId],
    '/finance/receivables',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Transações Financeiras */
export function useTransactions(storeId: string | null, params = '') {
  return useApiQuery<{ transactions: { id: string; tipo: string; valor: number; descricao: string; categoria?: string; dataTransacao: string; wallet?: { nome: string }; fornecedor?: string }[]; total: number; page: number; totalPages: number }>(
    ['transactions', storeId, params],
    `/finance/transactions${params}`,
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Contas a Pagar */
export function usePayables(storeId: string | null) {
  return useApiQuery<any[]>(
    ['payables', storeId],
    '/finance/payables',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Comissões */
export function useCommissions(storeId: string | null) {
  return useApiQuery<any[]>(
    ['commissions', storeId],
    '/commissions',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}

/** Relatório de Comissões */
export function useCommissionSummary(storeId: string | null) {
  return useApiQuery<any>(
    ['commission-summary', storeId],
    '/commission-payments/summary',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Devoluções */
export function useReturns(storeId: string | null) {
  return useApiQuery<any[]>(
    ['returns', storeId],
    '/returns',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Ordens de Serviço */
export function useServiceOrders(storeId: string | null) {
  return useApiQuery<any[]>(
    ['service-orders', storeId],
    '/service-orders',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Tipos de Serviço */
export function useServiceTypes(storeId: string | null) {
  return useApiQuery<any[]>(
    ['service-types', storeId],
    '/service-orders/service-types',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}

/** Agendamentos */
export function useAppointments(storeId: string | null, date: string, professionalId = '') {
  const params = `?data=${date}${professionalId ? `&professionalId=${professionalId}` : ''}`;
  return useApiQuery<any[]>(
    ['appointments', storeId, date, professionalId],
    `/appointments${params}`,
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Profissionais */
export function useProfessionals(storeId: string | null) {
  return useApiQuery<any[]>(
    ['professionals', storeId],
    '/appointments/professionals',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}

/** Transferências de Estoque */
export function useStockTransfers(storeId: string | null) {
  return useApiQuery<any[]>(
    ['stock-transfers', storeId],
    '/stock-transfers',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Contagens de Inventário */
export function useInventoryCounts(storeId: string | null) {
  return useApiQuery<any[]>(
    ['inventory-counts', storeId],
    '/inventory-counts',
    { staleTime: STALE_TIMES.FREQUENT, enabled: !!storeId }
  );
}

/** Configurações do WhatsApp */
export function useWhatsAppConfig(storeId: string | null) {
  return useApiQuery<any>(
    ['whatsapp-config', storeId],
    '/whatsapp/config',
    { staleTime: STALE_TIMES.NORMAL, enabled: !!storeId }
  );
}

/** Templates de WhatsApp */
export function useWhatsAppTemplates(storeId: string | null) {
  return useApiQuery<any[]>(
    ['whatsapp-templates', storeId],
    '/whatsapp/templates',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}

/** Planos de Assinatura */
export function usePlans() {
  return useApiQuery<any[]>(
    ['plans'],
    '/super-admin/plans'
  );
}

/** Notificações do Sistema */
export function useNotifications() {
  return useApiQuery<any[]>(
    ['notifications'],
    '/notifications',
    { staleTime: STALE_TIMES.REALTIME }
  );
}

export function useCategoriesTyped(storeId: string | null) {
  return useApiQuery<Category[]>(
    ['categories', storeId],
    '/categories',
    { staleTime: STALE_TIMES.STATIC, enabled: !!storeId }
  );
}
