import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { useApiQuery, STALE_TIMES } from '../lib/query';

export interface PixConfig {
  chavePix: string;
  beneficiario: string;
  whatsappSuporte: string;
  valor: number;
  plano: string;
  subscriptionId: string;
  dataVencimento: string;
}

export interface PaymentProof {
  id: string;
  status: 'AGUARDANDO_VALIDACAO' | 'APROVADO' | 'REJEITADO';
  valorDeclarado: number;
  transactionId: string | null;
  arquivoOriginal: string | null;
  motivoRejeicao: string | null;
  createdAt: string;
}

/** Configuração de Pagamento Pix manual (chave oficial + valor do plano do usuário) */
export function usePixConfig(enabled = true) {
  return useApiQuery<PixConfig | null>(
    ['subscriptions', 'pix-config'],
    '/subscriptions/pix-config',
    { enabled, staleTime: STALE_TIMES.STATIC, retry: false }
  );
}

/** Histórico de comprovantes enviados pelo lojista atual */
export function useMyPaymentProofs(enabled = true) {
  return useApiQuery<PaymentProof[]>(
    ['subscriptions', 'payment-proofs'],
    '/subscriptions/payment-proofs',
    { enabled, staleTime: STALE_TIMES.REALTIME, retry: false }
  );
}

/** Envio de comprovante/ID de transação Pix (rate-limited no backend) */
export function useSubmitPaymentProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { transactionId?: string; file?: File | null }) => {
      const form = new FormData();
      if (payload.transactionId?.trim()) form.append('transactionId', payload.transactionId.trim());
      if (payload.file) form.append('file', payload.file);
      return fetchApi<{ message: string; receipt: PaymentProof }>('/subscriptions/payment-proof', {
        method: 'POST',
        body: form,
        timeout: 30000,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'payment-proofs'] });
    },
  });
}