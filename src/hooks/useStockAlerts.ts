import { useState, useCallback, useRef } from 'react';
import { fetchApi, ApiError } from '../lib/api';
import { usePoll } from './usePoll';
import { useAuthUser } from '../context/AuthContext';

interface StockAlert {
  id: string;
  nome: string;
  qtdEstoqueAtual: number;
  estoqueMinimo: number;
  imageUrl: string | null;
  categoria: string;
}

interface AlertsResponse {
  count: number;
  products: StockAlert[];
}

/**
 * Hook que busca alertas de estoque baixo a cada 60 segundos.
 */
export function useStockAlerts() {
  const { isAuthenticated, user } = useAuthUser();
  const [count, setCount] = useState(0);
  const [products, setProducts] = useState<StockAlert[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    // Não dispara requisição de loja se não estiver logado ou se for SUPER_ADMIN
    if (!isAuthenticated || user?.role === 'SUPER_ADMIN') return;

    // Cancela request anterior se ainda estiver pendente
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const data = await fetchApi<AlertsResponse>('/inventory/alerts', {
        signal: abortRef.current.signal,
        timeout: 10000,
      });
      setCount(data.count);
      setProducts(data.products);
    } catch (error: unknown) {
      if (error instanceof ApiError && (error.status === 408 || error.status === 401 || error.status === 403)) {
        return;
      }
    }
  }, [isAuthenticated, user?.role]);

  // Polling a cada 60s, pausado quando a aba está oculta
  usePoll(fetch, 60_000);

  return { count, products, refetch: fetch };
}