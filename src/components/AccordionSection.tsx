import { useState } from 'react';

export function AccordionSection({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`sidebar:${title}`);
      if (saved !== null) return saved === '1';
    } catch {}
    return defaultOpen;
  });
  return (
    <div>
      <button
        onClick={() => {
          setOpen(!open);
          try {
            localStorage.setItem(`sidebar:${title}`, open ? '0' : '1');
          } catch {}
        }}
        className="flex items-center w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
      >
        <span className="mr-2">{icon}</span>
        <span className="flex-1 text-left">{title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="ml-2 space-y-0.5 border-l-2 border-gray-100 pl-2">{children}</div>}
    </div>
  );
}
