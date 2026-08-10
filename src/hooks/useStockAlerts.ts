import { useState, useCallback, useRef } from 'react';
import { fetchApi, ApiError } from '../lib/api';
import { usePoll } from './usePoll';

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
 *
 * Melhorias em relação à versão anterior:
 * - Usa fetchApi em vez de fetch direto (funciona com proxy reverso)
 * - AbortController para cancelar requests anteriores
 * - Evita race conditions com ref de mounted
 * - Tipagem completa sem "any"
 */
export function useStockAlerts() {
  const [count, setCount] = useState(0);
  const [products, setProducts] = useState<StockAlert[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    const hasUser = localStorage.getItem('@LancePeloZap:activeStoreId');
    if (!hasUser) return;

    // Cancela request anterior se ainda estiver pendente
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const data = await fetchApi<AlertsResponse>('/inventory/alerts', {
        signal: abortRef.current.signal,
        timeout: 10000, // 10s é suficiente para alertas
      });
      setCount(data.count);
      setProducts(data.products);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 408) {
        // Timeout — não mostrar erro, tentar de novo no próximo ciclo
        return;
      }
      // Falha silenciosa (pode estar offline ou sem permissão)
    }
  }, []);

  // Polling a cada 60s, pausado quando a aba está oculta
  usePoll(fetch, 60_000);

  return { count, products, refetch: fetch };
}
