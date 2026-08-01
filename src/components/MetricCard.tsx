import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'brand' | 'green' | 'blue' | 'purple' | 'red' | 'emerald' | 'amber' | 'teal';
  trend?: { value: number; positive?: boolean };
  onClick?: () => void;
}

const colorMap: Record<string, string> = {
  brand: 'border-t-brand-500', green: 'border-t-emerald-500', blue: 'border-t-blue-500',
  purple: 'border-t-purple-500', red: 'border-t-red-500', emerald: 'border-t-emerald-500',
  amber: 'border-t-amber-500', teal: 'border-t-teal-500',
};

/**
 * Card de métrica com React.memo.
 * Só re-renderiza se as props mudarem.
 */
export const MetricCard = React.memo(function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'brand',
  trend,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-2 md:p-5 rounded-xl shadow-sm border border-gray-200 border-t-4 ${colorMap[color]} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-sm md:text-3xl font-bold mt-0 md:mt-2 text-gray-900 break-all leading-tight">{value}</p>
          {subtitle && <p className="text-[10px] md:text-xs text-gray-400 mt-0 md:mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${trend.positive !== false ? 'text-emerald-600' : 'text-red-600'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.positive !== false ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6'} />
              </svg>
              {Math.abs(trend.value).toFixed(1)}%
            </p>
          )}
        </div>
        {icon && <div className="text-gray-300 shrink-0 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">{icon}</div>}
      </div>
    </div>
  );
});
