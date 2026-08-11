import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi, ApiError } from '../lib/api';
import { Modal } from '../components/Modal';
import { useModal } from '../hooks/useModal';

interface Permission {
  id?: string;
  module: string;
  accessLevel: 'FULL' | 'VIEW' | 'NONE';
  actions?: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
  _count?: { users: number };
  clientId?: string | null;
  client?: { id: string; nomeCompleto: string } | null;
}

const MODULES = [
  { id: 'CLIENTES', label: 'Clientes e Lojas' },
  { id: 'PLANOS_E_MODULOS', label: 'Planos e Módulos' },
  { id: 'ACESSO_E_LIBERACOES', label: 'Acesso e Liberações (Impersonate)' },
  { id: 'FINANCEIRO', label: 'Financeiro' },
  { id: 'AUDITORIA', label: 'Auditoria' },
  { id: 'CONFIGURACOES', label: 'Configurações Globais' }
];

const ACTIONS = [
  { id: 'create', label: 'Criar' },
  { id: 'read', label: 'Ver' },
  { id: 'update', label: 'Editar' },
  { id: 'delete', label: 'Excluir' }
];

const ALL_ACTIONS = ACTIONS.map(a => a.id);

const actionsFromPermission = (p?: Permission): string[] => {
  if (p?.actions && p.actions.length > 0) return p.actions;
  if (p?.accessLevel === 'FULL') return [...ALL_ACTIONS];
  if (p?.accessLevel === 'VIEW') return ['read'];
  return [];
};

const deriveAccessLevel = (actions: string[]): Permission['accessLevel'] => {
  if (actions.length === ALL_ACTIONS.length) return 'FULL';
  if (actions.length === 1 && actions[0] === 'read') return 'VIEW';
  return 'NONE';
};

