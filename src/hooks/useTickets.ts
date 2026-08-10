import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import type { SupportTicket } from '../types/api';

/**
 * Estado de lista de chamados de suporte + mensagem + transições de status.
 *
 *   const { tickets, loading, activeTicket, setActiveTicket, reply } = useTickets('/support/all');
 */
export function useTickets(endpoint: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      const data = await fetchApi<SupportTicket[]>(endpoint);
      setTickets(data);
      setActiveTicket(prev => (prev ? data.find((t: SupportTicket) => t.id === prev.id) ?? null : null));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const reply = useCallback(async (mensagem: string) => {
    if (!mensagem.trim() || !activeTicket) return false;
    try {
      await fetchApi(`/support/${activeTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ mensagem })
      });
      await loadTickets();
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
      return false;
    }
  }, [activeTicket, loadTickets]);

  const updateStatus = useCallback(async (status: string) => {
    if (!activeTicket) return;
    try {
      await fetchApi(`/support/${activeTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      await loadTickets();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }, [activeTicket, loadTickets]);

  return { tickets, loading, activeTicket, setActiveTicket, loadTickets, reply, updateStatus };
}
