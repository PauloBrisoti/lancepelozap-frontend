import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi, ApiError } from '../lib/api';
import { formatDateBR } from '../lib/dates';
import { Modal } from '../components/Modal';
import { useSubscription } from '../hooks/useSubscription';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

const IconFileText = () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconShield = () => <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;

interface Subscription {
  id: string;
  tenantId: string;
  plano: string;
  valorMensalidade: number;
  dataVencimento: string;
  statusPagamento: string;
  tenant?: { razaoSocial: string };
}

interface PublicPlan {
  id: string;
  nome: string;
  precoMensal: number;
}

export function PlanosPage() {
  const { user } = useAuth();
  const [modalTermosAberto, setModalTermosAberto] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data: todasAssinaturas = [], isLoading: loadingTodas, refetch: refetchTodas } = useApiQuery<Subscription[]>(
    ['subscriptions', 'all'],
    '/subscriptions/all',
    { enabled: isSuperAdmin, staleTime: STALE_TIMES.NORMAL }
  );
  const { data: minhaAssinatura, isLoading: loadingMinha, refetch: refetchMinha } = useSubscription(!isSuperAdmin);
  const { data: plans = [] } = useApiQuery<PublicPlan[]>(
    ['public-plans'],
    '/public/plans',
    { staleTime: STALE_TIMES.STATIC }
  );

  const loading = isSuperAdmin ? loadingTodas : loadingMinha;

  useEffect(() => {
    // Verificar retorno do Mercado Pago
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam === 'success' || statusParam === 'approved') {
      toast.success('Pagamento processado com sucesso! Sua assinatura está ativa.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusParam === 'pending') {
      toast('Pagamento pendente. Assim que compensar, sua assinatura será ativada.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (statusParam === 'failure') {
      toast.error('Falha no pagamento. Por favor, tente novamente.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [changeModal, setChangeModal] = useState<{ open: boolean; planId: string; planNome: string }>({ open: false, planId: '', planNome: '' });
  const [changeMotivo, setChangeMotivo] = useState('');

  const statusSub = minhaAssinatura?.statusPagamento;
  const isPago = statusSub === 'PAGO';
  const isPendente = statusSub === 'PENDENTE';
  const podeAssinarDireto = statusSub === 'TRIAL' || !minhaAssinatura;

  const assinarPlano = async (planId: string, nome: string, valor: number) => {
    try {
      if (!confirm(`Deseja assinar o plano ${nome} por R$ ${valor}/mês?`)) return;
      const data = await fetchApi('/subscriptions/plan', {
        method: 'POST',
        body: JSON.stringify({ planId, plano: nome, valorMensalidade: valor })
      });

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        toast.success('Plano registrado! Aguarde a confirmação do pagamento.');
        await refetchMinha();
      }
    } catch {
      toast.error('Erro ao assinar plano');
    }
  };

  const solicitarMudanca = async () => {
    if (!changeMotivo.trim()) {
      toast.error('Descreva o motivo da mudança de plano.');
      return;
    }
    try {
      await fetchApi('/subscriptions/change-request', {
        method: 'POST',
        body: JSON.stringify({ planId: changeModal.planId, motivo: changeMotivo }),
      });
      toast.success('Solicitação enviada! Acompanhe pelo menu Chamados.');
      setChangeModal({ open: false, planId: '', planNome: '' });
      setChangeMotivo('');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar mudança';
      toast.error(msg);
    }
  };

  const toggleBloqueio = async (tenantId: string, currentStatus: string) => {
    const isBlocked = currentStatus === 'VENCIDO';
    const actionStr = isBlocked ? 'desbloquear' : 'bloquear';
    if (!confirm(`Deseja ${actionStr} a loja?`)) return;

    try {
      await fetchApi(`/subscriptions/${tenantId}/toggle-block`, {
        method: 'PUT',
        body: JSON.stringify({ block: !isBlocked })
      });
      // Atualiza a lista
      await refetchTodas();
    } catch {
      toast.error(`Erro ao ${actionStr} loja`);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Carregando planos...</div>;
  }

  // ===================== VISÃO SUPER ADMIN =====================
  if (user?.role === 'SUPER_ADMIN') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Assinaturas SaaS</h1>
        <p className="text-gray-500">Veja o status de pagamento de todos os Lojistas.</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Tenant (Loja)</th>
                <th className="px-6 py-4 font-medium">Plano</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Vencimento</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {todasAssinaturas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhuma assinatura registrada.</td>
                </tr>
              ) : (
                todasAssinaturas.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {sub.tenant?.razaoSocial || `Tenant ID: ${sub.tenantId}`}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-semibold">{sub.plano}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {formatBRL(sub.valorMensalidade)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDateBR(sub.dataVencimento)}
                    </td>
                    <td className="px-6 py-4">
                      {sub.statusPagamento === 'PAGO' ? (
                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">Ativa / Pago</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">Inadimplente / Bloqueado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sub.statusPagamento === 'PAGO' ? (
                        <button onClick={() => toggleBloqueio(sub.tenantId, sub.statusPagamento)} className="text-red-600 hover:text-red-800 font-medium">
                          Bloquear
                        </button>
                      ) : (
                        <button onClick={() => toggleBloqueio(sub.tenantId, sub.statusPagamento)} className="text-green-600 hover:text-green-800 font-medium">
                          Desbloquear
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ===================== VISÃO LOJISTA =====================
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos e Faturamento</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os pacotes oferecidos e visualize o histórico de cobranças.</p>
        </div>
        <button 
          onClick={() => setModalTermosAberto(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors border border-brand-200"
        >
          <IconFileText /> Ver Termos de Assinatura
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: '', nome: 'Básico', valor: 49.90, cor: 'white', destaque: false, features: ['Catálogo Digital ilimitado', 'Recebimento de pedidos no WhatsApp', 'Link personalizado', 'Painel de gestão básico'] },
          { id: '', nome: 'Pro', valor: 99.90, cor: 'brand', destaque: true, features: ['Tudo do plano Básico', 'Gestão de Estoque', 'Controle Financeiro', 'Múltiplos Usuários / Vendedores'] },
          { id: '', nome: 'VIP', valor: 199.90, cor: 'white', destaque: false, features: ['Tudo do plano Pro', 'Múltiplas Lojas conectadas', 'Suporte Prioritário', 'Domínio Customizado (em breve)'] },
        ].map((plano) => {
          const planFromDb = plans.find(p => p.nome.toLowerCase().includes(plano.nome.toLowerCase()) || plano.nome.toLowerCase().includes(p.nome.toLowerCase().split('(')[0].trim()));
          const planId = planFromDb?.id || '';
          const valor = planFromDb?.precoMensal || plano.valor;
          return (
            <div key={plano.nome} className={`bg-${plano.cor === 'brand' ? 'brand-600 text-white' : 'white'} p-6 rounded-xl shadow-sm border ${plano.destaque ? 'border-brand-700 transform md:-translate-y-2' : 'border-gray-200'} text-center`}>
              {plano.destaque && <div className="text-xs font-bold uppercase tracking-wider text-brand-200 mb-1">Mais Popular</div>}
              <h3 className={`text-lg font-semibold ${plano.destaque ? 'text-white' : 'text-gray-800'}`}>{plano.nome}</h3>
              <p className={`text-4xl font-bold mt-4 ${plano.destaque ? 'text-white' : 'text-gray-900'}`}>R$ {valor.toFixed(2).replace('.', ',')}<span className={`text-sm ${plano.destaque ? 'text-brand-200' : 'text-gray-500'} font-normal`}>/mês</span></p>
              <ul className="mt-6 space-y-3 text-sm text-left">
                {plano.features.map(f => (
                  <li key={f} className={plano.destaque ? 'text-brand-100' : 'text-gray-600'}>✓ {f}</li>
                ))}
              </ul>
              {isPendente ? (
                <div className="mt-8 w-full text-center">
                  <span className="block text-xs text-amber-600 font-medium mb-1">⏳ Aguardando pagamento</span>
                  <button onClick={() => assinarPlano(planId, plano.nome, valor)} className="w-full border border-amber-400 text-amber-700 bg-amber-50 rounded-lg py-2 font-medium text-sm hover:bg-amber-100 transition">
                    Tentar Novamente
                  </button>
                </div>
              ) : podeAssinarDireto ? (
                <button onClick={() => assinarPlano(planId, plano.nome, valor)} className={`mt-8 w-full ${plano.destaque ? 'bg-white text-brand-600 hover:bg-gray-50' : 'border border-brand-600 text-brand-600 hover:bg-brand-50'} rounded-lg py-2 font-medium transition`}>
                  Assinar {plano.nome}
                </button>
              ) : isPago ? (
                <button onClick={() => setChangeModal({ open: true, planId, planNome: plano.nome })} className={`mt-8 w-full ${plano.destaque ? 'bg-white text-brand-600 hover:bg-gray-50' : 'border border-brand-600 text-brand-600 hover:bg-brand-50'} rounded-lg py-2 font-medium transition`}>
                  Solicitar Mudança
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Minha Fatura Atual</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium">Plano Atual</th>
              <th className="px-6 py-4 font-medium">Valor</th>
              <th className="px-6 py-4 font-medium">Próximo Vencimento</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {minhaAssinatura ? (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{minhaAssinatura.plano}</td>
                <td className="px-6 py-4 text-gray-900 font-medium">
                  {formatBRL(minhaAssinatura.valorMensalidade)}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {formatDateBR(minhaAssinatura.dataVencimento)}
                </td>
                <td className="px-6 py-4">
                  {minhaAssinatura.statusPagamento === 'PAGO' ? (
                    <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">Regular (Pago)</span>
                  ) : minhaAssinatura.statusPagamento === 'TRIAL' ? (
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">Teste Gratuito</span>
                  ) : minhaAssinatura.statusPagamento === 'PENDENTE' ? (
                    <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium">Pagamento Pendente</span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium">Bloqueado (Inadimplente)</span>
                  )}
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-6 text-center text-gray-500">Você ainda não escolheu um plano.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE SOLICITAÇÃO DE MUDANÇA DE PLANO */}
      {changeModal.open && (
        <Modal open onClose={() => { setChangeModal({ open: false, planId: '', planNome: '' }); setChangeMotivo(''); }} title={`Mudar para ${changeModal.planNome}`} size="sm">
          <div className="space-y-4">
              <p className="text-sm text-gray-600">Descreva o motivo da solicitação de mudança de plano. Um chamado será aberto para análise.</p>
              <textarea
                value={changeMotivo}
                onChange={e => setChangeMotivo(e.target.value)}
                placeholder="Ex: Preciso de mais funcionalidades para minha loja..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                rows={4}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setChangeModal({ open: false, planId: '', planNome: '' }); setChangeMotivo(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button onClick={solicitarMudanca} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">Enviar Solicitação</button>
              </div>
            </div>
        </Modal>
      )}

      {/* MODAL DE TERMOS DE ACEITE E USO */}
      {modalTermosAberto && (
        <Modal open onClose={() => setModalTermosAberto(false)} title={<span className="flex items-center gap-2"><IconShield /> Termos de Aceite e Condições de Uso</span>}>
          <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
              <section>
                <h4 className="font-bold text-gray-900 text-base mb-2">1. Aceitação dos Termos</h4>
                <p>Ao assinar qualquer um dos planos (Starter, Pro ou Enterprise) oferecidos pela SaaS Pro, o Lojista (CONTRATANTE) concorda expressamente com os termos descritos neste documento.</p>
              </section>
            </div>
            
            <div className="py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setModalTermosAberto(false)} 
                className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors"
              >
                Ciente e De Acordo
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
