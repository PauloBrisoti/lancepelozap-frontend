import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthUser } from '../context/AuthContext';
import { isPathActive } from '../utils/navigation';
import { IconHomeSm, IconShoppingBagSm, IconVendasSm, IconFinanceSm, IconClientsSm, IconMenuSm } from './icons';

interface NavTab {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const MobileBottomNav = React.memo(function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeWorkspace, canAccess } = useAuthUser();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' && !user?.isImpersonating;
  const isPf = activeWorkspace?.tipo === 'PF';

  // hide on PDV page — it has its own bottom bar
  if (location.pathname.startsWith('/app/pdv')) return null;

  let tabs: NavTab[];

  if (isSuperAdmin) {
    tabs = [
      { label: 'Visão Geral', path: '/admin', icon: <IconHomeSm /> },
      { label: 'Lojas', path: '/admin/lojas', icon: <IconClientsSm /> },
      { label: 'Financeiro', path: '/admin/relatorios-financeiros', icon: <IconFinanceSm /> },
      { label: 'Usuários', path: '/admin/usuarios', icon: <IconVendasSm /> },
    ];
  } else if (isPf) {
    tabs = [
      { label: 'Início', path: '/app', icon: <IconHomeSm /> },
      { label: 'Financeiro', path: '/app/financeiro', icon: <IconFinanceSm /> },
    ];
  } else {
    tabs = [
      { label: 'Início', path: '/app', icon: <IconHomeSm /> },
      ...(canAccess('pdv') ? [{ label: 'PDV', path: '/app/pdv', icon: <IconShoppingBagSm /> }] : []),
      ...(canAccess('vendas') ? [{ label: 'Vendas', path: '/app/vendas', icon: <IconVendasSm /> }] : []),
      ...(canAccess('financeiro') ? [{ label: 'Financeiro', path: '/app/financeiro', icon: <IconFinanceSm /> }] : []),
    ];
  }

  const isActive = (path: string) => isPathActive(location.pathname, path);

  const pfActiveColor = 'text-emerald-600';
  const pfInactiveColor = 'text-gray-400';
  const defaultActiveColor = 'text-brand-600';
  const defaultInactiveColor = 'text-gray-400';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const activeColor = isPf ? pfActiveColor : defaultActiveColor;
          const inactiveColor = isPf ? pfInactiveColor : defaultInactiveColor;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-lg transition-colors ${
                active ? activeColor : inactiveColor
              }`}
            >
              {tab.icon}
              <span className={`text-[10px] font-medium mt-0.5 ${
                active ? 'opacity-100' : 'opacity-70'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        <button
          onClick={onMenuClick}
          className={`flex flex-col items-center justify-center flex-1 h-full rounded-lg transition-colors text-gray-400`}
        >
          <IconMenuSm />
          <span className="text-[10px] font-medium mt-0.5 opacity-70">Menu</span>
        </button>
      </div>
    </nav>
  );
});
