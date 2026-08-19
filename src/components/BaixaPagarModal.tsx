import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { formatBRL } from '../utils/format';
import { useWallets } from '../lib/query';
import { useAuthStore } from '../context/AuthContext';
import type { Payable } from '../hooks/useFinanceiroDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  payable: Payable | null;
  onSubmit: (walletId: string) => void;
}

/** Modal de pagamento de conta a pagar (escolhe a carteira de saída) */
export function BaixaPagarModal({ open, onClose, payable, onSubmit }: Props) {
  const { activeStoreId } = useAuthStore();
  const walletsQ = useWallets(activeStoreId, open);
  const wallets = walletsQ.data?.wallets ?? [];

  // Estado próprio do modal: a carteira de saída vive aqui
  const [walletId, setWalletId] = useState('');

  // Reset e pré-seleção da primeira carteira a cada abertura
  useEffect(() => {
    if (!open) return;
    setWalletId(wallets[0]?.id ?? '');
  }, [open, payable, wallets]);

  if (!open || !payable) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(walletId);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Confirmar Pagamento">
      <p className="text-gray-600 mb-4">
        Deseja registrar o pagamento de <strong>{payable.descricao}</strong> no valor de {formatBRL(Number(payable.valor))}?
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sair o dinheiro de qual Carteira?</label>
          <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={walletId} onChange={e => setWalletId(e.target.value)}>
            <option value="">Selecione...</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
          </select>
        </div>
        <div className="pt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md">Confirmar Pagamento</button>
        </div>
      </form>
    </Modal>
  );
}