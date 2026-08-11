import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrudList } from '../hooks/useCrudList';

interface FeeConfig {
  id: string;
  formaPagamento: string;
  parcelas: number;
  taxaPercentual: number;
  taxaFixa: number;
  prazoRecebimento: number;
}

interface FeeForm {
  formaPagamento: string;
  parcelas: number;
  taxaPercentual: string;
  taxaFixa: string;
  prazoRecebimento: number;
}

const FORMAS_PAGAMENTO = [
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CREDIARIO', label: 'Crediário' },
];

const PRAZOS = [
  { value: 0, label: 'D+0 (Imediato)' },
  { value: 1, label: 'D+1' },
  { value: 2, label: 'D+2' },
  { value: 7, label: 'D+7' },
  { value: 14, label: 'D+14' },
  { value: 30, label: 'D+30' },
  { value: 60, label: 'D+60' },
];

const ALL_DASHBOARD_CARDS = [
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

function ConfigCardMachinePage() {
  const { activeStoreId } = useAuth();
  const [cartaoImediato, setCartaoImediato] = useState(true);
  const [savingCardBehavior, setSavingCardBehavior] = useState(false);
  const [diaInicioMes, setDiaInicioMes] = useState(1);
  const [savingDiaInicioMes, setSavingDiaInicioMes] = useState(false);
  const [dashboardCards, setDashboardCards] = useState<string[]>(ALL_DASHBOARD_CARDS.map(c => c.key));
  const [savingDashboardCards, setSavingDashboardCards] = useState(false);
  const [storeConfigLoading, setStoreConfigLoading] = useState(true);

  const fees = useCrudList<FeeConfig, FeeForm>({
    endpoint: '/payment-fees',
    loadList: () => fetchApi('/payment-fees'),
    createDefault: () => ({ formaPagamento: 'CARTAO_CREDITO', parcelas: 1, taxaPercentual: '', taxaFixa: '', prazoRecebimento: 30 }),
    toForm: fee => ({
      formaPagamento: fee.formaPagamento,
      parcelas: fee.parcelas,
      taxaPercentual: String(fee.taxaPercentual),
      taxaFixa: String(fee.taxaFixa),
      prazoRecebimento: fee.prazoRecebimento,
    }),
    beforeSave: form => {
      if (!form.taxaPercentual && !form.taxaFixa) {
        throw new Error('Preencha ao menos a taxa percentual ou fixa');
      }
      return {
        formaPagamento: form.formaPagamento,
        parcelas: Number(form.parcelas),
        taxaPercentual: Number(form.taxaPercentual) || 0,
        taxaFixa: Number(form.taxaFixa) || 0,
        prazoRecebimento: Number(form.prazoRecebimento),
      };
    },
    messages: {
      loadError: 'Erro ao carregar configurações',
      createSuccess: 'Taxa cadastrada',
      updateSuccess: 'Taxa atualizada',
      deleteSuccess: 'Configuração removida',
      deleteConfirm: 'Remover esta configuração?',
      saveError: 'Erro ao salvar',
    },
  });

  const getStoreId = async (): Promise<string | null> => {
    const stores: any[] = await fetchApi('/store/my');
    return stores[0]?.stores?.[0]?.id ?? null;
  };

  const carregarStoreConfig = async () => {
    const stores: any[] = await fetchApi('/store/my');
    const store = stores[0]?.stores?.[0];
    if (!store) return;
    setCartaoImediato(store.cartaoImediato ?? true);
    setDiaInicioMes(store.diaInicioMes ?? 1);
    const dashCfg = await fetchApi(`/store/my/${store.id}/dashboard-config`).catch(() => null) as { cards?: string[] } | null;
    if (dashCfg?.cards) {
      setDashboardCards(dashCfg.cards);
    }
  };

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
  }, [activeStoreId]);

  const saveCardBehavior = async () => {
    setSavingCardBehavior(true);
    try {
      const storeId = await getStoreId();
      if (!storeId) { toast.error('Loja não encontrada'); return; }
      await fetchApi(`/store/my/${storeId}/card-behavior`, {
        method: 'PATCH',
        body: JSON.stringify({ cartaoImediato: !cartaoImediato })
      });
      setCartaoImediato(!cartaoImediato);
      toast.success('Configuração salva');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSavingCardBehavior(false);
    }
  };

  const saveDiaInicioMes = async () => {
    setSavingDiaInicioMes(true);
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
      setSavingDiaInicioMes(false);
    }
  };

  const saveDashboardCards = async () => {
    setSavingDashboardCards(true);
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
      setSavingDashboardCards(false);
    }
  };

  const pmLabel = (v: string) => FORMAS_PAGAMENTO.find(f => f.value === v)?.label || v;
  const prazoLabel = (v: number) => PRAZOS.find(p => p.value === v)?.label || `D+${v}`;

  if (fees.loading || storeConfigLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Configuração da Maquininha</h1>
          <p className="text-sm text-gray-500 mt-1">Configure taxas e prazos de recebimento por bandeira e parcelamento</p>
        </div>
        <button
          onClick={fees.openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Taxa
        </button>
      </div>

      {fees.modalOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">{fees.editing ? 'Editar' : 'Nova'} Configuração</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Forma Pagamento</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={fees.form.formaPagamento} onChange={e => fees.setForm({ ...fees.form, formaPagamento: e.target.value })}>
                {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Parcelas</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={fees.form.parcelas} onChange={e => fees.setForm({ ...fees.form, parcelas: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(p => <option key={p} value={p}>{p}x</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Taxa %</label>
              <input type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="3.99" value={fees.form.taxaPercentual} onChange={e => fees.setForm({ ...fees.form, taxaPercentual: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Taxa Fixa (R$)</label>
              <input type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.50" value={fees.form.taxaFixa} onChange={e => fees.setForm({ ...fees.form, taxaFixa: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Prazo Recebimento</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={fees.form.prazoRecebimento} onChange={e => fees.setForm({ ...fees.form, prazoRecebimento: Number(e.target.value) })}>
                {PRAZOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fees.handleSave} disabled={fees.saving} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" /> Salvar
            </button>
            <button onClick={fees.closeModal} className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {fees.items.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
          <p className="text-lg font-medium">Nenhuma taxa configurada</p>
          <p className="text-sm mt-1">Adicione as taxas da sua maquininha para calcular automaticamente nas vendas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Forma Pagamento</th>
                <th className="px-4 py-3 text-left">Parcelas</th>
                <th className="px-4 py-3 text-right">Taxa %</th>
                <th className="px-4 py-3 text-right">Taxa Fixa</th>
                <th className="px-4 py-3 text-left">Prazo</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fees.items.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{pmLabel(fee.formaPagamento)}</td>
                  <td className="px-4 py-3 text-gray-600">{fee.parcelas}x</td>
                  <td className="px-4 py-3 text-right text-gray-900">{Number(fee.taxaPercentual).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-gray-900">R$ {Number(fee.taxaFixa).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{prazoLabel(fee.prazoRecebimento)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => fees.openEdit(fee)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => fees.handleDelete(fee.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comportamento de Recebimento de Cartão */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Cartão Imediato</h2>
        <p className="text-sm text-gray-500 mb-4">Define se vendas no cartão entram como dinheiro imediato no caixa ou viram contas a receber com prazo</p>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-gray-800">{cartaoImediato ? 'Recebimento Imediato' : 'Recebimento a Prazo'}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {cartaoImediato
                ? 'Vendas no cartão entram como dinheiro em caixa imediatamente'
                : 'Vendas no cartão viram contas a receber com vencimento no prazo configurado'}
            </p>
          </div>
          <button
            onClick={saveCardBehavior}
            disabled={savingCardBehavior}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${cartaoImediato ? 'bg-brand-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cartaoImediato ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {!cartaoImediato && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong className="font-bold">Projeção ativa:</strong> Ao vender no cartão, o valor líquido será registrado como conta a receber com vencimento no prazo definido na taxa da maquininha. O saldo do caixa só será atualizado quando o recebimento for baixado.
          </div>
        )}
      </div>

      {/* Mês Fiscal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Mês Fiscal</h2>
        <p className="text-sm text-gray-500 mb-4">Define em que dia do mês o seu mês fiscal começa. Isso afeta os cálculos de períodos no Financeiro.</p>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-gray-800">
              Mês inicia no dia <span className="text-brand-600">{diaInicioMes}</span>
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Ex: se dia 5, o período "Este Mês" vai de 05/jul a 04/ago
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={28}
              className="w-16 px-2 py-1.5 border rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-brand-500"
              value={diaInicioMes}
              onChange={e => setDiaInicioMes(Number(e.target.value))}
            />
            <button
              onClick={saveDiaInicioMes}
              disabled={savingDiaInicioMes}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {savingDiaInicioMes ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Config */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Cards do Painel Financeiro</h2>
        <p className="text-sm text-gray-500 mb-4">Selecione quais cards o lojista enxerga no painel financeiro. Os cálculos continuam sendo feitos mesmo com cards ocultos.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_DASHBOARD_CARDS.map(card => (
            <label key={card.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={dashboardCards.includes(card.key)}
                onChange={() => {
                  setDashboardCards(prev =>
                    prev.includes(card.key)
                      ? prev.filter(k => k !== card.key)
                      : [...prev, card.key]
                  );
                }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="font-semibold text-gray-800 text-sm">{card.label}</p>
                <p className="text-xs text-gray-500">{card.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={saveDashboardCards}
          disabled={savingDashboardCards}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {savingDashboardCards ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800">
        <strong className="font-bold">Como funciona:</strong> As taxas configuradas aqui são usadas automaticamente no PDV ao selecionar a forma de pagamento. Você pode optar por repassar a taxa ao cliente ou exibir o valor líquido a receber.
      </div>
    </div>
  );
}

export default ConfigCardMachinePage;
