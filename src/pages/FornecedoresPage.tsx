import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { useApiQuery, STALE_TIMES } from '../lib/query';

interface Supplier {
  id: string;
  nome: string;
  tipoPessoa: string;
  cnpjCpf: string | null;
  ieRg: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  observacoes: string | null;
  status: string;
}

export function FornecedoresPage() {
  const modal = useModal();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    nome: '',
    tipoPessoa: 'PJ' as 'PF' | 'PJ',
    cnpjCpf: '',
    ieRg: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    observacoes: '',
  });

  const query = (statusFilter ? `?status=${statusFilter}` : '') + (search ? `${statusFilter ? '&' : '?'}search=${encodeURIComponent(search)}` : '');
  const { data: suppliers = [], isLoading, refetch } = useApiQuery<Supplier[]>(
    ['suppliers', statusFilter, search],
    `/suppliers${query}`,
    { staleTime: STALE_TIMES.NORMAL }
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', tipoPessoa: 'PJ', cnpjCpf: '', ieRg: '', telefone: '', email: '', cep: '', endereco: '', observacoes: '' });
    modal.openModal();
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      nome: s.nome,
      tipoPessoa: s.tipoPessoa as 'PF' | 'PJ',
      cnpjCpf: s.cnpjCpf || '',
      ieRg: s.ieRg || '',
      telefone: s.telefone || '',
      email: s.email || '',
      cep: s.cep || '',
      endereco: s.endereco || '',
      observacoes: s.observacoes || '',
    });
    modal.openModal();
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      setSaving(true);
      const body = { ...form };
      if (editing) {
        await fetchApi(`/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Fornecedor atualizado!');
      } else {
        await fetchApi('/suppliers', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Fornecedor criado!');
      }
      await refetch();
      modal.closeModal();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleToggleStatus = async (s: Supplier) => {
    const newStatus = s.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    try {
      await fetchApi(`/suppliers/${s.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      toast.success(`Fornecedor ${newStatus === 'ATIVO' ? 'ativado' : 'inativado'}`);
      await refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const handleDelete = async (s: Supplier) => {
    if (!window.confirm(`Remover fornecedor "${s.nome}"?`)) return;
    try {
      await fetchApi(`/suppliers/${s.id}`, { method: 'DELETE' });
      toast.success('Fornecedor removido');
      await refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const setField = (field: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <button onClick={openCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 font-medium transition-colors">
          + Novo Fornecedor
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
        <button onClick={() => { setStatusFilter(''); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Todos</button>
        <button onClick={() => { setStatusFilter('ATIVO'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === 'ATIVO' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Ativos</button>
        <button onClick={() => { setStatusFilter('INATIVO'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === 'INATIVO' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Inativos</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Nenhum fornecedor encontrado</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">CPF/CNPJ</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.tipoPessoa}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.cnpjCpf || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.telefone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleToggleStatus(s)} className={`px-2 py-1 rounded-lg text-xs font-medium ${s.status === 'ATIVO' ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>{s.status === 'ATIVO' ? 'Inativar' : 'Ativar'}</button>
                      <button onClick={() => handleDelete(s)} className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal.open} onClose={modal.closeModal} closeDisabled={saving} title={`${editing ? 'Editar' : 'Novo'} Fornecedor`} size="md">
        <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input value={form.nome} onChange={e => setField('nome', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.tipoPessoa} onChange={e => setField('tipoPessoa', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="PF">Pessoa Física</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{form.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
                  <input value={form.cnpjCpf} onChange={e => setField('cnpjCpf', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IE/RG</label>
                  <input value={form.ieRg} onChange={e => setField('ieRg', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setField('telefone', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => setField('email', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input value={form.cep} onChange={e => setField('cep', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input value={form.endereco} onChange={e => setField('endereco', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setField('observacoes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={modal.closeModal} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nome.trim()} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
      </Modal>
    </div>
  );
}