import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { Key, RefreshCw, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Search, Download } from 'lucide-react';
import { DataTable, StatusBadge } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { PageContainer, ActionButton } from '../components/PageContainer';
import { Modal } from '../components/Modal';
import { formatDateTimeBR } from '../lib/dates';
import { useApiQuery, STALE_TIMES } from '../lib/query';

interface UserData {
  id: string; nome: string; email: string; role: string; ativo: boolean;
  createdAt: string; lastLogin: string | null;
  clients: string[]; stores: { nome: string; role: string }[];
}

const PAGE_SIZE = 10;

const exportCsv = (users: UserData[]) => {
  const esc = (v: string | number | boolean) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Nome', 'Email', 'Nível', 'Lojas', 'Status', 'Cadastrado em', 'Último acesso'];
  const lines = users.map(u => [
    u.nome, u.email,
    u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Usuário',
    u.stores.map(s => s.nome).join('; '),
    u.ativo ? 'Ativo' : 'Inativo',
    formatDateTimeBR(u.createdAt),
    formatDateTimeBR(u.lastLogin)
  ].map(esc).join(';'));
  const csv = '\uFEFF' + [header.map(esc).join(';'), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export function UsuariosAdminPage() {
  const [resetModal, setResetModal] = useState<{ user?: UserData; mass?: boolean; ids?: string[] } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', role: '', ativo: true });
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterAtivo, setFilterAtivo] = useState('ALL');
  const [filterLoja, setFilterLoja] = useState('ALL');

  const { data: users = [], isLoading, refetch } = useApiQuery<UserData[]>(
    ['super-admin', 'users'],
    '/super-admin/users/all',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const lojasUnicas = useMemo(
    () => [...new Set(users.flatMap(u => u.stores.map(s => s.nome)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (q && !u.nome.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.stores.some(s => s.nome.toLowerCase().includes(q))) return false;
      if (filterRole !== 'ALL' && u.role !== filterRole) return false;
      if (filterAtivo !== 'ALL' && String(u.ativo) !== filterAtivo) return false;
      if (filterLoja !== 'ALL' && !u.stores.some(s => s.nome === filterLoja)) return false;
      return true;
    });
  }, [users, search, filterRole, filterAtivo, filterLoja]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectPage = () => {
    const pageIds = pageItems.map(u => u.id);
    const allSelected = pageIds.every(id => selected.includes(id));
    setSelected(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };

  const resetFilteredSelection = () => {
    setSelected(filtered.map(u => u.id));
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await fetchApi(`/super-admin/users/${resetModal?.user?.id}/reset-password`, {
        method: 'PUT',
      });
      toast.success('Senha redefinida! O usuário deve usar "Esqueci minha senha" para criar uma nova.');
      setResetModal(null);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleMassReset = async () => {
    if (confirmText !== 'RESETAR') return toast.error('Digite RESETAR para confirmar');
    if (!adminPassword) return toast.error('Informe sua senha para confirmar');
    setSaving(true);
    try {
      const res = await fetchApi<{ count: number }>('/super-admin/users/reset-all-passwords', {
        method: 'POST', body: JSON.stringify({ userIds: resetModal?.ids, confirmPassword: adminPassword }),
      });
      toast.success(`${res.count} senha(s) redefinida(s)! Cada usuário deve usar "Esqueci minha senha".`);
      setResetModal(null);
      setConfirmText('');
      setAdminPassword('');
      setSelected([]);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (user: UserData) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${user.nome}" (${user.email})? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    try {
      await fetchApi(`/super-admin/users/${user.id}`, { method: 'DELETE' });
      toast.success(`Usuário ${user.nome} excluído!`);
      setDeleteConfirm(null);
      setSelected(prev => prev.filter(id => id !== user.id));
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selected.length} usuário(s) selecionado(s)?`)) return;
    setSaving(true);
    try {
      let ok = 0;
      for (const id of selected) {
        const u = users.find(x => x.id === id);
        if (!u || u.role === 'SUPER_ADMIN') continue;
        await fetchApi(`/super-admin/users/${id}`, { method: 'DELETE' });
        ok++;
      }
      toast.success(`${ok} usuário(s) excluído(s)!`);
      setBulkDeleteConfirm(false);
      setSelected([]);
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleToggleAtivo = async (u: UserData) => {
    try {
      await fetchApi(`/super-admin/users/${u.id}`, {
        method: 'PUT', body: JSON.stringify({ ativo: !u.ativo }),
      });
      toast.success(`${u.nome} ${u.ativo ? 'desativado' : 'ativado'}.`);
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const handleBulkToggleAtivo = async (ativo: boolean) => {
    setSaving(true);
    try {
      let ok = 0;
      for (const id of selected) {
        const u = users.find(x => x.id === id);
        if (!u || u.role === 'SUPER_ADMIN') continue;
        await fetchApi(`/super-admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ ativo }) });
        ok++;
      }
      toast.success(`${ok} usuário(s) ${ativo ? 'ativado(s)' : 'desativado(s)'}!`);
      setSelected([]);
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nome.trim()) return toast.error('Nome é obrigatório');
    if (!editForm.email.trim()) return toast.error('E-mail é obrigatório');
    setSaving(true);
    try {
      await fetchApi(`/super-admin/users/${editModal!.id}`, {
        method: 'PUT', body: JSON.stringify(editForm),
      });
      toast.success('Usuário atualizado!');
      setEditModal(null);
      refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };
  const columns: Column<UserData>[] = [
    {
      key: 'sel', header: '',
      render: (u) => (
        <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)}
          className="w-4 h-4 accent-brand-600 cursor-pointer" />
      )
    },
    { key: 'nome', header: 'Nome', render: (u) => (
      <div><p className="font-medium text-gray-900">{u.nome}</p><p className="text-xs text-gray-500">{u.email}</p></div>
    )},
    { key: 'role', header: 'Nível', render: (u) => (
      <StatusBadge status={u.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER'}
        labels={{ SUPER_ADMIN: 'Super Admin', USER: 'Usuário' }}
        colors={{ SUPER_ADMIN: 'bg-purple-100 text-purple-700', USER: 'bg-blue-100 text-blue-700' }} />
    )},
    { key: 'stores', header: 'Lojas', render: (u) => (
      <span className="text-sm text-gray-600">{u.stores.map(s => s.nome).join(', ') || '-'}</span>
    )},
    { key: 'createdAt', header: 'Cadastrado em', render: (u) => (
      <span className="text-xs text-gray-500">{formatDateTimeBR(u.createdAt)}</span>
    )},
    { key: 'lastLogin', header: 'Último acesso', render: (u) => (
      <span className={`text-xs ${u.lastLogin ? 'text-gray-500' : 'text-gray-300'}`}>{formatDateTimeBR(u.lastLogin)}</span>
    )},
    { key: 'ativo', header: 'Status', render: (u) => (
      <button
        onClick={() => handleToggleAtivo(u)}
        disabled={u.role === 'SUPER_ADMIN'}
        title={u.role === 'SUPER_ADMIN' ? 'Super Admin não pode ser desativado' : u.ativo ? 'Clique para desativar' : 'Clique para ativar'}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-60 ${
          u.ativo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        {u.ativo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {u.ativo ? 'Ativo' : 'Inativo'}
      </button>
    )},
    { key: 'id', header: 'Ações', render: (u) => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setEditModal(u); setEditForm({ nome: u.nome, email: u.email, role: u.role, ativo: u.ativo }); }}
          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Editar Usuário">
          <Edit className="w-4 h-4" />
        </button>
        <ActionButton icon={<Key className="w-4 h-4" />} label="Redefinir Senha"
          onClick={() => setResetModal({ user: u })} />
        {u.role !== 'SUPER_ADMIN' && (
          <button onClick={() => setDeleteConfirm(u)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir Usuário">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <PageContainer title="Gestão de Usuários e Senhas"
      description="Gerencie todos os usuários cadastrados no sistema"
      actions={
        <div className="flex gap-2">
          <button onClick={() => { setResetModal({ mass: true }); setConfirmText(''); setAdminPassword(''); }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition">
            <RefreshCw className="w-4 h-4" /> Redefinição em Massa
          </button>
          <button onClick={() => exportCsv(filtered)}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      }>

      {/* Filtros e busca */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); setSelected([]); }}
            placeholder="Buscar por nome, e-mail ou loja..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); setSelected([]); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="ALL">Todos os níveis</option>
          <option value="USER">Usuário</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select value={filterAtivo} onChange={e => { setFilterAtivo(e.target.value); setPage(1); setSelected([]); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="ALL">Ativos e inativos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
        <select value={filterLoja} onChange={e => { setFilterLoja(e.target.value); setPage(1); setSelected([]); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="ALL">Todas as lojas</option>
          {lojasUnicas.map(loja => <option key={loja} value={loja}>{loja}</option>)}
        </select>
        <span className="text-xs text-gray-500 whitespace-nowrap">{filtered.length} usuário(s)</span>
      </div>

      {/* Barra de ações em lote */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
          <span className="text-sm font-semibold text-brand-800">{selected.length} selecionado(s)</span>
          <button onClick={() => setSelected([])} className="text-xs text-gray-500 hover:text-gray-700 underline">limpar</button>
          <button onClick={resetFilteredSelection} className="text-xs text-brand-700 hover:text-brand-900 underline">selecionar todos os filtrados</button>
          <div className="flex-1" />
          <button onClick={() => { setResetModal({ ids: selected }); setConfirmText(''); setAdminPassword(''); }}
            className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700">
            <Key className="w-3.5 h-3.5" /> Redefinir Senha
          </button>
          <button onClick={() => handleBulkToggleAtivo(true)}
            className="border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-50">Ativar</button>
          <button onClick={() => handleBulkToggleAtivo(false)}
            className="border border-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-50">Desativar</button>
          <button onClick={() => setBulkDeleteConfirm(true)}
            className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50">Excluir</button>
        </div>
      )}

      <DataTable columns={columns} data={pageItems} loading={isLoading}
        keyExtractor={(u) => u.id} />

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={pageItems.every(u => selected.includes(u.id)) && pageItems.length > 0}
              onChange={toggleSelectPage} className="w-4 h-4 accent-brand-600 cursor-pointer" />
            Selecionar página ({pageItems.length})
          </label>
          <div className="flex items-center gap-2">
            <button disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {safePage} de {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Próxima</button>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title="Editar Usuário"
        size="sm"
        rounded="xl"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" required value={editForm.nome}
              onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" required value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
            <select value={editForm.role}
              onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="USER">Usuário</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-700">Usuário Ativo</span>
            <button type="button" onClick={() => setEditForm(f => ({ ...f, ativo: !f.ativo }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(null)}
              className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal individual de senha */}
      {resetModal?.user && (
        <Modal
          open={!!resetModal?.user}
          onClose={() => setResetModal(null)}
          title="Redefinir Senha"
          size="sm"
          rounded="xl"
        >
          <p className="text-sm text-gray-500 mb-4">
            Usuário: <strong>{resetModal.user.nome}</strong> ({resetModal.user.email})
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
            A senha será invalidada e uma senha aleatória será definida — <strong>ninguém, nem o suporte, conhece essa senha</strong>.
            O usuário deve criar uma nova senha usando "Esqueci minha senha" (o link chega no e-mail cadastrado).
          </div>
          <div className="flex gap-3">
            <button onClick={() => setResetModal(null)}
              className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
            <button onClick={handleReset} disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de Exclusão */}
      {deleteConfirm && (
        <Modal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          size="sm"
          rounded="xl"
        >
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-900">Excluir Usuário</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Tem certeza que deseja excluir permanentemente o usuário{' '}
            <strong>{deleteConfirm.nome}</strong> ({deleteConfirm.email})?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirm)} disabled={saving}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? 'Excluindo...' : 'Excluir Usuário'}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirmação de exclusão em lote */}
      <Modal
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        size="sm"
        rounded="xl"
      >
        <div className="flex items-center gap-3 mb-4 text-red-600">
          <AlertTriangle className="w-6 h-6" />
          <h2 className="text-xl font-bold text-gray-900">Excluir Usuários</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Excluir permanentemente <strong>{selected.length} usuário(s)</strong> selecionado(s)? Super Admins são ignorados.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setBulkDeleteConfirm(false)}
            className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
          <button onClick={handleBulkDelete} disabled={saving}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
            {saving ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </Modal>

      {/* Modal massa / lote */}
      {(resetModal?.mass || resetModal?.ids) && (
        <Modal
          open={!!(resetModal?.mass || resetModal?.ids)}
          onClose={() => setResetModal(null)}
          size="sm"
          rounded="xl"
        >
          <div className="flex items-center gap-3 mb-4 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-900">Redefinição em Massa</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {resetModal.ids
              ? <>Redefinir a senha de <strong>{resetModal.ids.length} usuário(s) selecionado(s)</strong> (Super Admins são ignorados).</>
              : <>Isso vai redefinir a senha de <strong>TODOS os usuários</strong> (exceto Super Admin).</>}
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
            Cada usuário receberá uma senha aleatória diferente — <strong>ninguém, nem o suporte, conhece essas senhas</strong>.
            Cada um deve criar uma nova senha usando "Esqueci minha senha" (o link chega no e-mail cadastrado).
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Digite <strong>RESETAR</strong> para confirmar</label>
          <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-400 mb-3" />
          <label className="block text-sm font-medium text-gray-700 mb-1">Sua senha (confirmação)</label>
          <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 mb-4" />
          <div className="flex gap-3">
            <button onClick={() => setResetModal(null)}
              className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
            <button onClick={handleMassReset} disabled={saving}
              className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">
              {saving ? 'Redefinindo...' : 'Confirmar Redefinição'}
            </button>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
