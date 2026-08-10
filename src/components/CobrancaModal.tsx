import { Modal } from './Modal';
import { formatBRL } from '../utils/format';
import type { Receivable } from '../hooks/useFinanceiroDashboard';

interface Props {
  open: boolean;
  onClose: () => void;
  devedores: Receivable[];
  onCobrar: (devedor: Receivable) => void;
}

/** Modal de cobrança rápida via WhatsApp para devedores em atraso */
export function CobrancaModal({ open, onClose, devedores, onCobrar }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          Cobrança Rápida via WhatsApp
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="space-y-4">
        {devedores.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhum devedor encontrado.</p>
        ) : (
          devedores.map((dev, idx) => (
            <div key={dev.id || idx} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
              <div className="mb-2 sm:mb-0">
                <p className="font-bold text-gray-800">{dev.nome}</p>
                <p className="text-sm text-gray-500">Atraso: <span className="text-red-500 font-semibold">{dev.diasAtraso} dias</span></p>
                <p className="text-sm font-semibold text-gray-700">{formatBRL(Number(dev.valor))}</p>
              </div>
              <button
                onClick={() => onCobrar(dev)}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.383 0 0 5.383 0 12.031c0 2.124.552 4.161 1.603 5.975L.01 24l6.143-1.611A11.96 11.96 0 0012.031 24c6.648 0 12.031-5.383 12.031-12.031C24.062 5.383 18.679 0 12.031 0zM17.5 16.5c-.378 1.066-1.928 1.956-3.085 2.112-1.047.142-2.39-.089-4.808-1.092-2.91-1.21-4.795-4.22-4.945-4.422-.15-.202-1.182-1.572-1.182-2.998 0-1.426.745-2.128 1.018-2.428.273-.3.593-.375.792-.375.2 0 .4.002.578.01.196.009.46-.076.716.544.3.722.955 2.336 1.04 2.508.085.172.142.375.04.578-.1.202-.15.328-.3.504-.15.176-.312.372-.45.517-.152.16-.309.336-.135.638.174.302.775 1.282 1.666 2.077 1.15.103 2.155.674 2.474.836.319.162.505.14.693-.075.188-.215.81-1.037 1.026-1.393.216-.356.432-.296.72-.188.288.108 1.82.858 2.132 1.015.312.158.52.235.596.368.076.133.076.772-.302 1.838z"/></svg>
                Cobrar
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
