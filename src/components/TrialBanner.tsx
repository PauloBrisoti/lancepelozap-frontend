import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';

interface SubscriptionData {
  id: string;
  statusPagamento: string;
  dataVencimento: string;
  valorMensalidade: number;
}

export function TrialBanner() {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    fetchApi<SubscriptionData>('/subscriptions/me')
      .then(d => setSub(d))
      .catch(() => {});
  }, []);

  if (!sub || sub.statusPagamento !== 'TRIAL') return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(sub.dataVencimento);
  venc.setHours(0, 0, 0, 0);
  const diffMs = venc.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 30) return null;

  const isExpired = diffDays <= 0;
  const isUrgent = diffDays <= 3 && diffDays > 0;

  const bg = isExpired ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className={`${bg} text-white px-3 md:px-8 py-2 md:py-3 flex flex-col md:flex-row justify-between items-center gap-2 text-xs md:text-sm`}>
      <span className="font-semibold text-center md:text-left">
        {isExpired
          ? 'Seu período de teste gratuito expirou!'
          : `Período de teste gratuito — ${diffDays} ${diffDays === 1 ? 'dia restante' : 'dias restantes'}`
        }
      </span>
      <span className="text-white/80 text-center md:text-left">
        {isExpired
          ? 'Assine um plano para continuar usando o sistema.'
          : `Seu acesso expira em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}. Assine agora e não perca nenhuma funcionalidade.`
        }
      </span>
      <button
        onClick={() => navigate('/app/planos')}
        className="shrink-0 bg-white text-gray-900 font-bold px-4 py-1.5 rounded-lg hover:bg-gray-100 transition text-xs"
      >
        {isExpired ? 'Assinar Plano' : 'Ver Planos'}
      </button>
    </div>
  );
}
