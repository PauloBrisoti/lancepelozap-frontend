import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { formatDateBR, formatDateTimeBR } from '../lib/dates';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { useTickets } from '../hooks/useTickets';
import { TicketChat } from '../components/TicketChat';
import { TicketListItem } from '../components/TicketListItem';
import { getStatusColor } from '../utils/ticket';

export function ChamadosLojistaPage() {
  const { tickets, loading, activeTicket, setActiveTicket, loadTickets, reply, updateStatus } = useTickets('/support/my');

  const modal = useModal();
  const [assunto, setAssunto] = useState('Dúvida Financeira');
  const [prioridade, setPrioridade] = useState('P2');

  const [descricao, setDescricao] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    modal.closeModal();
    setAssunto('Dúvida Financeira');
    setDescricao('');
    setPrioridade('P2');
    setAnexo(null);
    setError(null);
  };

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
      await loadTickets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsSubmitting(false);
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
            onClick={() => modal.openModal()}
            className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 font-medium"
          >
            + Novo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tickets.map(t => (
            <TicketListItem
              key={t.id}
              ticket={t}
              active={activeTicket?.id === t.id}
              onClick={() => setActiveTicket(t)}
              right={<span className="text-xs text-gray-400">{formatDateBR(t.createdAt)}</span>}
              meta={<p className="text-xs text-gray-500 mt-1">Prioridade: {t.prioridade}</p>}
            />
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
                <span>Criado em: {formatDateTimeBR(activeTicket.createdAt)}</span>
                <span>Prioridade: {activeTicket.prioridade}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(activeTicket.status)}`}>{activeTicket.status.replace('_', ' ')}</span>
              </div>
            </div>

            <TicketChat
              ticket={activeTicket}
              myRole="CLIENTE"
              emptyMessage="O suporte responderá em breve."
              replyPlaceholder="Digite sua mensagem..."
              onReply={reply}
              onReopen={() => updateStatus('ABERTO')}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>Selecione um chamado para visualizar</p>
          </div>
        )}
      </div>

      <Modal open={modal.open} onClose={modal.closeModal} size="sm">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center -mx-6 -mt-6 mb-5">
          <h2 className="text-lg font-bold text-gray-800">Abrir Chamado</h2>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-5">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
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
      </Modal>
    </div>
  );
}
