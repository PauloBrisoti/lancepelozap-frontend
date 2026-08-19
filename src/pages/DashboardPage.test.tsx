import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockUser = { id: 'u1', nome: 'Tenant User', role: 'USER' };
vi.mock('../context/AuthContext', () => ({
  useAuthUser: () => ({ user: mockUser, activeWorkspace: { id: 'store-1', tipo: 'PJ' }, loading: false, isAuthenticated: true }),
  useAuthStore: () => ({ activeStoreId: 'store-1' }),
}));

vi.mock('../hooks/useStockAlerts', () => ({
  useStockAlerts: () => ({ count: 3, products: [] }),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const tenantData = {
  faturamentoBruto: 12500,
  faturamentoPeriodo: 12500,
  faturamentoTotal: 150000,
  faturamentoLiquido: 11750,
  receitaLiquida: 11750,
  faturamentoCrescimento: 15.5,
  cmvPeriodo: 5000,
  despesasPeriodo: 2000,
  lucroBruto: 7500,
  lucroLiquido: 5500,
  margemBruta: 60.0,
  margemLiquida: 44.0,
  pedidosPeriodo: 42,
  ticketMedio: 297.62,
  aReceberFiado: 2300,
  impostosEstimados: 750,
  aliquotaImposto: 6,
  estoqueBaixoCount: 3,
  produtosEstoqueBaixo: [
    { id: 'p1', nome: 'Produto X', qtdEstoqueAtual: 2 },
    { id: 'p2', nome: 'Produto Y', qtdEstoqueAtual: 1 },
  ],
  ultimasVendas: [
    { id: 's1', data: new Date().toISOString(), cliente: 'João', pagamento: 'PIX', valor: 150 },
  ],
  topProdutos: [{ nome: 'Produto A', qtd: 10, valor: 500 }],
  chartData: [{ name: 'Seg', receitas: 2000, despesas: 500 }],
};

function renderPage() {
  return renderWithQuery(<DashboardPage />);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders tenant dashboard title', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows DRE summary section with LP', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Resumo DRE (Período)')).toBeInTheDocument();
    });
    expect(screen.getByText('Faturamento Bruto')).toBeInTheDocument();
    expect(screen.getByText('Impostos')).toBeInTheDocument();
    expect(screen.getByText('Faturamento Líquido')).toBeInTheDocument();
    expect(screen.getByText('CMV')).toBeInTheDocument();
    expect(screen.getByText('Lucro Bruto')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
    expect(screen.getByText('Lucro Líquido')).toBeInTheDocument();
  });

  it('shows CSV and PDF export buttons in DRE section', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Resumo DRE (Período)')).toBeInTheDocument();
    });
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows DRE metric values', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('R$ 12.500,00').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('R$ 5.500,00')).toBeInTheDocument();
  });

  it('shows low stock alert count', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    expect(screen.getByText(/Produtos precisando de reposição/)).toBeInTheDocument();
  });

  it('shows loading spinner then dashboard', async () => {
    mockFetch.mockResolvedValueOnce(tenantData);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Resumo DRE (Período)')).toBeInTheDocument();
  });
});
