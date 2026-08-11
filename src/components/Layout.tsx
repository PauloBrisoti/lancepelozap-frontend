import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationBell } from './NotificationBell';
import { TrialBanner } from './TrialBanner';

export function Layout() {
  const navigate = useNavigate();
  const { logout, revertImpersonate, user, isPf } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`flex min-h-screen font-sans text-gray-900 ${
      isPf ? 'bg-emerald-50/30' : 'bg-gray-50'
    }`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {user?.isImpersonating && (
          <div className="bg-orange-500 text-white px-2 py-2 md:px-4 text-center text-xs md:text-sm font-bold flex flex-col md:flex-row justify-between items-center z-50 gap-2">
            <span>⚠️ SUPORTE: Você está acessando o painel de {isPf ? 'um usuário' : 'um lojista'}.</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  window.location.href = '/admin/lojas';
                }}
                className="bg-white/20 text-white px-3 py-1 rounded hover:bg-white/30 transition text-xs"
              >
                ⚙️ Configurar Lojista
              </button>
              <button
                onClick={async () => {
                  try {
                    await revertImpersonate();
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Erro ao sair');
                  }
                }}
                className="bg-white text-orange-600 px-3 py-1 rounded hover:bg-orange-50 transition text-xs"
              >
                Voltar ao Painel Super Admin
              </button>
            </div>
          </div>
        )}
        <header className="bg-white border-b border-gray-200 h-12 md:h-16 flex items-center justify-between px-3 md:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="hidden md:block text-xl font-semibold text-gray-800">Painel de Controle</h2>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
             <NotificationBell />
             <button onClick={handleLogout} className="hidden md:inline-flex text-gray-500 hover:text-red-600 text-sm font-medium transition-colors ml-1 md:ml-2">
               Sair
             </button>
          </div>
        </header>
        <TrialBanner />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 md:p-8 relative pb-20 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
}
