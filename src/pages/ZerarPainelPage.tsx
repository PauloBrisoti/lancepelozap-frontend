import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { AlertTriangle, Database, Shield, ArrowLeft } from 'lucide-react';

export function ZerarPainelPage() {
  const [step, setStep] = useState<'confirm' | 'type' | 'done'>('confirm');
  const [typing, setTyping] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await fetchApi('/super-admin/reset-database', {
        method: 'POST',
        body: JSON.stringify({ confirmacao: typing }),
      });
      setStep('done');
      toast.success('Banco zerado com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao zerar banco');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zerar Painel</h1>
        <p className="text-gray-500 text-sm">Limpa todos os dados de teste e prepara o sistema para produção.</p>
      </div>

      {step === 'confirm' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="flex items-center gap-4 text-red-600">
            <AlertTriangle className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-bold">⚠️ Atenção! Operação Irreversível</h2>
              <p className="text-sm text-gray-600">Isso vai apagar TODOS os dados: vendas, clientes, produtos, transações.</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4 text-sm text-red-800 space-y-2">
            <p><strong>Será apagado:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Todas as vendas e itens</li>
              <li>Todos os clientes e produtos</li>
              <li>Todas as transações financeiras</li>
              <li>Fornecedores, orçamentos, comissões</li>
              <li>Ordens de serviço, agendamentos</li>
            </ul>
            <p className="mt-2"><strong>Não será apagado:</strong> usuários, planos e configurações.</p>
          </div>

          <button onClick={() => { setStep('type'); setTyping(''); }}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition">
            Continuar com a Exclusão
          </button>
          <p className="text-xs text-center text-gray-400">Você ainda precisará confirmar digitando "ZERAR TUDO"</p>
        </div>
      )}

      {step === 'type' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
          <div className="flex items-center gap-3 text-red-600">
            <Shield className="w-8 h-8" />
            <h2 className="text-lg font-bold">Confirmação Final</h2>
          </div>

          <p className="text-sm text-gray-600">
            Digite <strong className="text-red-600">ZERAR TUDO</strong> no campo abaixo para confirmar a exclusão permanente de todos os dados.
          </p>

          <input type="text" value={typing} onChange={e => setTyping(e.target.value)}
            placeholder="Digite ZERAR TUDO"
            className="w-full border-2 border-red-300 rounded-lg px-4 py-3 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-red-500" />

          <div className="flex gap-3">
            <button onClick={() => setStep('confirm')}
              className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-gray-700 font-medium hover:bg-gray-50">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={handleReset} disabled={typing !== 'ZERAR TUDO' || loading}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition disabled:opacity-50">
              {loading ? 'Zerando...' : 'E X E C U T A R'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Database className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Banco Zerado com Sucesso!</h2>
          <p className="text-gray-500">Execute o seed para recriar os dados básicos.</p>
          <code className="block bg-gray-100 p-3 rounded text-sm font-mono">npm run db:seed</code>
        </div>
      )}
    </div>
  );
}
