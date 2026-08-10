import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnnouncements } from './useAnnouncements';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' } }),
}));

const base = (overrides: Partial<any> = {}) => ({
  id: 'a1',
  title: 'Título',
  message: 'Mensagem',
  type: 'info' as const,
  active: true,
  ...overrides,
});

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe('useAnnouncements', () => {
  it('carrega apenas anúncios ativos', async () => {
    mockFetch.mockResolvedValueOnce([base({ id: 'a1' }), base({ id: 'a2', active: false })]);
    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.visible).toHaveLength(1));
    expect(result.current.visible[0].id).toBe('a1');
  });

  it('dismiss persiste em localStorage e esconde o anúncio', async () => {
    mockFetch.mockResolvedValueOnce([base({ id: 'a1' })]);
    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.visible).toHaveLength(1));

    await act(async () => {
      result.current.dismiss('a1');
    });

    expect(result.current.visible).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('@LancePeloZap:dismissedAnnouncements')!)).toEqual(['a1']);
  });

  it('anúncio dismissado não volta a aparecer após novo carregamento', async () => {
    localStorage.setItem('@LancePeloZap:dismissedAnnouncements', JSON.stringify(['a1']));
    mockFetch.mockResolvedValueOnce([base({ id: 'a1' }), base({ id: 'a2' })]);
    const { result } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.visible).toHaveLength(1));
    expect(result.current.visible[0].id).toBe('a2');
  });
});
