import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './useNotifications';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

const base = (overrides: Partial<any> = {}) => ({
  id: 'n1',
  title: 'Título',
  message: 'Mensagem',
  type: 'info',
  createdAt: '2026-08-08T10:00:00',
  read: false,
  ...overrides,
});

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useNotifications', () => {
  it('carrega as notificações ao montar', async () => {
    mockFetch.mockResolvedValueOnce([base({ id: 'n1' }), base({ id: 'n2', read: true })]);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    expect(mockFetch).toHaveBeenCalledWith('/notifications');
    expect(result.current.unread).toBe(1);
  });

  it('ignora resposta que não é array', async () => {
    mockFetch.mockResolvedValueOnce({ foo: 'bar' });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(result.current.notifications).toEqual([]);
  });

  it('marca uma notificação como lida de forma otimista', async () => {
    mockFetch
      .mockResolvedValueOnce([base({ id: 'n1' }), base({ id: 'n2', read: true })])
      .mockResolvedValueOnce(null);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unread).toBe(1));

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(mockFetch).toHaveBeenCalledWith('/notifications/n1/read', { method: 'PUT' });
    expect(result.current.unread).toBe(0);
    expect(result.current.notifications[0].read).toBe(true);
  });

  it('marca todas como lidas', async () => {
    mockFetch
      .mockResolvedValueOnce([base({ id: 'n1' }), base({ id: 'n2' })])
      .mockResolvedValueOnce(null);
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unread).toBe(2));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockFetch).toHaveBeenCalledWith('/notifications/read-all', { method: 'PUT' });
    expect(result.current.unread).toBe(0);
  });
});
