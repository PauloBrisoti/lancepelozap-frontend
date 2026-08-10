import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { fetchApi } from '../lib/api';
import { formatDateBR } from '../lib/dates';
import { formatBRL } from '../utils/format';

interface Profile {
  id: string; nomeCompleto: string; cpf: string; telefoneWhatsapp: string;
  email: string; enderecoCompleto: string; cep: string; dataNascimento: string | null;
}

interface SaleItem {
  quantidade: number; precoUnitarioVendido: number;
  product: { nome: string };
}

interface Sale {
  id: string; dataVenda: string; valorTotalBruto: number;
  valorDesconto: number; valorTotalLiquido: number;
  formaPagamento: string; saleItems: SaleItem[];
}

interface Receivable {
  id: string; dataVencimento: string; valorParcela: number;
  numeroParcela: number; totalParcelas: number;
  status: string; statusExibicao?: string; formaPagamentoEsperada: string;
  sale: { id: string; dataVenda: string };
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [tab, setTab] = useState<'perfil' | 'compras' | 'pendencias'>('perfil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SEGURANÇA: o token do link é trocado por uma sessão de 30 min e removido da URL.
  // Assim ele não fica gravado no histórico do navegador nem vaza em logs/Referer.
  const getSessionToken = () => sessionStorage.getItem('portalSession');

  useEffect(() => {
    let cancelled = false;

    const load = async (sessionToken: string) => {
      const authHeaders = { Authorization: `Bearer ${sessionToken}` };
      try {
        const [p, s, r] = await Promise.all([
          fetchApi('/customer-portal/profile', { headers: authHeaders }).catch(() => {
            throw new Error('Erro ao carregar perfil');
          }),
          fetchApi('/customer-portal/sales', { headers: authHeaders }).catch(() => [] as Sale[]),
          fetchApi('/customer-portal/receivables', { headers: authHeaders }).catch(() => [] as Receivable[]),
        ]);
        if (!cancelled) {
          setProfile(p);
          setSales(s);
          setReceivables(r);
        }
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem('portalSession');
          setError('Link inválido ou expirado. Verifique seu link de acesso.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const start = async () => {
      setLoading(true);

      // Caso 1: veio do link com token → troca por sessão curta e limpa a URL
      if (token) {
        try {
          const res = await fetchApi<{ sessionToken: string; customer: Profile }>(
            '/customer-portal/session',
            { method: 'POST', body: JSON.stringify({ token }) }
          );
          sessionStorage.setItem('portalSession', res.sessionToken);
          // Remove o token da URL (fica só /portal) — nada no histórico
          window.history.replaceState({}, '', window.location.pathname);
          setProfile(res.customer);
          await load(res.sessionToken);
        } catch {
          if (!cancelled) {
            setLoading(false);
            setError('Link inválido ou expirado. Verifique seu link de acesso.');
          }
        }
        return;
      }

      // Caso 2: sessão já ativa (URL limpa)
      const sessionToken = getSessionToken();
      if (sessionToken) {
        await load(sessionToken);
      } else {
        setLoading(false);
        setError('Sessão expirada. Peça um novo link de acesso à loja.');
      }
    };

    start();
    return () => { cancelled = true; };
  }, [token]);

  const formatDate = (d: string) => formatDateBR(d);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500 text-lg">Carregando...</div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
        <p className="text-gray-600">{error || 'Este link de acesso não é válido.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">{profile.nomeCompleto[0]}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {profile.nomeCompleto.split(' ')[0]}!</h1>
          <p className="text-gray-500 mt-1">Bem-vindo ao seu portal de cliente</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {[
              { key: 'perfil' as const, label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              { key: 'compras' as const, label: 'Compras', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { key: 'pendencias' as const, label: 'Pendências', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  tab === t.key ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'perfil' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-gray-500">Nome</label><p className="font-medium">{profile.nomeCompleto}</p></div>
                  <div><label className="text-xs text-gray-500">CPF</label><p className="font-medium">{profile.cpf}</p></div>
                  <div><label className="text-xs text-gray-500">WhatsApp</label><p className="font-medium">{profile.telefoneWhatsapp}</p></div>
                  <div><label className="text-xs text-gray-500">Email</label><p className="font-medium">{profile.email || '-'}</p></div>
                  <div className="col-span-2"><label className="text-xs text-gray-500">Endereço</label><p className="font-medium">{profile.enderecoCompleto || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">CEP</label><p className="font-medium">{profile.cep || '-'}</p></div>
                  <div><label className="text-xs text-gray-500">Nascimento</label><p className="font-medium">{profile.dataNascimento ? formatDate(profile.dataNascimento) : '-'}</p></div>
                </div>
              </div>
            )}

            {tab === 'compras' && (
              <div className="space-y-3">
                {sales.length === 0 && <p className="text-gray-500 text-center py-8">Nenhuma compra encontrada.</p>}
                {sales.map(s => (
                  <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-gray-500">{formatDate(s.dataVenda)}</p>
                        <p className="font-bold text-lg">{formatBRL(s.valorTotalLiquido)}</p>
                      </div>
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full">{s.formaPagamento}</span>
                    </div>
                    {s.saleItems.map((item, i) => (
                      <p key={i} className="text-sm text-gray-600">{item.quantidade}x {item.product.nome} — {formatBRL(item.precoUnitarioVendido)}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === 'pendencias' && (
              <div className="space-y-3">
                {receivables.length === 0 && <p className="text-gray-500 text-center py-8">Nenhuma pendência em aberto.</p>}
                {receivables.map(r => (
                  <div key={r.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Vence em {formatDate(r.dataVencimento)}</p>
                      <p className="font-bold text-lg">{formatBRL(r.valorParcela)}</p>
                      <p className="text-xs text-gray-500">{r.numeroParcela}/{r.totalParcelas} — {r.formaPagamentoEsperada}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      r.statusExibicao === 'VENCIDO' ? 'bg-red-100 text-red-700' :
                      r.statusExibicao === 'PAGO_PARCIAL' ? 'bg-blue-100 text-blue-700' :
                      r.statusExibicao === 'PAGO' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{r.statusExibicao === 'PAGO' ? 'Quitado' : r.statusExibicao === 'PAGO_PARCIAL' ? 'Pago Parcial' : r.statusExibicao === 'VENCIDO' ? 'Vencido' : 'Pendente'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {import.meta.env.VITE_APP_NAME || 'Lance Pelo Zap'} — Portal do Cliente
        </p>
      </div>
    </div>
  );
}
