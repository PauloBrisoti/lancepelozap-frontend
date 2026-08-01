import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

interface SellerSummary {
  userId: string;
  nome: string;
  totalPendente: number;
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
  const [totalPendente, setTotalPendente] = useState(0);
  const [totalPagoMes, setTotalPagoMes] = useState(0);
  const [porVendedor, setPorVendedor] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  // Payment history
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const paymentLimit = 20;

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadPayments(); }, [paymentPage]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/commission-payments/summary');
      setTotalPendente(data.totalPendente || 0);
      setTotalPagoMes(data.totalPagoEsteMes || 0);
      setPorVendedor(data.porVendedor || []);
    } catch { toast.error('Erro ao carregar resumo'); }
    finally { setLoading(false); }
  };

  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      const data = await fetchApi(`/commission-payments?page=${paymentPage}&limit=${paymentLimit}`);
      setPayments(data.data || []);
      setPaymentTotal(data.total || 0);
    } catch { toast.error('Erro ao carregar histórico'); }
    finally { setPaymentsLoading(false); }
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
      loadSummary();
      loadPayments();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao pagar comissões'); }
    finally { setPaying(null); }
  };

  const totalPaymentPages = Math.ceil(paymentTotal / paymentLimit);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comissões</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Total Pendente</p>
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(totalPendente)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Pago Este Mês</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPagoMes)}</p>
            </div>
          </div>

          {/* Per Seller */}
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
                    <tr key={s.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.nome}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-amber-600">{formatCurrency(s.totalPendente)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handlePay(s.userId, s.nome)}
                          disabled={paying === s.userId}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium disabled:opacity-50"
                        >
                          {paying === s.userId ? 'Pagando...' : 'Pagar Comissões'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatCurrency(p.totalValor)}</td>
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
