import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, AlertTriangle, CheckCircle, Megaphone } from 'lucide-react';
import { formatDateTimeBR } from '../lib/dates';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Megaphone className="w-4 h-4 text-brand-500" />;
    }
  };

  const typeBg = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50';
    switch (type) {
      case 'warning': return 'bg-amber-50';
      case 'success': return 'bg-emerald-50';
      default: return 'bg-blue-50';
    }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Notificações</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhuma notificação.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${typeBg(n.type, n.read)}`}
                  onClick={() => !n.read && markRead(n.id)}>
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDateTimeBR(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
