import React from 'react';

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}

/**
 * Container de página que padroniza layout (título + ações + conteúdo).
 * Presentacional: só renderiza, não tem lógica de dados.
 */
export const PageContainer = React.memo(function PageContainer({
  title,
  description,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 md:gap-3 shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
});

// ============================================================
// ActionButton — botão de ação padronizado
// ============================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: 'default' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

export const ActionButton = React.memo(function ActionButton({
  icon,
  label,
  onClick,
  color = 'default',
  disabled,
  loading,
}: ActionButtonProps) {
  const colors = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    success: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {loading ? 'Carregando...' : label}
    </button>
  );
});
