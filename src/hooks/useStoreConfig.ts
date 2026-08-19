import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useStoreDashboardConfig } from '../lib/query';

export const ALL_DASHBOARD_CARDS = [
  { key: 'faturamento_bruto', label: 'Faturamento Bruto', desc: 'Total de vendas do período' },
  { key: 'dinheiro_recebido', label: 'Dinheiro Recebido', desc: 'Entradas financeiras no caixa' },
  { key: 'fiado_a_receber', label: 'Fiado a Receber', desc: 'Vendas fiado pendentes' },
  { key: 'contas_a_receber', label: 'Contas a Receber', desc: 'Total a receber (fiado + avulsas)' },
  { key: 'contas_a_pagar', label: 'Contas a Pagar', desc: 'Boletos e contas pendentes' },
  { key: 'caixa_disponivel', label: 'Caixa Disponível', desc: 'Saldo total em carteiras' },
  { key: 'lucro_operacao', label: 'Lucro da Operação', desc: 'Faturamento - CMV - Despesas' },
  { key: 'estoque_atual', label: 'Estoque Atual', desc: 'Custo dos produtos em estoque' },
  { key: 'despesas_operacionais', label: 'Despesas Operacionais', desc: 'Custos operacionais do mês' },
  { key: 'saldos_carteira', label: 'Saldos por Carteira', desc: 'Saldo individual de cada carteira' },
];

/** Campo de configuração em processo de salvamento (no máximo 1 por vez) */
export type StoreConfigSaving = 'cartao' | 'mes' | 'cards' | null;

/**
 * Configurações da loja atual: cartão imediato, mês fiscal e cards do painel.
 * Agrupa os estados co-mutantes (valor + salvando + loading) e centraliza o
 * fetch do /store/my (usa activeStoreId do AuthContext; o fetch cai como
 * fallback apenas quando o id não está disponível).
 */
export function useStoreConfig(activeStoreId: string | null) {
  const [cartaoImediato, setCartaoImediato] = useState(true);
  const [diaInicioMes, setDiaInicioMes] = useState(1);
  const [dashboardCards, setDashboardCards] = useState<string[]>(ALL_DASHBOARD_CARDS.map(c => c.key));
  const [storeConfigLoading, setStoreConfigLoading] = useState(true);
  const [savingField, setSavingField] = useState<StoreConfigSaving>(null);

  const storeCfg = useStoreDashboardConfig(activeStoreId);

  const getStoreId = async (): Promise<string | null> => {
    if (activeStoreId) return activeStoreId;
    const stores: any[] = await fetchApi('/store/my');
    return stores[0]?.stores?.[0]?.id ?? null;
  };

  const carregarStoreConfig = useCallback(async () => {
    const stores: any[] = await fetchApi('/store/my');
    const store = stores[0]?.stores?.[0];
    if (!store) return;
    setCartaoImediato(store.cartaoImediato ?? true);
    setDiaInicioMes(store.diaInicioMes ?? 1);
  }, []);

  useEffect(() => {
    (async () => {
      setStoreConfigLoading(true);
      try {
        await carregarStoreConfig();
      } catch {
        toast.error('Erro ao carregar configurações');
      } finally {
        setStoreConfigLoading(false);
      }
    })();
  }, [carregarStoreConfig, activeStoreId]);

  useEffect(() => {
    if (storeCfg.data?.cards) {
      setDashboardCards(storeCfg.data.cards);
    }
  }, [storeCfg.data]);

  const saveCardBehavior = useCallback(async () => {
    setSavingField('cartao');
    try {
      const storeId = await getStoreId();
      if (!storeId) { toast.error('Loja não encontrada'); return; }
      await fetchApi(`/store/my/${storeId}/card-behavior`, {
        method: 'PATCH',
        body: JSON.stringify({ cartaoImediato: !cartaoImediato })
      });
      setCartaoImediato(prev => !prev);
      toast.success('Configuração salva');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingField(null);
    }
  }, [cartaoImediato, activeStoreId]);

  const saveDiaInicioMes = useCallback(async () => {
    setSavingField('mes');
    try {
      const storeId = await getStoreId();
      if (!storeId) { toast.error('Loja não encontrada'); return; }
      await fetchApi(`/store/my/${storeId}/fiscal-config`, {
        method: 'PATCH',
        body: JSON.stringify({ diaInicioMes })
      });
      toast.success('Dia de início do mês salvo!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingField(null);
    }
  }, [diaInicioMes, activeStoreId]);

  const saveDashboardCards = useCallback(async () => {
    setSavingField('cards');
    try {
      const storeId = await getStoreId();
      if (!storeId) { toast.error('Loja não encontrada'); return; }
      await fetchApi(`/store/my/${storeId}/dashboard-config`, {
        method: 'PATCH',
        body: JSON.stringify({ cards: dashboardCards })
      });
      toast.success('Configuração do painel salva!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingField(null);
    }
  }, [dashboardCards, activeStoreId]);

  return {
    cartaoImediato,
    diaInicioMes,
    dashboardCards,
    setDiaInicioMes,
    setDashboardCards,
    savingField,
    loading: storeConfigLoading || (!!activeStoreId && storeCfg.isLoading),
    saveCardBehavior,
    saveDiaInicioMes,
    saveDashboardCards,
  };
}
