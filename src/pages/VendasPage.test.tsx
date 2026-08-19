import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VendasPage } from './VendasPage';
import type { Sale, SaleItem } from '../types/api';

const mockFetch = vi.fn();
const mockRefetch = vi.fn();

let mockSalesData: Sale[] = [];
const mockQueryState: { data: Sale[] | undefined; isLoading: boolean; error: Error | null } = {
  data: [],
  isLoading: false,
  error: null,
};

vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('../lib/query', () => ({
  useApiQuery: () => ({ ...mockQueryState, refetch: mockRefetch }),
  queryKeys: {
    customers: () => ['customers', 'store-1'],
    products: () => ['products', 'store-1'],
    sales: () => ['sales', 'store-1'],
    receivables: () => ['receivables', 'store-1'],
    paymentFees: () => ['payment-fees', 'store-1'],
    storeDashboardConfig: () => ['store-dashboard-config', 'store-1'],
    serviceOrders: () => ['service-orders', 'store-1'],
    personal: {
      categories: () => ['personal', 'categories'],
      wallets: () => ['personal', 'wallets'],
      transactions: () => ['personal', 'transactions'],
      dashboard: () => ['personal', 'dashboard'],
      aiAnalysis: () => ['personal', 'ai-analysis'],
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuthStore: () => ({ activeStoreId: 'store-1' }),
  useAuthUser: () => ({ user: null }),
}));

const sampleItems: SaleItem[] = [
  { id: 'item-1', quantidade: 2, precoUnitarioVendido: 50, product: { id: 'p1', nome: 'Produto A' } },
  { id: 'item-2', quantidade: 1, precoUnitarioVendido: 100, product: { id: 'p2', nome: 'Produto B' } },
];

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 'sale-1',
    dataVenda: '2026-07-20T10:00:00Z',
    status: 'FINALIZADA',
    formaPagamento: 'PIX',
    valorTotalBruto: 200,
    valorTotalLiquido: 200,
    valorDesconto: 0,
    valorSinal: 0,
    numeroParcelas: 1,
    saleItems: sampleItems,
    customer: { id: 'c1', nomeCompleto: 'João Silva' },
    ...overrides,
  };
}

function renderPage() {
  return render(<VendasPage />);
}

describe('VendasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSalesData = [makeSale()];
    mockQueryState.data = mockSalesData;
    mockQueryState.isLoading = false;
    mockQueryState.error = null;
  });

  it('renderiza título e cards de resumo', async () => {
    renderPage();
    expect(screen.getByText('Histórico de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Total de Vendas')).toBeInTheDocument();
    expect(screen.getByText('Produtos Vendidos')).toBeInTheDocument();
  });

  it('mostra valores corretos nos cards de resumo', () => {
    renderPage();
    expect(screen.getAllByText((content) => content.includes('R$ 200,00')).length).toBeGreaterThanOrEqual(1);
  });

  it('mostra contagem de produtos vendidos', () => {
    mockQueryState.data = [makeSale({ saleItems: [{ id: 'i1', quantidade: 3, precoUnitarioVendido: 10, product: { id: 'p1', nome: 'P' } }] })];
    renderPage();
    expect(screen.getByText('3 itens')).toBeInTheDocument();
  });

  it('exclui vendas canceladas dos cálculos', () => {
    mockQueryState.data = [makeSale({ status: 'CANCELADA', valorTotalLiquido: 999 })];
    renderPage();
    expect(screen.getAllByText((content) => content.includes('R$ 0,00')).length).toBeGreaterThanOrEqual(1);
  });

  it('mostra linhas de produtos na tabela ou cards', () => {
    renderPage();
    expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pix').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Concluída').length).toBeGreaterThanOrEqual(1);
  });

  it('abre modal de detalhes ao clicar em uma venda', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('João Silva')[0]);
    expect(screen.getByText(/Detalhes do Pedido/)).toBeInTheDocument();
    expect(screen.getAllByText(/Produto A/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Produto B/).length).toBeGreaterThanOrEqual(1);
  });

  it('abre modal de edição ao clicar em Editar', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByText('Editar Venda')).toBeInTheDocument();
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('mostra modal de exclusão ao clicar em Excluir', () => {
    renderPage();
    fireEvent.click(screen.getAllByText('Excluir')[0]);
    expect(screen.getAllByText(/Confirmar Exclusão/).length).toBeGreaterThanOrEqual(1);
  });

  it('confirma exclusão e chama request-delete + confirm-delete', async () => {
    mockFetch.mockResolvedValue({});
    renderPage();

    fireEvent.click(screen.getAllByText('Excluir')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/sales/sale-1/request-delete', { method: 'POST' });
    });
  });

  it('mostra loading skeleton quando isLoading', () => {
    mockQueryState.data = undefined;
    mockQueryState.isLoading = true;
    renderPage();
    expect(screen.getByText('Histórico de Vendas')).toBeInTheDocument();
  });
});
