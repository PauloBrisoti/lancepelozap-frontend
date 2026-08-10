import { useEffect, useRef } from 'react';

/**
 * Hook de polling compartilhado.
 *
 * Vantagens sobre usar setInterval solto em cada componente:
 * - Pausa quando a aba está oculta (não desperdiça requisições)
 * - Dispara uma vez ao voltar para a aba (dados sempre frescos na hora)
 * - Erros são ignorados (o próximo ciclo tenta de novo)
 */
export function usePoll(fn: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn; // mantém a função mais recente sem reiniciar o timer
  }, [fn]);

  useEffect(() => {
    let alive = true;

    const run = () => {
      if (!alive) return;
      if (document.visibilityState === 'hidden') return; // aba oculta: não busca
      void Promise.resolve(fnRef.current()).catch(() => { /* próximo ciclo tenta de novo */ });
    };

    run(); // primeira busca imediata
    const id = window.setInterval(run, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run(); // voltou: atualiza na hora
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
