import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import type { ScanPlan, ScanResultado } from '../types/api';

/**
 * Fluxo da Varredura Financeira: dry-run (plano) → confirmação com senha → execução → resultado.
 * Toda a lógica de negócio (chamadas, validações, toasts) vive aqui;
 * o modal fica apenas com a apresentação dos estados.
 */
export function useVarreduraFinanceira(onExecuted: () => void) {
  const [plano, setPlano] = useState<ScanPlan | null>(null);
  const [carregandoPlano, setCarregandoPlano] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState<ScanResultado | null>(null);
  const [erro, setErro] = useState('');

  const carregarPlano = useCallback(async () => {
    setCarregandoPlano(true);
    setErro('');
    setResultado(null);
    setConfirmPassword('');
    try {
      const data = await fetchApi<ScanPlan>('/super-admin/scan/plan');
      setPlano(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar plano da varredura');
    } finally {
      setCarregandoPlano(false);
    }
  }, []);

  const executar = useCallback(async () => {
    if (!plano) return;
    setExecutando(true);
    setErro('');
    try {
      const res = await fetchApi<{ jaExecutadoHoje: boolean; resultado: ScanResultado }>(
        '/super-admin/scan/execute',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmPassword }),
        }
      );
      setResultado(res.resultado);
      if (res.jaExecutadoHoje) {
        toast('A varredura de hoje já havia sido executada — nenhuma ação duplicada.');
      } else {
        toast.success('Varredura executada com sucesso!');
      }
      setConfirmPassword('');
      onExecuted();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao executar varredura');
    } finally {
      setExecutando(false);
    }
  }, [plano, confirmPassword, onExecuted]);

  const podeExecutar = !!(plano && plano.resumo.total > 0 && confirmPassword && !executando);
  const temAcoesBloqueio = (plano?.resumo.marcarVencido ?? 0) > 0;

  return {
    plano,
    carregandoPlano,
    confirmPassword,
    setConfirmPassword,
    executando,
    resultado,
    erro,
    carregarPlano,
    executar,
    podeExecutar,
    temAcoesBloqueio,
  };
}
