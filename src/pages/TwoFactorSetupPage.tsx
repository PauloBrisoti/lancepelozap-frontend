import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

/**
 * Página de configuração obrigatória de 2FA para equipe interna/Super Admin
 * (exigida pelo backend em produção quando twoFactorSetupRequired=true).
 */
export function TwoFactorSetupPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();

  const handleGenerate = async () => {
    try {
      const data = await fetchApi('/auth/2fa/generate');
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar 2FA');
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: code }),
      });
      toast.success('2FA ativado com sucesso!');
      await refreshUser();
      navigate(user?.role === 'SUPER_ADMIN' ? '/admin' : '/app', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Código inválido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <svg className="w-12 h-12 text-brand-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0115.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Segurança necessária</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sua conta exige autenticação em duas etapas (2FA) antes de acessar o painel administrativo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {!qrCodeUrl ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">
                Você usará um aplicativo de autenticação (Google Authenticator, Authy, etc.). Clique
                abaixo para gerar o QR Code e configurar o 2FA.
              </p>
              <button
                onClick={handleGenerate}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
              >
                Gerar QR Code
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleEnable}>
              <div className="text-center">
                <img
                  src={qrCodeUrl}
                  alt="QR Code do 2FA"
                  className="mx-auto w-48 h-48 border border-gray-200 rounded-md"
                />
                {secret && (
                  <p className="mt-2 text-xs text-gray-500 break-all bg-gray-50 p-2 rounded">
                    Chave manual: <span className="font-mono">{secret}</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Escaneie com o app de autenticação e digite o código de 6 dígitos.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Código do Authenticator</label>
                <div className="mt-1">
                  <input
                    type="text" required maxLength={6}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-lg text-center tracking-widest"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={isSubmitting || code.length < 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Ativando...' : 'Ativar 2FA'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
