/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
      } catch (error) {
        console.log('Não autenticado inicialmente ou erro ao recuperar sessão', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
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
