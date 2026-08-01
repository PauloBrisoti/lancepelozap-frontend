import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';

interface Permission {
  id?: string;
  module: string;
  accessLevel: 'FULL' | 'VIEW' | 'NONE';
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}

const MODULES = [
  { id: 'CLIENTES', label: 'Clientes e Lojas' },
  { id: 'PLANOS_E_MODULOS', label: 'Planos e Módulos' },
  { id: 'ACESSO_E_LIBERACOES', label: 'Acesso e Liberações (Impersonate)' },
  { id: 'FINANCEIRO', label: 'Financeiro' },
  { id: 'CHAMADOS', label: 'Chamados' },
  { id: 'AUDITORIA', label: 'Auditoria' },
  { id: 'CONFIGURACOES', label: 'Configurações Globais' }
];

export function PermissoesAdminPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    loadRoles();
  }, [user?.role]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/super-admin/team/roles');
      setRoles(res);
    } catch (error) {
      console.error('Erro ao carregar papéis', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (roleId: string, module: string, accessLevel: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id !== roleId) return r;
      
      const newPermissions = [...r.permissions];
      const existingIdx = newPermissions.findIndex(p => p.module === module);
      
      if (existingIdx >= 0) {
        newPermissions[existingIdx] = { ...newPermissions[existingIdx], accessLevel: accessLevel as any };
      } else {
        newPermissions.push({ module, accessLevel: accessLevel as any });
      }
      
      return { ...r, permissions: newPermissions };
    }));
  };

  const savePermissions = async (role: Role) => {
    try {
      await fetchApi(`/super-admin/team/roles/${role.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: role.permissions })
      });
      toast('Permissões salvas!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar permissões');
    }
  };

  if (loading) return <div className="p-8">Carregando permissões...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Matriz de Permissões</h1>
        <p className="text-gray-500 text-sm mt-1">Defina o que cada papel pode acessar no painel</p>
      </div>

      <div className="space-y-8">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{role.name}</h2>
                <p className="text-sm text-gray-500">{role.description}</p>
              </div>
              {!role.isSystem && (
                <button
                  onClick={() => savePermissions(role)}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                >
                  Salvar Permissões
                </button>
              )}
              {role.isSystem && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full border border-gray-200">
                  Papel de Sistema (Inalterável)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULES.map(mod => {
                const p = role.permissions.find(perm => perm.module === mod.id);
                const currentLevel = p ? p.accessLevel : 'NONE';
                
                return (
                  <div key={mod.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                    <p className="font-semibold text-gray-700 mb-3 text-sm">{mod.label}</p>
                    <select
                      disabled={role.isSystem}
                      value={currentLevel}
                      onChange={e => handlePermissionChange(role.id, mod.id, e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-gray-100"
                    >
                      <option value="FULL">Acesso Total</option>
                      <option value="VIEW">Somente Leitura</option>
                      <option value="NONE">Sem Acesso</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
