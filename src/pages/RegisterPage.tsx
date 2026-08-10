import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { fetchApi } from '../lib/api';
import { PhoneInput } from '../components/PhoneInput';
import { validarEmail, validarTelefone, validarSenha, validarNomeLoja, validarNomeResponsavel } from '../lib/validators';

interface PlanOption {
  id: string;
  nome: string;
  precoMensal: number;
}

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nomeFantasia: '',
    nomeResponsavel: '',
    email: '',
    telefoneWhatsapp: '',
    senha: '',
    planId: ''
  });
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [plansError, setPlansError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({
    nomeFantasia: '', nomeResponsavel: '', email: '', telefoneWhatsapp: '', senha: '', planId: '',
  });

  const setErrorField = (field: string, value: string) => setErrors(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    fetchApi<PlanOption[]>('/public/plans')
      .then(setPlans)
      .catch(() => setPlansError('Falha ao carregar planos. Tente recarregar a página.'));
  }, []);

  const senhaReqs = {
    length: formData.senha.length >= 8,
    upper: /[A-Z]/.test(formData.senha),
    lower: /[a-z]/.test(formData.senha),
    number: /[0-9]/.test(formData.senha),
  };

  const formValido = useMemo(() => {
    const nomeErro = validarNomeLoja(formData.nomeFantasia);
    const respErro = validarNomeResponsavel(formData.nomeResponsavel);
    const emailErro = validarEmail(formData.email);
    const telErro = validarTelefone(formData.telefoneWhatsapp);
    const senhaCheck = validarSenha(formData.senha);
    return !nomeErro && !respErro && !emailErro && !telErro && senhaCheck.valida && !!formData.planId;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeErro = validarNomeLoja(formData.nomeFantasia);
    const respErro = validarNomeResponsavel(formData.nomeResponsavel);
    const emailErro = validarEmail(formData.email);
    const telErro = validarTelefone(formData.telefoneWhatsapp);
    const senhaCheck = validarSenha(formData.senha);

    setErrors({
      nomeFantasia: nomeErro || '',
      nomeResponsavel: respErro || '',
      email: emailErro || '',
      telefoneWhatsapp: telErro || '',
      senha: senhaCheck.erros.join('. ') || '',
      planId: !formData.planId ? 'Selecione um plano' : '',
    });

    if (nomeErro || respErro || emailErro || telErro || !senhaCheck.valida || !formData.planId) {
      setError('Corrija os erros no formulário antes de continuar.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      nomeFantasia: formData.nomeFantasia,
      nomeResponsavel: formData.nomeResponsavel,
      email: formData.email,
      telefoneWhatsapp: formData.telefoneWhatsapp,
      senha: formData.senha,
      planId: formData.planId,
    };

    try {
      const response = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (response.error) {
        setError(response.error);
      } else if (response.pending) {
        setFormData({ nomeFantasia: '', nomeResponsavel: '', email: '', telefoneWhatsapp: '', senha: '', planId: '' });
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Crie sua Conta Grátis
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Você terá 7 dias de teste no Plano Pro. Sem compromisso.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cadastro enviado!</h3>
              <p className="text-sm text-gray-600">
                Sua solicitação foi recebida e será analisada pelo administrador.
                Você receberá um e-mail quando sua conta for ativada.
              </p>
              <p className="text-sm text-gray-600 bg-brand-50 border border-brand-200 rounded-lg p-3">
                <strong>Importante:</strong> enviamos um link de confirmação para o seu e-mail.
                Acesse a caixa de entrada (ou o spam) e clique no link em até 48 horas —
                o acesso ao sistema depende dessa confirmação.
              </p>
              <Link to="/login" className="inline-block mt-4 bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700">
                Ir para o Login
              </Link>
            </div>
          ) : (
          <>
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome da sua Loja</label>
              <div className="mt-1">
                <input
                  type="text" required
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${errors.nomeFantasia ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                  value={formData.nomeFantasia}
                  onChange={(e) => {
                    setFormData({...formData, nomeFantasia: e.target.value});
                    setErrorField('nomeFantasia', e.target.value ? validarNomeLoja(e.target.value) || '' : '');
                  }}
                  onBlur={() => setErrorField('nomeFantasia', formData.nomeFantasia ? validarNomeLoja(formData.nomeFantasia) || '' : '' )}
                  placeholder="Minha Loja..."
                />
                {errors.nomeFantasia && <p className="text-xs text-red-500 mt-1">{errors.nomeFantasia}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Seu Nome</label>
              <div className="mt-1">
                <input
                  type="text" required
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${errors.nomeResponsavel ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                  value={formData.nomeResponsavel}
                  onChange={(e) => {
                    setFormData({...formData, nomeResponsavel: e.target.value});
                    setErrorField('nomeResponsavel', e.target.value ? validarNomeResponsavel(e.target.value) || '' : '');
                  }}
                  onBlur={() => setErrorField('nomeResponsavel', formData.nomeResponsavel ? validarNomeResponsavel(formData.nomeResponsavel) || '' : '' )}
                  placeholder="João Silva"
                />
                {errors.nomeResponsavel && <p className="text-xs text-red-500 mt-1">{errors.nomeResponsavel}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <div className="mt-1">
                <input
                  type="email" required
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    setErrorField('email', e.target.value ? validarEmail(e.target.value) || '' : '');
                  }}
                  onBlur={() => setErrorField('email', formData.email ? validarEmail(formData.email) || '' : '' )}
                  placeholder="voce@email.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
              <div className="mt-1">
                <PhoneInput
                  value={formData.telefoneWhatsapp}
                  onChange={(v) => {
                    setFormData({...formData, telefoneWhatsapp: v});
                    setErrorField('telefoneWhatsapp', v ? validarTelefone(v) || '' : '');
                  }}
                  placeholder="(11) 99999-9999"
                  className="sm:text-sm"
                  error={!!errors.telefoneWhatsapp}
                />
                {errors.telefoneWhatsapp && <p className="text-xs text-red-500 mt-1">{errors.telefoneWhatsapp}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <div className="mt-1">
                <input
                  type="password" required
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-500 sm:text-sm ${errors.senha ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-brand-500'}`}
                  value={formData.senha}
                  onChange={(e) => {
                    setFormData({...formData, senha: e.target.value});
                    setErrorField('senha', e.target.value ? validarSenha(e.target.value).erros.join('. ') || '' : '');
                  }}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <p className={senhaReqs.length ? 'text-emerald-600' : 'text-gray-400'}>✓ Mínimo 8 caracteres</p>
                <p className={senhaReqs.upper ? 'text-emerald-600' : 'text-gray-400'}>✓ Uma letra maiúscula</p>
                <p className={senhaReqs.lower ? 'text-emerald-600' : 'text-gray-400'}>✓ Uma letra minúscula</p>
                <p className={senhaReqs.number ? 'text-emerald-600' : 'text-gray-400'}>✓ Um número</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Escolha seu Plano</label>
              <div className="space-y-2">
                {plans.length === 0 && !plansError && <p className="text-xs text-gray-400">Carregando planos...</p>}
                {plansError && <p className="text-xs text-red-500">{plansError}</p>}
                {plans.map(plan => (
                  <label key={plan.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.planId === plan.id ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="planId" value={plan.id} checked={formData.planId === plan.id} onChange={e => { setFormData({...formData, planId: e.target.value}); setErrorField('planId', ''); }} className="w-4 h-4 text-brand-600 focus:ring-brand-500" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{plan.nome}</span>
                      <span className="text-sm text-gray-500 ml-2">R$ {Number(plan.precoMensal).toFixed(2)}/mês</span>
                    </div>
                  </label>
                ))}
                {errors.planId && <p className="text-xs text-red-500 mt-1">{errors.planId}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !formValido}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-brand-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Criando Conta...' : 'Criar Minha Conta Grátis'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Já tem uma conta? </span>
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500">
              Faça Login
            </Link>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
