import React from 'react';

/**
 * Cria ícones SVG a partir do path data (heroicons outline).
 * Cada ícone vira uma linha; variantes Sm compartilham o mesmo path.
 */
function makeIcon(paths: string | string[], defaultClassName = 'w-6 h-6') {
  const list = Array.isArray(paths) ? paths : [paths];
  return React.memo(function Icon({ className = defaultClassName }: { className?: string }) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {list.map((d) => (
          <path key={d} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
        ))}
      </svg>
    );
  });
}

const HOME_PATH = 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6';
const USERS_PATH = 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
const FINANCE_PATH = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const SHOPPING_BAG_PATH = 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z';

export const IconHome = makeIcon(HOME_PATH, 'w-5 h-5 mr-3');
export const IconUsers = makeIcon(USERS_PATH, 'w-5 h-5 mr-3');
export const IconSettings = makeIcon(
  ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
], 'w-5 h-5 mr-3');
export const IconImport = makeIcon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', 'w-5 h-5 mr-3');
export const IconCreditCard = makeIcon('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', 'w-5 h-5 mr-3');
export const IconPackage = makeIcon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', 'w-5 h-5 mr-3');
export const IconFinance = makeIcon(FINANCE_PATH, 'w-5 h-5 mr-3');
export const IconShoppingBag = makeIcon(SHOPPING_BAG_PATH, 'w-5 h-5 mr-3');

export const IconHomeSm = makeIcon(HOME_PATH);
export const IconShoppingBagSm = makeIcon(SHOPPING_BAG_PATH);
export const IconVendasSm = makeIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01');
export const IconFinanceSm = makeIcon(FINANCE_PATH);
export const IconClientsSm = makeIcon(USERS_PATH);
export const IconMenuSm = makeIcon('M4 6h16M4 12h16M4 18h16');
