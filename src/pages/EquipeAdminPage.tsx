import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import { useAuthUser } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';
import { useApiQuery, STALE_TIMES } from '../lib/query';

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
  expiresAt?: string | null;
  internalRole?: Role;
}

const toDateInputValue = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const isExpired = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
};

export function EquipeAdminPage() {
  const { user } = useAuthUser();
  const modal = useModal();
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNome, setInviteNome] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useApiQuery<UserTeam[]>(
    ['super-admin', 'team-users'],
    '/super-admin/team/users',
    { staleTime: STALE_TIMES.NORMAL, enabled: isSuperAdmin }
  );

  const { data: roles = [], isLoading: rolesLoading } = useApiQuery<Role[]>(
    ['super-admin', 'team-roles'],
    '/super-admin/team/roles',
    { staleTime: STALE_TIMES.STATIC, enabled: isSuperAdmin }
  );

  useEffect(() => {
    if (roles.length > 0 && !inviteRoleId) setInviteRoleId(roles[0].id);
  }, [roles, inviteRoleId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/super-admin/team/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          nome: inviteNome,
          roleId: inviteRoleId,
          expiresAt: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : null
        })
      });
      toast('Convite enviado!');
      modal.closeModal();
      setInviteEmail('');
      setInviteNome('');
      setInviteExpiresAt('');
      refetchUsers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar convite');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar o acesso deste usuário?')) return;
    try {
      await fetchApi(`/super-admin/team/users/${id}`, { method: 'DELETE' });
      refetchUsers();
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
      refetchUsers();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar papel');
    }
  };

  const expiryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleChangeExpiry = (userId: string, expiresAt: string) => {
    if (expiryDebounceRef.current) clearTimeout(expiryDebounceRef.current);
    expiryDebounceRef.current = setTimeout(async () => {
      try {
        await fetchApi(`/super-admin/team/users/${userId}/expiry`, {
          method: 'PATCH',
          body: JSON.stringify({ expiresAt: expiresAt ? new Date(`${expiresAt}T12:00:00`).toISOString() : null })
        });
        toast.success('Expiração atualizada.');
        refetchUsers();
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar expiração');
      }
    }, 600);
  };

  if (usersLoading || rolesLoading) return <div className="p-8">Carregando equipe...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Equipe Interna</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os usuários e permissões do painel administrativo</p>
        </div>
        <button
          onClick={() => modal.openModal()}
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
              <th className="p-4 font-medium">Acesso expira</th>
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
                  <input
                    type="date"
                    value={toDateInputValue(u.expiresAt)}
                    onChange={e => handleChangeExpiry(u.id, e.target.value)}
                    className={`border rounded px-2 py-1 text-sm bg-white ${isExpired(u.expiresAt) ? 'border-red-300 text-red-600' : 'border-gray-300 text-gray-700'}`}
                  />
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {u.ativo ? 'Ativo' : 'Pendente/Inativo'}
                    </span>
                    {isExpired(u.expiresAt) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Acesso expirado
                      </span>
                    )}
                  </div>
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

      <Modal
        open={modal.open}
        onClose={modal.closeModal}
        size="sm"
        title="Convidar para a Equipe"
        rounded="xl" shadow="2xl"
      >
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiração do acesso (opcional)</label>
              <input
                type="date"
                value={inviteExpiresAt}
                onChange={e => setInviteExpiresAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">Após essa data o usuário perde o acesso automaticamente.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => modal.closeModal()}
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
      </Modal>
    </div>
  );
}
