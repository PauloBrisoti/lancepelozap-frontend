import { format } from 'date-fns';
import { formatBRL } from '../utils/format';
import { transactionLabel, transactionBadgeClass, transactionSign, transactionValueClass } from '../utils/cashRegister';
import type { CashTransaction } from '../types/api';

interface CashTransactionListProps {
  transactions: CashTransaction[];
  /** Exibe o horário ao lado do valor (usado no caixa aberto, não no relatório). */
  showTime?: boolean;
}

export function CashTransactionList({ transactions, showTime = false }: CashTransactionListProps) {
  if (transactions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Movimentações</h3>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${transactionBadgeClass(tx)}`}>
                {transactionLabel(tx)}
              </span>
              <span className="text-sm text-gray-600 ml-2">{tx.descricao}</span>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${transactionValueClass(tx)}`}>
                {transactionSign(tx)}{formatBRL(tx.valor)}
              </p>
              {showTime && <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), 'HH:mm')}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
