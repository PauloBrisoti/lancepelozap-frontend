import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function PendingCountBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    const check = async () => {
      try {
        const data = await fetchApi('/super-admin/pending-registrations');
        if (Array.isArray(data)) setCount(data.length);
      } catch {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  if (count === 0) return null;

  return (
    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
      {count}
    </span>
  );
}
