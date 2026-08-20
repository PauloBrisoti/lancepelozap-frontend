import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';
import { Copy, Check, Upload, Loader2, QrCode, MessageCircle, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { formatBRL } from '../utils/format';
import { formatDateBR } from '../lib/dates';
import { usePixConfig, useMyPaymentProofs, useSubmitPaymentProof } from '../hooks/usePixPayment';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

export function PixPaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [transactionId, setTransactionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: config } = usePixConfig(open);
  const { data: proofs } = useMyPaymentProofs(open);
  const submit = useSubmitPaymentProof();

  const pending = proofs?.find(p => p.status === 'AGUARDANDO_VALIDACAO');

  const handleCopy = async () => {
    if (!config) return;
    try {
      await navigator.clipboard.writeText(config.chavePix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente.');
    }
  };

  const handleFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Formato não permitido. Use .jpg, .png ou .pdf.');
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo de 5MB.');
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!transactionId.trim() && !file) {
      toast.error('Informe o ID da transação Pix ou anexe o comprovante.');
      return;
    }
    try {
      const res = await submit.mutateAsync({ transactionId, file });
      toast.success(res.message);
      setSent(true);
      setTransactionId('');
      setFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar comprovante');
    }
  };

  const whatsappUrl = config?.whatsappSuporte
    ? `https://wa.me/${config.whatsappSuporte.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Enviei meu comprovante de pagamento Pix pelo painel.')}`
    : null;

  return (
    <Modal open={open} onClose={onClose} closeDisabled={submit.isPending} title="Renovar Assinatura via Pix" size="md">
      <div className="space-y-5">
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-semibold text-gray-900 text-lg">Comprovante enviado!</p>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              Nossa equipe vai validar o pagamento e liberar o acesso em até <strong>24h úteis</strong>. Você receberá a confirmação por e-mail.
            </p>
            <button
              onClick={() => { setSent(false); onClose(); }}
              className="mt-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition"
            >
              Entendi
            </button>
          </div>
        ) : (
          <>
            {pending ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Você já tem um comprovante em análise</p>
                  <p className="mt-1">
                    Enviado em {formatDateBR(pending.createdAt)}. Assim que a equipe validar, sua assinatura será renovada automaticamente.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Valor do plano {config?.plano}</p>
                    <p className="text-2xl font-bold text-gray-900">{config ? formatBRL(config.valor) : '—'}</p>
                    {config?.dataVencimento && (
                      <p className="text-xs text-gray-500 mt-0.5">Vencimento atual: {formatDateBR(config.dataVencimento)}</p>
                    )}
                  </div>
                  <QrCode className="w-10 h-10 text-brand-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1.5">Pague via Pix (Copia e Cola)</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={config?.chavePix || 'Carregando chave Pix...'}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 font-mono truncate"
                      aria-label="Chave Pix"
                    />
                    <button
                      onClick={handleCopy}
                      disabled={!config}
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50"
                    >
                      {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar Chave</>}
                    </button>
                  </div>
                  {config?.beneficiario && (
                    <p className="text-xs text-gray-500 mt-1.5">Beneficiário: {config.beneficiario}</p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Confirme o pagamento</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Após pagar, cole o <strong>ID da transação (End-to-End ID)</strong> do Pix e/ou anexe o comprovante.
                  </p>
                  <input
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="Ex: E2E1234567890ABC1234567890ABC12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    maxLength={80}
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submit.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Upload className="w-4 h-4" />
                      {file ? file.name : 'Anexar comprovante'}
                    </button>
                    {file && (
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={e => handleFile(e.target.files?.[0] ?? null)}
                    />
                    <span className="text-xs text-gray-400">jpg, png ou pdf — máx. 5MB</span>
                  </div>
                </div>

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <MessageCircle className="w-4 h-4" /> Prefere enviar pelo WhatsApp? Fale com o suporte
                  </a>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submit.isPending}
                  className="w-full py-3 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar comprovante'}
                </button>
              </>
            )}

            {proofs?.filter(p => p.status === 'REJEITADO').map(p => (
              <div key={p.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">Comprovante recusado</p>
                  {p.motivoRejeicao && <p className="mt-1">{p.motivoRejeicao}</p>}
                  <p className="mt-1 text-xs text-red-600">Envie um novo comprovante válido acima.</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}