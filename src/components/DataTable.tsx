import React from 'react';
import { SkeletonTable } from './LoadingSkeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
}

/**
 * Tabela de dados reutilizável com React.memo.
 * Só re-renderiza se os dados ou colunas mudarem.
 */
function DataTableComponent<T extends Record<string, any>>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado.',
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  if (loading) return <SkeletonTable rows={5} cols={columns.length} />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`text-left px-4 py-3 font-semibold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                      {col.render ? col.render(item, index) : String(item[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const DataTable = React.memo(DataTableComponent) as typeof DataTableComponent;

// ============================================================
// StatusBadge — badge de status colorido
// ============================================================

interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
}

const defaultLabels: Record<string, string> = {
  ATIVO: 'Ativo', INATIVO: 'Inativo', PENDENTE: 'Pendente',
  PAGO: 'Pago', VENCIDO: 'Vencido', CANCELADO: 'Cancelado',
  PAGO_PARCIAL: 'Pago Parcial', FINALIZADA: 'Finalizada', ABERTO: 'Aberto',
};

const defaultColors: Record<string, string> = {
  ATIVO: 'bg-emerald-100 text-emerald-700', INATIVO: 'bg-gray-100 text-gray-500',
  PAGO: 'bg-emerald-100 text-emerald-700', PENDENTE: 'bg-amber-100 text-amber-700',
  VENCIDO: 'bg-red-100 text-red-700', CANCELADO: 'bg-red-100 text-red-700',
  PAGO_PARCIAL: 'bg-blue-100 text-blue-700', FINALIZADA: 'bg-emerald-100 text-emerald-700',
  ABERTO: 'bg-blue-100 text-blue-700',
};

export const StatusBadge = React.memo(function StatusBadge({
  status,
  labels = defaultLabels,
  colors = defaultColors,
}: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
});

// ============================================================
// EmptyState — estado vazio com ícone
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = React.memo(function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {icon || (
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <p className="text-lg font-medium text-gray-600">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 text-brand-600 hover:text-brand-700 font-medium text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
});
