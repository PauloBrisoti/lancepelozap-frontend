import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { validarEmail } from '../lib/validators';

type Status = 'verifying' | 'success' | 'error' | 'idle' | 'sending';

export function VerificarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailFromQuery = searchParams.get('email') || '';
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [email, setEmail] = useState(emailFromQuery);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await fetchApi('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        if (!cancelled) setStatus('success');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const erro = validarEmail(email);
    if (erro) {
      setEmailError(erro);
      return;
    }
    setStatus('sending');
    try {
      await fetchApi('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      toast.success('Link de confirmação enviado. Verifique sua caixa de entrada.');
      setStatus('idle');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reenviar link');
      setStatus('idle');
    }
  };

  const renderCard = () => {
    if (status === 'verifying') {
      return (
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto" />
          <p className="text-sm text-gray-600">Confirmando seu e-mail...</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">E-mail confirmado!</h3>
            <p className="mt-1 text-sm text-gray-500">Sua conta foi verificada. Agora você pode acessar o sistema.</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            Ir para o Login
          </button>
        </div>
      );
    }

    const erroMsg = token
      ? 'O link de confirmação é inválido ou expirou (ele vale por 48 horas).'
      : 'Para acessar o sistema, você precisa confirmar o e-mail do seu cadastro.';

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Confirmação de e-mail pendente</h3>
          <p className="mt-1 text-sm text-gray-500">{erroMsg}</p>
        </div>
        <form onSubmit={handleResend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail do cadastro</label>
            <div className="mt-1">
              <input
                type="email" required
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(e.target.value ? validarEmail(e.target.value) || '' : '');
                }}
                placeholder="seu@email.com"
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>
          </div>
          <button
            type="submit" disabled={status === 'sending'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
          >
            {status === 'sending' ? 'Enviando...' : 'Reenviar link de confirmação'}
          </button>
        </form>
        <div className="text-center">
          <Link to="/login" className="text-sm text-brand-600 hover:underline">
            Voltar ao Login
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <svg className="w-12 h-12 text-brand-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Verificação de e-mail</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {renderCard()}
        </div>
      </div>
    </div>
  );
}
