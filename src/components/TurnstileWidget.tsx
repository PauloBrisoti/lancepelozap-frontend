import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

/**
 * Widget Cloudflare Turnstile (CAPTCHA invisível/managed).
 * Carrega o script sob demanda e notifica o pai com o token via onToken.
 * Sem VITE_TURNSTILE_SITE_KEY, renderiza um aviso e nunca emite token
 * (o backend é fail-closed: login negado — comportamento intencional).
 */
export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    if (!SITE_KEY) {
      setScriptError(true);
      return;
    }

    let cancelled = false;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action: 'login',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => {
          onToken(null);
          setScriptError(true);
        },
        theme: 'light',
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!cancelled) renderWidget();
      };
      script.onerror = () => {
        if (!cancelled) setScriptError(true);
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget já removido
        }
      }
      widgetIdRef.current = null;
    };
  }, [onToken]);

  if (scriptError) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded text-xs">
        Não foi possível carregar a verificação de segurança (CAPTCHA). Verifique sua conexão e
        recarregue a página.
      </div>
    );
  }

  if (!SITE_KEY) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded text-xs">
        CAPTCHA não configurado no frontend (defina <code>VITE_TURNSTILE_SITE_KEY</code>). O login
        continuará bloqueado por segurança.
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
