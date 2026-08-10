import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { trialDaysLeft } from '../utils/subscription';

export function TrialBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Banner de trial é exclusivo de lojistas; SUPER_ADMIN/equipe interna não
  // têm assinatura (o backend responderia 401, que derrubaria a sessão).
  const { data: sub } = useSubscription(!!user && user.role !== 'SUPER_ADMIN');

  if (!sub || sub.statusPagamento !== 'TRIAL') return null;

  const diffDays = trialDaysLeft(sub.dataVencimento);

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
