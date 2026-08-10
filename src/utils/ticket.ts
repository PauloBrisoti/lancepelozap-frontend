export const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em Atendimento',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ABERTO': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'EM_ATENDIMENTO': return 'bg-brand-100 text-brand-800 border border-brand-200';
    case 'RESOLVIDO': return 'bg-green-100 text-green-800 border border-green-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export function getPriorityColor(prioridade: string): string {
  switch (prioridade) {
    case 'P1': return 'text-red-600 font-bold';
    case 'P2': return 'text-orange-500 font-medium';
    default: return 'text-gray-500';
  }
}
