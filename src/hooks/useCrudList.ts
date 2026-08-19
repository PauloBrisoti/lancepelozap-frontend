import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useApiQuery } from '../lib/query';

interface UseCrudListMessages {
  loadError: string;
  createSuccess: string;
  updateSuccess: string;
  deleteSuccess: string;
  deleteConfirm?: string;
  saveError?: string;
}

interface UseCrudListOptions<T extends { id: string }, F> {
  endpoint: string;
  /** Lista via react-query (cache compartilhado entre páginas). Alternativa ao loadList. */
  queryKey?: readonly unknown[];
  /** Fetch manual da lista (usado quando queryKey não é informado) */
  loadList?: () => Promise<T[]>;
  createDefault: () => F;
  toForm: (item: T) => F;
  beforeSave?: (form: F, editing: T | null) => unknown;
  messages: UseCrudListMessages;
}

interface UseCrudListResult<T extends { id: string }, F> {
  items: T[];
  loading: boolean;
  saving: boolean;
  modalOpen: boolean;
  editing: T | null;
  form: F;
  setForm: React.Dispatch<React.SetStateAction<F>>;
  load: () => Promise<void>;
  openNew: () => void;
  openEdit: (item: T) => void;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export function useCrudList<T extends { id: string }, F>(
  options: UseCrudListOptions<T, F>
): UseCrudListResult<T, F> {
  const { endpoint, messages } = options;
  const queryClient = useQueryClient();

  if (!options.queryKey && !options.loadList) {
    throw new Error('useCrudList: informe queryKey ou loadList');
  }

  const [items, setItems] = useState<T[]>([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<F>(() => options.createDefault());
  const [saving, setSaving] = useState(false);

  const usingQuery = !!options.queryKey;
  const listQuery = useApiQuery<T[]>(
    options.queryKey ?? ['crud-list', endpoint],
    endpoint,
    { enabled: usingQuery }
  );

  const loadListRef = useRef(options.loadList);
  const createDefaultRef = useRef(options.createDefault);
  const toFormRef = useRef(options.toForm);
  const beforeSaveRef = useRef(options.beforeSave);
  const messagesRef = useRef(messages);
  const endpointRef = useRef(endpoint);
  const queryKeyRef = useRef(options.queryKey);

  useEffect(() => {
    loadListRef.current = options.loadList;
    createDefaultRef.current = options.createDefault;
    toFormRef.current = options.toForm;
    beforeSaveRef.current = options.beforeSave;
    messagesRef.current = messages;
    endpointRef.current = endpoint;
    queryKeyRef.current = options.queryKey;
  });

  useEffect(() => {
    if (usingQuery) setItems(listQuery.data ?? []);
  }, [usingQuery, listQuery.data]);

  const loading = usingQuery ? listQuery.isLoading : manualLoading;

  const load = useCallback(async () => {
    if (usingQuery) {
      await queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      return;
    }
    setManualLoading(true);
    try {
      const data = await loadListRef.current?.();
      setItems(data ?? []);
    } catch {
      toast.error(messagesRef.current.loadError);
    } finally {
      setManualLoading(false);
    }
  }, [usingQuery, queryClient]);

  useEffect(() => {
    if (!usingQuery) void load();
  }, [load, usingQuery]);

  const openNew = useCallback(() => {
    setEditing(null);
    setForm(createDefaultRef.current());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setForm(toFormRef.current(item));
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = beforeSaveRef.current ? beforeSaveRef.current(form, editing) : form;
      if (editing) {
        await fetchApi(`${endpointRef.current}/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success(messagesRef.current.updateSuccess);
      } else {
        await fetchApi(endpointRef.current, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success(messagesRef.current.createSuccess);
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : messagesRef.current.saveError ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [editing, form, load]);

  const handleDelete = useCallback(async (id: string) => {
    if (messagesRef.current.deleteConfirm && !window.confirm(messagesRef.current.deleteConfirm)) return;
    try {
      await fetchApi(`${endpointRef.current}/${id}`, { method: 'DELETE' });
      toast.success(messagesRef.current.deleteSuccess);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    }
  }, [load]);

  return {
    items,
    loading,
    saving,
    modalOpen,
    editing,
    form,
    setForm,
    load,
    openNew,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  };
}
