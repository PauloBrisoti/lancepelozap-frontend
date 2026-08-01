import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FiadoPage } from './FiadoPage';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('../lib/query', () => ({
  useApiQuery: () => ({ data: mockReceivables, isLoading: false, error: null, refetch: vi.fn() }),
  useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ activeStoreId: 'store-1', user: { id: 'u1', role: 'USER' }, loading: false, isAuthenticated: true }),
}));

const mockReceivables = [
  {
    id: 'r1',
    customer: { nomeCompleto: 'João Silva', telefoneWhatsapp: '11911111111' },
    sale: { id: 's1' },
    dataVencimento: new Date(Date.now() + 10 * 86400000).toISOString(),
    numeroParcela: 1,
    totalParcelas: 2,
    valorParcela: 25.00,
    status: 'PENDENTE',
    statusExibicao: 'PENDENTE',
    formaPagamentoEsperada: 'DINHEIRO',
  },
  {
    id: 'r2',
    customer: { nomeCompleto: 'Maria Souza', telefoneWhatsapp: '11922222222' },
    sale: { id: 's2' },
    dataVencimento: new Date(Date.now() - 5 * 86400000).toISOString(),
    numeroParcela: 1,
    totalParcelas: 1,
    valorParcela: 28.00,
    status: 'VENCIDO',
    statusExibicao: 'VENCIDO',
    formaPagamentoEsperada: 'DINHEIRO',
  },
  {
    id: 'r3',
    customer: { nomeCompleto: 'Pedro Alves' },
    sale: null,
    dataVencimento: new Date(Date.now() - 30 * 86400000).toISOString(),
    numeroParcela: 2,
    totalParcelas: 2,
    valorParcela: 25.00,
    status: 'PAGO',
    statusExibicao: 'PAGO',
    formaPagamentoEsperada: 'DINHEIRO',
    dataPagamentoEfetivo: new Date().toISOString(),
    valorJaPago: 25.00,
    saldoRestante: 0,
  },
];

function renderPage() {
  return render(<FiadoPage />);
}

describe('FiadoPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(mockReceivables);
  });

  it('renders title and KPIs', async () => {
    renderPage();
    expect(screen.getByText('Crediário / Fiado')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(/Total a Receber/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Vencido/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Em Dia/).length).toBeGreaterThanOrEqual(1);
    });
    await waitFor(() => {
      expect(screen.getAllByText('R$ 53,00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('R$ 28,00').length).toBeGreaterThanOrEqual(1);
    });
    const val25 = screen.getAllByText('R$ 25,00');
    expect(val25.length).toBeGreaterThanOrEqual(1);
  });

  it('renders filter buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('A Vencer')).toBeInTheDocument();
      expect(screen.getAllByText('Vencido').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Quitados')).toBeInTheDocument();
      expect(screen.getByText('Todos')).toBeInTheDocument();
    });
  });

  it('shows pending receivables by default', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows pay button for non-paid receivables', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Receber').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens pay modal on click', async () => {
    renderPage();
    await waitFor(() => {
      fireEvent.click(screen.getAllByText('Receber')[0]);
    });
    expect(screen.getByText('Registrar Pagamento')).toBeInTheDocument();
    const joaoElements = screen.getAllByText('João Silva');
    expect(joaoElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Confirmar Recebimento')).toBeInTheDocument();
  });

  it('filters by vencido status', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getByRole('button', { name: /Vencido/ }));
    await waitFor(() => {
      expect(screen.getAllByText('Maria Souza').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryAllByText('João Silva').length).toBe(0);
  });

  it('filters by pago status', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1));
    fireEvent.click(screen.getByText('Quitados'));
    await waitFor(() => {
      expect(screen.getAllByText('Pedro Alves').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryAllByText('João Silva').length).toBe(0);
  });

  it('shows all when filter is todos', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1));
    fireEvent.click(screen.getByText('Todos'));
    await waitFor(() => {
      expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Maria Souza').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Pedro Alves').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when no results', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('João Silva').length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getByRole('button', { name: /Parcial/ }));
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma parcela/)).toBeInTheDocument();
    });
  });
});
