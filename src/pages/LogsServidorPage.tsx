import { useState, useRef } from 'react';
import { Terminal, RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiQuery, STALE_TIMES } from '../lib/query';

export function LogsServidorPage() {
  const [lines, setLines] = useState(100);
  const [filter, setFilter] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: logs = [], isFetching, refetch } = useApiQuery<{ file: string; lines: string[] }[]>(
    ['super-admin', 'server-logs', lines],
    `/super-admin/server-logs?lines=${lines}`,
    { staleTime: STALE_TIMES.REALTIME }
  );

  const allLines = logs.flatMap(l =>
    l.lines
      .filter(line => !filter || line.toLowerCase().includes(filter.toLowerCase()))
      .map(line => ({ file: l.file, line }))
  );

  const copyLogs = () => {
    const text = allLines.map(l => `[${l.file}] ${l.line}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Logs copiados!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs do Servidor</h1>
          <p className="text-gray-500 text-sm">Visualize os logs do backend em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Filtrar..." value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 w-48" />
          <select value={lines} onChange={e => setLines(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none">
            <option value={50}>50 linhas</option>
            <option value={100}>100 linhas</option>
            <option value={500}>500 linhas</option>
          </select>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button onClick={copyLogs} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">
            <Copy className="w-4 h-4" /> Copiar
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-300 text-sm font-medium">Console</span>
          <span className="text-gray-500 text-xs ml-auto">{allLines.length} linhas</span>
        </div>
        <div className="p-4 font-mono text-xs leading-relaxed max-h-[70vh] overflow-y-auto">
          {isFetching ? (
            <div className="text-gray-500">Carregando...</div>
          ) : allLines.length === 0 ? (
            <div className="text-gray-500">Nenhum log encontrado.</div>
          ) : (
            allLines.map((l, i) => (
              <div key={i} className="hover:bg-gray-800 px-2 py-0.5 rounded">
                <span className="text-gray-600 mr-2">[{i + 1}]</span>
                <span className="text-gray-500 mr-2">{l.file}:</span>
                <span className="text-gray-200">{l.line}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
