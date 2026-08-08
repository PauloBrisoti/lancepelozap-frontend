import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrudList } from './useCrudList';
import { fetchApi } from '../lib/api';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: Parameters<typeof fetchApi>) => mockFetch(...args),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

interface Item { id: string; nome: string }

function setup() {
  return renderHook(() =>
    useCrudList<Item, { nome: string }>({
      endpoint: '/items',
      loadList: () => Promise.resolve([{ id: '1', nome: 'Item 1' }]),
      createDefault: () => ({ nome: '' }),
      toForm: (item) => ({ nome: item.nome }),
      messages: {
        loadError: 'Erro ao carregar',
        createSuccess: 'Criado!',
        updateSuccess: 'Atualizado!',
        deleteSuccess: 'Removido!',
        deleteConfirm: 'Remover?',
      },
    })
  );
}

describe('useCrudList', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue([]);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('carrega a lista no mount', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: '1', nome: 'Item 1' }]);
  });

  it('openNew limpa o editing e reseta o form', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openEdit({ id: '1', nome: 'Item 1' }));
    act(() => result.current.openNew());
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editing).toBeNull();
    expect(result.current.form).toEqual({ nome: '' });
  });

  it('openEdit preenche o form com os dados do item', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openEdit({ id: '1', nome: 'Item 1' }));
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editing).toEqual({ id: '1', nome: 'Item 1' });
    expect(result.current.form).toEqual({ nome: 'Item 1' });
  });

  it('handleSave faz POST quando não há item em edição', async () => {
    mockFetch.mockResolvedValue({ id: '2' });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openNew());
    await act(async () => {
      result.current.setForm({ nome: 'Novo' });
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(mockFetch).toHaveBeenCalledWith('/items', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Novo' }),
    });
    expect(result.current.modalOpen).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('handleSave faz PUT quando há item em edição', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openEdit({ id: '1', nome: 'Item 1' }));
    await act(async () => {
      result.current.setForm({ nome: 'Item 1 editado' });
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(mockFetch).toHaveBeenCalledWith('/items/1', {
      method: 'PUT',
      body: JSON.stringify({ nome: 'Item 1 editado' }),
    });
  });

  it('handleDelete chama DELETE no endpoint com o id', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleDelete('1');
    });
    expect(mockFetch).toHaveBeenCalledWith('/items/1', { method: 'DELETE' });
  });

  it('handleDelete não chama a API quando confirm é negado', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleDelete('1');
    });
    expect(mockFetch).not.toHaveBeenCalledWith('/items/1', { method: 'DELETE' });
  });

  it('handleSave usa beforeSave para transformar o payload', async () => {
    mockFetch.mockResolvedValue({ id: '2' });
    const { result } = renderHook(() =>
      useCrudList<Item, { nome: string; preco: string }>({
        endpoint: '/items',
        loadList: () => Promise.resolve([]),
        createDefault: () => ({ nome: '', preco: '' }),
        toForm: (item) => ({ nome: item.nome, preco: '' }),
        beforeSave: (form) => ({ ...form, preco: Number(form.preco) }),
        messages: {
          loadError: 'Erro ao carregar',
          createSuccess: 'Criado!',
          updateSuccess: 'Atualizado!',
          deleteSuccess: 'Removido!',
        },
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openNew());
    await act(async () => {
      result.current.setForm({ nome: 'Novo', preco: '12.5' });
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(mockFetch).toHaveBeenCalledWith('/items', {
      method: 'POST',
      body: JSON.stringify({ nome: 'Novo', preco: 12.5 }),
    });
  });
});
