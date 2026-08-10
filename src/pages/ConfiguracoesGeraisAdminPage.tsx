import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import {
  Palette, CreditCard, Mail, Shield, Key, Database,
  Download, Trash2, Plus, Power, Megaphone, Flag, RefreshCw
} from 'lucide-react';
import { formatDateTimeBR } from '../lib/dates';
import type { Announcement } from '../types/api';

interface BackupFile { name: string; size: number; createdAt: string; }
interface ApiKey { id: string; name: string; key: string; active: boolean; }

interface FeatureFlag { key: string; label: string; enabled: boolean; }

export function ConfiguracoesGeraisAdminPage() {
  const [activeTab, setActiveTab] = useState('sistema');
  const [loading, setLoading] = useState(true);

  const [whiteLabel, setWhiteLabel] = useState({ appName: 'Lance Pelo Zap', appDomain: 'app.lancepelozap.com.br', primaryColor: '#2563eb', termsUrl: '', privacyUrl: '' });
  const [planLimits, setPlanLimits] = useState({ trialDays: 7, defaultUserLimit: 5, defaultStoreLimit: 1 });
  const [smtpConfig, setSmtpConfig] = useState({ host: 'smtp.hostinger.com', port: 465, user: 'contato@lancepelozap.com.br', password: '', fromEmail: 'contato@lancepelozap.com.br' });
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [gateways, setGateways] = useState({ mercadoPagoPublicKey: '', mercadoPagoAccessToken: '', whatsappApiUrl: '', whatsappApiToken: '' });

  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  const [saving, setSaving] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState<{ title: string; message: string; type: Announcement['type'] }>({ title: '', message: '', type: 'info' });
  const [newApiKey, setNewApiKey] = useState({ name: '' });
  const [newFlag, setNewFlag] = useState({ key: '', label: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsData, backupsData, announcementsData, flagsData, maintenanceData, keysData] = await Promise.all([
        fetchApi('/super-admin/settings').catch(() => []),
        fetchApi('/super-admin/backups').catch(() => []),
        fetchApi('/super-admin/announcements').catch(() => []),
        fetchApi('/super-admin/feature-flags').catch(() => ({ global: {} })),
        fetchApi('/super-admin/maintenance').catch(() => ({ enabled: false, message: '' })),
        fetchApi('/super-admin/api-keys').catch(() => []),
      ]);

      if (Array.isArray(settingsData)) {
        settingsData.forEach((item: Record<string, unknown>) => {
          const valor = item.valor as Record<string, unknown>;
          if (item.chave === 'WHITE_LABEL' && valor) setWhiteLabel(p => ({ ...p, ...valor }));
          if (item.chave === 'PLAN_LIMITS' && valor) setPlanLimits(p => ({ ...p, ...valor }));
          if (item.chave === 'SMTP_CONFIG' && valor) setSmtpConfig(p => ({ ...p, ...valor }));
          if (item.chave === 'GATEWAYS' && valor) setGateways(p => ({ ...p, ...valor }));
        });
      }
      setBackups(backupsData);
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      setFeatureFlags(Object.entries(flagsData.global || {}).map(([k, v]: [string, unknown]) => ({ key: k, label: k, enabled: v as boolean })));
      setMaintenance(maintenanceData);
      setApiKeys(Array.isArray(keysData) ? keysData : []);
    } catch {}
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/super-admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: [
            { chave: 'WHITE_LABEL', valor: whiteLabel, descricao: 'Identidade Visual e Domínio' },
            { chave: 'PLAN_LIMITS', valor: planLimits, descricao: 'Limites globais de assinaturas' },
            { chave: 'SMTP_CONFIG', valor: smtpConfig, descricao: 'Servidor de e-mail' },
            { chave: 'GATEWAYS', valor: gateways, descricao: 'Chaves de API Globais' },
          ]
        }),
      });
      toast.success('Configurações salvas!');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setSaving(false); }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await fetchApi('/super-admin/backup', { method: 'POST' });
      toast.success('Backup concluído!');
      const data = await fetchApi('/super-admin/backups');
      setBackups(data);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
    finally { setBackingUp(false); }
  };

  const saveAnnouncements = async () => {
    try {
      await fetchApi('/super-admin/announcements', {
        method: 'PUT',
        body: JSON.stringify({ announcements }),
      });
      toast.success('Anúncios salvos!');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const addAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return toast.error('Título e mensagem obrigatórios');
    setAnnouncements(p => [...p, { ...newAnnouncement, id: String(Date.now()), active: true }]);
    setNewAnnouncement({ title: '', message: '', type: 'info' });
  };

  const addApiKey = () => {
    if (!newApiKey.name) return toast.error('Nome obrigatório');
    const key = `lpz_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKeys(p => [...p, { id: String(Date.now()), name: newApiKey.name, key, active: true }]);
    setNewApiKey({ name: '' });
  };

  const saveApiKeysFn = async () => {
    try {
      await fetchApi('/super-admin/api-keys', {
        method: 'PUT',
        body: JSON.stringify({ apiKeys }),
      });
      toast.success('API Keys salvas!');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const saveFlags = async () => {
    try {
      const flags: Record<string, boolean> = {};
      featureFlags.forEach(f => { flags[f.key] = f.enabled; });
      await fetchApi('/super-admin/feature-flags', {
        method: 'PUT',
        body: JSON.stringify({ flags }),
      });
      toast.success('Feature flags salvas!');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const addFlag = () => {
    if (!newFlag.key) return toast.error('Chave obrigatória');
    setFeatureFlags(p => [...p, { key: newFlag.key, label: newFlag.label || newFlag.key, enabled: false }]);
    setNewFlag({ key: '', label: '' });
  };

  const toggleMaintenance = async () => {
    try {
      const next = { ...maintenance, enabled: !maintenance.enabled };
      const res = await fetchApi('/super-admin/maintenance', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      setMaintenance(next);
      toast.success(res.message);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const tabs = [
    { key: 'sistema', label: 'Sistema & Identidade', icon: Palette },
    { key: 'planos', label: 'Planos & Limites', icon: CreditCard },
    { key: 'comunicacao', label: 'E-mails (SMTP)', icon: Mail },
    { key: 'integracoes', label: 'Gateways & APIs', icon: Key },
    { key: 'anuncios', label: 'Anúncios In-App', icon: Megaphone },
    { key: 'flags', label: 'Feature Flags', icon: Flag },
    { key: 'backups', label: 'Backups', icon: Database },
    { key: 'api-keys', label: 'API Keys', icon: Shield },
    { key: 'manutencao', label: 'Manutenção', icon: Power },
  ];

  if (loading) return <div className="text-gray-500 p-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações Gerais (SaaS)</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie todo o seu SaaS em um só lugar.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 flex-none px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-6 max-w-3xl">
          {/* SISTEMA */}
          {activeTab === 'sistema' && (
            <>
              <h3 className="text-lg font-semibold">Identidade Visual</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Plataforma</label>
                  <input type="text" value={whiteLabel.appName} onChange={e => setWhiteLabel({...whiteLabel, appName: e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domínio Base</label>
                  <input type="text" value={whiteLabel.appDomain} onChange={e => setWhiteLabel({...whiteLabel, appDomain: e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
                  <div className="flex gap-2">
                    <input type="color" value={whiteLabel.primaryColor} onChange={e => setWhiteLabel({...whiteLabel, primaryColor: e.target.value})} className="h-10 w-10 border rounded cursor-pointer" />
                    <input type="text" value={whiteLabel.primaryColor} onChange={e => setWhiteLabel({...whiteLabel, primaryColor: e.target.value})} className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold pt-4 border-t">Documentos Legais</h3>
              <div className="space-y-3">
                <div><label className="block text-sm font-medium mb-1">URL dos Termos de Uso</label><input type="url" value={whiteLabel.termsUrl} onChange={e => setWhiteLabel({...whiteLabel, termsUrl: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium mb-1">URL da Política de Privacidade</label><input type="url" value={whiteLabel.privacyUrl} onChange={e => setWhiteLabel({...whiteLabel, privacyUrl: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
              </div>
            </>
          )}

          {/* PLANOS */}
          {activeTab === 'planos' && (
            <>
              <div className="bg-brand-50 text-brand-800 p-4 rounded-lg border text-sm">ℹ️ Limites padrão para novos lojistas.</div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium mb-1">Dias de Trial</label><input type="number" min="0" value={planLimits.trialDays} onChange={e => setPlanLimits({...planLimits, trialDays: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Limite de Usuários</label><input type="number" min="1" value={planLimits.defaultUserLimit} onChange={e => setPlanLimits({...planLimits, defaultUserLimit: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Limite de Lojas</label><input type="number" min="1" value={planLimits.defaultStoreLimit} onChange={e => setPlanLimits({...planLimits, defaultStoreLimit: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
              </div>
            </>
          )}

          {/* SMTP */}
          {activeTab === 'comunicacao' && (
            <>
              <div className="bg-brand-50 text-brand-800 p-4 rounded-lg border text-sm mb-4">
                📧 SMTP da Hostinger — Use porta 465 (SSL) ou 587 (TLS). 
                Senha é a senha do seu e-mail de acesso na Hostinger.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Host SMTP</label><input type="text" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Porta</label>
                  <select value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500">
                    <option value={465}>465 (SSL)</option>
                    <option value={587}>587 (TLS/STARTTLS)</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Usuário</label><input type="text" value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Senha</label><input type="password" value={smtpConfig.password} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">E-mail Remetente</label><input type="email" value={smtpConfig.fromEmail} onChange={e => setSmtpConfig({...smtpConfig, fromEmail: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Testar Configuração</h4>
                <div className="flex gap-3">
                  <input type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)}
                    placeholder="seu@email.com" className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
                  <button onClick={async () => {
                    if (!testEmailTo) return toast.error('Digite um e-mail');
                    setTestingEmail(true);
                    try {
                      await fetchApi('/super-admin/test-email', {
                        method: 'POST',
                        body: JSON.stringify({ to: testEmailTo, smtpConfig }),
                      });
                      toast.success('Email de teste enviado!');
                    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
                    finally { setTestingEmail(false); }
                  }} disabled={testingEmail}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
                    {testingEmail ? 'Enviando...' : 'Enviar Teste'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* INTEGRAÇÕES */}
          {activeTab === 'integracoes' && (
            <div className="space-y-6">
              <div><h3 className="text-lg font-semibold mb-3">Mercado Pago</h3>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div><label className="block text-sm font-medium mb-1">Access Token</label><input type="password" value={gateways.mercadoPagoAccessToken} onChange={e => setGateways({...gateways, mercadoPagoAccessToken: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                  <div><label className="block text-sm font-medium mb-1">Public Key</label><input type="text" value={gateways.mercadoPagoPublicKey} onChange={e => setGateways({...gateways, mercadoPagoPublicKey: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                </div>
              </div>
              <div><h3 className="text-lg font-semibold mb-3">WhatsApp API</h3>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div><label className="block text-sm font-medium mb-1">URL da API</label><input type="text" value={gateways.whatsappApiUrl} onChange={e => setGateways({...gateways, whatsappApiUrl: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                  <div><label className="block text-sm font-medium mb-1">Token Global</label><input type="password" value={gateways.whatsappApiToken} onChange={e => setGateways({...gateways, whatsappApiToken: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
                </div>
              </div>
            </div>
          )}

          {/* ANÚNCIOS */}
          {activeTab === 'anuncios' && (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1"><label className="block text-sm font-medium mb-1">Título</label><input type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                <div className="flex-1"><label className="block text-sm font-medium mb-1">Mensagem</label><input type="text" value={newAnnouncement.message} onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Tipo</label><select value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value as Announcement['type']})} className="border rounded-lg px-3 py-2 outline-none"><option value="info">Info</option><option value="warning">Alerta</option><option value="success">Sucesso</option></select></div>
                <button onClick={addAnnouncement} className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${a.type === 'warning' ? 'bg-amber-50 border-amber-200' : a.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-gray-600">{a.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setAnnouncements(p => p.map(x => x.id === a.id ? { ...x, active: !x.active } : x)); }} className={`text-xs px-2 py-1 rounded ${a.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{a.active ? 'Ativo' : 'Inativo'}</button>
                      <button onClick={() => setAnnouncements(p => p.filter(x => x.id !== a.id))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <p className="text-gray-400 text-sm">Nenhum anúncio criado.</p>}
              </div>
              <button onClick={saveAnnouncements} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">Salvar Anúncios</button>
            </>
          )}

          {/* FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <>
              <div className="flex items-end gap-3">
                <div><label className="block text-sm font-medium mb-1">Chave</label><input type="text" value={newFlag.key} onChange={e => setNewFlag({...newFlag, key: e.target.value})} placeholder="ex: modulo_relatorios" className="w-full border rounded-lg px-3 py-2 outline-none font-mono text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Nome</label><input type="text" value={newFlag.label} onChange={e => setNewFlag({...newFlag, label: e.target.value})} placeholder="ex: Relatórios Avançados" className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                <button onClick={addFlag} className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {featureFlags.map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-gray-500 font-mono">{f.key}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={f.enabled} onChange={() => setFeatureFlags(p => p.map(x => x.key === f.key ? { ...x, enabled: !x.enabled } : x))} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                      </label>
                      <button onClick={() => setFeatureFlags(p => p.filter(x => x.key !== f.key))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {featureFlags.length === 0 && <p className="text-gray-400 text-sm">Nenhuma flag criada.</p>}
              </div>
              <button onClick={saveFlags} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">Salvar Flags</button>
            </>
          )}

          {/* BACKUPS */}
          {activeTab === 'backups' && (
            <>
              <div className="bg-brand-50 text-brand-800 p-4 rounded-lg border text-sm mb-4">
                💾 Os backups são armazenados no servidor em <code className="bg-white px-1 rounded">/opt/backups/saas/</code>.
                Retenção automática de 30 dias. Para restaurar, use o script via SSH:
                <code className="block bg-white p-2 rounded mt-2 text-xs font-mono">/opt/saas/deploy/backup.sh --restore /caminho/do/arquivo.sql.gz</code>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleBackup} disabled={backingUp} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
                  <Database className="w-4 h-4" /> {backingUp ? 'Gerando...' : 'Gerar Backup Agora'}
                </button>
                <button onClick={async () => { try { const d = await fetchApi('/super-admin/backups'); setBackups(d); } catch {} }}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition">
                  <RefreshCw className="w-4 h-4" /> Atualizar
                </button>
              </div>
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTimeBR(b.createdAt)} — {(b.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`${import.meta.env.VITE_API_URL || '/api'}/super-admin/backups/${b.name}/download`}
                        className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium">
                        <Download className="w-4 h-4" /> Download
                      </a>
                      <button onClick={async () => {
                        if (!confirm(`Excluir backup ${b.name}?`)) return;
                        try {
                          await fetchApi(`/super-admin/backups/${b.name}`, { method: 'DELETE' });
                          toast.success('Backup excluído');
                          setBackups(p => p.filter(x => x.name !== b.name));
                    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
                      }} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && <p className="text-gray-400 text-sm">Nenhum backup disponível.</p>}
              </div>
            </>
          )}

          {/* API KEYS */}
          {activeTab === 'api-keys' && (
            <>
              <div className="flex items-end gap-3">
                <div><label className="block text-sm font-medium mb-1">Nome da Chave</label><input type="text" value={newApiKey.name} onChange={e => setNewApiKey({...newApiKey, name: e.target.value})} placeholder="ex: Integração Shopify" className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                <button onClick={addApiKey} className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700"><Plus className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{k.name}</p>
                        <p className="text-xs font-mono text-gray-500 select-all">{k.key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${k.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{k.active ? 'Ativa' : 'Inativa'}</span>
                        <button onClick={() => setApiKeys(p => p.map(x => x.id === k.id ? { ...x, active: !x.active } : x))} className="text-gray-500 hover:text-gray-700"><RefreshCw className="w-4 h-4" /></button>
                        <button onClick={() => setApiKeys(p => p.filter(x => x.id !== k.id))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {apiKeys.length === 0 && <p className="text-gray-400 text-sm">Nenhuma chave criada.</p>}
              </div>
              <button onClick={saveApiKeysFn} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700">Salvar API Keys</button>
            </>
          )}

          {/* MANUTENÇÃO */}
          {activeTab === 'manutencao' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-xl border-2 ${maintenance.enabled ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{maintenance.enabled ? '⚠️ Modo Manutenção ATIVO' : 'Sistema operando normalmente'}</h3>
                    <p className="text-sm text-gray-600">{maintenance.enabled ? 'Todos os lojistas verão a mensagem abaixo.' : 'Ative para bloquear o acesso de todos os lojistas.'}</p>
                  </div>
                  <button onClick={toggleMaintenance}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition ${
                      maintenance.enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                    }`}>
                    <Power className="w-4 h-4" />
                    {maintenance.enabled ? 'Desativar Manutenção' : 'Ativar Manutenção'}
                  </button>
                </div>
                {maintenance.enabled && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Mensagem exibida aos lojistas</label>
                    <input type="text" value={maintenance.message} onChange={e => setMaintenance({...maintenance, message: e.target.value})}
                      className="w-full border border-red-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SAVE BUTTON (for tabs that use handleSave) */}
        {['sistema', 'planos', 'comunicacao', 'integracoes'].includes(activeTab) && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button disabled={saving} onClick={handleSave}
              className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
