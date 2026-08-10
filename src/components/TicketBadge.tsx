import { useAdminCount } from '../hooks/useAdminCount';
import type { SupportTicket } from '../types/api';

export function TicketBadge() {
  const count = useAdminCount<SupportTicket[]>(
    '/support/all',
    60_000,
    tickets => tickets.filter(t => t.status === 'ABERTO').length
  );

  if (count === null || count === 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
}
