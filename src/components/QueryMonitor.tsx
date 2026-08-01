/**
 * Monitor de performance das queries.
 *
 * Exibe em desenvolvimento: quantas queries, tempo de resposta, erros.
 * Pode ser ativado via localStorage: localStorage.setItem('debug_queries', 'true')
 */

import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Hook que monitora queries e mutations para debug.
 * Use: const { totalQueries, totalMutations, queryLogs } = useQueryMonitor();
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useQueryMonitor() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const queryClient = useQueryClient();
  const enabled = typeof window !== 'undefined' &&
    localStorage.getItem('debug_queries') === 'true';

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const state = queryClient.getQueryCache().getAll();
      const activeQueries = state.filter(q => q.state.fetchStatus === 'fetching');
      if (activeQueries.length > 0) {
        console.group('[QueryMonitor] Queries ativas:');
        activeQueries.forEach(q => {
          console.log(`  ${q.queryKey[0]}: fetching`);
        });
        console.groupEnd();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);

  return {
    totalQueries: isFetching,
    totalMutations: isMutating,
    enabled,
  };
}

/**
 * Componente de debug que mostra o estado das queries.
 * Só renderiza se localStorage.debug_queries === 'true'
 */
export function QueryMonitor() {
  const { totalQueries, totalMutations, enabled } = useQueryMonitor();
  const queryClient = useQueryClient();

  if (!enabled) return null;

  const state = queryClient.getQueryCache().getAll();
  const staleQueries = state.filter(q => q.isStaleByTime(60000));

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-xs font-mono p-3 rounded-xl shadow-2xl opacity-80 hover:opacity-100 max-w-xs">
      <p className="text-emerald-400 font-bold mb-1">⚡ Query Monitor</p>
      <p>Ativas: <strong>{totalQueries}</strong> | Mutations: <strong>{totalMutations}</strong></p>
      <p>Cache: <strong>{state.length}</strong> itens | Stale: <strong>{staleQueries.length}</strong></p>
      <div className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
        {state.slice(0, 10).map((q) => (
          <p key={q.queryHash} className="text-gray-400">
            {String(q.queryKey[0])}: {q.state.fetchStatus === 'fetching' ? '🔄' : q.isStaleByTime(0) ? '⏳' : '✅'}
          </p>
        ))}
      </div>
    </div>
  );
}
