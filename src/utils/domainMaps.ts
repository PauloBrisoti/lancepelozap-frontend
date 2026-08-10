/**
 * Mapas de domínio compartilhados entre páginas e componentes.
 * Centraliza labels/cores para evitar duplicação e divergência.
 */

// ============================================================
// FORMAS DE PAGAMENTO
// ============================================================

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  CREDIARIO: 'Crediário',
  BOLETO: 'Boleto',
  OUTRO: 'Outro',
};

/** Cores hex (gráficos) por forma de pagamento */
export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  PIX: '#059669',
  DINHEIRO: '#f59e0b',
  CREDIARIO: '#6366f1',
  CARTAO_CREDITO: '#8b5cf6',
  CARTAO_DEBITO: '#0ea5e9',
  BOLETO: '#ef4444',
  OUTRO: '#64748b',
};

/** Labels específicas do relatório financeiro (chaves próprias da API) */
export const REPORT_PAYMENT_LABELS: Record<string, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CREDIARIO: 'Crediário',
  CARTAO_DEBITO: 'Cartão de Débito',
  CARTAO_CREDITO_AVISTA: 'Crédito à Vista',
  CARTAO_CREDITO_PARCELADO: 'Crédito Parcelado',
  OUTROS: 'Outros',
};

// ============================================================
// STATUS DE VENDA
// ============================================================

export const SALE_STATUS_LABELS: Record<string, string> = {
  FINALIZADA: 'Concluída',
  PENDENTE: 'Pendente',
  CANCELADA: 'Cancelada',
};

// ============================================================
// STATUS DE PEDIDO DE COMPRA
// ============================================================

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  PENDENTE: 'Pendente',
  PARCIAL: 'Recebido Parcial',
  RECEBIDO: 'Recebido',
  CANCELADO: 'Cancelado',
};

export const PURCHASE_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  PENDENTE: 'bg-blue-100 text-blue-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  RECEBIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

// ============================================================
// STATUS DE AGENDAMENTO (AgendaPage)
// ============================================================

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  NAO_COMPARECEU: 'Não Compareceu',
};

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-700',
  CONFIRMADO: 'bg-green-100 text-green-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO: 'bg-gray-100 text-gray-700',
  CANCELADO: 'bg-red-100 text-red-700',
  NAO_COMPARECEU: 'bg-orange-100 text-orange-700',
};

// ============================================================
// STATUS DE ORDEM DE SERVIÇO
// ============================================================

export const SERVICE_ORDER_STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_PECAS: 'Aguardando Peças',
  CONCLUIDO: 'Concluído',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

export const SERVICE_ORDER_STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  AGUARDANDO_PECAS: 'bg-orange-100 text-orange-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  ENTREGUE: 'bg-gray-100 text-gray-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

// ============================================================
// STATUS DE ORÇAMENTO
// ============================================================

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  APROVADO: 'Aprovado',
  CONVERTIDO: 'Convertido',
  CANCELADO: 'Cancelado',
  VENCIDO: 'Vencido',
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  ENVIADO: 'bg-blue-100 text-blue-700',
  APROVADO: 'bg-green-100 text-green-700',
  CONVERTIDO: 'bg-purple-100 text-purple-700',
  CANCELADO: 'bg-red-100 text-red-700',
  VENCIDO: 'bg-amber-100 text-amber-700',
};
