import { useState } from 'react';
import type { SupportTicket, TicketMessage } from '../types/api';
import { TZ_BR } from '../lib/dates';

interface TicketChatProps {
  ticket: SupportTicket;
  /** Papel do usuário logado — define em qual lado as mensagens aparecem. */
  myRole: 'SUPORTE' | 'CLIENTE';
  emptyMessage: string;
  replyPlaceholder: string;
  replyButtonLabel?: string;
  /** Retorna true se a mensagem foi enviada com sucesso. */
  onReply: (mensagem: string) => Promise<boolean>;
  onReopen?: () => void;
}

const CLOSED_STATUSES = ['RESOLVIDO', 'FECHADO'];

export function TicketChat({
  ticket,
  myRole,
  emptyMessage,
  replyPlaceholder,
  replyButtonLabel = 'Enviar',
  onReply,
  onReopen,
}: TicketChatProps) {
  const [mensagem, setMensagem] = useState('');

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;
    if (await onReply(mensagem)) setMensagem('');
  };

  const closed = CLOSED_STATUSES.includes(ticket.status);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {ticket.messages.map((m: TicketMessage) => (
          <div key={m.id} className={`flex ${m.remetente === myRole ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${m.remetente === myRole ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
              <p className="text-sm">{m.mensagem}</p>
              <span className={`text-[10px] block mt-1 ${m.remetente === myRole ? 'text-brand-200' : 'text-gray-400'}`}>
                {m.remetente} • {new Date(m.createdAt).toLocaleTimeString('pt-BR', { timeZone: TZ_BR })}
              </span>
            </div>
          </div>
        ))}
        {ticket.messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">{emptyMessage}</div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        {closed ? (
          <div className="flex justify-between items-center bg-gray-50 border rounded-lg p-4">
            <span className="text-gray-500 text-sm">Este chamado foi encerrado.</span>
            {onReopen && (
              <button
                onClick={onReopen}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 text-sm transition"
              >
                Reabrir Chamado
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleReply} className="flex gap-2">
            <input
              type="text"
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder={replyPlaceholder}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-500"
            />
            <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700">
              {replyButtonLabel}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
