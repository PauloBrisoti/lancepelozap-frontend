import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchApi, ApiError } from '../api';

const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('fetchApi', () => {
  it('deve fazer GET e retornar JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    const result = await fetchApi('/test');
    expect(result).toEqual({ data: 'test' });
  });

  it('deve incluir x-store-id quando ativo', async () => {
    localStorage.setItem('@LancePeloZap:activeStoreId', 'store-123');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await fetchApi('/sales');
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers['x-store-id']).toBe('store-123');
  });

  it('deve lançar ApiError em 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Não autorizado' }),
    });

    try {
      await fetchApi('/auth/me');
      expect.fail('Deveria ter lançado erro');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).message).toBe('Não autorizado');
    }
  });

  it('deve retornar null em 204', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await fetchApi('/delete');
    expect(result).toBeNull();
  });

  it('deve usar Content-Type JSON por padrão', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await fetchApi('/post', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('não deve setar Content-Type para FormData', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const formData = new FormData();
    await fetchApi('/upload', { method: 'POST', body: formData });
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('deve ter status e message', () => {
    const err = new ApiError('Not found', 404, { path: '/test' });
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.data).toEqual({ path: '/test' });
    expect(err.name).toBe('ApiError');
  });
});
