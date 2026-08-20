export const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Chave legada de persistência do workspace ativo (localStorage) */
export const ACTIVE_STORE_KEY = '@LancePeloZap:activeStoreId';
/** Cookie do workspace ativo (fonte preferida) */
export const ACTIVE_STORE_COOKIE = 'activeStoreId';

/**
 * Erro padronizado para falhas de API.
 * Inclui status HTTP e mensagem legível.
 */
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface FetchApiOptions extends RequestInit {
  /** Timeout em milissegundos (default: 15s) */
  timeout?: number;
  /** Sinal para cancelamento externo (ex: AbortController) */
  signal?: AbortSignal;
  /** Retorna ArrayBuffer bruto em vez de JSON (ex: download de arquivos) */
  raw?: boolean;
}

/**
 * Utilitário base para requisições na API.
 *
 * Funcionalidades:
 * - Timeout automático (15s) para evitar requisições pendentes infinitas
 * - Suporte a AbortController para cancelamento
 * - Headers de autenticação (cookie + store context)
 * - Tratamento padronizado de erros
 * - Suporte a FormData (upload de arquivos)
 */
export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<T> {
  const { timeout = 15000, signal: externalSignal, raw = false, ...fetchOptions } = options;
  const url = `${API_URL}${endpoint}`;

  // Timeout + sinal externo combinados
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  // Conectar sinais: se o externo abortar, o interno também
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
  }

  // Lê storeId: primeiro de cookie (seguro), fallback localStorage (legado)
  const getCookie = (name: string) => {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  };
  const activeStoreId = getCookie(ACTIVE_STORE_COOKIE) || localStorage.getItem(ACTIVE_STORE_KEY);
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Só define Content-Type se não for FormData
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (activeStoreId) {
    headers['x-store-id'] = activeStoreId;
    headers['x-workspace-id'] = activeStoreId;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: abortController.signal,
      // Nunca usar cache HTTP da API: o backend responde 304 com If-None-Match
      // e, sem corpo, o response.json() abaixo falharia (sessão "perdida").
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'SUBSCRIPTION_EXPIRED') {
        window.dispatchEvent(new CustomEvent('subscription_expired', { detail: errorData.error }));
      }
      if (errorData.twoFactorSetupRequired) {
        window.dispatchEvent(new CustomEvent('two_factor_setup_required'));
      }
      if (response.status === 401) {
        // O cookie de sessão é HttpOnly (invisível ao JS), então não dá para
        // checá-lo aqui. Quem decide se o 401 representa fim de sessão real é o
        // AuthContext (hadSessionRef), que ignora o evento se não havia sessão
        // ativa — isso evita loop de reload na tela de login.
        window.dispatchEvent(new CustomEvent('session_expired'));
      }
      throw new ApiError(
        errorData.error || errorData.message || `Erro ${response.status}`,
        response.status,
        errorData
      );
    }

    if (response.status === 204) return null as T;

    if (raw) return (await response.arrayBuffer()) as T;

    return response.json();
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if ((error as Error)?.name === 'AbortError') {
      throw new ApiError('Requisição cancelada (timeout)', 408);
    }
    throw new ApiError(
      (error as Error)?.message || 'Erro de conexão com o servidor',
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
