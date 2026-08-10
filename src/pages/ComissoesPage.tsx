import { useState, Fragment } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

interface SellerSummary {
  userId: string;
  nome: string;
  totalPendente: number;
}

interface PendingSale {
  saleId: string;
  dataVenda: string;
  valorTotal: number;
  formaPagamento: string;
  totalComissao: number;
  itens: { id: string; produto: string; quantidade: number; comissao: number }[];
}

interface Payment {
  id: string;
  user: { id: string; nome: string };
  totalValor: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  pagoEm: string;
  observacao: string | null;
}

export function ComissoesPage() {
  const { isRestrictedRole } = useAuth();
  // VENDEDOR/CAIXA vê apenas as próprias comissões (sem pagar, sem ver outros vendedores)

  const [paying, setPaying] = useState<string | null>(null);
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
  const [pendingDetail, setPendingDetail] = useState<PendingSale[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment history
  const [paymentPage, setPaymentPage] = useState(1);
  const paymentLimit = 20;

  const { data: summary, isLoading, refetch: refetchSummary } = useApiQuery<any>(
    ['commission', 'summary'],
    '/commission-payments/summary',
    { staleTime: STALE_TIMES.FREQUENT }
  );
  const { data: paymentsRes, isLoading: paymentsLoading, refetch: refetchPayments } = useApiQuery<{ data: Payment[]; total: number }>(
    ['commission', 'payments', paymentPage],
    `/commission-payments?page=${paymentPage}&limit=${paymentLimit}`,
    { staleTime: STALE_TIMES.NORMAL }
  );

  const totalPendente = summary?.totalPendente ?? 0;
  const totalPagoMes = summary?.totalPagoEsteMes ?? 0;
  const porVendedor: SellerSummary[] = summary?.porVendedor ?? [];
  const payments: Payment[] = paymentsRes?.data ?? [];
  const paymentTotal = paymentsRes?.total ?? 0;

  const toggleDetail = async (sellerId: string) => {
    if (expandedSeller === sellerId) {
      setExpandedSeller(null);
      setPendingDetail(null);
      return;
    }
    setExpandedSeller(sellerId);
    setPendingDetail(null);
    setDetailLoading(true);
    try {
      const data = await fetchApi<{ vendas: PendingSale[] }>(`/commission-payments/pending?sellerId=${sellerId}`);
      setPendingDetail(data.vendas || []);
    } catch { toast.error('Erro ao carregar detalhe'); }
    finally { setDetailLoading(false); }
  };

  const handlePay = async (sellerId: string, nome: string) => {
    if (!window.confirm(`Pagar todas as comissões pendentes de ${nome}?`)) return;
    try {
      setPaying(sellerId);
      await fetchApi('/commission-payments', {
        method: 'POST',
        body: JSON.stringify({ sellerId }),
      });
      toast.success(`Comissões de ${nome} pagas!`);
      refetchSummary();
      refetchPayments();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao pagar comissões'); }
    finally { setPaying(null); }
  };

  const totalPaymentPages = Math.ceil(paymentTotal / paymentLimit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isRestrictedRole ? 'Minhas Comissões' : 'Comissões'}
      </h1>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Total Pendente</p>
              <p className="text-3xl font-bold text-amber-600">{formatBRL(totalPendente)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Pago Este Mês</p>
              <p className="text-3xl font-bold text-green-600">{formatBRL(totalPagoMes)}</p>
            </div>
          </div>

          {/* Per Seller (apenas gestores) */}
          {!isRestrictedRole && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Comissões por Vendedor</h2>
            </div>
            {porVendedor.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">Nenhuma comissão pendente</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Vendedor</th>
                    <th className="px-6 py-3">Valor Pendente</th>
                    <th className="px-6 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {porVendedor.map((s) => (
                    <Fragment key={s.userId}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleDetail(s.userId)}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <button onClick={(e) => { e.stopPropagation(); toggleDetail(s.userId); }} className="mr-2 text-gray-400 hover:text-brand-600 inline-flex items-center">
                            {expandedSeller === s.userId ? '▾' : '▸'}
                          </button>
                          {s.nome}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-amber-600">{formatBRL(s.totalPendente)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePay(s.userId, s.nome); }}
                            disabled={paying === s.userId}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium disabled:opacity-50"
                          >
                            {paying === s.userId ? 'Pagando...' : 'Pagar Comissões'}
                          </button>
                        </td>
                      </tr>
                      {expandedSeller === s.userId && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 bg-gray-50/70">
                            {detailLoading ? (
                              <p className="text-center text-gray-400 text-sm py-3">Carregando detalhe...</p>
                            ) : !pendingDetail || pendingDetail.length === 0 ? (
                              <p className="text-center text-gray-400 text-sm py-3">Nenhuma venda com comissão pendente</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-2">Data</th>
                                    <th className="px-4 py-2">Venda</th>
                                    <th className="px-4 py-2">Itens</th>
                                    <th className="px-4 py-2 text-right">Total Venda</th>
                                    <th className="px-4 py-2 text-right">Comissão</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {pendingDetail.map(v => (
                                    <tr key={v.saleId}>
                                      <td className="px-4 py-2 text-gray-600">{format(new Date(v.dataVenda), 'dd/MM/yy HH:mm')}</td>
                                      <td className="px-4 py-2 text-gray-900">{v.formaPagamento}</td>
                                      <td className="px-4 py-2 text-gray-600">
                                        <div className="flex flex-col gap-0.5">
                                          {v.itens.map(i => (
                                            <span key={i.id} className="text-xs">
                                              <span className="font-medium">{Number(i.quantidade)}x</span> {i.produto}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right text-gray-900">{formatBRL(v.valorTotal)}</td>
                                      <td className="px-4 py-2 text-right font-semibold text-amber-600">{formatBRL(v.totalComissao)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Histórico de Pagamentos</h2>
        </div>
        {paymentsLoading ? (
          <div className="px-6 py-8 text-center text-gray-400">Carregando...</div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">Nenhum pagamento registrado</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Vendedor</th>
                  <th className="px-6 py-3">Valor</th>
                  <th className="px-6 py-3">Período</th>
                  <th className="px-6 py-3">Pago Em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.user.nome}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatBRL(p.totalValor)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(p.dataInicio), 'dd/MM/yy')} - {format(new Date(p.dataFim), 'dd/MM/yy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(p.pagoEm), 'dd/MM/yy HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPaymentPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                <button disabled={paymentPage <= 1} onClick={() => setPaymentPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 disabled:opacity-50">Anterior</button>
                <span className="px-3 py-1.5 text-sm text-gray-500">Página {paymentPage} de {totalPaymentPages}</span>
                <button disabled={paymentPage >= totalPaymentPages} onClick={() => setPaymentPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 disabled:opacity-50">Próxima</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
