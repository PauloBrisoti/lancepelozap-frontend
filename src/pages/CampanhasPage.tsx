import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';
import type { CampaignLog } from '../types/api';

interface Customer {
  id: string; nomeCompleto: string; telefoneWhatsapp: string;
  aceitaMarketing: boolean;
}

interface Template {
  id: string; nome: string; categoria: string; conteudo: string;
}

export function CampanhasPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [tab, setTab] = useState<'enviar' | 'templates' | 'historico'>('enviar');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [sending, setSending] = useState(false);

  // Template form
  const [templateNome, setTemplateNome] = useState('');
  const [templateCategoria, setTemplateCategoria] = useState('MARKETING');
  const [templateConteudo, setTemplateConteudo] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchApi('/customers').then(setCustomers).catch(() => {});
    fetchApi('/whatsapp/templates').then(setTemplates).catch(() => {});
    fetchApi('/whatsapp/logs?limit=20').then(setLogs).catch(() => {});
  }, []);

  const filteredCustomers = customers.filter(c =>
    c.aceitaMarketing && (!filter || c.nomeCompleto.toLowerCase().includes(filter.toLowerCase()))
  );

  const toggleAll = () => {
    if (selectedIds.size === filteredCustomers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) { toast.error('Selecione ao menos um cliente'); return; }
    if (!message.trim()) { toast.error('Digite uma mensagem'); return; }

    setSending(true);
    try {
      const res = await fetchApi('/whatsapp/campaign', {
        method: 'POST',
        body: JSON.stringify({ customerIds: Array.from(selectedIds), message }),
      });
      toast.success(`${res.enviados} mensagens enviadas, ${res.erros} erros`);
      setSelectedIds(new Set());
      fetchApi('/whatsapp/logs?limit=20').then(setLogs).catch(() => {});
    } catch { toast.error('Erro ao enviar campanha'); }
    finally { setSending(false); }
  };

  const saveTemplate = async () => {
    if (!templateNome || !templateConteudo) { toast.error('Nome e conteúdo obrigatórios'); return; }
    try {
      if (editingTemplate) {
        await fetchApi(`/whatsapp/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nome: templateNome, categoria: templateCategoria, conteudo: templateConteudo }),
        });
        toast.success('Template atualizado');
      } else {
        await fetchApi('/whatsapp/templates', {
          method: 'POST',
          body: JSON.stringify({ nome: templateNome, categoria: templateCategoria, conteudo: templateConteudo }),
        });
        toast.success('Template criado');
      }
      setTemplateNome(''); setTemplateConteudo(''); setTemplateCategoria('MARKETING'); setEditingTemplate(null);
      fetchApi('/whatsapp/templates').then(setTemplates).catch(() => {});
    } catch { toast.error('Erro ao salvar template'); }
  };

  const editTemplate = (t: Template) => {
    setEditingTemplate(t);
    setTemplateNome(t.nome); setTemplateCategoria(t.categoria); setTemplateConteudo(t.conteudo);
    setTab('templates');
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Excluir template?')) return;
    await fetchApi(`/whatsapp/templates/${id}`, { method: 'DELETE' });
    fetchApi('/whatsapp/templates').then(setTemplates).catch(() => {});
  };

  const applyTemplate = (t: Template) => {
    setMessage(t.conteudo);
    setTab('enviar');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campanhas & Mensagens</h1>
        <p className="text-gray-500 text-sm mt-1">Envie mensagens em massa pelo WhatsApp.</p>
      </div>

      <div className="flex border-b border-gray-200 gap-6">
        {(['enviar', 'templates', 'historico'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'text-brand-600 border-brand-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}>
            {t === 'enviar' ? 'Enviar Mensagem' : t === 'templates' ? 'Modelos' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'enviar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Clientes com aceitaMarketing ({filteredCustomers.length})</h2>
              <div className="flex gap-2">
                <input type="text" placeholder="Filtrar..." className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={filter} onChange={e => setFilter(e.target.value)} />
                <button onClick={toggleAll} className="text-sm text-brand-600 hover:underline">
                  {selectedIds.size === filteredCustomers.length ? 'Desmarcar' : `Selecionar ${filteredCustomers.length}`}
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {filteredCustomers.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)}
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.nomeCompleto}</p>
                    <p className="text-xs text-gray-500">{c.telefoneWhatsapp || 'Sem WhatsApp'}</p>
                  </div>
                </label>
              ))}
              {filteredCustomers.length === 0 && <p className="text-gray-400 text-center py-8 text-sm">Nenhum cliente encontrado</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold">Mensagem</h2>
            {templates.length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Usar modelo:</label>
                <select onChange={e => { const t = templates.find(t => t.id === e.target.value); if (t) applyTemplate(t); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="">— Selecionar —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            )}
            <textarea rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder="Digite a mensagem que será enviada..."
              value={message} onChange={e => setMessage(e.target.value)} />
            <p className="text-xs text-gray-500">{selectedIds.size} cliente(s) selecionado(s)</p>
            <button onClick={handleSend} disabled={sending || selectedIds.size === 0}
              className="w-full bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
              {sending ? 'Enviando...' : `Enviar para ${selectedIds.size} cliente(s)`}
            </button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold">{editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={templateNome} onChange={e => setTemplateNome(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={templateCategoria} onChange={e => setTemplateCategoria(e.target.value)}>
                <option value="COBRANCA">Cobrança</option>
                <option value="CONFIRMACAO">Confirmação</option>
                <option value="MARKETING">Marketing</option>
                <option value="PORTAL">Portal</option>
                <option value="ANIVERSARIO">Aniversário</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
              <textarea rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={templateConteudo} onChange={e => setTemplateConteudo(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={saveTemplate} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition">
                {editingTemplate ? 'Atualizar' : 'Criar Modelo'}
              </button>
              {editingTemplate && (
                <button onClick={() => { setEditingTemplate(null); setTemplateNome(''); setTemplateCategoria('MARKETING'); setTemplateConteudo(''); }}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition">
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs text-gray-500 uppercase">{t.categoria}</span>
                    <p className="font-medium text-gray-900">{t.nome}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => applyTemplate(t)} className="text-xs text-brand-600 hover:underline">Usar</button>
                    <button onClick={() => editTemplate(t)} className="text-xs text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-600 hover:underline">Excluir</button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{t.conteudo}</p>
              </div>
            ))}
            {templates.length === 0 && <p className="text-gray-400 text-center py-8">Nenhum modelo criado</p>}
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log: CampaignLog) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500">{new Date(log.sentAt).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-3">{log.customer?.nomeCompleto || '-'}</td>
                    <td className="px-6 py-3 text-xs uppercase">{log.tipo}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        log.status === 'ENVIADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{log.conteudo}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Nenhuma mensagem enviada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
