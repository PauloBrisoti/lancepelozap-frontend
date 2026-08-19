import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useAuthUser, useAuthActions } from '../context/AuthContext';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos sem interação
const WARNING_MS = 60 * 1000; // aviso 1 minuto antes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;

const PUBLIC_PATHS = ['/login', '/reset-password', '/cadastro', '/catalogo', '/portal'];

export function IdleSession() {
  const { isAuthenticated } = useAuthUser();
  const { logout } = useAuthActions();
  const location = useLocation();
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const lastActivity = useRef(Date.now());
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const isPublic = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));
  const enabled = isAuthenticated && !isPublic;

  // Reinicia a contagem de inatividade sempre que a sessão passa a valer
  // (ex.: logo após o login), para não herdar o tempo parado na tela de login.
  useEffect(() => {
    if (enabled) lastActivity.current = Date.now();
  }, [enabled]);

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now();
    setWarningVisible(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onActivity = () => resetTimer();
    const bound = ACTIVITY_EVENTS.map(ev => {
      window.addEventListener(ev, onActivity, { passive: true });
      return ev;
    });

    const checkInterval = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_TIMEOUT_MS) {
        const warn = () => {
          const left = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS + WARNING_MS - (Date.now() - lastActivity.current)) / 1000));
          setSecondsLeft(left);
          if (left <= 0) {
            clearInterval(checkInterval);
            logoutRef.current?.();
          }
        };
        warn();
        setWarningVisible(true);
      }
    }, 1000);

    return () => {
      bound.forEach(ev => window.removeEventListener(ev, onActivity));
      clearInterval(checkInterval);
    };
  }, [enabled, resetTimer]);

  if (!enabled || !warningVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sessão prestes a expirar</h2>
            <p className="mt-1 text-sm text-gray-600">
              Você ficou {Math.round(IDLE_TIMEOUT_MS / 60000)} minutos sem interação. Sua sessão será encerrada em{' '}
              <span className="font-semibold text-gray-900">{secondsLeft}s</span>.
            </p>
          </div>
        </div>
        <button
          onClick={resetTimer}
          className="mt-5 w-full py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
        >
          Continuar conectado
        </button>
      </div>
    </div>
  );
}
