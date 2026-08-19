import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { CashTransactionList } from '../components/CashTransactionList';
import { useModal } from '../hooks/useModal';
import type { CashTransaction } from '../types/api';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

interface CurrentRegister {
  id: string;
  userId: string;
  user: { id: string; nome: string };
  dataAbertura: string;
  valorTrocoInicial: number;
  status: string;
  totalVendas: number;
  cashTransactions: CashTransaction[];
  _count: { sales: number };
}

interface RegisterRecord {
  id: string;
  user: { id: string; nome: string };
  dataAbertura: string;
  dataFechamento: string | null;
  valorTrocoInicial: number;
  valorTotalFechamento: number | null;
  saldoEsperado: number | null;
  diferenca: number | null;
  status: string;
  _count: { sales: number };
}

interface ReportCashRegister {
  id: string;
  dataAbertura: string;
  dataFechamento: string | null;
  user: { id: string; nome: string };
  cashTransactions: CashTransaction[];
}

interface ClosingReport {
  cashRegister: ReportCashRegister;
  totais: {
    totalVendas: number;
    quantidadeVendas: number;
    trocoInicial: number;
    saldoEsperado: number;
    valorDeclarado: number;
    diferenca: number;
    porFormaPagamento: Record<string, number>;
  };
}

export function CashRegisterPage() {
  const openModal = useModal();
  const closeModal = useModal();
  const transModal = useModal();
  const reportModal = useModal();
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [closeResult, setCloseResult] = useState<{ saldoEsperado: number; diferenca: number } | null>(null);
  const [trocoInicial, setTrocoInicial] = useState('0');
  const [valorFechamento, setValorFechamento] = useState('0');
  const [transTipo, setTransTipo] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [transValor, setTransValor] = useState('');
  const [transDescricao, setTransDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const { data: currentRes, isLoading, refetch } = useApiQuery<{ data: CurrentRegister | null }>(
    ['cash-register', 'current'],
    '/cash-register/current',
    { staleTime: STALE_TIMES.NORMAL }
  );
  const { data: historyRes, refetch: refetchHistory } = useApiQuery<{ data: { records: RegisterRecord[]; total: number; limit: number } }>(
    ['cash-register', 'history', page],
    `/cash-register/history?page=${page}&limit=20`,
    { staleTime: STALE_TIMES.NORMAL }
  );

  const current = currentRes?.data ?? null;
  const history = historyRes?.data?.records ?? [];
  const totalPages = Math.ceil((historyRes?.data?.total ?? 0) / (historyRes?.data?.limit ?? 20));

  const loadData = () => {
    refetch();
    refetchHistory();
  };

  const handleOpen = async () => {
    setSaving(true);
    try {
      await fetchApi('/cash-register/open', {
        method: 'POST',
        body: JSON.stringify({ valorTrocoInicial: parseFloat(trocoInicial) }),
      });
      toast.success('Caixa aberto com sucesso!');
      openModal.closeModal();
      loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao abrir caixa'); }
    finally { setSaving(false); }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      const data = await fetchApi('/cash-register/close', {
        method: 'POST',
        body: JSON.stringify({ valorTotalFechamento: parseFloat(valorFechamento) }),
      });
      toast.success('Caixa fechado com sucesso!');
      setCloseResult({ saldoEsperado: Number(data.saldoEsperado), diferenca: Number(data.diferenca) });
      closeModal.closeModal();
      loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao fechar caixa'); }
    finally { setSaving(false); }
  };

  const handleTransaction = async () => {
    if (!transValor || parseFloat(transValor) <= 0) { toast.error('Valor deve ser positivo'); return; }
    setSaving(true);
    try {
      await fetchApi('/cash-register/transaction', {
        method: 'POST',
        body: JSON.stringify({ tipo: transTipo, valor: parseFloat(transValor), descricao: transDescricao || undefined }),
      });
      toast.success(transTipo === 'SANGRIA' ? 'Sangria registrada!' : 'Suprimento registrado!');
      transModal.closeModal();
      setTransValor('');
      setTransDescricao('');
      loadData();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao registrar transação'); }
    finally { setSaving(false); }
  };

  const openReport = async (id: string) => {
    try {
      const data = await fetchApi(`/cash-register/${id}/summary`);
      setReport(data);
      reportModal.openModal();
    } catch { toast.error('Erro ao carregar relatório'); }
  };

  const totalEntradas = current?.cashTransactions
    .filter(t => t.tipo === 'SUPRIMENTO')
    .reduce((acc, t) => acc + Number(t.valor), 0) || 0;

  const totalSaidas = current?.cashTransactions
    .filter(t => t.tipo === 'SANGRIA')
    .reduce((acc, t) => acc + Number(t.valor), 0) || 0;

  const saldoEsperado = current
    ? Number(current.valorTrocoInicial) + Number(current.totalVendas) + totalEntradas - totalSaidas
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Caixa</h1>
          <p className="text-gray-500 mt-1">Gerencie abertura, fechamento e movimentações do caixa</p>
        </div>
        <div className="flex gap-2">
          {current ? (
            <>
              <button onClick={() => { setTransTipo('SUPRIMENTO'); setTransValor(''); setTransDescricao(''); transModal.openModal(); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">+ Suprimento</button>
              <button onClick={() => { setTransTipo('SANGRIA'); setTransValor(''); setTransDescricao(''); transModal.openModal(); }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">- Sangria</button>
              <button onClick={() => { setValorFechamento(String(saldoEsperado)); setCloseResult(null); closeModal.openModal(); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Fechar Caixa</button>
            </>
          ) : (
            <button onClick={() => openModal.openModal()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm">Abrir Caixa</button>
          )}
        </div>
      </div>

      {closeResult && (
        <div className={`rounded-xl p-4 border ${closeResult.diferenca === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="font-semibold text-gray-900">Caixa Fechado</p>
          <p className="text-sm text-gray-600">Saldo esperado: <strong>{formatBRL(closeResult.saldoEsperado)}</strong></p>
          <p className="text-sm text-gray-600">Diferença: <strong className={closeResult.diferenca === 0 ? 'text-green-600' : 'text-amber-600'}>{formatBRL(closeResult.diferenca)}</strong></p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : current ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                <h2 className="text-lg font-semibold text-gray-900">Caixa Aberto</h2>
              </div>
              <span className="text-sm text-gray-500">Aberto em {format(new Date(current.dataAbertura), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Responsável: <span className="font-medium text-gray-700">{current.user.nome}</span></p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Troco Inicial</p>
                <p className="text-lg font-bold text-gray-900">{formatBRL(current.valorTrocoInicial)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Vendas (qtd)</p>
                <p className="text-lg font-bold text-gray-900">{current._count.sales}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total em Vendas</p>
                <p className="text-lg font-bold text-gray-900">{formatBRL(current.totalVendas)}</p>
              </div>
              <div className="bg-brand-50 p-3 rounded-lg border border-brand-200">
                <p className="text-xs text-brand-600 mb-1">Saldo Esperado</p>
                <p className="text-lg font-bold text-brand-700">{formatBRL(saldoEsperado)}</p>
              </div>
            </div>
            {current.cashTransactions.length > 0 && (
              <CashTransactionList transactions={current.cashTransactions} showTime />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Caixas</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum caixa fechado ainda</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-gray-500 font-medium">Abertura</th>
                      <th className="text-left py-3 text-gray-500 font-medium">Fechamento</th>
                      <th className="text-left py-3 text-gray-500 font-medium">Resp.</th>
                      <th className="text-right py-3 text-gray-500 font-medium">Troco</th>
                      <th className="text-right py-3 text-gray-500 font-medium">Esperado</th>
                      <th className="text-right py-3 text-gray-500 font-medium">Declarado</th>
                      <th className="text-right py-3 text-gray-500 font-medium">Diferença</th>
                      <th className="text-right py-3 text-gray-500 font-medium">Vendas</th>
                      <th className="text-center py-3 text-gray-500 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(r => {
                      const fechamento = r.valorTotalFechamento ? Number(r.valorTotalFechamento) : null;
                      const esperado = r.saldoEsperado ? Number(r.saldoEsperado) : null;
                      const diferenca = r.diferenca ? Number(r.diferenca) : (fechamento !== null ? fechamento - Number(r.valorTrocoInicial) : null);
                      return (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3">{format(new Date(r.dataAbertura), 'dd/MM HH:mm')}</td>
                          <td className="py-3">{r.dataFechamento ? format(new Date(r.dataFechamento), 'dd/MM HH:mm') : '-'}</td>
                          <td className="py-3">{r.user.nome}</td>
                          <td className="py-3 text-right">{formatBRL(r.valorTrocoInicial)}</td>
                          <td className="py-3 text-right">{esperado !== null ? formatBRL(esperado) : '-'}</td>
                          <td className="py-3 text-right">{fechamento !== null ? formatBRL(fechamento) : '-'}</td>
                          <td className={`py-3 text-right font-medium ${diferenca !== null && diferenca !== 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {diferenca !== null ? formatBRL(diferenca) : '-'}
                          </td>
                          <td className="py-3 text-right">{r._count.sales}</td>
                          <td className="py-3 text-right">
                            <button onClick={() => openReport(r.id)} className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">Relatório</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-2">Nenhum caixa aberto</p>
          <p className="text-gray-400 text-sm">Abra um caixa para começar a registrar vendas</p>
        </div>
      )}

      {openModal.open && (
        <Modal open={openModal.open} onClose={openModal.closeModal} size="sm" title="Abrir Caixa" rounded="xl" className="mx-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Troco Inicial</label>
            <input type="number" step="0.01" value={trocoInicial} onChange={e => setTrocoInicial(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={openModal.closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleOpen} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Abrindo...' : 'Abrir Caixa'}
              </button>
            </div>
        </Modal>
      )}

      {closeModal.open && (
        <Modal open={closeModal.open} onClose={closeModal.closeModal} size="sm" title="Fechar Caixa" rounded="xl" className="mx-4">
          <p className="text-sm text-gray-500 mb-4">Saldo esperado: <strong className="text-brand-700">{formatBRL(saldoEsperado)}</strong></p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total no Caixa</label>
            <input
              type="number" step="0.01" value={valorFechamento}
              onChange={e => setValorFechamento(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            />
            <p className={`text-sm mb-4 ${Number(valorFechamento) !== saldoEsperado ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}`}>
              Diferença: {formatBRL(Number(valorFechamento) - saldoEsperado)}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal.closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleClose} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Fechando...' : 'Fechar Caixa'}
              </button>
            </div>
        </Modal>
      )}

      {reportModal.open && report && (
        <Modal open={reportModal.open} onClose={reportModal.closeModal} size="lg">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Relatório de Fechamento</h2>
              <button onClick={reportModal.closeModal} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Período</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(report.cashRegister.dataAbertura), 'dd/MM/yyyy HH:mm')} — {report.cashRegister.dataFechamento ? format(new Date(report.cashRegister.dataFechamento), 'dd/MM/yyyy HH:mm') : 'Aberto'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Responsável: {report.cashRegister.user.nome}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Troco Inicial</p>
                  <p className="text-lg font-bold text-gray-900">{formatBRL(report.totais.trocoInicial)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Total em Vendas</p>
                  <p className="text-lg font-bold text-gray-900">{formatBRL(report.totais.totalVendas)}</p>
                  <p className="text-xs text-gray-400">{report.totais.quantidadeVendas} venda(s)</p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                  <p className="text-xs text-brand-600 mb-1">Saldo Esperado</p>
                  <p className="text-lg font-bold text-brand-700">{formatBRL(report.totais.saldoEsperado)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Valor Declarado</p>
                  <p className="text-lg font-bold text-gray-900">{formatBRL(report.totais.valorDeclarado)}</p>
                </div>
              </div>

              <div className={`rounded-xl p-4 border ${report.totais.diferenca === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Diferença</p>
                <p className={`text-2xl font-bold ${report.totais.diferenca === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatBRL(report.totais.diferenca)}
                </p>
                {report.totais.diferenca !== 0 && (
                  <p className="text-xs text-amber-700 mt-1">Valor declarado difere do esperado. Verifique o caixa.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Vendas por Forma de Pagamento</h3>
                <div className="space-y-2">
                  {Object.entries(report.totais.porFormaPagamento).map(([method, value]) => (
                    <div key={method} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{method}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatBRL(value)}</span>
                    </div>
                  ))}
                  {Object.keys(report.totais.porFormaPagamento).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">Nenhuma venda no período</p>
                  )}
                </div>
              </div>

              {report.cashRegister.cashTransactions?.length > 0 && (
                <CashTransactionList transactions={report.cashRegister.cashTransactions} />
              )}
            </div>

            <div className="mt-6 text-center">
              <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium">
                Imprimir Relatório
              </button>
            </div>
        </Modal>
      )}

      {transModal.open && (
        <Modal open={transModal.open} onClose={transModal.closeModal} size="sm" title={transTipo === 'SANGRIA' ? 'Registrar Sangria' : 'Registrar Suprimento'} rounded="xl" className="mx-4">
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={transTipo} onChange={e => setTransTipo(e.target.value as 'SANGRIA' | 'SUPRIMENTO')} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="SANGRIA">Sangria (retirada)</option>
                <option value="SUPRIMENTO">Suprimento (entrada)</option>
              </select>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
            <input type="number" step="0.01" value={transValor} onChange={e => setTransValor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <input type="text" value={transDescricao} onChange={e => setTransDescricao(e.target.value)} placeholder="Ex: Pagamento de fornecedor" className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={transModal.closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleTransaction} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
