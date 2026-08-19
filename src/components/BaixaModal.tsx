import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { formatBRL } from '../utils/format';
import { saldoRestante, valorMaximoBaixa } from '../utils/financeiro';
import { useWallets } from '../lib/query';
import { useAuthStore } from '../context/AuthContext';
import type { Receivable } from '../hooks/useFinanceiroDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  rec: Receivable | null;
  onSubmit: (valorPago: string, walletId: string) => void;
}

/** Modal de baixa (registrar pagamento de uma parcela a receber) */
export function BaixaModal({ open, onClose, rec, onSubmit }: Props) {
  const { activeStoreId } = useAuthStore();
  const walletsQ = useWallets(activeStoreId, open);
  const wallets = walletsQ.data?.wallets ?? [];

  // Estado próprio do modal: valor e carteira vivem aqui
  const [valorPago, setValorPago] = useState('');
  const [walletId, setWalletId] = useState('');

  // Reset a cada abertura
  useEffect(() => {
    if (!open) return;
    setValorPago('');
    setWalletId('');
  }, [open, rec]);

  // Pré-seleciona a primeira carteira quando as carteiras carregam
  useEffect(() => {
    if (!open || !rec) return;
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id);
    }
  }, [open, rec, wallets, walletId]);

  if (!open || !rec) return null;

  const sr = saldoRestante(rec);
  const maxPagamento = valorMaximoBaixa(rec);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(valorPago, walletId);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Confirmar Pagamento">
      <p className="text-gray-600 mb-4">
        Cliente: <strong>{rec.customer?.nomeCompleto || 'Cliente'}</strong><br />
        Parcela: {rec.numeroParcela}/{rec.totalParcelas}<br />
        Valor Original: {formatBRL(Number(rec.valorParcela))}<br />
        Já Pago: {formatBRL(Number(rec.valorJaPago ?? 0))}<br />
        Saldo Restante: <strong>{formatBRL(Number(sr))}</strong>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
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