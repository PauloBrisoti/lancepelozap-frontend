import { useEffect } from 'react';
import { Loader2, ShieldAlert, CheckCircle2, X, AlertTriangle, Lock } from 'lucide-react';
import { useVarreduraFinanceira } from '../hooks/useVarreduraFinanceira';
import { formatBRL } from '../utils/format';
import type { ScanPlanItem } from '../types/api';

const LABEL_ACOES: Record<string, string> = {
  MARCAR_VENCIDO: 'Marcar como VENCIDO (bloqueia acesso)',
  LEMBRETE_1: 'Enviar cobrança amigável (lembrete 1)',
  LEMBRETE_2: 'Enviar cobrança firme (lembrete 2)',
  AVISO_BLOQUEIO: 'Enviar aviso de bloqueio',
};

const COR_ACOES: Record<string, string> = {
  MARCAR_VENCIDO: 'bg-red-50 text-red-700 border-red-200',
  LEMBRETE_1: 'bg-blue-50 text-blue-700 border-blue-200',
  LEMBRETE_2: 'bg-amber-50 text-amber-700 border-amber-200',
  AVISO_BLOQUEIO: 'bg-orange-50 text-orange-700 border-orange-200',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onExecuted: () => void;
}

/**
 * Fluxo da Varredura Financeira: dry-run (plano) → revisão → confirmação com senha → execução → resultado.
 * A lógica (chamadas de API, validações, toasts) vive no hook useVarreduraFinanceira.
 */
export function VarreduraFinanceiraModal({ open, onClose, onExecuted }: Props) {
  const {
    plano, carregandoPlano, confirmPassword, setConfirmPassword, executando,
    resultado, erro, carregarPlano, executar, podeExecutar, temAcoesBloqueio,
  } = useVarreduraFinanceira(onExecuted);

  useEffect(() => {
    if (open) void carregarPlano();
  }, [open, carregarPlano]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Varredura Financeira
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          {carregandoPlano && (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Montando plano (simulação)...
            </div>
          )}

          {erro && !carregandoPlano && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{erro}</div>
          )}

          {plano && !carregandoPlano && !resultado && (
            <>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Isto é uma simulação — nada foi executado.</p>
                  <p className="text-xs mt-1">
                    Plano para {plano.data}. Bloqueio é implícito: assinaturas marcadas como VENCIDO perdem acesso
                    imediatamente (validação no middleware de autenticação).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-red-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-red-700">{plano.resumo.marcarVencido}</p>
                  <p className="text-[10px] text-red-500 font-medium">Marcar VENCIDO</p>
                </div>
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{plano.resumo.lembretes1}</p>
                  <p className="text-[10px] text-blue-500 font-medium">Lembrete 1</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-amber-700">{plano.resumo.lembretes2}</p>
                  <p className="text-[10px] text-amber-600 font-medium">Lembrete 2</p>
                </div>
                <div className="bg-orange-50 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-orange-700">{plano.resumo.avisosBloqueio}</p>
                  <p className="text-[10px] text-orange-600 font-medium">Aviso bloqueio</p>
                </div>
              </div>

              {plano.itens.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Nenhuma ação necessária hoje. Todas as assinaturas estão em dia ou já notificadas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {plano.itens.map((item) => (
                    <ScanPlanItemRow key={item.subscriptionId} item={item} />
                  ))}
                </ul>
              )}
            </>
          )}

          {resultado && (
            <div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-800">
                  <p className="font-semibold">Varredura executada</p>
                  <p className="text-xs mt-1">
                    {resultado.marcadasVencido} assinatura(s) marcada(s) como VENCIDO ·{' '}
                    {resultado.notificacoesEnviadas} e-mail(s) enviado(s)
                    {resultado.notificacoesFalhas > 0 && ` · ${resultado.notificacoesFalhas} falha(s)`}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg">
                  Fechar
                </button>
              </div>
            </div>
          )}

          {plano && !resultado && !carregandoPlano && plano.resumo.total > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <Lock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Confirme sua senha para executar
                  </p>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Sua senha de administrador"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              {temAcoesBloqueio && (
                <p className="text-xs text-red-600 mt-2">
                  Atenção: esta execução bloqueará {plano.resumo.marcarVencido} lojista(s) (acesso suspenso até o pagamento).
                </p>
              )}
              <button
                onClick={() => void executar()}
                disabled={!podeExecutar}
                className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {executando ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
                Executar Varredura Financeira
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanPlanItemRow({ item }: { item: ScanPlanItem }) {
  return (
    <li className="border border-gray-200 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{item.cliente}</p>
        <p className="text-sm font-bold text-red-600">{formatBRL(item.valor)}</p>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        {item.diasAtraso} dia(s) de atraso · vencimento {item.dataVencimento}
        {!item.bloqueioAutomaticoAtivo && ' · bloqueio automático desativado'}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {item.acoes.map((acao) => (
          <span
            key={acao}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${COR_ACOES[acao] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
          >
            {LABEL_ACOES[acao] || acao}
          </span>
        ))}
      </div>
    </li>
  );
}
