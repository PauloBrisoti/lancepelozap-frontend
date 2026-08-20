import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi, ApiError } from '../lib/api';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';
import { formatDateTimeBR } from '../lib/dates';
import { CheckCircle, XCircle, Eye, Loader2, Save, QrCode } from 'lucide-react';

interface PixProof {
  id: string;
  clientId: string;
  cliente: string;
  email: string;
  whatsapp: string | null;
  plano: string;
  status: 'AGUARDANDO_VALIDACAO' | 'APROVADO' | 'REJEITADO';
  transactionId: string | null;
  valorDeclarado: number;
  arquivoOriginal: string | null;
  temArquivo: boolean;
  motivoRejeicao: string | null;
  aprovadoEm: string | null;
  rejeitadoEm: string | null;
  createdAt: string;
}

interface PixProofsData {
  total: number;
  comprovantes: PixProof[];
}

interface PixConfig {
  chavePix: string;
  beneficiario: string;
  whatsappSuporte: string;
}

const STATUS_LABEL: Record<PixProof['status'], string> = {
  AGUARDANDO_VALIDACAO: 'Aguardando validação',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
};

const STATUS_STYLE: Record<PixProof['status'], string> = {
  AGUARDANDO_VALIDACAO: 'bg-amber-100 text-amber-700',
  APROVADO: 'bg-green-100 text-green-700',
  REJEITADO: 'bg-red-100 text-red-700',
};

export function PixProofsAdminPage() {
  const [filter, setFilter] = useState<'AGUARDANDO_VALIDACAO' | 'APROVADO' | 'REJEITADO' | 'TODOS'>('AGUARDANDO_VALIDACAO');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const [config, setConfig] = useState<PixConfig>({ chavePix: '', beneficiario: '', whatsappSuporte: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const { data: pixConfigData } = useApiQuery<PixConfig>(
    ['super-admin', 'pix-config'],
    '/super-admin/pix-config',
    { staleTime: STALE_TIMES.STATIC }
  );

  useEffect(() => {
    if (pixConfigData && !configLoaded) {
      setConfigLoaded(true);
      setConfig(pixConfigData);
    }
  }, [pixConfigData, configLoaded]);

  const { data, isLoading, refetch } = useApiQuery<PixProofsData>(
    ['super-admin', 'pix-proofs', filter],
    `/super-admin/pix-proofs${filter === 'TODOS' ? '' : `?status=${filter}`}`,
    { staleTime: STALE_TIMES.FREQUENT }
  );

  const approve = async (id: string) => {
    if (!confirm('Confirmar aprovação deste comprovante? A assinatura será renovada por +30 dias.')) return;
    setApprovingId(id);
    try {
      const res = await fetchApi<{ message: string }>(`/super-admin/pix-proofs/${id}/approve`, { method: 'POST' });
      toast.success(res.message);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar');
    } finally {
      setApprovingId(null);
    }
  };

  const startReject = (id: string) => {
    setMotivo('');
    setRejectingId(id);
  };

  const reject = async (id: string) => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }
    try {
      await fetchApi(`/super-admin/pix-proofs/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      toast.success('Comprovante rejeitado.');
      setRejectingId(null);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao rejeitar');
    }
  };

  const viewFile = async (item: PixProof) => {
    try {
      const buffer = await fetchApi<ArrayBuffer>(`/subscriptions/payment-proofs/${item.id}/file`, { raw: true, timeout: 30000 });
      const ext = (item.arquivoOriginal || '').split('.').pop()?.toLowerCase();
      const type = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
      const blob = new Blob([buffer], { type });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao abrir comprovante');
    }
  };

  const saveConfig = async () => {
    if (!config.chavePix.trim()) {
      toast.error('Informe a chave Pix.');
      return;
    }
    setSavingConfig(true);
    try {
      await fetchApi('/super-admin/pix-config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      toast.success('Chave Pix atualizada. O valor aparece automaticamente no modal dos lojistas.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar chave Pix');
    } finally {
      setSavingConfig(false);
    }
  };

  const lista = data?.comprovantes ?? [];
  const pendentes = data?.total ?? 0;

  if (isLoading && !data) return <div className="p-8 text-gray-500">Carregando comprovantes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renovações Pix Manuais</h1>
          <p className="text-gray-500 text-sm mt-1">
            Confira e aprove manualmente a extensão de 30 dias nas assinaturas dos lojistas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['AGUARDANDO_VALIDACAO', 'APROVADO', 'REJEITADO', 'TODOS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f === 'AGUARDANDO_VALIDACAO' ? `Aguardando (${pendentes})` : f === 'TODOS' ? 'Todos' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Configuração da chave Pix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Chave Pix oficial (Copia e Cola)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chave Pix</label>
            <input
              value={config.chavePix}
              onChange={e => setConfig({ ...config, chavePix: e.target.value })}
              placeholder="Ex: contato@lancepelozap.com.br"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Beneficiário</label>
            <input
              value={config.beneficiario}
              onChange={e => setConfig({ ...config, beneficiario: e.target.value })}
              placeholder="Ex: Lance Pelo Zap LTDA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp do suporte</label>
            <input
              value={config.whatsappSuporte}
              onChange={e => setConfig({ ...config, whatsappSuporte: e.target.value })}
              placeholder="Ex: 5511966401931"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
        <button
          onClick={saveConfig}
          disabled={savingConfig}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-60"
        >
          {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar chave Pix
        </button>
      </div>

      {/* Lista de comprovantes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold">Plano</th>
                <th className="text-right px-4 py-3 font-semibold">Valor</th>
                <th className="text-left px-4 py-3 font-semibold">ID da transação</th>
                <th className="text-center px-4 py-3 font-semibold">Comprovante</th>
                <th className="text-left px-4 py-3 font-semibold">Enviado em</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.cliente}</p>
                    <p className="text-xs text-gray-400">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.plano}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatBRL(item.valorDeclarado)}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{item.transactionId || '—'}</code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.temArquivo ? (
                      <button
                        onClick={() => viewFile(item)}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium"
                        title={item.arquivoOriginal || 'Ver comprovante'}
                      >
                        <Eye className="w-4 h-4" /> Ver
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTimeBR(item.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    {item.motivoRejeicao && (
                      <p className="text-xs text-red-500 mt-1" title={item.motivoRejeicao}>
                        {item.motivoRejeicao}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {item.status === 'AGUARDANDO_VALIDACAO' && (
                        <>
                          <button
                            onClick={() => approve(item.id)}
                            disabled={approvingId === item.id}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Aprovar e renovar +30 dias"
                          >
                            {approvingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => startReject(item.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Rejeitar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.status !== 'AGUARDANDO_VALIDACAO' && <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Nenhum comprovante {filter === 'AGUARDANDO_VALIDACAO' ? 'aguardando validação' : 'nesta categoria'}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de rejeição */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectingId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Rejeitar comprovante</h2>
            <p className="text-sm text-gray-600 mb-4">
              Informe o motivo para o lojista (o motivo é registrado e exibido a ele no painel).
            </p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={4}
              placeholder="Ex: Valor divergente do plano (pago R$ 50,00 em vez de R$ 99,90)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => reject(rejectingId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Rejeitar comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}