import type { ReactNode } from 'react';
import type { SupportTicket } from '../types/api';
import { getStatusColor } from '../utils/ticket';

interface TicketListItemProps {
  ticket: SupportTicket;
  active: boolean;
  onClick: () => void;
  /** Conteúdo exibido no canto direito da linha de status (prioridade, data...). */
  right?: ReactNode;
  /** Linha extra abaixo do assunto (Loja, Prioridade...). */
  meta?: ReactNode;
}

export function TicketListItem({ ticket, active, onClick, right, meta }: TicketListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${active ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(ticket.status)}`}>
          {ticket.status.replace('_', ' ')}
        </span>
        {right}
      </div>
      <h3 className="text-sm font-bold text-gray-800 mt-2 truncate">{ticket.assunto}</h3>
      {meta}
    </div>
  );
}
