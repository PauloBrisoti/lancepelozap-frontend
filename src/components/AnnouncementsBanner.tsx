import { X, Megaphone } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';

export function AnnouncementsBanner() {
  const { visible, dismiss } = useAnnouncements();

  if (visible.length === 0) return null;

  const colors: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };

  return (
    <div className="space-y-2 px-4 pt-2">
      {visible.map(a => (
        <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${colors[a.type] || colors.info}`}>
          <Megaphone className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{a.title}</p>
            <p className="text-xs mt-0.5">{a.message}</p>
          </div>
          <button onClick={() => dismiss(a.id)} className="shrink-0 p-0.5 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
