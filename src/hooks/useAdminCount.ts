import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { useAuthUser } from '../context/AuthContext';
import { usePoll } from './usePoll';

/**
 * Contagem administrada com polling, restrita a SUPER_ADMIN.
 *
 * Unifica o padrão de TicketBadge / PendingCountBadge:
 * busca em intervalo fixo, ignora erros e retorna null até a
 * primeira resposta (para o componente decidir se renderiza).
 */
export function useAdminCount<T>(
  endpoint: string,
  intervalMs: number,
  select: (data: T) => number,
  deps: unknown[] = []
): number | null {
  const { user } = useAuthUser();
  const [count, setCount] = useState<number | null>(null);

  usePoll(
    async () => {
      if (user?.role !== 'SUPER_ADMIN') return;
      try {
        const data = await fetchApi<T>(endpoint);
        setCount(select(data));
      } catch {
        setCount(0);
      }
    },
    intervalMs,
    [user?.role, ...deps]
  );

  return count;
}
