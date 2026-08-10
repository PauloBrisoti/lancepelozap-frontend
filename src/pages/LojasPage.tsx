import toast from 'react-hot-toast';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { maskCpfCnpj, validarCpfCnpj } from '../lib/validators';
import type { Subscription } from '../types/api';
import { formatDateBR, formatDateTimeBR } from '../lib/dates';
import { formatBRL } from '../utils/format';
import { Modal } from '../components/Modal';

interface Store {
  id: string;
  nomeFantasia: string;
  cnpjCpf: string | null;
  nichoPrincipal: string | null;
  status: string;
  chavePix?: string | null;
}

interface Control {
  id: string;
  nome: string;
  tipo: string;
  stores: Store[];
  status?: string;
}

interface ClientData {
  id: string;
  nomeCompleto: string;
  nomeFantasia: string;
  cnpjCpf: string;
  emailContato: string;
  telefoneWhatsapp: string;
  status: string;
  createdAt: string;

  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;

  // relations
  controls?: Control[];
  subscriptions?: Subscription[];
  isDemo?: boolean;
  deletedAt?: string | null;
}

const PAGE_SIZE = 10;

function formatDoc(doc: string | null | undefined): string {
  const digits = (doc || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc || '-';
}

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

function subStatusInfo(sub: Subscription | undefined): { label: string; className: string } {
  if (!sub) return { label: 'Sem assinatura', className: 'bg-gray-200 text-gray-600' };
  switch (sub.statusPagamento) {
    case 'PAGO': return { label: 'Pago', className: 'bg-green-100 text-green-700' };
    case 'TRIAL': return { label: 'Trial', className: 'bg-blue-100 text-blue-700' };
    case 'PENDENTE': return { label: 'Em graça', className: 'bg-amber-100 text-amber-700' };
    case 'VENCIDO': return { label: 'Inadimplente', className: 'bg-red-100 text-red-700' };
    case 'CANCELADO': return { label: 'Cancelado', className: 'bg-gray-200 text-gray-600' };
    default: return { label: sub.statusPagamento, className: 'bg-gray-200 text-gray-600' };
  }
}

function dueDateLabel(sub: Subscription | undefined): string {
  if (!sub?.dataVencimento) return '';
  return formatDateBR(sub.dataVencimento);
}

function dueBadgeSuffix(sub: Subscription | undefined): string {
  if (!sub?.dataVencimento) return '';
  const due = new Date(sub.dataVencimento);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (sub.statusPagamento === 'VENCIDO' || days < 0) {
    return ` (${Math.abs(days)}d atraso)`;
  }
  return ` (vence em ${days}d)`;
}

const NICHOS = ['Pessoal', 'Varejo', 'Alimentício', 'Pet', 'Moda e Acessórios', 'Beleza e Estética', 'Saúde', 'Serviços', 'Outros'];

function moduleLabel(control: Control): string {
  return control.tipo === 'PF' ? 'Finanças Pessoais' : 'Varejo e Estoque';
}

export function LojasPage() {
  const { user, impersonate } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formTab, setFormTab] = useState<'GERAL' | 'ENDERECO' | 'MODULOS'>('GERAL');

  // Form State
  const [formData, setFormData] = useState<{ 
    id: string | null; 
    nomeFantasia: string; 
    cnpjCpf: string; 
    nichoPrincipal: string; 
    telefoneWhatsapp: string; 
    emailContato: string; 
    chavePix: string; 
    status: string; 
    nomeResponsavel: string; 
    emailResponsavel: string; 
    senhaResponsavel: string; 
    plano: string; 
    statusPagamento: string;
    dataVencimento: string;
    planoId: string;
    subscriptionId: string;
    workspaceType: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    isDemo: boolean;
  }>({ 
    id: null, nomeFantasia: '', cnpjCpf: '', nichoPrincipal: '', telefoneWhatsapp: '', emailContato: '', chavePix: '', status: 'ATIVO', 
    nomeResponsavel: '', emailResponsavel: '', senhaResponsavel: '', plano: 'BASICO', statusPagamento: 'PAGO',
    dataVencimento: '', planoId: '', subscriptionId: '', workspaceType: 'PJ',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', isDemo: false
  });

  const [equipeModalAberto, setEquipeModalAberto] = useState(false);
  const [formFeatures, setFormFeatures] = useState<Record<string, boolean>>({});
  const [formFeaturesStoreId, setFormFeaturesStoreId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [hideDemo, setHideDemo] = useState(false);
  const [logsModalStore, setLogsModalStore] = useState<{ storeId: string; storeName: string } | null>(null);
  const [impersonationLogs, setImpersonationLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'nome' | 'cadastro' | 'status'>('cadastro');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const kpis = useMemo(() => {
    const activeClients = clients.filter(c => !c.deletedAt);
    const lojasAtivas = activeClients.reduce(
      (acc, c) => acc + (c.controls || []).reduce(
        (a, control) => a + control.stores.filter(s => s.status === 'ATIVO').length, 0
      ),
      0
    );
    const subs = activeClients.map(c => c.subscriptions?.[0]).filter(Boolean);
    const mrr = subs
      .filter(s => s!.statusPagamento === 'PAGO' || s!.statusPagamento === 'TRIAL')
      .reduce((acc, s) => acc + Number(s!.valorMensalidade || 0), 0);
    return {
      clientes: activeClients.length,
      lojasAtivas,
      trials: subs.filter(s => s!.statusPagamento === 'TRIAL').length,
      emGraca: subs.filter(s => s!.statusPagamento === 'PENDENTE').length,
      inadimplentes: subs.filter(s => s!.statusPagamento === 'VENCIDO').length,
      mrr,
    };
  }, [clients]);

  const toggleSort = (key: 'nome' | 'cadastro' | 'status') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'nome' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter(c => {
      if (!showArchived && c.deletedAt) return false;
      if (showArchived && !c.deletedAt) return false;
      if (hideDemo && c.isDemo) return false;
      if (filterStatus !== 'TODOS') {
        const subStatus = c.subscriptions?.[0]?.statusPagamento;
        if (subStatus !== filterStatus) return false;
      }
      if (!term) return true;
      const haystack = [
        c.nomeCompleto,
        c.emailContato,
        c.telefoneWhatsapp,
        c.cnpjCpf,
        ...(c.controls || []).flatMap(control => control.stores.map(s => s.nomeFantasia)),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search, filterStatus, showArchived, hideDemo]);

  const sortedClients = useMemo(() => {
    const sorted = [...filteredClients];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      if (sortKey === 'nome') return a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR') * dir;
      if (sortKey === 'status') return a.status.localeCompare(b.status, 'pt-BR') * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return sorted;
  }, [filteredClients, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageClients = sortedClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const ALL_FEATURES: { key: string; label: string }[] = [
    { key: 'pdv', label: 'Nova Venda (PDV)' },
    { key: 'vendas', label: 'Vendas' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'catalogo', label: 'Catálogo & Estoque' },
    { key: 'financeiro', label: 'Financeiro / Dashboard' },
    { key: 'ordem_servico', label: 'Ordem de Serviço' },
    { key: 'operacional_pet', label: 'Operacional Pet' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'orcamentos', label: 'Orçamentos' },
    { key: 'devolucoes', label: 'Devoluções' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'campanhas', label: 'Campanhas' },
    { key: 'crediario', label: 'Crediário / Fiado' },
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'insights', label: 'Insights & IA' },
    { key: 'bi', label: 'BI & Relatórios' },
    { key: 'dashboard_pj', label: 'Dashboard Consolidado' },
    { key: 'caixa', label: 'Controle de Caixa' },
    { key: 'comissoes', label: 'Comissões' },
    { key: 'transferencia_estoque', label: 'Transferência de Estoque' },
    { key: 'inventario', label: 'Inventário' },
    { key: 'compras', label: 'Compras' },
    { key: 'fornecedores', label: 'Fornecedores' },
    { key: 'multiplos_vendedores', label: 'Múltiplos Vendedores' },
    { key: 'financas_pessoais', label: 'Finanças Pessoais' },
  ];
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [selectedClientForEquipe, setSelectedClientForEquipe] = useState<ClientData | null>(null);

  const abrirModalEquipe = async (client: ClientData) => {
    setSelectedClientForEquipe(client);
    setEquipeModalAberto(true);
    setClientUsers([]);
    try {
      const data = await fetchApi(`/super-admin/clients/${client.id}/users`);
      setClientUsers(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar equipe do cliente');
    }
  };

  const carregarLojas = async (archived = showArchived) => {
    try {
      const [data, plansData] = await Promise.all([
        fetchApi(`/super-admin/clients${archived ? '?includeArchived=true' : ''}`),
        fetchApi('/super-admin/plans')
      ]);
      setClients(data);
      setPlans(plansData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar clientes e lojas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLojas();
  }, []);

  const toggleArchived = (value: boolean) => {
    setShowArchived(value);
    setPage(1);
    carregarLojas(value);
  };

  const arquivarCliente = async (client: ClientData) => {
    if (!confirm(`Arquivar "${client.nomeCompleto}"? O acesso ao painel será bloqueado, mas os dados serão preservados.`)) return;
    try {
      await fetchApi(`/super-admin/clients/${client.id}`, { method: 'DELETE' });
      toast.success('Cliente arquivado');
      carregarLojas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const restaurarCliente = async (client: ClientData) => {
    try {
      await fetchApi(`/super-admin/clients/${client.id}/restore`, { method: 'POST' });
      toast.success('Cliente restaurado');
      carregarLojas(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const excluirDefinitivamente = async (client: ClientData) => {
    if (!confirm(`EXCLUIR PERMANENTEMENTE "${client.nomeCompleto}" e todos os dados (vendas, estoque, financeiro)?`)) return;
    if (!confirm('TEM CERTEZA? Esta ação não pode ser desfeita!')) return;
    try {
      await fetchApi(`/super-admin/clients/${client.id}/purge`, { method: 'POST' });
      toast.success('Cliente excluído definitivamente');
      carregarLojas(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const abrirLogsLoja = async (store: Store) => {
    setLogsModalStore({ storeId: store.id, storeName: store.nomeFantasia });
    setImpersonationLogs([]);
    setLogsLoading(true);
    try {
      const data = await fetchApi(`/super-admin/impersonation-logs?storeId=${store.id}&limit=20`);
      setImpersonationLogs(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar histórico de acessos');
    } finally {
      setLogsLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['Nome', 'Email', 'Telefone', 'CNPJ/CPF', 'Lojas', 'Nicho', 'Status', 'Pagamento', 'Vencimento', 'Cadastro', 'Demo', 'Arquivado'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = sortedClients.map(c => {
      const sub = c.subscriptions?.[0];
      const lojas = (c.controls || []).flatMap(ctrl => ctrl.stores.map(s => s.nomeFantasia)).join('; ');
      const nichos = (c.controls || []).flatMap(ctrl => ctrl.stores.map(s => s.nichoPrincipal || '')).filter(Boolean).join('; ');
      return [
        c.nomeCompleto,
        c.emailContato || '',
        c.telefoneWhatsapp || '',
        formatDoc(c.cnpjCpf),
        lojas,
        nichos,
        c.status,
        sub?.statusPagamento || '',
        dueDateLabel(sub),
        formatDateBR(c.createdAt),
        c.isDemo ? 'Sim' : 'Não',
        c.deletedAt ? 'Sim' : 'Não',
      ].map(escape).join(';');
    });
    const csv = '\ufeff' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNewModal = () => {
    setFormTab('GERAL');
    const firstPlan = plans[0];
    setFormData({
      id: '',
      nomeFantasia: '',
      cnpjCpf: '',
      nichoPrincipal: '',
      telefoneWhatsapp: '',
      emailContato: '',
      status: 'ATIVO',
      nomeResponsavel: '',
      emailResponsavel: '',
      senhaResponsavel: '',
      plano: 'STARTER',
      statusPagamento: 'TRIAL',
      dataVencimento: '',
      planoId: firstPlan?.id || '',
      subscriptionId: '',
      workspaceType: 'PJ',
      chavePix: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      isDemo: false,
    });
    setIsEditing(false);
    setModalOpen(true);
  };

  const openEditModal = async (client: ClientData) => {
    const sub = client.subscriptions?.[0];
    const firstCtrl = client.controls?.[0];
    setFormTab('GERAL');
    setFormData({
      id: client.id,
      nomeFantasia: client.nomeCompleto || client.nomeFantasia || '',
      cnpjCpf: client.cnpjCpf || '',
      nichoPrincipal: firstCtrl?.stores?.[0]?.nichoPrincipal || '',
      telefoneWhatsapp: client.telefoneWhatsapp || '',
      emailContato: client.emailContato || '',
      status: client.status,
      nomeResponsavel: '',
      emailResponsavel: '',
      senhaResponsavel: '',
      plano: 'STARTER',
      statusPagamento: sub?.statusPagamento || 'PAGO',
      dataVencimento: sub?.dataVencimento ? sub.dataVencimento.split('T')[0] : '',
      planoId: sub?.planId || '',
      subscriptionId: sub?.id || '',
      workspaceType: firstCtrl?.tipo || 'PJ',
      chavePix: firstCtrl?.stores?.[0]?.chavePix || '',
      cep: client.cep || '',
      logradouro: client.logradouro || '',
      numero: client.numero || '',
      complemento: client.complemento || '',
      bairro: client.bairro || '',
      cidade: client.cidade || '',
      uf: client.uf || '',
      isDemo: !!client.isDemo,
    });
    setIsEditing(true);
    setModalOpen(true);

    // Load features from first store
    const firstStore = firstCtrl?.stores?.[0];
    if (firstStore?.id) {
      setFormFeaturesStoreId(firstStore.id);
      try {
        const storeData = await fetchApi('/super-admin/stores/' + firstStore.id + '/features');
        if (storeData.features && Object.keys(storeData.features).length > 0) {
          setFormFeatures(storeData.features);
        } else {
          // Sem features configuradas: assume todos os módulos habilitados
          setFormFeatures(Object.fromEntries(ALL_FEATURES.map(f => [f.key, true])));
        }
      } catch {
        setFormFeatures(Object.fromEntries(ALL_FEATURES.map(f => [f.key, true])));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docErro = validarCpfCnpj(formData.cnpjCpf);
    if (docErro) {
      toast.error(docErro);
      return;
    }
    try {
      if (isEditing) {
        const payload: Record<string, unknown> = { ...formData };
        if (!formData.subscriptionId) {
          delete payload.subscriptionId;
          delete payload.planoId;
        }
        await fetchApi(`/super-admin/clients/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await fetchApi('/super-admin/clients', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Cliente e Loja criados com sucesso!');
      }
      setModalOpen(false);
      carregarLojas();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cliente');
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="p-6">Acesso negado. Apenas Super Administradores.</div>;
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando clientes e lojas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Clientes e Lojas</h1>
          <p className="text-gray-500 text-sm mt-1">Visão Global de todos os Clientes e as respectivas Lojas/Operações.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition"
        >
          Novo Cliente Manual
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Clientes', value: String(kpis.clientes), className: 'text-brand-600' },
          { label: 'Lojas Ativas', value: String(kpis.lojasAtivas), className: 'text-green-600' },
          { label: 'MRR', value: formatBRL(kpis.mrr), className: 'text-gray-900', small: true },
          { label: 'Em Trial', value: String(kpis.trials), className: 'text-blue-600' },
          { label: 'Em Período de Graça', value: String(kpis.emGraca), className: 'text-amber-600' },
          { label: 'Inadimplentes', value: String(kpis.inadimplentes), className: 'text-red-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
            <div className={`${kpi.small ? 'text-xl' : 'text-2xl'} font-bold ${kpi.className}`}>{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, CNPJ ou loja..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="TODOS">Todos os status de pagamento</option>
          <option value="PAGO">Pago</option>
          <option value="TRIAL">Trial</option>
          <option value="PENDENTE">Período de graça</option>
          <option value="VENCIDO">Inadimplente</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideDemo}
            onChange={e => setHideDemo(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600"
          />
          Ocultar demo
        </label>
        <button
          onClick={() => toggleArchived(!showArchived)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
            showArchived
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {showArchived ? 'Ver Clientes Ativos' : 'Clientes Arquivados'}
        </button>
        <button
          onClick={exportCsv}
          className="px-4 py-2 rounded-lg text-sm font-medium transition border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('nome')}>
                Cliente (Pagante) {sortKey === 'nome' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-6 py-4 font-medium">Operações (Lojas)</th>
              <th className="px-6 py-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('cadastro')}>
                Cadastro {sortKey === 'cadastro' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer select-none" onClick={() => toggleSort('status')}>
                Status do Cliente {sortKey === 'status' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
              <th className="px-6 py-4 font-medium text-right">Ações Globais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pageClients.map(c => {
              const sub = c.subscriptions?.[0];
              const subInfo = subStatusInfo(sub);
              return (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 align-top">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {c.nomeCompleto}
                    {c.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700" title="Cliente de demonstração">Demo</span>
                    )}
                    {c.deletedAt && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 text-gray-600">Arquivado</span>
                    )}
                  </div>
                  {c.emailContato ? (
                    <a href={`mailto:${c.emailContato}`} className="text-gray-500 text-xs mt-1 block hover:text-brand-600">
                      {c.emailContato}
                    </a>
                  ) : (
                    <div className="text-gray-500 text-xs mt-1">{c.telefoneWhatsapp}</div>
                  )}
                  <div className="text-gray-500 text-xs">CNPJ/CPF: {formatDoc(c.cnpjCpf)}</div>
                </td>
                <td className="px-6 py-4 align-top">
                  {c.controls && c.controls.map(control => (
                    <div key={control.id} className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{control.nome}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-100 text-brand-700">
                          {moduleLabel(control)}
                        </span>
                      </div>
                      <ul className="mt-1 space-y-2">
                        {control.stores.map((store: Store) => (
                          <li key={store.id} className="flex flex-col border p-2 rounded bg-gray-50">
                            <span className="font-medium text-gray-800">{store.nomeFantasia}</span>
                            <span className="text-xs text-gray-500">Nicho: {store.nichoPrincipal || '-'} | Status: {store.status}</span>
                            <div className="mt-2 flex gap-2">
                              {!c.deletedAt && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      await impersonate(store.id);
                                      window.location.href = '/app'; // Recarrega para iniciar God Mode na loja
                                    } catch (err: unknown) {
                                      toast.error(err instanceof Error ? err.message : 'Erro ao acessar loja');
                                    }
                                  }}
                                  className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium transition"
                                  title="Entrar no painel desta loja específica"
                                >
                                  Acessar Loja (God Mode)
                                </button>
                              )}
                              <button
                                onClick={() => abrirLogsLoja(store)}
                                className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded font-medium transition"
                                title="Histórico de acessos em God Mode nesta loja"
                              >
                                Acessos
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {(!c.controls || c.controls.length === 0) && (
                    <span className="text-gray-400 text-xs italic">Nenhuma loja cadastrada</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600 align-top">
                  <div title={formatDateBR(c.createdAt)}>
                    {relativeDate(c.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 align-top space-y-1">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                    c.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.status}
                  </span>
                  <div
                    title={sub?.dataVencimento ? `Vencimento: ${dueDateLabel(sub)}` : ''}
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ml-1 ${subInfo.className}`}
                  >
                    {subInfo.label}
                    {(sub?.statusPagamento === 'PENDENTE' || sub?.statusPagamento === 'VENCIDO' || sub?.statusPagamento === 'TRIAL') && dueBadgeSuffix(sub)}
                  </div>
                </td>
                <td className="px-6 py-4 align-top relative text-right">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                    className="px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-lg leading-none font-bold"
                    title="Ações"
                  >
                    ⋯
                  </button>
                  {openMenuId === c.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-4 top-11 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 text-left">
                        {!c.deletedAt ? (
                          <>
                            <button
                              onClick={() => { setOpenMenuId(null); abrirModalEquipe(c); }}
                              className="block w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50"
                            >
                              Equipe Global
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); openEditModal(c); }}
                              className="block w-full text-left px-3 py-2 text-sm text-brand-700 hover:bg-brand-50"
                            >
                              Editar Cliente
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); arquivarCliente(c); }}
                              className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              Arquivar Cliente
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setOpenMenuId(null); restaurarCliente(c); }}
                              className="block w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                            >
                              Restaurar Cliente
                            </button>
                            <button
                              onClick={() => { setOpenMenuId(null); excluirDefinitivamente(c); }}
                              className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              Excluir Definitivamente
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </td>
              </tr>
              );
            })}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-gray-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              {filteredClients.length} cliente(s) · página {currentPage} de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={currentPage >= pageCount}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="xl" rounded="xl" className="flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <div className="px-6 pt-4">
                  <div className="flex border-b border-gray-200 gap-4">
                    <button type="button" onClick={() => setFormTab('GERAL')} className={`pb-2 text-sm font-medium border-b-2 ${formTab === 'GERAL' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500'}`}>Geral</button>
                    <button type="button" onClick={() => setFormTab('ENDERECO')} className={`pb-2 text-sm font-medium border-b-2 ${formTab === 'ENDERECO' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500'}`}>Endereço</button>
                    <button type="button" onClick={() => setFormTab('MODULOS')} className={`pb-2 text-sm font-medium border-b-2 ${formTab === 'MODULOS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500'}`}>Módulos & Assinaturas</button>
                  </div>
                </div>
              ) : null}

              <form id="client-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                {(formTab === 'GERAL' || !isEditing) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo / Fantasia *</label>
                      <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                        value={formData.nomeFantasia} onChange={e => setFormData({...formData, nomeFantasia: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ / CPF</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="00.000.000/0000-00 ou 000.000.000-00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.cnpjCpf}
                        onChange={e => setFormData({...formData, cnpjCpf: maskCpfCnpj(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Contato Principal</label>
                      <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                        value={formData.emailContato} onChange={e => setFormData({...formData, emailContato: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                        value={formData.telefoneWhatsapp} onChange={e => setFormData({...formData, telefoneWhatsapp: e.target.value})} />
                    </div>
                    {isEditing && (
                      <div className="col-span-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={formData.isDemo}
                            onChange={e => setFormData({...formData, isDemo: e.target.checked})}
                          />
                          <span className="text-sm font-medium text-gray-700">Cliente de demonstração (dados de exemplo)</span>
                        </label>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nicho (Para a 1ª Loja)</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        value={formData.nichoPrincipal}
                        onChange={e => setFormData({...formData, nichoPrincipal: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        {NICHOS.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                        value={formData.chavePix} onChange={e => setFormData({...formData, chavePix: e.target.value})} />
                    </div>
                  </div>
                )}

                {(formTab === 'ENDERECO' || !isEditing) && (
                  <div className="space-y-4">
                    {(!isEditing) && <h3 className="font-bold text-gray-800 mt-6 border-t pt-4">Endereço</h3>}
                    <div className="grid grid-cols-12 gap-4 mt-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          placeholder="00000-000"
                          value={formData.cep || ''} onChange={e => setFormData({...formData, cep: e.target.value})}
                          onBlur={(e) => {
                            const cep = e.target.value.replace(/\D/g, '');
                            if (cep.length === 8) {
                              fetch(`https://viacep.com.br/ws/${cep}/json/`)
                                .then(res => res.json())
                                .then(data => {
                                  if (!data.erro) {
                                    setFormData(prev => ({
                                      ...prev,
                                      logradouro: data.logradouro,
                                      bairro: data.bairro,
                                      cidade: data.localidade,
                                      uf: data.uf
                                    }));
                                  }
                                });
                            }
                          }}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-8">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.logradouro || ''} onChange={e => setFormData({...formData, logradouro: e.target.value})} />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.numero || ''} onChange={e => setFormData({...formData, numero: e.target.value})} />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.complemento || ''} onChange={e => setFormData({...formData, complemento: e.target.value})} />
                      </div>
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.bairro || ''} onChange={e => setFormData({...formData, bairro: e.target.value})} />
                      </div>
                      <div className="col-span-12 sm:col-span-9">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.cidade || ''} onChange={e => setFormData({...formData, cidade: e.target.value})} />
                      </div>
                      <div className="col-span-12 sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.uf || ''} onChange={e => setFormData({...formData, uf: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <>
                    <h3 className="font-bold text-gray-800 mt-6 border-t pt-4">Dados de Acesso (Dono)</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Proprietário *</label>
                        <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.nomeResponsavel} onChange={e => setFormData({...formData, nomeResponsavel: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de Login *</label>
                        <input required type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.emailResponsavel} onChange={e => setFormData({...formData, emailResponsavel: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial *</label>
                        <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                          value={formData.senhaResponsavel} onChange={e => setFormData({...formData, senhaResponsavel: e.target.value})} />
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-800 mt-6 border-t pt-4">Assinatura</h3>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plano Inicial</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.plano} onChange={e => setFormData({...formData, plano: e.target.value})}>
                          <option value="STARTER">Starter</option>
                          <option value="PRO">Pro</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status do Pagamento</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.statusPagamento} onChange={e => setFormData({...formData, statusPagamento: e.target.value})}>
                          <option value="TRIAL">Trial (Teste Grátis)</option>
                          <option value="PAGO">Pago</option>
                          <option value="PENDENTE">Pendente</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {formTab === 'MODULOS' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Ambiente, plano e dados de assinatura.</p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ambiente</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        value={formData.workspaceType}
                        onChange={e => setFormData({...formData, workspaceType: e.target.value})}>
                        <option value="PJ">PJ (Empresarial)</option>
                        <option value="PF">PF (Pessoal)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.planoId}
                          onChange={e => setFormData({...formData, planoId: e.target.value})}>
                          <option value="">Selecione um plano...</option>
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nome} — R$ {Number(p.precoMensal).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status do Pagamento</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.statusPagamento}
                          onChange={e => setFormData({...formData, statusPagamento: e.target.value})}>
                          <option value="TRIAL">Trial</option>
                          <option value="PAGO">Pago</option>
                          <option value="PENDENTE">Pendente</option>
                          <option value="VENCIDO">Vencido</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                        <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          value={formData.dataVencimento}
                          onChange={e => setFormData({...formData, dataVencimento: e.target.value})} />
                      </div>
                    </div>

                    {isEditing && (
                      <>
                        <h4 className="font-semibold text-gray-800 border-t pt-4 mt-4">Módulos Contratados</h4>
                        {clients.find(c => c.id === formData.id)?.controls?.map(control => (
                          <div key={control.id} className="border border-brand-100 bg-brand-50/50 rounded-lg p-4 mb-4">
                            <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{control.nome} — {moduleLabel(control)}</span>
                            <div className="mt-2 text-sm text-gray-700">
                              <p><strong>Status:</strong> {control.status || 'Ativo'}</p>
                            </div>
                          </div>
                        ))}

                        <h4 className="font-semibold text-gray-800 border-t pt-4 mt-4">Features (Ativar/Desativar)</h4>
                        <p className="text-sm text-gray-500 mb-3">Liga/desliga módulos para esta empresa. As alterações refletem no menu lateral imediatamente.</p>
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_FEATURES.map(f => (
                            <label key={f.key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                checked={formFeatures[f.key] || false}
                                onChange={e => setFormFeatures({ ...formFeatures, [f.key]: e.target.checked })}
                              />
                              <span className="text-sm font-medium text-gray-700">{f.label}</span>
                            </label>
                          ))}
                        </div>
                        {formFeaturesStoreId && (
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const explicitFeatures = Object.fromEntries(
                                    ALL_FEATURES.map(f => [f.key, !!formFeatures[f.key]])
                                  );
                                  await fetchApi('/super-admin/stores/' + formFeaturesStoreId + '/features', {
                                    method: 'PUT',
                                    body: JSON.stringify({ features: explicitFeatures }),
                                  });
                                  toast.success('Features salvas com sucesso!');
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : 'Erro ao salvar features');
                                }
                              }}
                              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm shadow-sm"
                            >
                              Salvar Features
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Cancelar</button>
              <button type="submit" form="client-form" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-sm">
                Salvar Cliente
              </button>
            </div>
        </Modal>

      {/* Modal de Histórico de Acessos (God Mode) */}
      {logsModalStore && (
        <Modal open={!!logsModalStore} onClose={() => setLogsModalStore(null)} size="md" rounded="xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Acessos em God Mode: {logsModalStore?.storeName}
              </h2>
              <button onClick={() => setLogsModalStore(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="p-6">
              {logsLoading ? (
                <p className="text-gray-500 text-center py-4">Carregando histórico...</p>
              ) : impersonationLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum acesso registrado nesta loja.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Administrador</th>
                        <th className="px-4 py-3 font-medium">E-mail</th>
                        <th className="px-4 py-3 font-medium">Quando</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {impersonationLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{log.impersonatorName || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{log.impersonatorEmail || '-'}</td>
                          <td className="px-4 py-3 text-gray-500" title={formatDateTimeBR(log.createdAt)}>
                            {relativeDate(log.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </Modal>
      )}

      {/* Modal de Equipe Global */}
      {equipeModalAberto && selectedClientForEquipe && (
        <Modal open={!!(equipeModalAberto && selectedClientForEquipe)} onClose={() => setEquipeModalAberto(false)} size="md" rounded="xl">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Acessos: {selectedClientForEquipe?.nomeCompleto}
              </h2>
              <button onClick={() => setEquipeModalAberto(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {clientUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum usuário global encontrado ou carregando...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nome</th>
                        <th className="px-4 py-3 font-medium">E-mail</th>
                        <th className="px-4 py-3 font-medium">Permissão</th>
                        <th className="px-4 py-3 font-medium">Status do Usuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                          <td className="px-4 py-3 text-gray-500">{u.email}</td>
                          <td className="px-4 py-3 text-gray-500">{u.clientRole || u.role}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </Modal>
      )}
    </div>
  );
}
