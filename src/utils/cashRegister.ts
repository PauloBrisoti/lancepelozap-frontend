import type { CashTransaction } from '../types/api';

/** Rótulo exibido para o tipo de movimentação de caixa */
export function transactionLabel(t: CashTransaction): string {
  return t.tipo === 'SANGRIA' ? 'Sangria' : 'Suprimento';
}

/** Classes Tailwind do badge de tipo (vermelho = sangria, verde = suprimento) */
export function transactionBadgeClass(t: CashTransaction): string {
  return t.tipo === 'SANGRIA' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
}

/** Sinal exibido antes do valor */
export function transactionSign(t: CashTransaction): string {
  return t.tipo === 'SANGRIA' ? '-' : '+';
}

/** Cor do valor (vermelho = saída, verde = entrada) */
export function transactionValueClass(t: CashTransaction): string {
  return t.tipo === 'SANGRIA' ? 'text-red-600' : 'text-green-600';
}
