import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EstoquePage } from './EstoquePage';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ activeStoreId: 'store-1', user: { id: 'u1', role: 'USER' }, loading: false, isAuthenticated: true }),
}));

let mockAlertData = { count: 0, products: [] as Array<{ id: string; nome: string; qtdEstoqueAtual: number; estoqueMinimo: number }> };
vi.mock('../hooks/useStockAlerts', () => ({
  useStockAlerts: () => mockAlertData,
}));

const mockProducts: any[] = [
  { id: 'p1', nome: 'Produto A', qtdEstoqueAtual: 2, estoqueMinimo: 10, precoVenda: 50, categoria: { id: 'c1', nome: 'Geral' }, deletedAt: null },
  { id: 'p2', nome: 'Produto B', qtdEstoqueAtual: 20, estoqueMinimo: 5, precoVenda: 30, categoria: { id: 'c1', nome: 'Geral' }, deletedAt: null },
  { id: 'p3', nome: 'Produto C', qtdEstoqueAtual: 1, estoqueMinimo: 3, precoVenda: 15, categoria: { id: 'c2', nome: 'Cosméticos' }, deletedAt: null },
];

const mockCategories = [
  { id: 'c1', nome: 'Geral' },
  { id: 'c2', nome: 'Cosméticos' },
];
const mockBrands: any[] = [];

function renderPage() {
  return render(<EstoquePage />);
}

function setupMocks() {
  mockFetch
    .mockResolvedValueOnce(mockCategories)
    .mockResolvedValueOnce(mockBrands)
    .mockResolvedValueOnce(mockProducts);
}

describe('EstoquePage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockAlertData = { count: 0, products: [] };
  });

  it('renders title and tabs after loading', async () => {
    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Catálogo e Estoque')).toBeInTheDocument();
    });
    expect(screen.getByText('Pronta Entrega (Estoque)')).toBeInTheDocument();
    expect(screen.getByText('Movimentações')).toBeInTheDocument();
  });

  it('shows low stock alert banner when alerts exist', async () => {
    mockAlertData = {
      count: 2,
      products: [
        { id: 'p1', nome: 'Produto A', qtdEstoqueAtual: 2, estoqueMinimo: 10 },
        { id: 'p3', nome: 'Produto C', qtdEstoqueAtual: 1, estoqueMinimo: 3 },
      ],
    };

    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    expect(screen.getByText(/produtos? com estoque baixo/)).toBeInTheDocument();
  });

  it('shows product list after loading', async () => {
    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Produto A')).toBeInTheDocument();
    });
    expect(screen.getByText('Produto B')).toBeInTheDocument();
    expect(screen.getByText('Produto C')).toBeInTheDocument();
  });

  it('shows filter buttons', async () => {
    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Com Estoque')).toBeInTheDocument();
    });
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Sem Estoque')).toBeInTheDocument();
    expect(screen.getByText('Encomenda')).toBeInTheDocument();
  });

  it('shows "+X mais" when more than 5 alert products', async () => {
    mockAlertData = {
      count: 7,
      products: Array.from({ length: 7 }, (_, i) => ({
        id: `p${i}`, nome: `Produto ${i}`, qtdEstoqueAtual: i, estoqueMinimo: 10,
      })),
    };

    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('+2 mais')).toBeInTheDocument();
    });
  });

  it('hides alert banner when no alerts', async () => {
    mockAlertData = { count: 0, products: [] };

    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Produto A')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Produtos precisando de reposição/)).not.toBeInTheDocument();
  });
});
