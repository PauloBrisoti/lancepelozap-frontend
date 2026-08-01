import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApiQuery } from '../lib/query';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { AlertTriangle, CalendarCheck, DollarSign, Search, User, Wallet, Inbox } from 'lucide-react';
import { SkeletonTable } from '../components/LoadingSkeleton';

interface Receivable {
  id: string;
  customer: { nomeCompleto: string; telefoneWhatsapp?: string };
  sale: { id: string; dataVenda?: string; valorTotalLiquido?: number; formaPagamento?: string } | null;
  dataVencimento: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  status: string;
  statusExibicao: string;
  formaPagamentoEsperada: string;
  dataPagamentoEfetivo?: string;
  valorJaPago?: number;
  saldoRestante?: number;
}

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatNome = (nome: string) => {
  const conectivos = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return nome.trim().split(/\s+/).map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && conectivos.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
};

export function FiadoPage() {
  const { activeStoreId } = useAuth();
  const [filter, setFilter] = useState<'all' | 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'PAGO_PARCIAL'>('all');
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState<Receivable | null>(null);
  const [payValue, setPayValue] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [renegModal, setRenegModal] = useState<Receivable | null>(null);
  const [renegForm, setRenegForm] = useState({ novaDataVencimento: '', novoValor: '', novasParcelas: '1' });
  const [renegSaving, setRenegSaving] = useState(false);

  const { data: receivablesData, isLoading, refetch } = useApiQuery<Receivable[]>(
    ['receivables', activeStoreId],
    '/finance/receivables',
    { enabled: !!activeStoreId, staleTime: 0, refetchOnMount: true }
  );
  const receivables = receivablesData || [];

  const handlePay = async () => {
    if (!payModal || !payValue) return;
    setSaving(true);
    try {
      await fetchApi(`/finance/receivables/${payModal.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          valorPago: parseFloat(payValue),
          dataPagamento: payDate,
        })
      });
      toast.success('Pagamento registrado!');
      setPayModal(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    } finally {
      setSaving(false);
    }
  };

  const handleRenegotiate = async () => {
    if (!renegModal || !renegForm.novaDataVencimento || !renegForm.novoValor) return;
    setRenegSaving(true);
    try {
      await fetchApi(`/finance/receivables/${renegModal.id}/renegotiate`, {
        method: 'POST',
        body: JSON.stringify({
          novaDataVencimento: renegForm.novaDataVencimento,
          novoValor: parseFloat(renegForm.novoValor),
          novasParcelas: parseInt(renegForm.novasParcelas),
        }),
      });
      toast.success('Parcelas renegociadas!');
      setRenegModal(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renegociar');
    } finally {
      setRenegSaving(false);
    }
  };

  const hoje = new Date();
  const totalPendente = receivables
    .filter(r => r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + (r.saldoRestante ?? Number(r.valorParcela)), 0);

  const totalVencido = receivables
    .filter(r => new Date(r.dataVencimento) < hoje && r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + (r.saldoRestante ?? Number(r.valorParcela)), 0);

  const totalEmDia = receivables
    .filter(r => new Date(r.dataVencimento) >= hoje && r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + (r.saldoRestante ?? Number(r.valorParcela)), 0);

  const countBy = (status: string) => receivables.filter(r => r.statusExibicao === status).length;

  const filtered = receivables
    .filter(r => (filter === 'all' ? true : r.statusExibicao === filter))
    .filter(r => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return (r.customer?.nomeCompleto || '').toLowerCase().includes(term);
    })
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

  const totalFiltrado = filtered
    .filter(r => r.statusExibicao !== 'PAGO')
    .reduce((acc, r) => acc + (r.saldoRestante ?? Number(r.valorParcela)), 0);

  const hasFilters = search.trim() !== '' || filter !== 'all';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Crediário / Fiado</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">Gerencie contas a receber e parcelas pendentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Total a Receber</p>
            <p className="text-base md:text-2xl font-extrabold text-gray-900 leading-tight">R$ {formatBRL(totalPendente)}</p>
            <p className="text-[10px] text-gray-400 truncate">{receivables.length} parcela(s) no total</p>
          </div>
        </div>
        <div className={`p-3 md:p-4 rounded-2xl shadow-sm border flex items-center gap-3 ${totalVencido > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${totalVencido > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Vencido</p>
            <p className={`text-base md:text-2xl font-extrabold leading-tight ${totalVencido > 0 ? 'text-red-600' : 'text-gray-900'}`}>R$ {formatBRL(totalVencido)}</p>
            <p className={`text-[10px] truncate ${totalVencido > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {countBy('VENCIDO') > 0 ? `${countBy('VENCIDO')} parcela(s) em atraso` : 'Nenhuma parcela atrasada'}
            </p>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Em Dia</p>
            <p className="text-base md:text-2xl font-extrabold text-emerald-700 leading-tight">R$ {formatBRL(totalEmDia)}</p>
            <p className="text-[10px] text-gray-400 truncate">{countBy('PENDENTE')} parcela(s) a vencer</p>
          </div>
        </div>
      </div>

      {/* Barra de filtros + busca */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div className="flex gap-2 bg-white rounded-xl p-1 border shadow-sm w-fit overflow-x-auto">
          {([
            { key: 'PENDENTE', label: 'A Vencer' },
            { key: 'VENCIDO', label: 'Vencido' },
            { key: 'PAGO_PARCIAL', label: 'Parcial' },
            { key: 'PAGO', label: 'Quitados' },
            { key: 'all', label: 'Todos' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === f.key ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {countBy(f.key)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            {hasFilters ? (
              <p className="text-sm text-gray-600">Nenhuma parcela com os filtros aplicados.</p>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma parcela registrada ainda.</p>
            )}
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {filtered.length} parcela(s)
                {filter !== 'all' && (
                  <span className="ml-1 text-gray-400">· {filter === 'PAGO' ? 'quitadas' : filter === 'VENCIDO' ? 'vencidas' : filter === 'PAGO_PARCIAL' ? 'parciais' : 'a vencer'}</span>
                )}
                {search.trim() && <span className="ml-1 text-gray-400">· busca: "{search.trim()}"</span>}
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setFilter('all'); }} className="ml-2 text-brand-600 hover:underline font-medium">Limpar</button>
                )}
              </span>
              <span className="font-semibold text-gray-700">
                {filter !== 'PAGO' ? `Pendente: R$ ${formatBRL(totalFiltrado)}` : `Total quitado: R$ ${formatBRL(filtered.reduce((acc, r) => acc + Number(r.valorParcela), 0))}`}
              </span>
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Parcela</th>
                    <th className="px-5 py-3.5">Compra</th>
                    <th className="px-5 py-3.5">Vencimento</th>
                    <th className="px-5 py-3.5">Valor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => {
                    const status = r.statusExibicao;
                    const isPago = status === 'PAGO';
                    const isParcial = status === 'PAGO_PARCIAL';
                    const isVencido = status === 'VENCIDO';
                    const saldo = r.saldoRestante ?? Number(r.valorParcela);
                    const temParcial = r.saldoRestante !== undefined && r.saldoRestante > 0 && r.saldoRestante < Number(r.valorParcela);
                    const diasAtraso = isVencido ? Math.max(1, Math.floor((hoje.getTime() - new Date(r.dataVencimento).getTime()) / 86400000)) : 0;
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${isVencido ? 'bg-red-50/60' : ''}`}>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isVencido ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate max-w-[220px]">{formatNome(r.customer?.nomeCompleto || 'Cliente')}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {r.numeroParcela}/{r.totalParcelas}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {r.sale?.dataVenda ? format(new Date(r.sale.dataVenda), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={isVencido ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                              {format(new Date(r.dataVencimento), 'dd/MM/yyyy')}
                            </span>
                            {diasAtraso > 0 && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                                há {diasAtraso} dia{diasAtraso > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                          {isPago ? (
                            <span className="text-emerald-700">R$ {formatBRL(Number(r.valorParcela))}</span>
                          ) : temParcial ? (
                            <span>
                              R$ {formatBRL(saldo)}
                              <span className="text-gray-400 text-xs ml-1.5 line-through">R$ {formatBRL(Number(r.valorParcela))}</span>
                            </span>
                          ) : (
                            `R$ ${formatBRL(Number(r.valorParcela))}`
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            isPago ? 'bg-emerald-100 text-emerald-700' :
                            isParcial ? 'bg-blue-100 text-blue-700' :
                            isVencido ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {isPago ? '✓ Quitado' : isParcial ? 'Pago Parcial' : isVencido ? 'Vencido' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {!isPago && (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => { setPayModal(r); setPayValue(String(saldo)); }}
                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Receber
                              </button>
                              <button
                                onClick={() => {
                                  setRenegModal(r);
                                  setRenegForm({
                                    novaDataVencimento: format(new Date(r.dataVencimento), 'yyyy-MM-dd'),
                                    novoValor: String(saldo),
                                    novasParcelas: '1',
                                  });
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
                              >
                                Renegociar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(r => {
                const status = r.statusExibicao;
                const isPago = status === 'PAGO';
                const isParcial = status === 'PAGO_PARCIAL';
                const isVencido = status === 'VENCIDO';
                const saldo = r.saldoRestante ?? Number(r.valorParcela);
                const temParcial = r.saldoRestante !== undefined && r.saldoRestante > 0 && r.saldoRestante < Number(r.valorParcela);
                const diasAtraso = isVencido ? Math.max(1, Math.floor((hoje.getTime() - new Date(r.dataVencimento).getTime()) / 86400000)) : 0;
                return (
                  <div key={r.id} className={`p-4 ${isVencido ? 'bg-red-50/60' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isVencido ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{formatNome(r.customer?.nomeCompleto || 'Cliente')}</p>
                          <p className="text-[11px] text-gray-400">
                            {r.numeroParcela}/{r.totalParcelas} · vence {format(new Date(r.dataVencimento), 'dd/MM/yyyy')}
                            {diasAtraso > 0 && <span className="text-red-500 font-bold ml-1">({diasAtraso}d atraso)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-bold ${isPago ? 'text-emerald-700' : 'text-gray-900'}`}>
                          R$ {formatBRL(isPago ? Number(r.valorParcela) : saldo)}
                        </p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isPago ? 'bg-emerald-100 text-emerald-700' :
                          isParcial ? 'bg-blue-100 text-blue-700' :
                          isVencido ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {isPago ? '✓ Quitado' : isParcial ? 'Pago Parcial' : isVencido ? 'Vencido' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                    {temParcial && (
                      <p className="text-[11px] text-gray-400 mb-2">
                        Original: <span className="line-through">R$ {formatBRL(Number(r.valorParcela))}</span>
                      </p>
                    )}
                    {!isPago && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { setPayModal(r); setPayValue(String(saldo)); }}
                          className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Receber
                        </button>
                        <button
                          onClick={() => {
                            setRenegModal(r);
                            setRenegForm({
                              novaDataVencimento: format(new Date(r.dataVencimento), 'yyyy-MM-dd'),
                              novoValor: String(saldo),
                              novasParcelas: '1',
                            });
                          }}
                          className="flex-1 py-2 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
                        >
                          Renegociar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Registrar Pagamento</h3>
              <button onClick={() => setPayModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cliente</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatNome(payModal.customer?.nomeCompleto || 'Cliente')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Parcela {payModal.numeroParcela}/{payModal.totalParcelas}</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {payModal.saldoRestante !== undefined && payModal.saldoRestante > 0 && payModal.saldoRestante < Number(payModal.valorParcela) ? (
                    <span>Saldo: R$ {formatBRL(payModal.saldoRestante)} <span className="text-gray-400 text-xs line-through">R$ {formatBRL(Number(payModal.valorParcela))}</span></span>
                  ) : (
                    `R$ ${formatBRL(Number(payModal.valorParcela))}`
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold"
                  value={payValue}
                  onChange={e => setPayValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                />
              </div>
              <button
                onClick={handlePay}
                disabled={saving || !payValue}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renegotiate Modal */}
      {renegModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Renegociar Dívida</h3>
              <button onClick={() => setRenegModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cliente</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatNome(renegModal.customer?.nomeCompleto || 'Cliente')}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Saldo devedor da parcela</p>
                <p className="font-semibold text-amber-800 mt-0.5">R$ {formatBRL(renegModal.saldoRestante ?? Number(renegModal.valorParcela))}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Novo Valor Total</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={renegForm.novoValor}
                  onChange={e => setRenegForm({...renegForm, novoValor: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primeiro Vencimento</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={renegForm.novaDataVencimento}
                  onChange={e => setRenegForm({...renegForm, novaDataVencimento: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  value={renegForm.novasParcelas}
                  onChange={e => setRenegForm({...renegForm, novasParcelas: e.target.value})}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              {Number(renegForm.novasParcelas) > 1 && (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">
                    {Number(renegForm.novasParcelas)}x de <strong>R$ {formatBRL(Number(renegForm.novoValor) / Number(renegForm.novasParcelas))}</strong>
                  </p>
                </div>
              )}
              <button
                onClick={handleRenegotiate}
                disabled={renegSaving || !renegForm.novoValor || !renegForm.novaDataVencimento}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50"
              >
                {renegSaving ? 'Salvando...' : 'Confirmar Renegociação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
