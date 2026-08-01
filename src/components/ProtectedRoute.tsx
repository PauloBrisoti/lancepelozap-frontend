import { useState, useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApi, ApiError } from '../lib/api';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading, user } = useAuth();
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'SUPER_ADMIN' && !location.pathname.startsWith('/admin')) {
      fetchApi('/subscriptions/me')
        .then((data: { statusPagamento: string } | null) => {
          if (data && (data.statusPagamento === 'INADIMPLENTE' || data.statusPagamento === 'VENCIDO' || data.statusPagamento === 'PENDENTE')) {
            setSubscriptionBlocked(true);
          } else {
            setSubscriptionBlocked(false);
          }
        })
        .catch((err: ApiError) => {
          if (err.data && (err.data as any).code === 'SUBSCRIPTION_EXPIRED') {
            setSubscriptionBlocked(true);
          } else {
            setSubscriptionBlocked(false);
          }
        });
    } else {
      setSubscriptionBlocked(false);
    }
  }, [isAuthenticated, user, location.pathname]);

  if (loading || subscriptionBlocked === null) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando sistema...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname.startsWith('/admin') && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/app" replace />;
  }

  if (subscriptionBlocked && !['/app/planos', '/app/configuracoes', '/app/completar-cadastro'].includes(location.pathname)) {
    return <Navigate to="/app/planos" replace />;
  }

  const precisaCompletarCadastro =
    isAuthenticated &&
    user?.role !== 'SUPER_ADMIN' &&
    user?.dadosCompletos === false;

  if (precisaCompletarCadastro && location.pathname !== '/app/completar-cadastro') {
    return <Navigate to="/app/completar-cadastro" replace />;
  }

  return <>{children}</>;
}
