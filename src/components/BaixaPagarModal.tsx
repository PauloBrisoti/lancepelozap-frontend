import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { formatBRL } from '../utils/format';
import type { Wallet, Payable } from '../hooks/useFinanceiroDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  payable: Payable | null;
  walletId: string;
  setWalletId: (walletId: string) => void;
  wallets: Wallet[];
  onSubmit: (e: FormEvent) => void;
}

/** Modal de pagamento de conta a pagar (escolhe a carteira de saída) */
export function BaixaPagarModal({
  open,
  onClose,
  payable,
  walletId,
  setWalletId,
  wallets,
  onSubmit,
}: Props) {
  if (!open || !payable) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Confirmar Pagamento">
      <p className="text-gray-600 mb-4">
        Deseja registrar o pagamento de <strong>{payable.descricao}</strong> no valor de {formatBRL(Number(payable.valor))}?
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
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
