import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Smartphone, QrCode, CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

export function WhatsAppConfigPage() {
  const [config, setConfig] = useState({
    whatsappApiUrl: '', whatsappApiKey: '',
    whatsappEnabled: false,
    whatsappSendConfirmation: false,
    whatsappSendReminder: false,
    whatsappSendBirthday: false,
    whatsappSendMarketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [qrCodeImg, setQrCodeImg] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{ state: string; number: string | null; profileName: string | null } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchApi('/whatsapp/config')
      .then(data => { if (data) setConfig(prev => ({ ...prev, ...data })); })
      .catch(() => toast.error('Erro ao carregar configuração'))
      .finally(() => setLoading(false));
    checkStatus();
  }, []);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const checkStatus = async () => {
    try {
      type StatusData = { connected: boolean; state: string; number: string | null; profileName: string | null };
      const data = await fetchApi<StatusData>('/whatsapp/qrcode/status');
      setConnected(data.connected);
      setConnectionInfo(data);
    } catch {}
  };

  const handleConnect = async () => {
    if (!config.whatsappApiUrl) { toast.error('Configure a URL da API primeiro'); return; }
    if (!config.whatsappApiKey) { toast.error('Configure a API Key primeiro'); return; }

    setQrCodeImg(null);
    setQrError(null);
    setQrLoading(true);
    setConnected(false);

    try {
      const res = await fetchApi<{ connected?: boolean; qrcode?: string; message?: string; error?: string }>('/whatsapp/qrcode', { method: 'POST' });

      if (res.connected) {
        setConnected(true);
        toast.success(res.message || 'WhatsApp já está conectado!');
        checkStatus();
        return;
      }

      if (res.qrcode) {
        setQrCodeImg(res.qrcode);
        toast.success('Escaneie o código QR com seu WhatsApp');

        // Poll for connection status every 3s
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            const statusData = await fetchApi<{ connected: boolean }>('/whatsapp/qrcode/status');
            if (statusData.connected) {
              setConnected(true);
              setQrCodeImg(null);
              setQrLoading(false);
              toast.success('WhatsApp conectado com sucesso!');
              if (pollingRef.current) clearInterval(pollingRef.current);
              checkStatus();
            }
          } catch {}
        }, 3000);
      } else {
        setQrError(res.error || 'Erro ao gerar QR Code');
        toast.error(res.error || 'Erro ao gerar QR Code');
      }
    } catch (err: unknown) {
      setQrError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/whatsapp/config', { method: 'PUT', body: JSON.stringify(config) });
      toast.success('Configuração salva!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!config.whatsappApiUrl) { toast.error('Configure a URL da API primeiro'); return; }
    setTesting(true);
    try {
      const res = await fetchApi<{ success: boolean; error?: string }>('/whatsapp/test', { method: 'POST' });
      if (res.success) toast.success('Mensagem de teste enviada!');
      else toast.error(res.error || 'Erro no teste');
    } catch { toast.error('Erro ao testar conexão'); }
    finally { setTesting(false); }
  };

  const ManagerLink = () => {
    const baseUrl = config.whatsappApiUrl?.replace(/\/message\/sendText\/[^/]+$/, '') || '';
    if (!baseUrl) return null;
    return (
      <a href={baseUrl + '/manager'} target="_blank" rel="noopener noreferrer"
        className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1">
        <ExternalLink className="w-3.5 h-3.5" /> Abrir Manager
      </a>
    );
  };

  if (loading) return <div className="text-gray-500 p-8">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integração WhatsApp</h1>
        <p className="text-gray-500 text-sm mt-1">Conecte sua API Evolution para enviar mensagens automáticas.</p>
      </div>

      {/* Status Banner */}
      {connectionInfo && (
        <div className={`p-4 rounded-xl border ${connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connected ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Smartphone className="w-5 h-5 text-amber-600" />}
              <div>
                <p className="font-semibold">{connected ? '✅ WhatsApp Conectado' : '📱 WhatsApp Desconectado'}</p>
                {connected && connectionInfo?.number && (
                  <p className="text-sm text-gray-600">{connectionInfo.profileName || 'WhatsApp'} — {connectionInfo.number}</p>
                )}
                {!connected && <p className="text-sm text-gray-600">Clique em "Conectar WhatsApp" para gerar o QR Code</p>}
              </div>
            </div>
            <ManagerLink />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold">1. Configurar API</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL da API</label>
          <input type="url"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm"
            placeholder="http://SEU-IP:8080/message/sendText/NOME_INSTANCIA"
            value={config.whatsappApiUrl}
            onChange={e => setConfig({ ...config, whatsappApiUrl: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm"
            placeholder="••••••••"
            value={config.whatsappApiKey}
            onChange={e => setConfig({ ...config, whatsappApiKey: e.target.value })} />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold">2. Conectar WhatsApp</h2>
        <p className="text-sm text-gray-500">Clique no botão para gerar o QR Code. Escaneie com o WhatsApp do seu celular.</p>

        {!connected && (
          <button onClick={handleConnect} disabled={qrLoading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition text-lg disabled:opacity-50 w-full justify-center">
            {qrLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Gerando QR Code...</>
            ) : (
              <><QrCode className="w-5 h-5" /> Conectar WhatsApp</>
            )}
          </button>
        )}

        {connected && (
          <div className="text-center p-6 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-emerald-800">WhatsApp Conectado</p>
            {connectionInfo?.number && <p className="text-sm text-emerald-600 mt-1">{connectionInfo.number}</p>}
            <div className="flex gap-3 mt-4 justify-center">
              <button onClick={handleTest} disabled={testing}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 text-sm">
                {testing ? 'Testando...' : '📱 Testar Envio'}
              </button>
              <button onClick={handleConnect}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
                <RefreshCw className="w-4 h-4" /> Reconectar
              </button>
            </div>
          </div>
        )}

        {/* QR Code Display */}
        {qrCodeImg && !connected && (
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl border-2 border-brand-200">
            <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              Escaneie o QR Code com seu WhatsApp
            </p>
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200">
              <img src={qrCodeImg} alt="QR Code WhatsApp" className="w-64 h-64" />
            </div>
            <p className="text-xs text-gray-400">O código atualiza automaticamente. Após escanear, a conexão será confirmada.</p>
          </div>
        )}

        {qrError && !connected && (
          <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-700">{qrError}</p>
            <p className="text-xs text-red-500 mt-1">Acesse o Manager manualmente para conectar, ou tente novamente.</p>
          </div>
        )}
      </div>

      {/* Auto Dispatch Config */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold">3. Disparos Automáticos</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={config.whatsappEnabled}
            onChange={e => setConfig({ ...config, whatsappEnabled: e.target.checked })}
            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
          <div><p className="font-medium text-gray-900">Habilitar disparos automáticos</p><p className="text-sm text-gray-500">Ativa o envio automático de mensagens</p></div>
        </label>

        <div className={`space-y-4 pl-7 ${config.whatsappEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.whatsappSendConfirmation}
              onChange={e => setConfig({ ...config, whatsappSendConfirmation: e.target.checked })}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
            <div><p className="font-medium text-gray-900">Confirmação de compra</p><p className="text-sm text-gray-500">Envia comprovante após cada venda</p></div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.whatsappSendReminder}
              onChange={e => setConfig({ ...config, whatsappSendReminder: e.target.checked })}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
            <div><p className="font-medium text-gray-900">Lembrete de cobrança</p><p className="text-sm text-gray-500">Aviso automático de contas a vencer</p></div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.whatsappSendBirthday}
              onChange={e => setConfig({ ...config, whatsappSendBirthday: e.target.checked })}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
            <div><p className="font-medium text-gray-900">Aniversário</p><p className="text-sm text-gray-500">Mensagem automática para clientes</p></div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={config.whatsappSendMarketing}
              onChange={e => setConfig({ ...config, whatsappSendMarketing: e.target.checked })}
              className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500" />
            <div><p className="font-medium text-gray-900">Marketing</p><p className="text-sm text-gray-500">Campanhas em massa para clientes</p></div>
          </label>
        </div>
      </div>
    </div>
  );
}
