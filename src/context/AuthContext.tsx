/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react';
import { fetchApi, ACTIVE_STORE_COOKIE, ACTIVE_STORE_KEY } from '../lib/api';

interface Store {
  id: string;
  nomeFantasia: string;
  control: {
    id: string;
    nome: string;
    tipo: string;
  };
}

interface Workspace {
  id: string;
  nome: string;
  tipo: string;
  role: string;
}

interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  clientId: string | null;
  storeId: string | null;
  isImpersonating?: boolean;
  availableStores?: Store[];
  workspaces?: Workspace[];
  features?: Record<string, boolean>;
  dadosCompletos?: boolean;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  emailVerificationRequired?: boolean;
}

const RESTRICTED_ROLES = ['VENDEDOR', 'CAIXA'];

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  activeStoreId: string | null;
  activeWorkspace: Workspace | null;
  /** Workspace atual é do tipo pessoa física (finanças pessoais) */
  isPf: boolean;
  /** Usuário em papel restrito (VENDEDOR/CAIXA), sem impersonação ativa */
  isRestrictedRole: boolean;
  /** Semântica de feature flag: sem features cadastradas => tudo liberado */
  canAccess: (feature?: string) => boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  impersonate: (storeId: string) => Promise<void>;
  revertImpersonate: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Lê um cookie pelo nome.
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Salva storeId em cookie HttpOnly (mais seguro que localStorage).
 * O cookie é definido sem HttpOnly para que o JS possa ler (SameSite=Lax).
 * Para produção, Idealmente o backend deve setar esse cookie.
 */
function setStoreIdCookie(storeId: string | null) {
  if (storeId) {
    document.cookie = `${ACTIVE_STORE_COOKIE}=${encodeURIComponent(storeId)}; path=/; max-age=604800; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } else {
    document.cookie = `${ACTIVE_STORE_COOKIE}=; path=/; max-age=0`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(
    getCookie(ACTIVE_STORE_COOKIE) || localStorage.getItem(ACTIVE_STORE_KEY)
  );

  // Estado derivado: o workspace ativo é sempre o workspace do usuário cujo id
  // é o activeStoreId. Derivar (em vez de sincronizar via efeito) elimina o
  // risco de activeWorkspace ficar inconsistente com o user.
  const activeWorkspace = useMemo<Workspace | null>(() => {
    if (!user?.workspaces || !activeStoreId) return null;
    return user.workspaces.find(w => w.id === activeStoreId) ?? null;
  }, [user, activeStoreId]);

  const isPf = activeWorkspace?.tipo === 'PF';
  const isRestrictedRole = !!user && !user.isImpersonating && activeWorkspace
    ? RESTRICTED_ROLES.includes(activeWorkspace.role)
    : false;

  const canAccess = useCallback((feature?: string) => {
    const f = user?.features;
    if (!f || !feature) return true;
    if (Object.keys(f).length === 0) return true;
    return !!f[feature];
  }, [user]);

  // Verifica se há uma sessão ativa via cookie na inicialização
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await fetchApi('/auth/me');
        if (data.user) {
          setUser(data.user);
          const storedActive = getCookie(ACTIVE_STORE_COOKIE) || localStorage.getItem(ACTIVE_STORE_KEY);
          let targetStoreId = storedActive;
          if (!targetStoreId && data.user.workspaces && data.user.workspaces.length > 0) {
            targetStoreId = data.user.workspaces[0].id;
          }
          if (targetStoreId) {
            setActiveStoreId(targetStoreId);
            setStoreIdCookie(targetStoreId);
          }
        }
      } catch {
        // Sessão inválida/expirada: segue o fluxo de login normalmente
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Encerra a sessão local quando o backend responde 401 (token expirado/inválido)
  // Só age se havia sessão ativa — sem isso, o 401 do /auth/me na tela de login
  // causaria um loop infinito de reload.
  const hadSessionRef = useRef(false);
  useEffect(() => {
    hadSessionRef.current = !!user;
  }, [user]);

  useEffect(() => {
    const onSessionExpired = () => {
      if (!hadSessionRef.current) return;
      hadSessionRef.current = false;
      setUser(null);
      setActiveStoreId(null);
      setStoreIdCookie(null);
      localStorage.removeItem(ACTIVE_STORE_KEY);
    };
    window.addEventListener('session_expired', onSessionExpired);
    return () => window.removeEventListener('session_expired', onSessionExpired);
  }, []);

  // Mantém features/permissões atualizadas em tempo real:
  // refaz o /auth/me ao voltar para a aba e a cada 60s,
  // para que mudanças de features (ex.: desligar PDV) sumam do menu sem re-login.
  // PERFORMANCE: só atualiza o estado se o usuário REALMENTE mudou — sem isso,
  // a cada 60s o app inteiro re-renderizava sem necessidade.
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return; // aba oculta: não busca
      try {
        const data = await fetchApi('/auth/me');
        if (data.user) {
          setUser(prev => {
            if (prev && JSON.stringify(prev) === JSON.stringify(data.user)) return prev;
            return data.user;
          });
        }
      } catch { /* sessão indisponível — ignora */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    if (userData.workspaces && userData.workspaces.length > 0) {
      const firstWorkspace = userData.workspaces[0];
      setActiveStoreId(firstWorkspace.id);
      setStoreIdCookie(firstWorkspace.id);
      localStorage.removeItem(ACTIVE_STORE_KEY);
    } else {
      setActiveStoreId(null);
      setStoreIdCookie(null);
      localStorage.removeItem(ACTIVE_STORE_KEY);
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao fazer logout', error);
    } finally {
      setUser(null);
      setActiveStoreId(null);
      setStoreIdCookie(null);
      localStorage.removeItem(ACTIVE_STORE_KEY);
    }
  };

  const switchStore = (storeId: string) => {
    switchWorkspace(storeId);
  };

  const switchWorkspace = (workspaceId: string) => {
    setActiveStoreId(workspaceId);
    setStoreIdCookie(workspaceId);
    localStorage.removeItem(ACTIVE_STORE_KEY);
    refreshUser();
  };

  const impersonate = async (storeId: string) => {
    await fetchApi(`/super-admin/impersonate/${storeId}`, { method: 'POST' });
    setActiveStoreId(storeId);
    setStoreIdCookie(storeId);
    localStorage.removeItem(ACTIVE_STORE_KEY);
    window.location.href = '/app';
  };

  const revertImpersonate = async () => {
    await fetchApi('/super-admin/revert-impersonate', { method: 'POST' });
    setActiveStoreId(null);
    setStoreIdCookie(null);
    localStorage.removeItem(ACTIVE_STORE_KEY);
    window.location.href = '/admin';
  };

  const refreshUser = async () => {
    try {
      const data = await fetchApi('/auth/me');
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Erro ao recarregar usuário', error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, activeStoreId, activeWorkspace, isPf, isRestrictedRole, canAccess, login, logout, switchStore, switchWorkspace, impersonate, revertImpersonate, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
