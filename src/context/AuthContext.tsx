/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { fetchApi } from '../lib/api';

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

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  activeStoreId: string | null;
  activeWorkspace: Workspace | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  switchStore: (storeId: string) => void;
  switchWorkspace: (workspaceId: string) => void;
  impersonate: (storeId: string) => Promise<void>;
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
    document.cookie = `activeStoreId=${encodeURIComponent(storeId)}; path=/; max-age=604800; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } else {
    document.cookie = 'activeStoreId=; path=/; max-age=0';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(
    getCookie('activeStoreId') || localStorage.getItem('@LancePeloZap:activeStoreId')
  );
  
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // Sync activeWorkspace when user or activeStoreId changes
  useEffect(() => {
    if (user?.workspaces && activeStoreId) {
      const ws = user.workspaces.find(w => w.id === activeStoreId);
      if (ws) setActiveWorkspace(ws);
    }
  }, [user, activeStoreId]);

  // Verifica se há uma sessão ativa via cookie na inicialização
  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await fetchApi('/auth/me');
        if (data.user) {
          setUser(data.user);
          const storedActive = getCookie('activeStoreId') || localStorage.getItem('@LancePeloZap:activeStoreId');
          let targetStoreId = storedActive;
          if (!targetStoreId && data.user.workspaces && data.user.workspaces.length > 0) {
            targetStoreId = data.user.workspaces[0].id;
          }
          if (targetStoreId) {
            setActiveStoreId(targetStoreId);
            setStoreIdCookie(targetStoreId);
            const ws = data.user.workspaces?.find((w: Workspace) => w.id === targetStoreId);
            if (ws) setActiveWorkspace(ws);
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
      setActiveWorkspace(null);
      setStoreIdCookie(null);
      localStorage.removeItem('@LancePeloZap:activeStoreId');
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
      setActiveWorkspace(firstWorkspace);
      setStoreIdCookie(firstWorkspace.id);
      localStorage.removeItem('@LancePeloZap:activeStoreId');
    } else {
      setActiveStoreId(null);
      setActiveWorkspace(null);
      setStoreIdCookie(null);
      localStorage.removeItem('@LancePeloZap:activeStoreId');
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
      setActiveWorkspace(null);
      setStoreIdCookie(null);
      localStorage.removeItem('@LancePeloZap:activeStoreId');
    }
  };

  const switchStore = (storeId: string) => {
    switchWorkspace(storeId);
  };
  
  const switchWorkspace = (workspaceId: string) => {
    setActiveStoreId(workspaceId);
    const ws = user?.workspaces?.find(w => w.id === workspaceId);
    if (ws) setActiveWorkspace(ws);
    setStoreIdCookie(workspaceId);
    localStorage.removeItem('@LancePeloZap:activeStoreId');
    refreshUser();
  };

  const impersonate = async (storeId: string) => {
    await fetchApi(`/super-admin/impersonate/${storeId}`, { method: 'POST' });
    setActiveStoreId(storeId);
    setStoreIdCookie(storeId);
    localStorage.removeItem('@LancePeloZap:activeStoreId');
    window.location.href = '/app';
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
    <AuthContext.Provider value={{ isAuthenticated, user, loading, activeStoreId, activeWorkspace, login, logout, switchStore, switchWorkspace, impersonate, refreshUser }}>
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
