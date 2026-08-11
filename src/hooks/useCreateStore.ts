import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';

/**
 * Mutação de criação de loja (PJ).
 * Encapsula o POST /stores/my com estados de loading e feedback via toast.
 * Retorna true quando a loja foi criada com sucesso.
 */
export function useCreateStore() {
  const [creating, setCreating] = useState(false);

  const createStore = useCallback(async (nomeFantasia: string) => {
    if (!nomeFantasia.trim()) {
      toast.error('Nome da loja é obrigatório');
      return false;
    }
    setCreating(true);
    try {
      await fetchApi('/stores/my', {
        method: 'POST',
        body: JSON.stringify({ nomeFantasia: nomeFantasia.trim() }),
      });
      toast.success('Loja criada! Recarregando...');
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar loja');
      return false;
    } finally {
      setCreating(false);
    }
  }, []);

  return { creating, createStore };
}
