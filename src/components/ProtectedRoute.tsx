import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { useSubscription } from '../hooks/useSubscription';
import { isSubscriptionBlocked } from '../utils/subscription';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  const canCheckSubscription =
    isAuthenticated && user?.role !== 'SUPER_ADMIN' && !location.pathname.startsWith('/admin');

  const { data: sub, isLoading: loadingSub, error } = useSubscription(canCheckSubscription);

  let subscriptionBlocked: boolean | null;
  if (!canCheckSubscription) {
    subscriptionBlocked = false;
  } else if (loadingSub) {
    subscriptionBlocked = null;
  } else {
    const data = (error as ApiError | null)?.data;
    const expired = !!error && typeof data === 'object' && data !== null &&
      (data as { code?: string }).code === 'SUBSCRIPTION_EXPIRED';
    subscriptionBlocked = expired || isSubscriptionBlocked(sub?.statusPagamento);
  }

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
