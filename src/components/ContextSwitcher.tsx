import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCreateStore } from '../hooks/useCreateStore';
import { X } from 'lucide-react';

export function ContextSwitcher() {
  const { user, activeWorkspace, switchWorkspace } = useAuth();
  const { creating: creatingStore, createStore } = useCreateStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewStore, setShowNewStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');

  if (user?.role === 'SUPER_ADMIN' && !user?.isImpersonating) {
    return null;
  }

  if (!user?.workspaces || user.workspaces.length === 0) {
    return null;
  }

  const handleSwitch = (wsId: string) => {
    const target = user.workspaces?.find(w => w.id === wsId);
    const currentTipo = activeWorkspace?.tipo;
    if (target && target.tipo !== currentTipo) {
      window.location.href = '/app';
    }
    switchWorkspace(wsId);
    setIsOpen(false);
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contexto Atual</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-2.5 outline-none transition-all shadow-sm font-medium cursor-pointer"
        >
          <span className="truncate">
            {activeWorkspace?.tipo === 'PF' ? '👤 ' : '🏢 '}
            {activeWorkspace?.nome || 'Selecionar...'}
          </span>
          <svg className="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {user.workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                    ws.id === activeWorkspace?.id
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{ws.tipo === 'PF' ? '👤' : '🏢'}</span>
                  <span className="truncate">{ws.nome}</span>
                  {ws.id === activeWorkspace?.id && (
                    <span className="ml-auto text-xs text-brand-600">✓</span>
                  )}
                </button>
              ))}

              <div className="border-t border-gray-100" />
              <button
                onClick={() => { setShowNewStore(true); setIsOpen(false); }}
                className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 text-brand-700 hover:bg-brand-50 transition-colors font-medium"
              >
                <span className="text-lg leading-none">+</span>
                <span>Nova Loja (PJ)</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 text-[11px] text-brand-600 font-medium bg-brand-50 inline-block px-2 py-0.5 rounded-md">
        Visualizando: {activeWorkspace?.tipo === 'PF' ? 'Finanças Pessoais (PF)' : 'Loja (PJ)'}
      </div>

      {showNewStore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewStore(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Nova Loja</h3>
              <button onClick={() => setShowNewStore(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const created = await createStore(newStoreName);
              if (!created) return;
              setShowNewStore(false);
              setNewStoreName('');
              window.location.reload();
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                <input type="text" required autoFocus
                  value={newStoreName} onChange={e => setNewStoreName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ex: Minha Nova Loja" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewStore(false)}
                  className="flex-1 py-2.5 border rounded-lg text-gray-700 font-medium text-sm">Cancelar</button>
                <button type="submit" disabled={creatingStore || !newStoreName.trim()}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50">
                  {creatingStore ? 'Criando...' : 'Criar Loja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
