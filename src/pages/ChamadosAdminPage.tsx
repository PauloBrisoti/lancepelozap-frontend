import { useTickets } from '../hooks/useTickets';
import { TicketChat } from '../components/TicketChat';
import { TicketListItem } from '../components/TicketListItem';
import { getPriorityColor, STATUS_LABELS } from '../utils/ticket';
import { formatDateTimeBR } from '../lib/dates';
import type { SupportTicket } from '../types/api';

export function ChamadosAdminPage() {
  const { tickets, loading, activeTicket, setActiveTicket, reply, updateStatus } = useTickets('/support/all');

  if (loading) return <div className="p-6">Carregando chamados...</div>;

  return (
    <div className="flex h-full gap-6">
      {/* Lista de Chamados */}
      <div className="w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">Fila de Atendimento (Admin)</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.map((t: SupportTicket) => (
            <TicketListItem
              key={t.id}
              ticket={t}
              active={activeTicket?.id === t.id}
              onClick={() => setActiveTicket(t)}
              right={<span className={`text-xs ${getPriorityColor(t.prioridade)}`}>{t.prioridade}</span>}
              meta={<p className="text-xs text-gray-500 mt-1 truncate">Loja: {t.store?.nomeFantasia}</p>}
            />
          ))}
          {tickets.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">Fila vazia! 🎉</div>
          )}
        </div>
      </div>

      {/* Chat do Chamado */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm">
        {activeTicket ? (
          <>
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{activeTicket.assunto}</h2>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Loja: {activeTicket.store?.nomeFantasia}</span>
                  <span>|</span>
                  <span>{formatDateTimeBR(activeTicket.createdAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-gray-600">Mudar Status:</span>
                <select
                  className="text-xs font-bold border border-gray-300 rounded px-2 py-1 outline-none focus:border-brand-500"
                  value={activeTicket.status}
                  onChange={(e) => updateStatus(e.target.value)}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <TicketChat
              ticket={activeTicket}
              myRole="SUPORTE"
              emptyMessage="O lojista abriu o chamado mas não enviou detalhes. Envie a primeira mensagem."
              replyPlaceholder="Responda como Suporte..."
              replyButtonLabel="Enviar Resposta"
              onReply={reply}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
            <p>Selecione um chamado na fila</p>
          </div>
        )}
      </div>
    </div>
  );
}
