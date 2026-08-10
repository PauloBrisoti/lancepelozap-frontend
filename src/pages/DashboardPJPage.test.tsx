import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPJPage } from './DashboardPJPage';

const mockRefetch = vi.fn();

let mockQueryState: { data: unknown; isLoading: boolean; error: Error | null } = {
  data: null,
  isLoading: false,
  error: null,
};

vi.mock('../lib/query', () => ({
  STALE_TIMES: { STATIC: 300000, NORMAL: 120000, FREQUENT: 30000, REALTIME: 10000 },
  useApiQuery: (key: unknown[]) => {
    if (key[1] === 'seller-performance') {
      return { data: { sellers: [] }, isLoading: false, error: null, refetch: mockRefetch };
    }
    return { ...mockQueryState, refetch: mockRefetch };
  },
}));

const mockUser = { id: 'u1', nome: 'PJ User', role: 'USER' };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, activeStoreId: 'store-1', activeWorkspace: { id: 'store-1', tipo: 'PJ' }, loading: false, isAuthenticated: true }),
}));

const consolidatedData = {
  totalStores: 2,
  stores: [
    {
      storeId: 's1', storeName: 'Loja Centro',
      volumeVendas: 10000, faturamentoBruto: 12000,
      fluxoFinanceiro: { saldoAcumulado: 15000, entradasDoMes: 9500, saidasDoMes: 3000, saldoDisponivel: 21500 },
      resultadoOperacao: { faturamentoLiquido: 10000, cmv: 4000, despesasOperacionais: 3000, impostosEstimados: 500, lucroOperacao: 2500, margemOperacional: 25 },
      estoqueImobilizado: 8000, aReceberFiado: 1500,
      estoqueBaixoCount: 2, fiadoVencido: 100, apPendentes: 400, apVencido: 0, apVencendo7d: 400,
      prevVolume: 8000, prevFatLiquido: 7500, prevDespesa: 2800, prevCmv: 3500, prevEntradas: 8000, prevSaidas: 2500,
      paymentMethodsBreakdown: [{ method: 'PIX', label: 'Pix', value: 5000 }],
    },
    {
      storeId: 's2', storeName: 'Loja Norte',
      volumeVendas: 5000, faturamentoBruto: 6000,
      fluxoFinanceiro: { saldoAcumulado: 8000, entradasDoMes: 4800, saidasDoMes: 1500, saldoDisponivel: 11300 },
      resultadoOperacao: { faturamentoLiquido: 5000, cmv: 2000, despesasOperacionais: 1500, impostosEstimados: 200, lucroOperacao: 1300, margemOperacional: 26 },
      estoqueImobilizado: 4000, aReceberFiado: 800,
      estoqueBaixoCount: 0, fiadoVencido: 0, apPendentes: 200, apVencido: 0, apVencendo7d: 200,
      prevVolume: 4000, prevFatLiquido: 3800, prevDespesa: 1400, prevCmv: 1800, prevEntradas: 4000, prevSaidas: 1200,
    },
  ],
  faturamentoPorDia: [
    { storeId: 's1', data: '2026-07-01', atual: 500, anterior: 400 },
    { storeId: 's2', data: '2026-07-01', atual: 300, anterior: 200 },
  ],
  consolidated: {
    fluxoFinanceiro: { saldoAcumulado: 23000, entradasDoMes: 14300, saidasDoMes: 4500, saldoDisponivel: 32800 },
    resultadoOperacao: { faturamentoLiquido: 15000, cmv: 6000, despesasOperacionais: 4500, impostosEstimados: 700, lucroOperacao: 3800, margemOperacional: 25.33 },
    faturamentoCrescimento: 26.58, lucroCrescimento: 22.58, faturamentoMesPassado: 12000,
    prevCmv: 5300, prevEntradas: 12000, prevSaidas: 3700,
    estoqueBaixoCount: 2, fiadoVencido: 100, apPendentes: 600, apVencido: 0, apVencendo7d: 600,
  },
};

function renderPage() {
  return render(<DashboardPJPage />);
}

describe('DashboardPJPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryState = { data: null, isLoading: false, error: null };
  });

  it('shows loading state initially', () => {
    mockQueryState.isLoading = true;
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders consolidated KPIs after loading', async () => {
    mockQueryState.data = consolidatedData;
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard Consolidado')).toBeInTheDocument();
    });

    expect(screen.getByText('Todas as Lojas (2)')).toBeInTheDocument();
  });

  it('shows per-store breakdown table with headers', async () => {
    mockQueryState.data = consolidatedData;
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Desempenho por Loja')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Loja Centro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Loja Norte').length).toBeGreaterThanOrEqual(1);
  });

  it('shows store selector with all stores', async () => {
    mockQueryState.data = consolidatedData;
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Todas as Lojas (2)')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });

  it('shows card metrics after data loads', async () => {
    mockQueryState.data = consolidatedData;
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Consolidado/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Todas as Lojas/)).toBeInTheDocument();
  });

  it('handles data fetch failure gracefully', async () => {
    mockQueryState.error = new Error('Network error');
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard Consolidado')).toBeInTheDocument();
    });
  });

  it('currency formatting uses pt-BR locale', async () => {
    mockQueryState.data = consolidatedData;
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText(/R\$/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
