import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Activity, HardDrive, Database, Cpu, Clock, AlertCircle, CheckCircle, RefreshCw, Server } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemStatus {
  status: string;
  uptime: number;
  uptimeHuman: string;
  memory: { total: number; free: number; used: number; usagePercent: number };
  cpu: { cores: number; load1m: number; load5m: number; load15m: number };
  disk: { total: number; free: number; used: number; usagePercent: number };
  database: { connected: boolean; size: number; stores: number; clients: number; users: number };
  queue: { pendingSales: number; pendingQueue: number };
  lastBackup: string | null;
  nodeVersion: string;
  platform: string;
  env: string;
}

export function MonitoramentoPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/super-admin/system-status');
      setStatus(data);
    } catch { toast.error('Erro ao carregar status'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const formatBytes = (b: number) => {
    if (b === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;
  if (!status) return <div className="p-8 text-red-500">Erro ao carregar status.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoramento do Sistema</h1>
          <p className="text-gray-500 text-sm">Status em tempo real do servidor e banco de dados.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <div className={`p-4 rounded-xl border ${status.status === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          {status.status === 'healthy' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6 text-red-600" />}
          <div>
            <p className="font-bold text-lg">{status.status === 'healthy' ? '✅ Sistema Operacional Normal' : '⚠️ Sistema Degradado'}</p>
            <p className="text-sm text-gray-600">Node {status.nodeVersion} · {status.platform} · {status.env}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard icon={Clock} title="Uptime" value={status.uptimeHuman} color="brand" />
        <StatusCard icon={Cpu} title="CPU (média 1m)" value={`${status.cpu.load1m.toFixed(1)}%`} subtitle={`${status.cpu.cores} núcleos`} color="blue" />
        <StatusCard icon={HardDrive} title="Memória RAM" value={`${status.memory.usagePercent}%`} subtitle={`${formatBytes(status.memory.used)} / ${formatBytes(status.memory.total)}`} color={status.memory.usagePercent > 80 ? 'red' : 'emerald'} />
        <StatusCard icon={Database} title="Disco" value={`${status.disk.usagePercent}%`} subtitle={`${formatBytes(status.disk.used)} / ${formatBytes(status.disk.total)}`} color={status.disk.usagePercent > 80 ? 'red' : 'emerald'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600" /> Banco de Dados
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Conexão</span>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${status.database.connected ? 'text-emerald-600' : 'text-red-600'}`}>
                {status.database.connected ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.database.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Tamanho</span>
              <span className="text-sm font-medium">{formatBytes(status.database.size)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Lojas</span>
              <span className="text-sm font-medium">{status.database.stores}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Clientes</span>
              <span className="text-sm font-medium">{status.database.clients}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Usuários</span>
              <span className="text-sm font-medium">{status.database.users}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" /> Servidor
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Node.js</span>
              <span className="text-sm font-medium font-mono">{status.nodeVersion}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Plataforma</span>
              <span className="text-sm font-medium">{status.platform}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Ambiente</span>
              <span className="text-sm font-medium">{status.env}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm font-medium">{status.uptimeHuman}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Último Backup</span>
              <span className="text-sm font-medium">{status.lastBackup || 'Nenhum'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Vendas Pendentes</span>
              <span className="text-sm font-medium">{status.queue.pendingSales}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-600" /> Métricas de Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider">CPU Load</p>
            <div className="mt-2 space-y-1">
              {[
                { label: '1 min', value: status.cpu.load1m },
                { label: '5 min', value: status.cpu.load5m },
                { label: '15 min', value: status.cpu.load15m },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{item.label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${Math.min(item.value * 10, 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{item.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Memória RAM</p>
            <div className="mt-3">
              <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className={`h-4 rounded-full transition-all ${status.memory.usagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${status.memory.usagePercent}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{formatBytes(status.memory.used)} usado</span>
                <span>{formatBytes(status.memory.free)} livre</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Disco</p>
            <div className="mt-3">
              <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className={`h-4 rounded-full transition-all ${status.disk.usagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${status.disk.usagePercent}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{formatBytes(status.disk.used)} usado</span>
                <span>{formatBytes(status.disk.free)} livre</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, title, value, subtitle, color }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; subtitle?: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'border-t-brand-500', green: 'border-t-emerald-500', blue: 'border-t-blue-500',
    red: 'border-t-red-500', emerald: 'border-t-emerald-500',
  };
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 ${colors[color] || colors.brand}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-2 text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-8 h-8 text-gray-300" />
      </div>
    </div>
  );
}
