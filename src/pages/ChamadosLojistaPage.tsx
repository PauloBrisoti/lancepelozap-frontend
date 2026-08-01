import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import type { SupportTicket, TicketMessage } from '../types/api';

export function ChamadosLojistaPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  
  const [novoChamadoModal, setNovoChamadoModal] = useState(false);
  const [assunto, setAssunto] = useState('Dúvida Financeira');
  const [prioridade, setPrioridade] = useState('P2');
  
  const [mensagem, setMensagem] = useState('');

  const [descricao, setDescricao] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    setNovoChamadoModal(false);
    setAssunto('Dúvida Financeira');
    setDescricao('');
    setPrioridade('P2');
    setAnexo(null);
    setError(null);
  };

  const loadTickets = async () => {
    try {
      const data = await fetchApi('/support/my');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('assunto', assunto);
      formData.append('prioridade', prioridade);
      if (descricao) formData.append('descricao', descricao);
      if (anexo) formData.append('anexo', anexo);

      await fetchApi('/support/my', {
        method: 'POST',
        body: formData,
      });

      closeModal();
      loadTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABERTO': return 'bg-yellow-100 text-yellow-800';
      case 'EM_ATENDIMENTO': return 'bg-brand-100 text-brand-800';
      case 'RESOLVIDO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="flex h-full gap-6">
      {/* Lista de Chamados */}
      <div className="w-1/3 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800">Meus Chamados</h2>
          <button 
            onClick={() => setNovoChamadoModal(true)}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium"
          >
            + Novo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.map(t => (
            <div 
              key={t.id} 
              onClick={() => setActiveTicket(t)}
              className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${activeTicket?.id === t.id ? 'bg-brand-50 border-l-4 border-l-brand-600' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(t.status)}`}>{t.status.replace('_', ' ')}</span>
                <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 mt-2 truncate">{t.assunto}</h3>
              <p className="text-xs text-gray-500 mt-1">Prioridade: {t.prioridade}</p>
            </div>
          ))}
          {tickets.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">Nenhum chamado aberto.</div>
          )}
        </div>
      </div>

      {/* Chat do Chamado */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm">
        {activeTicket ? (
          <>
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">{activeTicket.assunto}</h2>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>Criado em: {new Date(activeTicket.createdAt).toLocaleString()}</span>
                <span>Prioridade: {activeTicket.prioridade}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(activeTicket.status)}`}>{activeTicket.status.replace('_', ' ')}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              {activeTicket.messages.map((m: TicketMessage) => (
                <div key={m.id} className={`flex ${m.remetente === 'CLIENTE' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${m.remetente === 'CLIENTE' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                    <p className="text-sm">{m.mensagem}</p>
                    <span className={`text-[10px] block mt-1 ${m.remetente === 'CLIENTE' ? 'text-brand-200' : 'text-gray-400'}`}>
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {activeTicket.messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-10">O suporte responderá em breve.</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              {activeTicket.status === 'RESOLVIDO' || activeTicket.status === 'FECHADO' ? (
                <div className="flex justify-between items-center bg-gray-50 border rounded-lg p-4">
                  <span className="text-gray-500 text-sm">Este chamado foi encerrado.</span>
                  <button 
                    onClick={async () => {
                      try {
                        await fetchApi(`/support/${activeTicket.id}/status`, {
                          method: 'PUT',
                          body: JSON.stringify({ status: 'ABERTO' })
                        });
                        loadTickets();
                      } catch (error: unknown) {
                        toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
                      }
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 text-sm transition"
                  >
                    Reabrir Chamado
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReply} className="flex gap-2">
                  <input 
                    type="text" 
                    value={mensagem} 
                    onChange={e => setMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-brand-500"
                  />
                  <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700">Enviar</button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>Selecione um chamado para visualizar</p>
          </div>
        )}
      </div>

      {novoChamadoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Abrir Chamado</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 mx-5 mt-5 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria (Assunto)</label>
                <select required className="w-full border rounded-lg px-3 py-2 outline-none focus:border-brand-500 bg-white" value={assunto} onChange={e => setAssunto(e.target.value)} disabled={isSubmitting}>
                  <option value="Dúvida Financeira">Dúvida Financeira</option>
                  <option value="Problema Técnico">Problema Técnico</option>
                  <option value="Sugestão / Melhoria">Sugestão / Melhoria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
                <textarea required rows={4} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-brand-500" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva o que você precisa..." disabled={isSubmitting}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select className="w-full border rounded-lg px-3 py-2 outline-none focus:border-brand-500 bg-white" value={prioridade} onChange={e => setPrioridade(e.target.value)} disabled={isSubmitting}>
                    <option value="P3">Baixa (Dúvida)</option>
                    <option value="P2">Média (Erro pontual)</option>
                    <option value="P1">Alta (Sistema parado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anexo (Opcional)</label>
                  {anexo ? (
                    <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50 text-sm">
                      <span className="truncate max-w-[120px] text-gray-700">{anexo.name}</span>
                      <button type="button" onClick={() => setAnexo(null)} className="text-red-500 font-bold ml-2 hover:text-red-700 disabled:opacity-50" disabled={isSubmitting}>✕</button>
                    </div>
                  ) : (
                    <input type="file" className="w-full text-sm mt-1" onChange={e => setAnexo(e.target.files ? e.target.files[0] : null)} disabled={isSubmitting} />
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50" disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Abrir Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
