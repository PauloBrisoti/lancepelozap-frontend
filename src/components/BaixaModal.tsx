import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { formatBRL } from '../utils/format';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { useAuth } from '../context/AuthContext';
import type { Wallet, Receivable } from '../hooks/useFinanceiroDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  rec: Receivable | null;
  valorPago: string;
  setValorPago: (valor: string) => void;
  walletId: string;
  setWalletId: (walletId: string) => void;
  onSubmit: (e: FormEvent) => void;
}

/** Modal de baixa (registrar pagamento de uma parcela a receber) */
export function BaixaModal({
  open,
  onClose,
  rec,
  valorPago,
  setValorPago,
  walletId,
  setWalletId,
  onSubmit,
}: Props) {
  const { activeStoreId } = useAuth();
  const walletsQ = useApiQuery<{ wallets: Wallet[] }>(
    ['finance-dashboard', activeStoreId],
    '/finance/dashboard',
    { staleTime: STALE_TIMES.FREQUENT, enabled: open }
  );
  const wallets = walletsQ.data?.wallets ?? [];

  if (!open || !rec) return null;

  const tp = rec.valorJaPago ?? 0;
  const sr = rec.saldoRestante ?? (Number(rec.valorParcela) - tp);
  const maxPagamento = Math.max(0, sr);

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Confirmar Pagamento">
      <p className="text-gray-600 mb-4">
        Cliente: <strong>{rec.customer?.nomeCompleto || 'Cliente'}</strong><br />
        Parcela: {rec.numeroParcela}/{rec.totalParcelas}<br />
        Valor Original: {formatBRL(Number(rec.valorParcela))}<br />
        Já Pago: {formatBRL(Number(tp))}<br />
        Saldo Restante: <strong>{formatBRL(Number(sr))}</strong>
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido (R$)</label>
          <input required type="number" step="0.01" min="0.01" placeholder="Digite o valor a pagar" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={valorPago} onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && Number(raw) > maxPagamento) {
              setValorPago(maxPagamento.toFixed(2));
            } else {
              setValorPago(raw);
            }
          }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entrar o dinheiro em qual Carteira?</label>
          <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={walletId} onChange={e => setWalletId(e.target.value)}>
            <option value="">Selecione...</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
          </select>
        </div>
        <div className="pt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md">Confirmar Baixa</button>
        </div>
      </form>
    </Modal>
  );
}
