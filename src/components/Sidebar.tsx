import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router';
import { useAuthUser, useAuthActions } from '../context/AuthContext';
import { useStockAlerts } from '../hooks/useStockAlerts';
import { AccordionSection } from './AccordionSection';
import { ContextSwitcher } from './ContextSwitcher';
import { AnnouncementsBanner } from './AnnouncementsBanner';
import { PendingCountBadge } from './PendingCountBadge';
import { TicketBadge } from './TicketBadge';
import { isPathActive, activeSection } from '../utils/navigation';
import { IconHome, IconUsers, IconSettings, IconImport, IconCreditCard, IconPackage, IconFinance, IconShoppingBag } from './icons';

export const Sidebar = React.memo(function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeWorkspace, isPf, isRestrictedRole, canAccess } = useAuthUser();
  const { logout } = useAuthActions();
  const { count: alertCount } = useStockAlerts();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showOperacional = ['caixa', 'ordem_servico', 'agenda', 'orcamentos', 'operacional_pet', 'devolucoes'].some(canAccess);
  const showEstoque = ['catalogo', 'transferencia_estoque', 'inventario', 'compras', 'fornecedores'].some(canAccess);
  const section = activeSection(location.pathname);
  const getLinkClass = (path: string) => {
    const isActive = isPathActive(location.pathname, path);
    if (isPf) {
      return `flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
        isActive ? 'bg-emerald-200 text-emerald-800' : 'text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900'
      }`;
    }
    return `flex items-center px-4 py-3 rounded-lg font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed md:sticky top-0 h-screen w-72 md:w-64 flex flex-col z-50 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} overflow-y-auto shadow-2xl md:shadow-none pb-20 md:pb-0 ${
        activeWorkspace?.tipo === 'PF'
          ? 'bg-emerald-50 border-r border-emerald-200'
          : 'bg-white border-r border-gray-200'
      }`}>
        <div className={`p-4 md:p-6 border-b flex justify-between items-center ${
          activeWorkspace?.tipo === 'PF' ? 'border-emerald-200' : 'border-gray-100'
        }`}>
          <h1 className={`text-lg md:text-2xl font-bold tracking-tight ${
            activeWorkspace?.tipo === 'PF' ? 'text-emerald-700' : 'text-brand-600'
          }`}>
            {activeWorkspace?.tipo === 'PF' ? 'Finanças Pessoais' : 'Controle de Vendas e Finanças'}
          </h1>
          <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors" onClick={() => setIsOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

      <ContextSwitcher />
      <AnnouncementsBanner />

      <nav className="flex-1 p-4 space-y-1">
        <Link to={user?.role === 'SUPER_ADMIN' && !user?.isImpersonating ? '/admin' : isRestrictedRole ? '/app/vendas' : '/app'} className={getLinkClass(user?.role === 'SUPER_ADMIN' && !user?.isImpersonating ? '/admin' : isRestrictedRole ? '/app/vendas' : '/app')}><IconHome /> {user?.role === 'SUPER_ADMIN' && !user?.isImpersonating ? 'Visão Geral SaaS' : activeWorkspace?.tipo === 'PF' ? 'Dashboard PF' : isRestrictedRole ? 'Vendas' : 'Início'}</Link>

        {!(user?.role === 'SUPER_ADMIN' && !user?.isImpersonating) && (
          <>
            {activeWorkspace?.tipo === 'PF' ? (
              <>
                <Link to="/app/financeiro" className={getLinkClass('/app/financeiro')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                  Financeiro PF
                </Link>
              </>
            ) : (
              <>
                {(!user?.features || user.features?.pdv) && <Link to="/app/pdv" className={getLinkClass('/app/pdv')}><IconShoppingBag /> Nova Venda (PDV)</Link>}
                {(!user?.features || user.features?.vendas) && <Link to="/app/vendas" className={getLinkClass('/app/vendas')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Vendas
                </Link>}
                {(!user?.features || user.features?.clientes) && <Link to="/app/clientes" className={getLinkClass('/app/clientes')}><IconUsers /> Clientes</Link>}
                {(!user?.features || user.features?.crediario) && <Link to="/app/fiado" className={getLinkClass('/app/fiado')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Crediário / Fiado
                </Link>}
                {!isRestrictedRole && (!user?.features || user.features?.financeiro) && <Link to="/app/financeiro" className={getLinkClass('/app/financeiro')}><IconFinance /> Financeiro</Link>}
              </>
            )}

            <div className="border-t border-gray-200 pt-2 mt-2">
              {activeWorkspace?.tipo !== 'PF' && (
                <AccordionSection title="Gestão & Relatórios" icon="📊" defaultOpen={section === 'Gestão & Relatórios'}>
                  {!isRestrictedRole && (!user?.features || user.features?.dashboard_pj) && <Link to="/app/dashboard-pj" className={getLinkClass('/app/dashboard-pj')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Dashboard Consolidado
                  </Link>}
                  {!isRestrictedRole && (!user?.features || user.features?.relatorios) && <Link to="/app/relatorios" className={getLinkClass('/app/relatorios')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Relatórios
                  </Link>}
                  {!isRestrictedRole && (!user?.features || user.features?.insights) && <Link to="/app/insights" className={getLinkClass('/app/insights')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    Insights & IA
                  </Link>}
                  {(!user?.features || user.features?.comissoes) && <Link to="/app/comissoes" className={getLinkClass('/app/comissoes')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Comissões
                  </Link>}
                </AccordionSection>
              )}

              {showOperacional && (
                <AccordionSection title="Operacional" icon="🛠️" defaultOpen={section === 'Operacional'}>
                  {(!user?.features || user.features?.caixa) && <Link to="/app/caixa" className={getLinkClass('/app/caixa')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Controle de Caixa
                  </Link>}
                  {(!user?.features || user.features?.ordem_servico) && <Link to="/app/os" className={getLinkClass('/app/os')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Ordens de Serviço
                  </Link>}
                  {(!user?.features || user.features?.agenda) && <Link to="/app/agenda" className={getLinkClass('/app/agenda')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Agenda
                  </Link>}
                  {(!user?.features || user.features?.orcamentos) && <Link to="/app/orcamentos" className={getLinkClass('/app/orcamentos')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Orçamentos
                  </Link>}
                  {(!user?.features || user.features?.operacional_pet) && <Link to="/app/operacional-pet" className={getLinkClass('/app/operacional-pet')}>
                    🐾 Operacional Pet
                  </Link>}
                  {(!user?.features || user.features?.devolucoes) && <Link to="/app/devolucoes" className={getLinkClass('/app/devolucoes')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Devoluções
                  </Link>}
                </AccordionSection>
              )}

              {showEstoque && (
                <AccordionSection title="Estoque & Suprimentos" icon="📦" defaultOpen={section === 'Estoque & Suprimentos'}>
                  {(!user?.features || user.features?.catalogo) && <Link to="/app/estoque" className={getLinkClass('/app/estoque')}>
                    <IconPackage /> Catálogo & Estoque
                    {alertCount > 0 && (
                      <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {alertCount}
                      </span>
                    )}
                  </Link>}
                  {(!user?.features || user.features?.transferencia_estoque) && <Link to="/app/transferencias" className={getLinkClass('/app/transferencias')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Transferências
                  </Link>}
                  {(!user?.features || user.features?.inventario) && <Link to="/app/inventario" className={getLinkClass('/app/inventario')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    Inventário
                  </Link>}
                  {(!user?.features || user.features?.compras) && <Link to="/app/compras" className={getLinkClass('/app/compras')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    Compras
                  </Link>}
                  {(!user?.features || user.features?.fornecedores) && <Link to="/app/fornecedores" className={getLinkClass('/app/fornecedores')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Fornecedores
                  </Link>}
                </AccordionSection>
              )}

              <AccordionSection title="Comunicação" icon="💬" defaultOpen={section === 'Comunicação'}>
                {(!user?.features || user.features?.whatsapp) && <Link to="/app/whatsapp" className={getLinkClass('/app/whatsapp')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  WhatsApp
                </Link>}
                {(!user?.features || user.features?.campanhas) && <Link to="/app/campanhas" className={getLinkClass('/app/campanhas')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Campanhas
                </Link>}
                <Link to="/app/chamados" className={getLinkClass('/app/chamados')}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Suporte Técnico
                </Link>
              </AccordionSection>

              {!isRestrictedRole && (
                <AccordionSection title="Configurações e Suporte" icon="⚙️" defaultOpen={section === 'Configurações e Suporte'}>
                  <Link to="/app/planos" className={getLinkClass('/app/planos')}><IconCreditCard /> Planos</Link>
                  <Link to="/app/configuracoes" className={getLinkClass('/app/configuracoes')}><IconSettings /> Configurações</Link>
                  <Link to="/app/configuracoes/maquininha" className={getLinkClass('/app/configuracoes/maquininha')}>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Maquininha de Cartão
                  </Link>
                  <Link to="/app/importacao-legada" className={getLinkClass('/app/importacao-legada')}><IconImport /> Importar Sistema Anterior</Link>
                  <Link to="/app/importar-planilha" className={getLinkClass('/app/importar-planilha')}><IconImport /> Importar Planilha</Link>
                </AccordionSection>
              )}
            </div>
          </>
        )}

        {canAccess('financas_pessoais') && !isPf && (
          <div className="border-t border-gray-200 pt-2 mt-2">
            <Link to="/app/financas-pessoais" className={getLinkClass('/app/financas-pessoais')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Finanças Pessoais
            </Link>
          </div>
        )}

        {(user?.role === 'SUPER_ADMIN' && !user?.isImpersonating) && (
          <>
            <Link to="/admin/lojas" className={getLinkClass('/admin/lojas')}><IconUsers /> Lojas e Clientes</Link>
            <Link to="/admin/relatorios-financeiros" className={getLinkClass('/admin/relatorios-financeiros')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Relatórios Financeiros
            </Link>
            <Link to="/admin/inadimplentes" className={getLinkClass('/admin/inadimplentes')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Inadimplentes
            </Link>
            <Link to="/admin/chamados" className={getLinkClass('/admin/chamados')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Chamados (Admin)
              <TicketBadge />
            </Link>
            <Link to="/admin/aprovar-cadastros" className={getLinkClass('/admin/aprovar-cadastros')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Aprovar Cadastros
              <PendingCountBadge />
            </Link>
            <Link to="/admin/planos" className={getLinkClass('/admin/planos')}>
              <IconCreditCard /> Planos de Assinatura
            </Link>
            <Link to="/admin/auditoria" className={getLinkClass('/admin/auditoria')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Auditoria
            </Link>
            <Link to="/admin/equipe" className={getLinkClass('/admin/equipe')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Equipe Interna
            </Link>
            <Link to="/admin/equipe/permissoes" className={getLinkClass('/admin/equipe/permissoes')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Matriz de Permissões
            </Link>
            <Link to="/admin/notificacoes" className={getLinkClass('/admin/notificacoes')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Notificações Push
            </Link>
            <Link to="/admin/usuarios" className={getLinkClass('/admin/usuarios')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Usuários e Senhas
            </Link>
            <Link to="/admin/zerar-painel" className={getLinkClass('/admin/zerar-painel')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Zerar Painel
            </Link>
            <Link to="/admin/configuracoes" className={getLinkClass('/admin/configuracoes')}><IconSettings /> Configurações Gerais</Link>
            <Link to="/admin/monitoramento" className={getLinkClass('/admin/monitoramento')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Monitoramento
            </Link>
            <Link to="/admin/logs" className={getLinkClass('/admin/logs')}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Logs do Servidor
            </Link>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="md:hidden mb-3 px-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair
          </button>
        </div>
        <div className="mb-4 px-2">
          <p className="text-xs text-gray-500 text-center font-medium">
            {activeWorkspace?.tipo === 'PF' ? 'Finanças Pessoais' : 'Controle de Vendas e Finanças'}
          </p>
          <p className="text-xs text-gray-500 text-center mt-1"><a href="https://www.lancepelozap.com.br" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">www.lancepelozap.com.br</a></p>
          <p className="text-xs text-gray-500 text-center mt-1">✉️ <a href="mailto:contato@lancepelozap.com.br" className="hover:text-gray-700">contato@lancepelozap.com.br</a></p>
          <p className="text-xs text-gray-500 text-center mt-1">📱 <a href="https://wa.me/5511966401931" className="hover:text-gray-700" target="_blank" rel="noopener noreferrer">(11) 96640-1931</a></p>
        </div>
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${
            activeWorkspace?.tipo === 'PF' ? 'bg-emerald-600' : 'bg-brand-600'
          }`}>
            {user?.nome ? user.nome[0].toUpperCase() : 'U'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.nome || 'Usuário'}</p>
            <p className={`text-xs font-bold truncate ${
              activeWorkspace?.tipo === 'PF' ? 'text-emerald-600' : 'text-brand-600'
            }`}>{activeWorkspace?.nome || (user?.role === 'SUPER_ADMIN' ? 'Admin SaaS' : 'Loja')}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
});
