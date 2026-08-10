import { useAdminCount } from '../hooks/useAdminCount';

export function PendingCountBadge() {
  const count = useAdminCount<unknown[]>(
    '/super-admin/pending-registrations',
    30_000,
    data => data.length
  );

  if (count === null || count === 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
      {count}
    </span>
  );
}
