import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConciliacaoBancariaPage } from './ConciliacaoBancariaPage';

const mockNavigate = vi.fn();
const mockFetch = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../lib/api', () => {
  class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }
  return {
    ApiError,
    fetchApi: (...args: unknown[]) => mockFetch(...args),
  };
});

vi.mock('../lib/query', () => ({
  STALE_TIMES: { STATIC: 300000, NORMAL: 120000, FREQUENT: 30000, REALTIME: 10000 },
  useApiQuery: () => ({
    data: [{ id: 'w1', nome: 'Conta Bancária', tipo: 'BANCO' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  queryKeys: {
    financeWallets: (storeId: string | null) => ['finance-wallets', storeId],
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuthStore: () => ({ activeStoreId: 'store-1' }),
}));

const importFixture = {
  id: 'imp1',
  walletId: 'w1',
  filename: 'extrato-novembro.csv',
  importedAt: '2026-11-05T12:00:00Z',
  banco: 'Banco Teste',
  totalItems: 2,
  reconciledItems: 1,
  pendingItems: 1,
  wallet: { id: 'w1', nome: 'Conta Bancária', tipo: 'BANCO' },
};

const itemsFixture = [
  {
    id: 'item1',
    data: '2026-11-05',
    descricao: 'PIX recebido do cliente',
    valor: 100,
    tipo: 'CREDITO',
    conciliado: false,
    financialTransactionId: null,
    financialTransaction: null,
  },
  {
    id: 'item2',
    data: '2026-11-04',
    descricao: 'Tarifa bancária',
    valor: 45.9,
    tipo: 'DEBITO',
    conciliado: true,
    financialTransactionId: 'tx1',
    financialTransaction: {
      id: 'tx1',
      descricao: 'Tarifa bancária',
      valor: 45.9,
      tipo: 'SAIDA',
      dataTransacao: '2026-11-04T12:00:00Z',
      wallet: { nome: 'Conta Bancária' },
    },
  },
];

const candidatesFixture = [
  {
    id: 'tx2',
    tipo: 'ENTRADA',
    valor: 100,
    descricao: 'Recebimento PIX',
    dataTransacao: '2026-11-05T10:00:00Z',
    wallet: { nome: 'Conta Bancária' },
  },
  {
    id: 'tx3',
    tipo: 'ENTRADA',
    valor: 80,
    descricao: 'Outro recebimento',
    dataTransacao: '2026-11-06T10:00:00Z',
    wallet: { nome: 'Conta Bancária' },
  },
];

function renderPage() {
  return render(<ConciliacaoBancariaPage />);
}

describe('ConciliacaoBancariaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((endpoint: string, options: RequestInit = {}) => {
      if (endpoint === '/finance/bank-statements') return Promise.resolve([importFixture]);
      if (endpoint === '/finance/bank-statements/imp1/items') {
        return Promise.resolve({ import: importFixture, items: itemsFixture });
      }
      if (endpoint.startsWith('/finance/transactions')) return Promise.resolve(candidatesFixture);
      if (endpoint === '/finance/bank-statements/imp1/reconcile' && options.method === 'POST') {
        return Promise.resolve({ analyzed: 1, reconciled: 1, pending: 0 });
      }
      if (endpoint === '/finance/bank-statements/items/item1/link' && options.method === 'POST') {
        return Promise.resolve({ id: 'item1', conciliado: true });
      }
      if (endpoint === '/finance/bank-statements/imp1' && options.method === 'DELETE') {
        return Promise.resolve({ id: 'imp1', deletedItems: 2 });
      }
      return Promise.reject(new Error(`endpoint não mockado: ${endpoint}`));
    });
  });

  it('renderiza importações e itens pendentes', async () => {
    renderPage();

    expect(await screen.findByText('Conciliação Bancária')).toBeInTheDocument();
    expect((await screen.findAllByText('extrato-novembro.csv')).length).toBeGreaterThan(0);
    expect(await screen.findByText('PIX recebido do cliente')).toBeInTheDocument();
    // filtro padrão "pendentes": o item conciliado não aparece
    expect(screen.queryByText('Tarifa bancária')).not.toBeInTheDocument();
    expect(screen.getByText('1 pendente(s)')).toBeInTheDocument();
  });

  it('abre o vínculo manual e vincula um lançamento sugerido', async () => {
    renderPage();

    const rowButtons = await screen.findAllByRole('button', { name: 'Vincular' });
    fireEvent.click(rowButtons[0]);

    expect(await screen.findByText('Vincular lançamento ao extrato')).toBeInTheDocument();
    expect(await screen.findByText('Recebimento PIX')).toBeInTheDocument();
    // sugerido por valor exato
    expect(await screen.findByText('VALOR EXATO')).toBeInTheDocument();

    const allLinkButtons = screen.getAllByRole('button', { name: 'Vincular' });
    // [0] = botão da linha do extrato; [1] = primeiro candidato do modal (valor exato)
    expect(allLinkButtons.length).toBe(3);
    fireEvent.click(allLinkButtons[1]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/finance/bank-statements/items/item1/link',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ financialTransactionId: 'tx2' }),
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Vincular lançamento ao extrato')).not.toBeInTheDocument();
    });
  });

  it('filtra itens conciliados pela aba de status', async () => {
    renderPage();

    await screen.findByText('PIX recebido do cliente');
    fireEvent.click(screen.getByRole('button', { name: /Conciliados \(1\)/ }));

    expect((await screen.findAllByText('Tarifa bancária')).length).toBeGreaterThan(0);
    expect(screen.queryByText('PIX recebido do cliente')).not.toBeInTheDocument();
  });

  it('executa a conciliação automática da importação selecionada', async () => {
    renderPage();

    expect((await screen.findAllByText('extrato-novembro.csv')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Conciliar automaticamente/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/finance/bank-statements/imp1/reconcile',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('volta ao financeiro pelo botão de navegação', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao financeiro' }));
    expect(mockNavigate).toHaveBeenCalledWith('/app/financeiro');
  });

  it('exclui a importação após confirmação', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    await screen.findByText('PIX recebido do cliente');
    fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/finance/bank-statements/imp1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('não exclui a importação se a confirmação for cancelada', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    await screen.findByText('PIX recebido do cliente');
    fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some(
        ([endpoint, options]) => endpoint === '/finance/bank-statements/imp1' && options?.method === 'DELETE',
      ),
    ).toBe(false);
    confirmSpy.mockRestore();
  });
});
