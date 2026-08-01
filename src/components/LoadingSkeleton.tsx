/**
 * Componentes de esqueleto de carregamento (skeleton).
 *
 * Uso:
 * ```tsx
 * if (isLoading) return <SkeletonTable rows={5} cols={4} />;
 * ```
 */

interface SkeletonProps {
  className?: string;
}

function Bar({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
    />
  );
}

export function SkeletonLine({ className = 'h-4 w-full' }: SkeletonProps) {
  return <Bar className={className} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <Bar className="h-4 w-1/3" />
      <Bar className="h-8 w-1/2" />
      <Bar className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Bar key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Bar key={c} className={`h-4 ${c === 0 ? 'flex-1' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6 p-6">
      <Bar className="h-8 w-64" />
      <Bar className="h-4 w-96" />
      <SkeletonGrid />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}

/**
 * Componente de erro para recarregar.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-sm font-medium text-gray-700 mb-1">Erro ao carregar dados</p>
      <p className="text-xs text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
