import type { ReactNode } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Texto exibido junto ao "Página X de Y" (ex.: "· 12 venda(s)"). */
  info?: ReactNode;
  /** 'centered': padrão abaixo de tabelas; 'between': barra com info à esquerda. */
  variant?: 'centered' | 'between';
}

const btnCls = 'px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50';
const labelCls = 'px-3 py-1.5 text-sm text-gray-500';

export function Pagination({ page, totalPages, onPageChange, info, variant = 'centered' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevBtn = (
    <button disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} className={btnCls}>
      Anterior
    </button>
  );
  const label = (
    <span className={labelCls}>
      Página {page} de {totalPages}
      {info && <> · {info}</>}
    </span>
  );
  const nextBtn = (
    <button disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))} className={btnCls}>
      Próxima
    </button>
  );

  if (variant === 'between') {
    return (
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
        {label}
        <div className="flex gap-2">
          {prevBtn}
          {nextBtn}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 mt-4">
      {prevBtn}
      {label}
      {nextBtn}
    </div>
  );
}
