import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface UserTeam {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  internalRole?: Role;
}

export function EquipeAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserTeam[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    loadData();
  }, [user?.role]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        fetchApi('/super-admin/team/users'),
        fetchApi('/super-admin/team/roles')
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
      if (rolesRes.length > 0) setInviteRoleId(rolesRes[0].id);
    } catch (error) {
      console.error('Erro ao carregar equipe', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/super-admin/team/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, nome: inviteNome, roleId: inviteRoleId })
      });
      toast('Convite enviado!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteNome('');
      loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar convite');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) return;
    try {
      await fetchApi(`/super-admin/team/users/${id}`, { method: 'DELETE' });
      loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao revogar acesso');
    }
  };

  const handleChangeRole = async (userId: string, newRoleId: string) => {
    try {
      await fetchApi(`/super-admin/team/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ roleId: newRoleId })
      });
      loadData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar papel');
    }
  };

  if (loading) return <div className="p-8">Carregando equipe...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Equipe Interna</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os usuários e permissões do painel administrativo</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Convidar Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4 font-medium">Nome / Email</th>
              <th className="p-4 font-medium">Papel</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <p className="font-semibold text-gray-800">{u.nome}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="p-4">
                  <select
                    value={u.internalRole?.id || ''}
                    onChange={(e) => handleChangeRole(u.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {u.ativo ? 'Ativo' : 'Pendente/Inativo'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleRevoke(u.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Revogar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Convidar para a Equipe</h2>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={inviteNome}
                    onChange={e => setInviteNome(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Nome do usuário"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="email@dominio.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                  <select
                    value={inviteRoleId}
                    onChange={e => setInviteRoleId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
