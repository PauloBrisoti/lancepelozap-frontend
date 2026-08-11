import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatDateBR } from '../lib/dates';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

interface Category {
  id: string; nome: string; tipo: string; icone: string; cor: string;
}

interface Wallet {
  id: string; nome: string; icone: string; saldo?: number;
}

interface Transaction {
  id: string; tipo: string; valor: number; descricao: string;
  data: string; dataCompetencia?: string | null;
  pago: boolean; formaPagamento?: string | null;
  recorrente: boolean; parcelas?: number | null;
  observacoes?: string | null;
  category: { id: string; nome: string; icone: string; cor: string };
  wallet?: { id: string; nome: string; icone: string };
}

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'Pix', icon: '⚡' },
  { value: 'BOLETO', label: 'Boleto', icon: '📄' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito', icon: '💳' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito', icon: '💳' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { value: 'TRANSFERENCIA', label: 'Transferência', icon: '🔄' },
  { value: 'DEBITO_AUTOMATICO', label: 'Débito Automático', icon: '🔁' },
];

const toDT = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
};

interface PersonalDashboard {
  saldoAcumulado: number;
  saldosAcumuladosPorConta: { id: string; nome: string; saldo: number }[];
}

export function FinanceiroPF() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const modal = useModal();
  const [filterMes, setFilterMes] = useState(String(new Date().getMonth() + 1));
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));

  const INITIAL_FORM = {
    id: '', tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA', valor: '', descricao: '',
    walletId: '', categoryId: '', dataVencimento: '', dataCompetencia: '',
    pago: false, formaPagamento: '', recorrente: false, parcelas: '', observacoes: '',
  };
  const [formTx, setFormTx] = useState(INITIAL_FORM);

  const { data: categories = [], refetch: refetchDados } = useApiQuery<Category[]>(
    ['personal', 'categories'],
    '/personal/categories',
    { staleTime: STALE_TIMES.NORMAL }
  );
  const { data: wallets = [] } = useApiQuery<Wallet[]>(
    ['personal', 'wallets'],
    '/personal/wallets',
    { staleTime: STALE_TIMES.NORMAL }
  );
  const { data: txsData, isLoading, refetch: refetchTx } = useApiQuery<Transaction[]>(
    ['personal', 'transactions', filterMes, filterAno],
    `/personal/transactions?mes=${filterMes}&ano=${filterAno}`,
    { staleTime: STALE_TIMES.FREQUENT }
  );
  const { data: dash } = useApiQuery<PersonalDashboard>(
    ['personal', 'dashboard', filterMes, filterAno],
    `/personal/dashboard?mes=${filterMes}&ano=${filterAno}`,
    { staleTime: STALE_TIMES.FREQUENT }
  );

  const transactions = Array.isArray(txsData) ? txsData : [];
  const saldoAcumulado = dash?.saldoAcumulado ?? 0;
  const saldosAcumuladosPorConta: { id: string; nome: string; saldo: number }[] = dash?.saldosAcumuladosPorConta ?? [];

  const entradasMes = useMemo(() =>
    transactions.filter(t => t.tipo === 'ENTRADA').reduce((acc, t) => acc + Number(t.valor), 0),
  [transactions]);

  const saidasMes = useMemo(() =>
    transactions.filter(t => t.tipo === 'SAIDA').reduce((acc, t) => acc + Number(t.valor), 0),
  [transactions]);

  const saldosPorConta = useMemo(() => {
    const map = new Map<string, Wallet & { saldo: number }>();
    transactions.forEach(t => {
      const walletId = t.wallet?.id;
      const walletNome = t.wallet?.nome || 'Sem conta';
      const walletIcone = t.wallet?.icone || '🏦';
      const key = walletId || '__none__';
      const atual = map.get(key);
      const valor = Number(t.valor);
      if (t.tipo === 'ENTRADA') {
        map.set(key, { id: key, nome: walletNome, icone: walletIcone, saldo: (atual?.saldo ?? 0) + valor });
      } else {
        map.set(key, { id: key, nome: walletNome, icone: walletIcone, saldo: (atual?.saldo ?? 0) - valor });
      }
    });
    return Array.from(map.values());
  }, [transactions]);

  useEffect(() => {
    fetchApi<{ billingCycleStartDay: number }>('/personal/cycle-config')
      .then(cfg => {
        const day = cfg?.billingCycleStartDay || 1;
        if (day > 1) {
          const today = new Date();
          if (today.getDate() < day) {
            let m = today.getMonth() - 1;
            let a = today.getFullYear();
            if (m < 0) { m = 11; a--; }
            setFilterMes(String(m + 1));
            setFilterAno(String(a));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTx.categoryId) return toast.error('Selecione uma categoria');
    if (!formTx.descricao.trim()) return toast.error('Descrição é obrigatória');
    if (!formTx.valor || Number(formTx.valor) <= 0) return toast.error('Valor deve ser maior que zero');
    try {
      const payload = {
        ...formTx,
        valor: Number(formTx.valor),
        dataVencimento: toDT(formTx.dataVencimento),
        dataTransacao: toDT(formTx.dataVencimento),
        dataCompetencia: formTx.dataCompetencia || undefined,
        pago: formTx.pago,
        formaPagamento: formTx.formaPagamento || undefined,
        recorrente: formTx.recorrente,
        parcelas: formTx.parcelas ? Number(formTx.parcelas) : undefined,
        observacoes: formTx.observacoes || undefined,
      };
      if (formTx.id) {
        await fetchApi(`/personal/transactions/${formTx.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchApi('/personal/transactions', { method: 'POST', body: JSON.stringify(payload) });
      }
      modal.closeModal();
      setFormTx(INITIAL_FORM);
      await Promise.all([refetchDados(), refetchTx()]);
      toast.success(formTx.id ? 'Atualizado!' : 'Lançamento criado!');
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao salvar');
    }
  };

  const openNew = async () => {
    const now = new Date();
    const localDate = now.toISOString().slice(0, 10);
    const cats = categories.length > 0 ? categories : await fetchApi<Category[]>('/personal/categories').catch(() => []);
    const firstCat = (Array.isArray(cats) ? cats : categories).find(c => c.tipo === 'SAIDA');
    setFormTx({
      ...INITIAL_FORM,
      categoryId: firstCat?.id || '',
      dataVencimento: localDate,
      dataCompetencia: localDate,
      walletId: saldosPorConta[0]?.id || wallets[0]?.id || '',
      recorrente: false,
      parcelas: '',
      observacoes: '',
    });
    modal.openModal();
  };

  const openEdit = (tx: Transaction) => {
    setFormTx({
      id: tx.id,
      tipo: tx.tipo as 'ENTRADA' | 'SAIDA',
      valor: String(Number(tx.valor)),
      descricao: tx.descricao || '',
      walletId: tx.wallet?.id || '',
      categoryId: tx.category?.id || '',
      dataVencimento: tx.data ? tx.data.slice(0, 10) : '',
      dataCompetencia: tx.dataCompetencia ? tx.dataCompetencia.slice(0, 10) : '',
      pago: tx.pago ?? false,
      formaPagamento: tx.formaPagamento || '',
      recorrente: tx.recorrente ?? false,
      parcelas: tx.parcelas ? String(tx.parcelas) : '',
      observacoes: tx.observacoes || '',
    });
    modal.openModal();
  };

  const categoriasFiltradas = categories.filter(c => c.tipo === formTx.tipo);

  const filtered = transactions.filter(tx => {
    if (statusFilter === 'PAGO' && !tx.pago) return false;
    if (statusFilter === 'PENDENTE' && tx.pago) return false;
    return tx.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      tx.category?.nome?.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return <div className="p-8 text-gray-500">Carregando financeiro pessoal...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro Pessoal</h1>
          <p className="text-gray-500 mt-1">Controle suas receitas, despesas e saldo.</p>
        </div>
        <button onClick={openNew}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Novo Lançamento
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
          <span className="font-semibold text-blue-600">Saldo Consolidado</span>
          <p className={`text-2xl font-bold mt-2 ${saldoAcumulado >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
            {formatBRL(saldoAcumulado)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
          <span className="font-semibold text-green-600">Entradas</span>
          <p className="text-2xl font-bold text-green-700 mt-2">{formatBRL(entradasMes)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
          <span className="font-semibold text-red-600">Saídas</span>
          <p className="text-2xl font-bold text-red-700 mt-2">{formatBRL(saidasMes)}</p>
        </div>
      </div>

      {/* Saldos por Conta */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Saldos por Conta (Acumulado)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {saldosAcumuladosPorConta.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-full">Nenhuma conta cadastrada.</p>
          ) : saldosAcumuladosPorConta.map(w => {
            const isCC = 'isCreditCard' in w && w.isCreditCard;
            return (
              <div key={w.id} className={`p-4 rounded-xl border shadow-sm ${isCC ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                <p className={`font-semibold mb-1 ${isCC ? 'text-red-700' : 'text-gray-700'}`}>
                  {isCC ? '💳 Fatura - ' : ''}{w.nome}
                </p>
                <p className={`text-xl font-bold ${isCC ? 'text-red-700' : w.saldo >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
                  {formatBRL(w.saldo)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extrato */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-800">Extrato de Lançamentos</h2>
          <div className="flex items-center gap-2">
            <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={String(i+1)}>{String(i+1).padStart(2, '0')}</option>
              ))}
            </select>
            <select value={filterAno} onChange={e => setFilterAno(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={String(new Date().getFullYear() - i)}>{new Date().getFullYear() - i}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="TODOS">Todos</option>
              <option value="PAGO">Pagos</option>
              <option value="PENDENTE">Pendentes</option>
            </select>
            <input type="text" placeholder="Buscar..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4 border-b">Data</th>
              <th className="p-4 border-b">Tipo</th>
              <th className="p-4 border-b">Descrição</th>
              <th className="p-4 border-b">Categoria</th>
              <th className="p-4 border-b">Conta</th>
              <th className="p-4 border-b text-center">Status</th>
              <th className="p-4 border-b text-right">Valor</th>
              <th className="p-4 border-b text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => (
              <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-600">
                  {formatDateBR(tx.data)}
                </td>
                <td className="p-4">
                  {tx.tipo === 'ENTRADA' ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ENTRADA</span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">SAÍDA</span>
                  )}
                </td>
                <td className="p-4 font-medium text-gray-800">{tx.descricao}</td>
                <td className="p-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    {tx.category?.icone && <span>{tx.category.icone}</span>}
                    {tx.category?.nome || '-'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">{tx.wallet?.nome || '-'}</td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tx.pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {tx.pago ? 'Pago' : 'Pendente'}
                  </span>
                </td>
                <td className={`p-4 text-right font-bold ${tx.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.tipo === 'ENTRADA' ? '+' : '-'} R$ {Number(tx.valor).toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => openEdit(tx)}
                    className="text-brand-500 hover:text-brand-700 transition-colors p-1" title="Editar">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum lançamento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de lançamento */}
      <Modal open={modal.open} onClose={() => { modal.closeModal(); setFormTx(INITIAL_FORM); }} size="md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">F</div>
          <h2 className="text-xl font-bold text-gray-900">{formTx.id ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button type="button" onClick={() => { modal.closeModal(); setFormTx(INITIAL_FORM); }} className="ml-auto p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Fechar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSalvar} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-3">
            <button type="button" onClick={() => setFormTx(f => ({ ...f, tipo: 'ENTRADA', categoryId: '' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold transition-all ${formTx.tipo === 'ENTRADA' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
              <ArrowUpCircle className="w-5 h-5" /> Entrada
            </button>
            <button type="button" onClick={() => setFormTx(f => ({ ...f, tipo: 'SAIDA', categoryId: '' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold transition-all ${formTx.tipo === 'SAIDA' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
              <ArrowDownCircle className="w-5 h-5" /> Saída
            </button>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input type="text" required placeholder="Descrição do lançamento"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={formTx.descricao}
              onChange={e => setFormTx(f => ({ ...f, descricao: e.target.value }))} />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input type="number" step="0.01" min="0.01" required placeholder="R$ 0,00"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-right font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={formTx.valor}
              onChange={e => setFormTx(f => ({ ...f, valor: e.target.value }))} />
          </div>

          {/* Datas lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
              <input type="date" required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formTx.dataVencimento}
                onChange={e => setFormTx(f => ({ ...f, dataVencimento: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Competência</label>
              <input type="date"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formTx.dataCompetencia}
                onChange={e => setFormTx(f => ({ ...f, dataCompetencia: e.target.value }))} />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={formTx.categoryId}
              onChange={e => setFormTx(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">Selecione...</option>
              {categoriasFiltradas.map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Conta + Forma de Pagamento lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formTx.walletId}
                onChange={e => setFormTx(f => ({ ...f, walletId: e.target.value }))}>
                <option value="">Selecione...</option>
                {(wallets.length > 0 ? wallets : saldosPorConta).map(w => (
                  <option key={w.id} value={w.id}>{w.icone || '🏦'} {w.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formTx.formaPagamento}
                onChange={e => setFormTx(f => ({ ...f, formaPagamento: e.target.value }))}>
                <option value="">Selecione...</option>
                {FORMAS_PAGAMENTO.map(fp => (
                  <option key={fp.value} value={fp.value}>{fp.icon} {fp.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recorrente / Parcelado */}
          <div className="flex items-center justify-between py-2 px-1 border-b border-gray-100">
            <div>
              <span className="text-sm font-medium text-gray-700">Lançamento Recorrente</span>
              <p className="text-xs text-gray-400">Repete-se todos os meses</p>
            </div>
            <button type="button" onClick={() => setFormTx(f => ({ ...f, recorrente: !f.recorrente, parcelas: f.recorrente ? '' : f.parcelas }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${formTx.recorrente ? 'bg-brand-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formTx.recorrente ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {formTx.recorrente && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas (deixe 1 ou vazio para recorrente sem fim)</label>
              <input type="number" min="1" placeholder="Ex: 12"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formTx.parcelas}
                onChange={e => setFormTx(f => ({ ...f, parcelas: e.target.value }))} />
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea rows={2} placeholder="Informações adicionais..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              value={formTx.observacoes}
              onChange={e => setFormTx(f => ({ ...f, observacoes: e.target.value }))} />
          </div>

          {/* Pago toggle */}
          <div className="flex items-center justify-between py-2 px-1">
            <div>
              <span className="text-sm font-medium text-gray-700">Pago</span>
              <p className="text-xs text-gray-400">Marque se o pagamento já foi realizado</p>
            </div>
            <button type="button" onClick={() => setFormTx(f => ({ ...f, pago: !f.pago }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${formTx.pago ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${formTx.pago ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => { modal.closeModal(); setFormTx(INITIAL_FORM); }}
              className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-semibold transition-colors text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm">
              {formTx.id ? 'Salvar Alterações' : 'Criar Lançamento'} <span className="text-lg">✓</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
