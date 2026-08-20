import { useState } from 'react';
import { useAuthUser } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useMyPaymentProofs } from '../hooks/usePixPayment';
import { PixPaymentModal } from './PixPaymentModal';
import { AlertTriangle, Clock, Wallet } from 'lucide-react';

const DIAS_AVISO = 7;

/**
 * Banner persistente de assinatura: alerta lojistas com vencimento próximo
 * (<= 7 dias), pendência de pagamento ou assinatura vencida/bloqueada, com
 * acesso direto ao fluxo de renovação Pix manual.
 */
export function SubscriptionBanner() {
  const { user } = useAuthUser();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: sub } = useSubscription(!!user && user.role !== 'SUPER_ADMIN');
  const { data: proofs } = useMyPaymentProofs(!!user && user.role !== 'SUPER_ADMIN' && !!sub);

  if (!sub || !user || user.role === 'SUPER_ADMIN') return null;

  const pendingProof = proofs?.find(p => p.status === 'AGUARDANDO_VALIDACAO');
  const status = sub.statusPagamento;

  const venc = new Date(sub.dataVencimento + (sub.dataVencimento.includes('T') ? '' : 'T00:00:00'));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  venc.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  const bloqueada = status === 'VENCIDO' || status === 'INADIMPLENTE';
  const pendente = status === 'PENDENTE';
  // TRIAL tem banner próprio (TrialBanner) — evita duplicidade
  const vencendo = status === 'PAGO' && diasRestantes <= DIAS_AVISO;

  if (!bloqueada && !pendente && !vencendo) return null;

  const titulo = bloqueada
    ? 'Sua assinatura está vencida e seu acesso foi bloqueado'
    : pendente
      ? 'Seu pagamento está pendente'
      : `Sua assinatura vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}`;

  const descricao = pendingProof
    ? 'Recebemos seu comprovante e ele está em análise pela nossa equipe.'
    : bloqueada
      ? 'Renove agora via Pix para reativar o acesso imediatamente após a validação.'
      : pendente
        ? 'Efetue o pagamento via Pix para garantir o acesso sem interrupção.'
        : 'Renove agora via Pix e evite a interrupção do serviço.';

  return (
    <>
      <div className={`px-3 md:px-8 py-2 md:py-3 flex flex-col md:flex-row justify-between items-center gap-2 text-xs md:text-sm text-white ${bloqueada ? 'bg-red-600' : 'bg-amber-500'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {pendingProof ? (
            <Clock className="w-4 h-4 shrink-0" />
          ) : bloqueada ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Wallet className="w-4 h-4 shrink-0" />
          )}
          <span className="font-semibold text-center md:text-left">{titulo}</span>
          <span className="text-white/80 text-center md:text-left hidden sm:inline">— {descricao}</span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 bg-white text-gray-900 font-bold px-4 py-1.5 rounded-lg hover:bg-gray-100 transition text-xs"
        >
          {pendingProof ? 'Acompanhar status' : 'Renovar via Pix'}
        </button>
      </div>
      <PixPaymentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}