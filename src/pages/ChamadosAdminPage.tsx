import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import type { SupportTicket, TicketMessage } from '../types/api';

export function ChamadosAdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [mensagem, setMensagem] = useState('');

  const loadTickets = async () => {
    try {
      const data = await fetchApi('/support/all');
      setTickets(data);
      if (activeTicket) {
        setActiveTicket(data.find((t: SupportTicket) => t.id === activeTicket.id));
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim() || !activeTicket) return;
    try {
      await fetchApi(`/support/${activeTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ mensagem })
      });
      setMensagem('');
      loadTickets();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const updateStatus = async (status: string) => {
    if (!activeTicket) return;
    try {
      await fetchApi(`/support/${activeTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      loadTickets();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABERTO': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'EM_ATENDIMENTO': return 'bg-brand-100 text-brand-800 border border-brand-200';
      case 'RESOLVIDO': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'P1': return 'text-red-600 font-bold';
      case 'P2': return 'text-orange-500 font-medium';
      default: return 'text-gray-500';
    }
  };

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
            <div 
              key={t.id} 
              onClick={() => setActiveTicket(t)}
              className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${activeTicket?.id === t.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(t.status)}`}>{t.status.replace('_', ' ')}</span>
                <span className={`text-xs ${getPriorityColor(t.prioridade)}`}>{t.prioridade}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 mt-2 truncate">{t.assunto}</h3>
              <p className="text-xs text-gray-500 mt-1 truncate">Loja: {t.store?.nomeFantasia}</p>
            </div>
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
                  <span>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm font-medium text-gray-600">Mudar Status:</span>
                <select 
                  className="text-xs font-bold border border-gray-300 rounded px-2 py-1 outline-none focus:border-brand-500"
                  value={activeTicket.status}
                  onChange={(e) => updateStatus(e.target.value)}
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ATENDIMENTO">Em Atendimento</option>
                  <option value="RESOLVIDO">Resolvido</option>
                  <option value="FECHADO">Fechado</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              {activeTicket.messages.map((m: TicketMessage) => (
                <div key={m.id} className={`flex ${m.remetente === 'SUPORTE' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${m.remetente === 'SUPORTE' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                    <p className="text-sm">{m.mensagem}</p>
                    <span className={`text-[10px] block mt-1 ${m.remetente === 'SUPORTE' ? 'text-brand-200' : 'text-gray-400'}`}>
                      {m.remetente} • {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {activeTicket.messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-10">O lojista abriu o chamado mas não enviou detalhes. Envie a primeira mensagem.</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleReply} className="flex gap-2">
                <input 
                  type="text" 
                  value={mensagem} 
                  onChange={e => setMensagem(e.target.value)}
                  placeholder="Responda como Suporte..." 
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-500"
                />
                <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700">Enviar Resposta</button>
              </form>
            </div>
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
