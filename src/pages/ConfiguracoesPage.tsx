import toast from 'react-hot-toast';
import { PAYMENT_METHOD_LABELS } from '../utils/domainMaps';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { Modal } from '../components/Modal';
import { useCrudList } from '../hooks/useCrudList';

interface Tenant {
  nomeFantasia: string;
  nichoPrincipal: string;
  telefoneWhatsapp: string;
  emailContato: string;
  chavePix: string;
  pixQrCodeUrl?: string;
  aliquotaImposto: number;
}

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  permiteVendaPrazo: boolean;
  limiteDescontoMaximo: number;
}

export function ConfiguracoesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'perfil' | 'loja' | 'equipe' | 'seguranca' | 'taxas' | 'comissoes'>('perfil');
  const [loading, setLoading] = useState(true);
  const [resetModalAberto, setResetModalAberto] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Tenant State
  const [tenant, setTenant] = useState<Tenant>({
    nomeFantasia: '',
    nichoPrincipal: '',
    telefoneWhatsapp: '',
    emailContato: '',
    chavePix: '',
    pixQrCodeUrl: '',
    aliquotaImposto: 0,
  });

  // Security State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [disable2FASenha, setDisable2FASenha] = useState('');
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(!!user?.twoFactorEnabled);

  // Profile State
  const [profileData, setProfileData] = useState({ nome: '', email: '', senhaAtual: '', novaSenha: '' });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({ ...prev, nome: user.nome || '', email: user.email || '' }));
    }
  }, [user]);

  // Users State
  const [equipe, setEquipe] = useState<User[]>([]);
  const [modalUserAberto, setModalUserAberto] = useState(false);
  const [userForm, setUserForm] = useState({
    id: '',
    nome: '',
    email: '',
    senha: '',
    role: 'VENDEDOR',
    permiteVendaPrazo: false,
    limiteDescontoMaximo: 0,
    ativo: true,
  });

  const isLojaAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const tenantData = await fetchApi('/settings/tenant');
      if (tenantData) {
        setTenant({
          nomeFantasia: tenantData.nomeFantasia || '',
          nichoPrincipal: tenantData.nichoPrincipal || '',
          telefoneWhatsapp: tenantData.telefoneWhatsapp || '',
          emailContato: tenantData.emailContato || '',
          chavePix: tenantData.chavePix || '',
          pixQrCodeUrl: tenantData.pixQrCodeUrl || '',
          aliquotaImposto: Number(tenantData.aliquotaImposto) || 0,
        });
      }

      if (isLojaAdmin) {
        const usersData = await fetchApi('/settings/users');
        setEquipe(usersData);
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const salvarLoja = async () => {
    try {
      await fetchApi('/settings/tenant', {
        method: 'PUT',
        body: JSON.stringify(tenant),
      });
      toast.success('Configurações da loja atualizadas com sucesso!');
    } catch {
      toast.error('Erro ao atualizar configurações da loja');
    }
  };

  const handleZerarFaturamento = async () => {
    if (resetConfirmText !== 'ZERAR') {
      toast.error('Digite ZERAR para confirmar');
      return;
    }
    try {
      await fetchApi('/settings/tenant/reset-revenue', {
        method: 'POST',
      });
      toast.success('Faturamento zerado com sucesso!');
      setResetModalAberto(false);
      setResetConfirmText('');
    } catch {
      toast.error('Erro ao zerar faturamento');
    }
  };

  const handleUploadPix = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast('A imagem deve ter no máximo 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await fetchApi('/settings/upload-pix', {
        method: 'POST',
        body: formData,
      });
      if (data.pixQrCodeUrl) {
        setTenant({ ...tenant, pixQrCodeUrl: data.pixQrCodeUrl });
        toast.success('QR Code do PIX enviado com sucesso!');
      } else {
        toast.success('QR Code do PIX enviado!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar imagem do QR Code.');
    }
  };

  const salvarUsuario = async () => {
    try {
      if (userForm.id) {
        // Edit
        await fetchApi(`/settings/users/${userForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(userForm),
        });
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        // Create
        await fetchApi('/settings/users', {
          method: 'POST',
          body: JSON.stringify(userForm),
        });
        toast.success('Funcionário criado com sucesso!');
      }
      setModalUserAberto(false);
      carregarDados();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar funcionário');
    }
  };

  const abrirModalNovo = () => {
    setUserForm({
      id: '',
      nome: '',
      email: '',
      senha: '',
      role: 'VENDEDOR',
      permiteVendaPrazo: false,
      limiteDescontoMaximo: 0,
      ativo: true,
    });
    setModalUserAberto(true);
  };

  const handleGenerate2FA = async () => {
    try {
      const data = await fetchApi('/auth/2fa/generate');
      setQrCodeUrl(data.qrCodeUrl);
      setTwoFactorSecret(data.secret);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar 2FA');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await fetchApi('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: twoFactorToken })
      });
      toast.success('2FA Ativado com sucesso!');
      setIs2FAEnabled(true);
      setQrCodeUrl('');
      setTwoFactorToken('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Código inválido');
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FASenha) {
      toast.error('Informe sua senha atual para desativar o 2FA');
      return;
    }
    setDisabling2FA(true);
    try {
      await fetchApi('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual: disable2FASenha })
      });
      toast.success('2FA desativado. Faça login novamente.');
      setIs2FAEnabled(false);
      setDisable2FASenha('');
      setQrCodeUrl('');
      setTwoFactorSecret('');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('session_expired'));
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar 2FA');
    } finally {
      setDisabling2FA(false);
    }
  };

  const abrirModalEditar = (u: User) => {
    setUserForm({
      id: u.id,
      nome: u.nome,
      email: u.email,
      senha: '',
      role: u.role,
      permiteVendaPrazo: u.permiteVendaPrazo,
      limiteDescontoMaximo: u.limiteDescontoMaximo,
      ativo: u.ativo,
    });
    setModalUserAberto(true);
  };

  if (loading) return <div className="text-gray-500">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie os dados da sua loja e os acessos da sua equipe.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* TABS */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'perfil' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Meu Perfil
          </button>
          <button
            onClick={() => setActiveTab('loja')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'loja' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dados da Loja
          </button>
          {isLojaAdmin && (
            <button
              onClick={() => setActiveTab('equipe')}
              className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'equipe' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Equipe e Acessos
            </button>
          )}
          <button
            onClick={() => setActiveTab('seguranca')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'seguranca' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Segurança
          </button>
          <button
            onClick={() => setActiveTab('taxas')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'taxas' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Taxas de Pagamento
          </button>
          <button
            onClick={() => setActiveTab('comissoes')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'comissoes' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Comissões
          </button>
        </div>

        {/* TAB CONTENT: PERFIL */}
        {activeTab === 'perfil' && (
          <div className="p-6 space-y-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Meu Perfil</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await fetchApi('/auth/profile', {
                  method: 'PUT',
                  body: JSON.stringify(profileData),
                });
                if (profileData.nome) {
                  const stored = localStorage.getItem('@LancePeloZap:user');
                  if (stored) {
                    const u = JSON.parse(stored);
                    u.nome = profileData.nome;
                    localStorage.setItem('@LancePeloZap:user', JSON.stringify(u));
                  }
                }
                toast.success('Perfil atualizado');
                setProfileData({ nome: '', email: '', senhaAtual: '', novaSenha: '' });
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
              }
            }}>
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input type="text" value={profileData.nome} onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                  <input type="password" value={profileData.senhaAtual} onChange={(e) => setProfileData({ ...profileData, senhaAtual: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="Obrigatório para alterar senha" />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <input type="password" value={profileData.novaSenha} onChange={(e) => setProfileData({ ...profileData, novaSenha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="Deixe em branco para manter" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB CONTENT: LOJA */}
        {activeTab === 'loja' && (
          <div className="p-6 space-y-6 max-w-2xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia da Loja</label>
                <input 
                  type="text" 
                  value={tenant.nomeFantasia} 
                  onChange={(e) => setTenant({ ...tenant, nomeFantasia: e.target.value })}
                  disabled={!isLojaAdmin}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nicho Principal</label>
                <input 
                  type="text" 
                  value={tenant.nichoPrincipal} 
                  onChange={(e) => setTenant({ ...tenant, nichoPrincipal: e.target.value })}
                  disabled={!isLojaAdmin}
                  placeholder="Ex: Roupas, Eletrônicos..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  value={tenant.telefoneWhatsapp} 
                  onChange={(e) => setTenant({ ...tenant, telefoneWhatsapp: e.target.value })}
                  disabled={!isLojaAdmin}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Contato</label>
                <input 
                  type="email" 
                  value={tenant.emailContato} 
                  onChange={(e) => setTenant({ ...tenant, emailContato: e.target.value })}
                  disabled={!isLojaAdmin}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX (Recebimentos)</label>
                <input 
                  type="text" 
                  value={tenant.chavePix} 
                  onChange={(e) => setTenant({ ...tenant, chavePix: e.target.value })}
                  disabled={!isLojaAdmin}
                  placeholder="CPF/CNPJ, E-mail ou Celular"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alíquota de Imposto (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0" max="100" step="0.01"
                    value={tenant.aliquotaImposto} 
                    onChange={(e) => setTenant({ ...tenant, aliquotaImposto: Number(e.target.value) || 0 })}
                    disabled={!isLojaAdmin}
                    placeholder="Ex: 6"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none disabled:bg-gray-100" 
                  />
                  <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Alíquota do Simples Nacional MEI para cálculo de imposto estimado nos relatórios</p>
              </div>

              {/* Upload QR Code PIX */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code do PIX (WhatsApp)</label>
                <div className="flex items-center gap-6">
                  {tenant.pixQrCodeUrl ? (
                    <div className="relative">
                      <img src={tenant.pixQrCodeUrl || ''} alt="QR Code PIX" className="w-24 h-24 object-cover border border-gray-200 rounded-lg shadow-sm" />
                      <button 
                        onClick={() => setTenant({ ...tenant, pixQrCodeUrl: '' })} 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-2">Faça o upload do seu QR Code do PIX. Ele será enviado automaticamente junto com as mensagens de cobrança no WhatsApp.</p>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadPix}
                      disabled={!isLojaAdmin}
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Catálogo Digital */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <h4 className="text-sm font-bold text-green-800 mb-2">📱 Seu Link de Catálogo Digital</h4>
              <p className="text-xs text-green-600 mb-3">Compartilhe este link com seus clientes para que vejam seus produtos e façam pedidos via WhatsApp.</p>
              <div className="flex gap-2">
                <input type="text" className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-500" readOnly 
                  value={`${window.location.origin}/catalogo/${user?.storeId || ''}`} />
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/catalogo/${user?.storeId || ''}`);
                    toast('Link copiado!');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                >
                  Copiar
                </button>
              </div>
            </div>
            
            {isLojaAdmin && (
              <>
                <div className="pt-8 border-t border-gray-100 mt-8">
                  <h4 className="text-sm font-bold text-red-600 mb-2">⚠️ Zona de Risco</h4>
                  <p className="text-xs text-gray-600 mb-4">
                    As ações abaixo são irreversíveis e afetam permanentemente os dados da sua loja.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setResetModalAberto(true)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
                    >
                      Zerar Faturamento
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-8 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={salvarLoja}
                  className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition"
                >
                  Salvar Alterações
                </button>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB CONTENT: EQUIPE */}
        {activeTab === 'equipe' && isLojaAdmin && (
          <div className="p-0">
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Funcionários</h2>
              <button 
                onClick={abrirModalNovo}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition flex items-center text-sm"
              >
                + Novo Funcionário
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                    <th className="p-4 font-semibold text-gray-600">Nome</th>
                    <th className="p-4 font-semibold text-gray-600">E-mail</th>
                    <th className="p-4 font-semibold text-gray-600">Cargo</th>
                    <th className="p-4 font-semibold text-gray-600">Desconto Máx.</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {equipe.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-900 font-medium">{u.nome}</td>
                      <td className="p-4 text-gray-500 text-sm">{u.email}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{u.limiteDescontoMaximo}%</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button onClick={() => abrirModalEditar(u)} className="text-brand-600 hover:text-brand-800 text-sm font-medium">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {equipe.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum funcionário encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SEGURANÇA */}
        {activeTab === 'seguranca' && (
          <div className="p-6 space-y-6 max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Autenticação em Duas Etapas (2FA)</h3>
            <p className="text-sm text-gray-500">
              Adicione uma camada extra de segurança à sua conta. Ao ativar, você precisará digitar um código do Google Authenticator ou Authy sempre que fizer login.
            </p>

            {is2FAEnabled ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <div>
                    <h4 className="font-bold text-green-800">2FA Ativado</h4>
                    <p className="text-sm text-green-700">Sua conta está protegida.</p>
                  </div>
                </div>
                <div className="border border-gray-200 p-4 rounded-xl space-y-3 max-w-xs">
                  <p className="text-sm font-medium text-gray-900">Desativar autenticação em duas etapas</p>
                  <input
                    type="password"
                    value={disable2FASenha}
                    onChange={(e) => setDisable2FASenha(e.target.value)}
                    placeholder="Senha atual"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <button
                    onClick={handleDisable2FA}
                    disabled={disabling2FA || disable2FASenha.length < 8}
                    className="bg-rose-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    {disabling2FA ? 'Desativando...' : 'Desativar 2FA'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border border-gray-200 p-4 rounded-xl">
                {!qrCodeUrl ? (
                  <button 
                    onClick={handleGenerate2FA}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition"
                  >
                    Iniciar Configuração 2FA
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-gray-900">1. Escaneie o QR Code abaixo com seu aplicativo de autenticação:</p>
                    <div className="bg-white inline-block p-2 border border-gray-200 rounded-lg shadow-sm">
                      <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-gray-500">Chave manual: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono">{twoFactorSecret}</code></p>
                    
                    <p className="text-sm font-medium text-gray-900 mt-4">2. Digite o código de 6 dígitos gerado:</p>
                    <div className="flex gap-2 max-w-xs">
                      <input 
                        type="text" 
                        maxLength={6}
                        value={twoFactorToken}
                        onChange={e => setTwoFactorToken(e.target.value)}
                        placeholder="000000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest focus:ring-2 focus:ring-brand-500 outline-none"
                      />
                      <button 
                        onClick={handleEnable2FA}
                        disabled={twoFactorToken.length < 6}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Ativar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: TAXAS DE PAGAMENTO */}
        {activeTab === 'taxas' && (
          <PaymentFeesSection />
        )}

        {/* TAB CONTENT: COMISSÕES */}
        {activeTab === 'comissoes' && (
          <CommissionSection />
        )}
      </div>

      {/* MODAL USUÁRIO */}
      {modalUserAberto && (
        <Modal open={modalUserAberto} onClose={() => setModalUserAberto(false)} size="sm" rounded="xl" padded={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">{userForm.id ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
              <button onClick={() => setModalUserAberto(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={userForm.nome} 
                  onChange={e => setUserForm({...userForm, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={userForm.email} 
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  disabled={!!userForm.id} // Não deixa mudar e-mail de usuário existente por enquanto
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-gray-100" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {userForm.id && <span className="text-xs text-gray-400 font-normal">(Deixe em branco para manter)</span>}
                </label>
                <input 
                  type="password" 
                  value={userForm.senha} 
                  onChange={e => setUserForm({...userForm, senha: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select 
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Máx. (%)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={userForm.limiteDescontoMaximo} 
                    onChange={e => setUserForm({...userForm, limiteDescontoMaximo: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={userForm.permiteVendaPrazo}
                    onChange={e => setUserForm({...userForm, permiteVendaPrazo: e.target.checked})}
                    className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer" 
                  />
                  <span>Permitir vendas "A Prazo" (Fiado)</span>
                </label>
              </div>

              {userForm.id && (
                <div className="pt-2">
                  <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={userForm.ativo}
                      onChange={e => setUserForm({...userForm, ativo: e.target.checked})}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer" 
                    />
                    <span>Usuário Ativo (Pode fazer login)</span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setModalUserAberto(false)} 
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarUsuario} 
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition"
              >
                Salvar
              </button>
            </div>
        </Modal>
      )}

      {/* MODAL CONFIRMAR ZERAR FATURAMENTO */}
      {resetModalAberto && (
        <Modal open={resetModalAberto} onClose={() => setResetModalAberto(false)} size="sm" rounded="xl" padded={false} className="overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="text-lg font-bold text-red-800">⚠️ Zerar Faturamento</h3>
              <button onClick={() => setResetModalAberto(false)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">
                Esta ação é <strong>irreversível</strong>. Todos os registros de vendas, caixas e transações financeiras desta loja serão permanentemente excluídos.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                Para confirmar, digite <strong>ZERAR</strong> no campo abaixo:
              </p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="ZERAR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none uppercase"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button 
                onClick={() => setResetModalAberto(false)} 
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleZerarFaturamento} 
                disabled={resetConfirmText !== 'ZERAR'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Exclusão
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// PAYMENT FEES SECTION
// ============================================================================
interface PaymentFee {
  id: string;
  formaPagamento: string;
  parcelas: number;
  taxaPercentual: number;
  taxaFixa: number;
  prazoRecebimento: number;
}

interface PaymentFeeForm {
  formaPagamento: string;
  parcelas: number;
  taxaPercentual: number;
  taxaFixa: number;
  prazoRecebimento: number;
}


function PaymentFeesSection() {
  const {
    items: fees, loading, saving, modalOpen, editing, form, setForm,
    openNew, openEdit, closeModal, handleSave, handleDelete,
  } = useCrudList<PaymentFee, PaymentFeeForm>({
    endpoint: '/payment-fees',
    loadList: () => fetchApi('/payment-fees'),
    createDefault: () => ({ formaPagamento: 'PIX', parcelas: 1, taxaPercentual: 0, taxaFixa: 0, prazoRecebimento: 0 }),
    toForm: (fee) => ({
      formaPagamento: fee.formaPagamento,
      parcelas: fee.parcelas,
      taxaPercentual: Number(fee.taxaPercentual),
      taxaFixa: Number(fee.taxaFixa),
      prazoRecebimento: Number(fee.prazoRecebimento),
    }),
    messages: {
      loadError: 'Erro ao carregar taxas',
      createSuccess: 'Taxa criada!',
      updateSuccess: 'Taxa atualizada!',
      deleteSuccess: 'Taxa removida!',
      deleteConfirm: 'Remover esta taxa?',
      saveError: 'Erro ao salvar taxa',
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Taxas de Pagamento</h3>
          <p className="text-sm text-gray-500 mt-1">Configure taxas por forma de pagamento e parcelas</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm">
          Nova Taxa
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : fees.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhuma taxa configurada. Adicione taxas para calcular automaticamente os valores de gateway nas vendas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-500 font-medium">Forma de Pagamento</th>
                <th className="text-right py-3 text-gray-500 font-medium">Parcelas</th>
                <th className="text-right py-3 text-gray-500 font-medium">Taxa %</th>
                <th className="text-right py-3 text-gray-500 font-medium">Taxa Fixa</th>
                <th className="text-right py-3 text-gray-500 font-medium">Prazo (dias)</th>
                <th className="text-center py-3 text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                <tr key={fee.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3">{PAYMENT_METHOD_LABELS[fee.formaPagamento] || fee.formaPagamento}</td>
                  <td className="py-3 text-right">{fee.parcelas}x</td>
                  <td className="py-3 text-right">{Number(fee.taxaPercentual).toFixed(2)}%</td>
                  <td className="py-3 text-right">R$ {Number(fee.taxaFixa).toFixed(2)}</td>
                  <td className="py-3 text-right">{fee.prazoRecebimento}d</td>
                  <td className="py-3 text-center">
                    <button onClick={() => openEdit(fee)} className="text-brand-600 hover:text-brand-800 text-sm font-medium mr-3">Editar</button>
                    <button onClick={() => handleDelete(fee.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal open={modalOpen} onClose={closeModal} size="sm" rounded="xl" padded={false}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar Taxa' : 'Nova Taxa'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                <select value={form.formaPagamento} onChange={e => setForm({...form, formaPagamento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_CREDITO">Cartão Crédito</option>
                  <option value="CARTAO_DEBITO">Cartão Débito</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CREDIARIO">Crediário</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                <input type="number" min="1" value={form.parcelas} onChange={e => setForm({...form, parcelas: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa (%)</label>
                  <input type="number" step="0.01" min="0" value={form.taxaPercentual} onChange={e => setForm({...form, taxaPercentual: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa Fixa (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.taxaFixa} onChange={e => setForm({...form, taxaFixa: Number(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Recebimento (dias)</label>
                <input type="number" min="0" value={form.prazoRecebimento} onChange={e => setForm({...form, prazoRecebimento: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// COMMISSION SECTION
// ============================================================================
interface CommissionRule {
  id: string;
  userId: string;
  user: { id: string; nome: string };
  categoryId: string | null;
  category: { id: string; nome: string } | null;
  percentual: number;
  ativo: boolean;
}

interface TeamUser {
  id: string;
  nome: string;
}

interface CommissionRuleForm {
  userId: string;
  categoryId: string;
  percentual: number;
}

function CommissionSection() {
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);

  const {
    items: rules, loading, saving, modalOpen, editing, form, setForm,
    openNew, openEdit, closeModal, handleSave, handleDelete, load,
  } = useCrudList<CommissionRule, CommissionRuleForm>({
    endpoint: '/commissions',
    loadList: async () => {
      const [rulesData, teamData, catData] = await Promise.all([
        fetchApi('/commissions'),
        fetchApi('/settings/team').catch(() => []),
        fetchApi('/categories'),
      ]);
      setTeam(teamData || []);
      setCategories(catData || []);
      return rulesData || [];
    },
    createDefault: () => ({ userId: team[0]?.id || '', categoryId: '', percentual: 0 }),
    toForm: (rule) => ({
      userId: rule.userId,
      categoryId: rule.categoryId || '',
      percentual: Number(rule.percentual),
    }),
    messages: {
      loadError: 'Erro ao carregar dados',
      createSuccess: 'Comissão criada!',
      updateSuccess: 'Comissão atualizada!',
      deleteSuccess: 'Regra removida!',
      deleteConfirm: 'Remover esta regra de comissão?',
      saveError: 'Erro ao salvar',
    },
  });

  const toggleActive = async (rule: CommissionRule) => {
    try {
      await fetchApi(`/commissions/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ativo: !rule.ativo }),
      });
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao alterar status'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Regras de Comissão</h3>
          <p className="text-sm text-gray-500 mt-1">Configure percentuais de comissão por vendedor e categoria</p>
        </div>
        <button onClick={openNew} disabled={team.length === 0} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm disabled:opacity-50">
          Nova Regra
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : rules.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhuma regra de comissão configurada. Adicione regras para calcular automaticamente a comissão dos vendedores nas vendas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-right py-3 text-gray-500 font-medium">% Comissão</th>
                <th className="text-center py-3 text-gray-500 font-medium">Ativo</th>
                <th className="text-center py-3 text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3">{rule.user.nome}</td>
                  <td className="py-3">{rule.category?.nome || <span className="text-gray-400">Todas</span>}</td>
                  <td className="py-3 text-right font-semibold">{Number(rule.percentual).toFixed(2)}%</td>
                  <td className="py-3 text-center">
                    <button onClick={() => toggleActive(rule)} className={`text-xs font-medium px-2 py-0.5 rounded ${rule.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-3 text-center">
                    <button onClick={() => openEdit(rule)} className="text-brand-600 hover:text-brand-800 text-sm font-medium mr-3">Editar</button>
                    <button onClick={() => handleDelete(rule.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal open={modalOpen} onClose={closeModal} size="sm" rounded="xl" padded={false}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">{editing ? 'Editar Comissão' : 'Nova Comissão'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <select value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  {team.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria <span className="text-gray-400 font-normal">(deixe vazio para todas)</span></label>
                <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option value="">Todas as categorias</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percentual (%)</label>
                <input type="number" step="0.01" min="0" max="100" value={form.percentual}
                  onChange={e => setForm({...form, percentual: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
