import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVarreduraFinanceira } from './useVarreduraFinanceira';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('react-hot-toast', () => ({
  default: { success: (...a: any[]) => toast.success(...a), error: (...a: any[]) => toast.error(...a) },
}));

const plano = {
  data: '2026-08-10',
  itens: [
    {
      clientId: 'c1',
      cliente: 'João',
      email: 'joao@x.com',
      subscriptionId: 's1',
      valor: 100,
      diasAtraso: 5,
      dataVencimento: '2026-08-05',
      acoes: ['LEMBRETE_1'],
      bloqueioAutomaticoAtivo: true,
    },
  ],
  resumo: { marcarVencido: 0, lembretes1: 1, lembretes2: 0, avisosBloqueio: 0, total: 1 },
};

beforeEach(() => {
  mockFetch.mockReset();
  toast.success.mockClear();
  toast.error.mockClear();
});

describe('useVarreduraFinanceira', () => {
  it('carrega o plano e habilita a execução com senha', async () => {
    mockFetch.mockResolvedValueOnce(plano);
    const { result } = renderHook(() => useVarreduraFinanceira(vi.fn()));
    await act(async () => { await result.current.carregarPlano(); });

    expect(result.current.plano).toEqual(plano);
    expect(result.current.erro).toBe('');
    expect(result.current.podeExecutar).toBe(false);

    await act(async () => { result.current.setConfirmPassword('123456'); });
    expect(result.current.podeExecutar).toBe(true);
    expect(result.current.temAcoesBloqueio).toBe(false);
  });

  it('erro ao carregar plano popula a mensagem de erro', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Falha de rede'));
    const { result } = renderHook(() => useVarreduraFinanceira(vi.fn()));
    await act(async () => { await result.current.carregarPlano(); });

    expect(result.current.erro).toBe('Falha de rede');
    expect(result.current.plano).toBeNull();
  });

  it('executa a varredura e chama onExecuted', async () => {
    const onExecuted = vi.fn();
    mockFetch
      .mockResolvedValueOnce(plano)
      .mockResolvedValueOnce({ jaExecutadoHoje: false, resultado: { marcadasVencido: 0, notificacoesEnviadas: 1, notificacoesFalhas: 0, detalhes: [] } });
    const { result } = renderHook(() => useVarreduraFinanceira(onExecuted));
    await act(async () => { await result.current.carregarPlano(); });
    await act(async () => { result.current.setConfirmPassword('123456'); });

    await act(async () => { await result.current.executar(); });

    expect(mockFetch).toHaveBeenCalledWith(
      '/super-admin/scan/execute',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ confirmPassword: '123456' }) })
    );
    expect(result.current.resultado?.notificacoesEnviadas).toBe(1);
    expect(result.current.erro).toBe('');
    expect(onExecuted).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Varredura executada com sucesso!');
  });

  it('não executa sem plano', async () => {
    const onExecuted = vi.fn();
    const { result } = renderHook(() => useVarreduraFinanceira(onExecuted));
    await act(async () => { await result.current.executar(); });
    expect(mockFetch).not.toHaveBeenCalledWith('/super-admin/scan/execute', expect.anything());
    expect(onExecuted).not.toHaveBeenCalled();
  });
});