export function PermissoesAdminPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirtyRoleIds, setDirtyRoleIds] = useState<string[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const modal = useModal();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [clients, setClients] = useState<{ id: string; nomeCompleto: string }[]>([]);
  const [lockdown, setLockdown] = useState(false);
  const [lockdownLoading, setLockdownLoading] = useState(true);
  const [lockdownPassword, setLockdownPassword] = useState('');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    loadRoles();
    loadLockdown();
    loadClients();
  }, [user?.role]);

  const loadClients = async () => {
    try {
      const res = await fetchApi('/super-admin/clients');
      setClients(res.map((c: { id: string; nomeCompleto: string }) => ({ id: c.id, nomeCompleto: c.nomeCompleto })));
    } catch (error) {
      console.error('Erro ao carregar clientes', error);
    }
  };

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/super-admin/team/roles');
      setRoles(res);
      setDirtyRoleIds([]);
    } catch (error) {
      console.error('Erro ao carregar papéis', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLockdown = async () => {
    try {
      const res = await fetchApi('/super-admin/settings/lockdown');
      setLockdown(res.enabled === true);
    } catch (error) {
      console.error('Erro ao carregar modo de emergência', error);
    } finally {
      setLockdownLoading(false);
    }
  };

  const isDirty = (roleId: string) => dirtyRoleIds.includes(roleId);

  const markDirty = (roleId: string, dirty = true) => {
    setDirtyRoleIds(prev => dirty ? [...new Set([...prev, roleId])] : prev.filter(id => id !== roleId));
  };

  const updateRolePermission = (roleId: string, moduleId: string, actions: string[]) => {
    const accessLevel = deriveAccessLevel(actions);
    setRoles(prev => prev.map(r => {
      if (r.id !== roleId) return r;
      const newPermissions = [...r.permissions];
      const existingIdx = newPermissions.findIndex(p => p.module === moduleId);
      const next = { module: moduleId, accessLevel, actions };
      if (existingIdx >= 0) {
        newPermissions[existingIdx] = { ...newPermissions[existingIdx], ...next };
      } else {
        newPermissions.push(next);
      }
      return { ...r, permissions: newPermissions };
    }));
    markDirty(roleId);
  };

  const handleToggleAction = (roleId: string, moduleId: string, action: string) => {
    const role = roles.find(r => r.id === roleId);
    const perm = role?.permissions.find(p => p.module === moduleId);
    const current = actionsFromPermission(perm);
    const next = current.includes(action)
      ? current.filter(a => a !== action)
      : [...current, action];
    updateRolePermission(roleId, moduleId, next);
  };

  const applyBulk = (roleId: string, level: Permission['accessLevel']) => {
    const actions = level === 'FULL' ? [...ALL_ACTIONS] : level === 'VIEW' ? ['read'] : [];
    setRoles(prev => prev.map(r => {
      if (r.id !== roleId) return r;
      return {
        ...r,
        permissions: MODULES.map(mod => ({ module: mod.id, accessLevel: deriveAccessLevel(actions), actions: [...actions] }))
      };
    }));
    markDirty(roleId);
  };

  const savePermissions = async (role: Role) => {
    try {
      setSavingRoleId(role.id);
      await fetchApi(`/super-admin/team/roles/${role.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissions: role.permissions.map(p => ({
            module: p.module,
            accessLevel: p.accessLevel,
            actions: actionsFromPermission(p)
          }))
        })
      });
      markDirty(role.id, false);
      toast.success('Permissões salvas!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar permissões');
    } finally {
      setSavingRoleId(null);
    }
  };

  const toggleLockdown = async () => {
    if (!lockdownPassword) {
      toast.error('Informe sua senha para confirmar.');
      return;
    }
    const next = !lockdown;
    try {
      await fetchApi('/super-admin/settings/lockdown', {
        method: 'PUT',
        body: JSON.stringify({ enabled: next, confirmPassword: lockdownPassword })
      });
      setLockdown(next);
      setLockdownPassword('');
      toast.success(next ? 'Modo de emergência ativado!' : 'Modo de emergência desativado.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar modo de emergência');
    }
  };

  const openNewRoleModal = () => {
    setFormName('');
    setFormDescription('');
    setFormClientId('');
    modal.openModal();
  };

  const openEditRoleModal = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormClientId(role.clientId || '');
    modal.openModal();
  };

  const closeRoleModal = () => {
    modal.closeModal();
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormClientId('');
  };

  const submitRoleModal = async () => {
    if (!formName.trim()) {
      toast.error('Informe o nome do papel.');
      return;
    }
    try {
      const payload = { name: formName, description: formDescription, clientId: formClientId || null };
      if (editingRole) {
        await fetchApi(`/super-admin/team/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Papel atualizado!');
      } else {
        await fetchApi('/super-admin/team/roles', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        toast.success('Papel criado!');
      }
      closeRoleModal();
      loadRoles();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar papel');
    }
  };

  const deleteRole = async (role: Role) => {
    if (!window.confirm(`Excluir o papel "${role.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await fetchApi(`/super-admin/team/roles/${role.id}`, { method: 'DELETE' });
      toast.success('Papel excluído.');
      loadRoles();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : 'Erro ao excluir papel');
      }
    }
  };

  if (loading) return <div className="p-8">Carregando permissões...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Matriz de Permissões</h1>
          <p className="text-gray-500 text-sm mt-1">Defina o que cada papel pode acessar no painel</p>
        </div>
        <button
          onClick={openNewRoleModal}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          + Novo Papel
        </button>
      </div>

      <div className={`mb-8 rounded-xl border p-5 flex justify-between items-center ${lockdown ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            {lockdown && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
            Modo de Emergência
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Quando ativo, apenas administradores raiz acessam o painel. Todos os demais papéis são bloqueados imediatamente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="password"
            placeholder="Sua senha para confirmar"
            value={lockdownPassword}
            onChange={e => setLockdownPassword(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none w-56"
          />
          <button
            onClick={toggleLockdown}
            disabled={lockdownLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${lockdown ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            {lockdown ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {roles.map(role => {
          const dirty = isDirty(role.id);
          const userCount = role._count?.users ?? 0;

          return (
            <div key={role.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden p-6 ${dirty ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{role.name}</h2>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-100 whitespace-nowrap">
                    {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                  </span>
                  {role.clientId && (
                    <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100 whitespace-nowrap" title="Escopo restrito a este cliente">
                      Loja: {role.client?.nomeCompleto || '—'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!role.isSystem && (
                    <>
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 mr-2">
                        {(['FULL', 'VIEW', 'NONE'] as const).map((level, i) => (
                          <button
                            key={level}
                            onClick={() => applyBulk(role.id, level)}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                              i > 0 ? 'border-l border-gray-200' : ''
                            } ${i === 0 ? 'bg-gray-50 hover:bg-gray-100 text-gray-600' : ''}`}
                          >
                            Tudo {level === 'FULL' ? 'FULL' : level === 'VIEW' ? 'VIEW' : 'NONE'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => openEditRoleModal(role)}
                        className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteRole(role)}
                        className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => savePermissions(role)}
                        disabled={!dirty || savingRoleId === role.id}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                      >
                        {savingRoleId === role.id ? 'Salvando...' : 'Salvar'}
                      </button>
                    </>
                  )}
                  {role.isSystem && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-200">
                      Papel de Sistema (Inalterável)
                    </span>
                  )}
                </div>
              </div>

              {dirty && (
                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Alterações não salvas — clique em Salvar para aplicar.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map(mod => {
                  const perm = role.permissions.find(p => p.module === mod.id);
                  const actions = actionsFromPermission(perm);

                  return (
                    <div key={mod.id} className={`border rounded-lg p-4 ${actions.length === 0 ? 'border-gray-100 bg-gray-50/40' : 'border-brand-100 bg-brand-50/40'}`}>
                      <p className="font-semibold text-gray-700 mb-3 text-sm">{mod.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {ACTIONS.map(action => {
                          const checked = actions.includes(action.id);
                          return (
                            <label
                              key={action.id}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors select-none ${
                                checked
                                  ? 'border-brand-600 bg-brand-600 text-white'
                                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                              } ${role.isSystem ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <input
                                type="checkbox"
                                disabled={role.isSystem}
                                checked={checked}
                                onChange={() => handleToggleAction(role.id, mod.id, action.id)}
                                className="hidden"
                              />
                              {action.label}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">
                        {actions.length === 0
                          ? 'Sem acesso'
                          : actions.length === 4
                            ? 'Acesso Total'
                            : actions.length === 1 && actions[0] === 'read'
                              ? 'Somente Leitura'
                              : 'Acesso personalizado'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={modal.open}
        onClose={closeRoleModal}
        size="sm"
        title={editingRole ? 'Editar Papel' : 'Novo Papel'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do papel *</label>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Ex.: OPERACIONAL"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="O que esse papel pode fazer?"
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escopo</label>
            <select
              value={formClientId}
              onChange={e => setFormClientId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
            >
              <option value="">Todos os clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nomeCompleto}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Selecione um cliente para restringir o acesso deste papel somente a ele.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={closeRoleModal}
            className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submitRoleModal}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {editingRole ? 'Salvar' : 'Criar Papel'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
