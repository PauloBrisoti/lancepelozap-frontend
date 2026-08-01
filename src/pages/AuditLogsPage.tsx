import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import type { AuditLogEntry } from '../types/api';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await fetchApi('/super-admin/audit-logs');
        setLogs(data);
      } catch (error) {
        console.error('Erro ao carregar logs', error);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoria do Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Histórico imutável de ações no sistema.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Carregando logs...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Data/Hora</th>
                  <th className="px-4 py-3 font-medium">Loja (Tenant)</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Ação</th>
                  <th className="px-4 py-3 font-medium">Tabela</th>
                  <th className="px-4 py-3 font-medium text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nenhum log encontrado.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{log.tenant?.nomeFantasia || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{log.user?.nome} ({log.user?.email})</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.acao.includes('CREATE') ? 'bg-green-100 text-green-700' :
                          log.acao.includes('DELETE') ? 'bg-red-100 text-red-700' :
                          'bg-brand-100 text-brand-700'
                        }`}>
                          {log.acao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.tabelaAfetada}</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          className="text-brand-600 hover:underline text-xs"
                          onClick={() => toast(`Dados Anteriores:\n${JSON.stringify(log.dadosAntigos, null, 2)}\n\nDados Novos:\n${JSON.stringify(log.dadosNovos, null, 2)}`)}
                        >
                          Ver JSON
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
