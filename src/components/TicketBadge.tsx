import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { SupportTicket } from '../types/api';

export function TicketBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    const check = async () => {
      try {
        const tickets = await fetchApi<SupportTicket[]>('/support/all');
        const open = tickets.filter((t: SupportTicket) => t.status === 'ABERTO').length;
        setCount(open);
      } catch { setCount(0); }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  if (count === null || count === 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
}
