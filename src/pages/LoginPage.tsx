import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { validarEmail } from '../lib/validators';
import { TurnstileWidget } from '../components/TurnstileWidget';

const IconLock = () => <svg className="w-12 h-12 text-brand-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('test')) {
      toast('Parâmetro de teste ignorado.');
    }
  }, [location.search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailErro = validarEmail(email);
    if (emailErro) {
      setError(emailErro);
      return;
    }

    if (captchaRequired && !captchaToken) {
      setError('Resolva o desafio de segurança antes de continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: senha,
          captchaToken: captchaToken || undefined,
        })
      });

      if (data.require2FA) {
        setRequire2FA(true);
        setTempToken(data.tempToken);
        toast('Autenticação em Duas Etapas necessária');
        return;
      }

      login(data.user);
      setCaptchaRequired(false);
      setCaptchaToken(null);
      if (data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: unknown) {
      const errorData = (err as { data?: Record<string, unknown> })?.data;
      if (errorData?.emailVerificationRequired) {
        navigate(`/verificar-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (errorData?.captchaRequired) {
        setCaptchaRequired(true);
        setCaptchaToken(null);
        setCaptchaAttempt((n) => n + 1);
        setError('Muitas tentativas. Resolva o desafio de segurança para continuar.');
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Erro ao realizar login';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await fetchApi('/auth/2fa/validate', {
        method: 'POST',
        body: JSON.stringify({ tempToken, code: code2fa })
      });

      login(data.user);
      if (data.user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else {
        navigate('/app');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar 2FA';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <IconLock />
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">Acesse sua conta</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Bem-vindo ao Controle de Vendas e Finanças</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {showForgot ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Recuperar Senha</h3>
                <p className="mt-1 text-sm text-gray-500">Digite seu email para receber o link de recuperação.</p>
              </div>
              {forgotSent ? (
                <div className="bg-green-50 text-green-700 p-4 rounded text-sm">
                  Se o email existir no sistema, você receberá um link de recuperação em breve.
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');

                  const forgotEmailErro = validarEmail(forgotEmail);
                  if (forgotEmailErro) { setError(forgotEmailErro); return; }

                  setIsSubmitting(true);
                  try {
                    await fetchApi('/auth/forgot-password', {
                      method: 'POST',
                      body: JSON.stringify({ email: forgotEmail })
                    });
                    setForgotSent(true);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Erro ao enviar solicitação');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                    <div className="mt-1">
                      <input type="email" required className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onBlur={() => { if (forgotEmail) setError(validarEmail(forgotEmail) || ''); }}
                        placeholder="seu@email.com" />
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
                  )}
                  <div>
                    <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                      {isSubmitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <button type="button" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setError(''); }} className="text-sm text-brand-600 hover:underline">
                      Voltar ao Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : !require2FA ? (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail corporativo</label>
                <div className="mt-1">
                  <input
                    type="email" required
                    className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(e.target.value ? validarEmail(e.target.value) || '' : '');
                    }}
                    onBlur={() => setEmailError(email ? validarEmail(email) || '' : '')}
                    placeholder="seu@email.com"
                  />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <div className="mt-1 relative">
                  <input
                    type={showSenha ? "text" : "password"} required
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                    value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showSenha ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button type="button" onClick={() => setShowForgot(true)} className="font-medium text-brand-600 hover:text-brand-500">
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
              {captchaRequired && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Verificação de segurança exigida após múltiplas tentativas:
                  </p>
                  <TurnstileWidget
                    key={captchaAttempt}
                    onToken={(token) => {
                      setCaptchaToken(token);
                      setError('');
                    }}
                  />
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                  {error}
                </div>
              )}
              <div>
                <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                  {isSubmitting ? 'Entrando...' : 'Entrar no Sistema'}
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Problemas com acesso? Contato: <a href="https://lancepelozap.com.br" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">lancepelozap</a>
                </p>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handle2FASubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Código do Authenticator</label>
                <p className="text-xs text-gray-500 mb-2">Digite os 6 dígitos gerados pelo seu aplicativo de autenticação (Google Authenticator, Authy, etc).</p>
                <div className="mt-1">
                  <input
                    type="text" required maxLength={6}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-lg text-center tracking-widest"
                    value={code2fa} onChange={(e) => setCode2fa(e.target.value)} placeholder="000000"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                  {error}
                </div>
              )}
              <div>
                <button type="submit" disabled={isSubmitting || code2fa.length < 6} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50">
                  {isSubmitting ? 'Validando...' : 'Validar Código'}
                </button>
              </div>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setRequire2FA(false)} className="text-sm text-brand-600 hover:underline">
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
