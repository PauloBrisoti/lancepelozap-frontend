export interface Customer {
  id: string;
  nomeCompleto: string;
  telefoneWhatsapp?: string;
}

export interface Product {
  id: string;
  nome: string;
  precoCusto?: number;
  precoVenda?: number;
  precoVendaSugerido?: number;
  qtdEstoqueAtual?: number;
  estoqueMinimo?: number;
  categoryId?: string;
  category?: { nome: string; corHexadecimal?: string | null };
  brand?: { id: string; nome: string };
  status?: string;
}

export interface SaleItem {
  id: string;
  quantidade: number;
  precoUnitarioVendido: number;
  custoUnitarioHistorico?: number;
  comissaoVendedorValor?: number;
  commissionPaidAt?: string | null;
  product?: Product | null;
}

export interface Receivable {
  id: string;
  numeroParcela: number;
  totalParcelas: number;
  valorParcela: number;
  dataVencimento: string;
  status: string;
  statusExibicao?: string;
  valorJaPago?: number;
  saldoRestante?: number;
  formaPagamentoEsperada?: string;
  payments?: { valor: number }[];
  customer?: Customer;
  sale?: { id: string } | null;
}

export interface Sale {
  id: string;
  dataVenda: string;
  status: string;
  formaPagamento: string;
  valorTotalBruto: number;
  valorTotalLiquido: number;
  valorDesconto: number;
  valorSinal: number;
  valorTaxasGateway?: number;
  numeroParcelas: number;
  cmvTotal?: number;
  margemLiquida?: number;
  margemBruta?: number;
  margemLiquidaValor?: number;
  margemBrutaValor?: number;
  observacoes?: string;
  customerId?: string;
  customer?: Customer | null;
  user?: { nome: string } | null;
  saleItems?: SaleItem[];
  receivables?: Receivable[];
  cashRegisterId?: string | null;
}

export interface FinancialTransaction {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  categoria?: string;
  dataTransacao: string;
  status?: string;
  wallet?: { nome: string };
  walletId?: string;
  customerId?: string;
  fornecedor?: string;
}

export interface FluxoFinanceiroMetrics {
  saldoAcumulado: number;
  entradasDoMes: number;
  saidasDoMes: number;
  saldoDisponivel: number;
}

export interface ResultadoOperacaoMetrics {
  faturamentoLiquido: number;
  cmvMes: number;
  despesasOperacionais: number;
  impostosEstimados: number;
  lucroOperacao: number;
  margemOperacional: number;
}

export interface DashboardMetrics {
  fluxoFinanceiro: FluxoFinanceiroMetrics;
  resultadoOperacao: ResultadoOperacaoMetrics;
  dinheiroImobilizado: number;
  faturamentoBruto: number;
  faturamentoCrescimento?: number;
  lucroCrescimento?: number;
  volumeVendasMes?: number;
  aReceberFiado?: number;
  paymentMethodsBreakdown?: { method: string; label: string; value: number }[];
}

export interface Category {
  id: string;
  nome: string;
  corHexadecimal: string | null;
  margemLucroPadrao: number | null;
  aliquotaImposto: number | null;
}

export interface AuditLogEntry {
  id: string;
  acao: string;
  tabelaAfetada: string;
  dadosAntigos: Record<string, unknown>;
  dadosNovos: Record<string, unknown>;
  createdAt: string;
  user: { nome: string; email: string };
  tenant: { nomeFantasia: string };
}

export interface TicketMessage {
  id: string;
  texto: string;
  role: string;
  createdAt: string;
  remetente?: string;
  mensagem?: string;
  user?: { nome: string };
}

export interface SupportTicket {
  id: string;
  assunto: string;
  descricao: string;
  prioridade: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  tenant?: { nomeFantasia: string };
  store?: { nomeFantasia: string };
}

export interface CampaignLog {
  id: string;
  sentAt: string;
  tipo: string;
  status: string;
  conteudo?: string;
  customer?: Customer;
}

export interface QuoteItem {
  productId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  product?: Product;
}

export interface Quote {
  id: string;
  cliente?: Customer | null;
  customerId?: string;
  customer?: Customer | null;
  quoteNumber?: number;
  user?: { nome: string };
  items: QuoteItem[];
  valorTotal: number;
  valorTotalLiquido?: number;
  validade?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  observacoes?: string;
}

export interface ServiceOrderItem {
  catalogItemId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
}

export interface ServiceOrder {
  id: string;
  tutor?: { id: string; nome: string; telefone: string } | null;
  pet?: { id: string; nome: string; especie: string; raca?: string } | null;
  items: ServiceOrderItem[];
  valorTotal: number;
  status: string;
  observacoes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  product: Product;
  quantidade: number;
  quantidadeRecebida?: number;
  precoUnitario: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: number;
  supplier?: { id: string; nome: string } | null;
  customer?: Customer | null;
  items: PurchaseItem[];
  valorVenda?: number;
  valorTotalLiquido: number;
  valorDesconto: number;
  valorFrete?: number;
  formaPagamento: string;
  dataPedido: string;
  dataPrevisao?: string | null;
  status: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  planos: { nome: string };
  planId?: string;
  status: string;
  dataVencimento: string;
  statusPagamento: string;
}

export interface SuperAdminDashboard {
  totalLojas: number;
  lojasAtivas: number;
  totalClientes: number;
  totalUsuarios: number;
  mrr: number;
  arpu: number;
  ltv: number;
  churnRate: number;
  inadimplentes: number;
  novosClientesMes: number;
  momGrowth: number;
  receitaPendente: number;
  receitaChart: { mes: string; receita: number }[];
}
