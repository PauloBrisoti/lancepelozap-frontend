import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { Key, RefreshCw, AlertTriangle, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { DataTable, StatusBadge } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { PageContainer, ActionButton } from '../components/PageContainer';

interface UserData {
  id: string; nome: string; email: string; role: string; ativo: boolean;
  createdAt: string; clients: string[]; stores: { nome: string; role: string }[];
}

export function UsuariosAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<{ user?: UserData; mass?: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [massPassword, setMassPassword] = useState('Senha@123');
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', role: '', ativo: true });
  const [deleteConfirm, setDeleteConfirm] = useState<UserData | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<UserData[]>('/super-admin/users/all');
      setUsers(data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) return toast.error('Mínimo 6 caracteres');
    setSaving(true);
    try {
      await fetchApi(`/super-admin/users/${resetModal?.user?.id}/reset-password`, {
        method: 'PUT', body: JSON.stringify({ novaSenha: newPassword }),
      });
      toast.success('Senha redefinida!');
      setResetModal(null);
      setNewPassword('');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleMassReset = async () => {
    if (!massPassword || massPassword.length < 8) return toast.error('Mínimo 8 caracteres');
    if (!confirm(`Redefinir senha de TODOS os usuários (exceto Super Admin) para "${massPassword}"?`)) return;
    setSaving(true);
    try {
      const res = await fetchApi<{count:number}>('/super-admin/users/reset-all-passwords', {
        method: 'POST', body: JSON.stringify({ senhaPadrao: massPassword }),
      });
      toast.success(`${res.count} senhas redefinidas!`);
      setResetModal(null);
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
      loadUsers();
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
      loadUsers();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const columns: Column<UserData>[] = [
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
    { key: 'ativo', header: 'Status', render: (u) => (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {u.ativo ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        {u.ativo ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'id', header: 'Ações', render: (u) => (
      <div className="flex items-center gap-2">
        <button onClick={() => { setEditModal(u); setEditForm({ nome: u.nome, email: u.email, role: u.role, ativo: u.ativo }); }}
          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Editar Usuário">
          <Edit className="w-4 h-4" />
        </button>
        <ActionButton icon={<Key className="w-4 h-4" />} label="Redefinir Senha"
          onClick={() => { setResetModal({ user: u }); setNewPassword(''); }} />
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
        <button onClick={() => setResetModal({ mass: true })}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-amber-700 transition">
          <RefreshCw className="w-4 h-4" /> Redefinição em Massa
        </button>
      }>

      <DataTable columns={columns} data={users} loading={loading}
        keyExtractor={(u) => u.id} />

      {/* Modal de Edição */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Editar Usuário</h2>
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
          </div>
        </div>
      )}

      {/* Modal individual de senha */}
      {resetModal?.user && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setResetModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Redefinir Senha</h2>
            <p className="text-sm text-gray-500 mb-4">
              Usuário: <strong>{resetModal.user.nome}</strong> ({resetModal.user.email})
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)}
                className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
              <button onClick={handleReset} disabled={saving || newPassword.length < 8}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Redefinindo...' : 'Redefinir Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
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
          </div>
        </div>
      )}

      {/* Modal massa */}
      {resetModal?.mass && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setResetModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold text-gray-900">Redefinição em Massa</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Isso vai redefinir a senha de <strong>TODOS os usuários</strong> (exceto Super Admin).
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha Padrão</label>
            <input type="text" value={massPassword} onChange={e => setMassPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500 mb-4 font-mono" />
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)}
                className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium">Cancelar</button>
              <button onClick={handleMassReset} disabled={saving}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50">
                {saving ? 'Redefinindo...' : 'Confirmar Redefinição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
