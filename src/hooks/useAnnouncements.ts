import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Announcement } from '../types/api';

const STORAGE_KEY = '@LancePeloZap:dismissedAnnouncements';

/**
 * Hook de anúncios do Super Admin.
 * Separa a regra de domínio (role, filtro de ativos, dismiss persistido)
 * do componente de banner.
 */
export function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setDismissed(new Set(JSON.parse(stored)));
  }, []);

  useEffect(() => {
    // Só carrega anúncios se for Super Admin
    if (user?.role !== 'SUPER_ADMIN') return;
    fetchApi<Announcement[]>('/super-admin/announcements')
      .then(data => {
        if (Array.isArray(data)) setAnnouncements(data.filter(a => a.active));
      })
      .catch(() => {});
  }, [user?.role]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const visible = announcements.filter(a => !dismissed.has(a.id));

  return { visible, dismiss };
}
