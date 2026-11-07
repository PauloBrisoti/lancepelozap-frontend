import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { fetchApi, ApiError } from '../lib/api';
import { STALE_TIMES, useApiQuery, queryKeys } from '../lib/query';
import { useAuthStore } from '../context/AuthContext';
import { formatDateBR, formatDateTimeBR } from '../lib/dates';
import { formatBRL } from '../utils/format';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  UploadCloud,
  Wallet as WalletIcon,
} from 'lucide-react';

type ItemFilter = 'todos' | 'pendentes' | 'conciliados';

interface WalletOption {
  id: string;
  nome: string;
  tipo: string;
}

interface StatementImport {
  id: string;
  walletId: string | null;
  filename: string;
  importedAt: string;
  banco: string;
  totalItems: number;
  reconciledItems: number;
  pendingItems: number;
  wallet?: WalletOption | null;
}

interface StatementItem {
  id: string;
  data: string;
  descricao: string;
  valor: number | string;
  tipo: string;
  conciliado: boolean;
  financialTransactionId: string | null;
  financialTransaction?: {
    id: string;
    descricao: string;
    valor: number | string;
    tipo: string;
    dataTransacao: string;
    wallet?: { nome: string } | null;
  } | null;
}

interface TransactionCandidate {
  id: string;
  tipo: string;
  valor: number | string;
  descricao: string;
  dataTransacao: string;
  wallet?: { nome: string } | null;
}

interface ReconcileResult {
  analyzed: number;
  reconciled: number;
  pending: number;
}

interface ScoredCandidate {
  tx: TransactionCandidate;
  exact: boolean;
  dayDiff: number;
}

const isCredit = (tipo: string) => tipo === 'CREDITO' || tipo === 'ENTRADA';

const cents = (value: number | string) => Math.round(Number(value) * 100);

/** Desloca uma data 'aaaa-mm-dd' em N dias (UTC, sem deslocar fuso). */
const shiftDate = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dayDiff = (a: string, b: string) =>
  Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000));

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export function ConciliacaoBancariaPage() {
  const navigate = useNavigate();
  const { activeStoreId } = useAuthStore();

  const { data: walletsData } = useApiQuery<WalletOption[]>(
    queryKeys.financeWallets(activeStoreId),
    '/finance/wallets',
    { staleTime: STALE_TIMES.NORMAL, retry: false },
  );
  const wallets = walletsData ?? [];

  const [imports, setImports] = useState<StatementImport[]>([]);
  const [importsLoading, setImportsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<StatementItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [filter, setFilter] = useState<ItemFilter>('pendentes');
  const [reconciling, setReconciling] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [walletId, setWalletId] = useState('');
  const [banco, setBanco] = useState('');
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [linkItem, setLinkItem] = useState<StatementItem | null>(null);
  const [candidates, setCandidates] = useState<ScoredCandidate[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const loadImports = useCallback(async (selectId?: string) => {
    setImportsLoading(true);
    try {
      const data = await fetchApi<StatementImport[]>('/finance/bank-statements');
      setImports(data);
      setSelectedId((prev) => selectId ?? prev ?? data[0]?.id ?? null);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao carregar importações'));
    } finally {
      setImportsLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (importId: string) => {
    setItemsLoading(true);
    try {
      const data = await fetchApi<{ items: StatementItem[] }>(
        `/finance/bank-statements/${importId}/items`,
      );
      setItems(data.items);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao carregar itens do extrato'));
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  useEffect(() => {
    if (selectedId) loadItems(selectedId);
    else setItems([]);
  }, [selectedId, loadItems]);

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo .csv ou .ofx.');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'ofx') {
      toast.error('Envie um extrato .csv ou .ofx.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 5 MB).');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (walletId) formData.append('walletId', walletId);
      if (banco.trim()) formData.append('banco', banco.trim());

      const created = await fetchApi<StatementImport>('/finance/bank-statements/import', {
        method: 'POST',
        body: formData,
        timeout: 30_000,
      });

      toast.success(`Extrato importado com ${created.totalItems} item(ns).`);
      setFile(null);
      setBanco('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadImports(created.id);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao importar extrato'));
    } finally {
      setImporting(false);
    }
  };

  const runReconcile = async (importId?: string) => {
    setReconciling(true);
    try {
      const result = await fetchApi<ReconcileResult>(
        importId ? `/finance/bank-statements/${importId}/reconcile` : '/finance/bank-statements/reconcile',
        { method: 'POST', timeout: 30_000 },
      );
      toast.success(
        `Conciliação: ${result.reconciled} conciliado(s), ${result.pending} pendente(s) de ${result.analyzed} analisado(s).`,
      );
      await loadImports();
      if (selectedId) await loadItems(selectedId);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao conciliar extrato'));
    } finally {
      setReconciling(false);
    }
  };

  const openLinkModal = async (item: StatementItem) => {
    setLinkItem(item);
    setCandidates(null);
    setCandidateQuery('');
    setCandidatesLoading(true);

    try {
      const start = shiftDate(item.data, -7);
      const end = shiftDate(item.data, 7);
      const transactions = await fetchApi<TransactionCandidate[]>(
        `/finance/transactions?startDate=${start}&endDate=${end}`,
      );
      const targetDirection = isCredit(item.tipo) ? 'ENTRADA' : 'SAIDA';
      const targetCents = cents(item.valor);

      setCandidates(
        transactions
          .filter((tx) => (isCredit(tx.tipo) ? 'ENTRADA' : 'SAIDA') === targetDirection)
          .map((tx) => ({
            tx,
            exact: cents(tx.valor) === targetCents,
            dayDiff: dayDiff(tx.dataTransacao, item.data),
          }))
          .sort(
            (a, b) =>
              Number(b.exact) - Number(a.exact) ||
              a.dayDiff - b.dayDiff ||
              a.tx.id.localeCompare(b.tx.id),
          ),
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao buscar lançamentos'));
      setLinkItem(null);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleLink = async (transactionId: string) => {
    if (!linkItem) return;
    setLinkingId(transactionId);
    try {
      await fetchApi(`/finance/bank-statements/items/${linkItem.id}/link`, {
        method: 'POST',
        body: JSON.stringify({ financialTransactionId: transactionId }),
      });
      toast.success('Lançamento vinculado ao extrato.');
      setLinkItem(null);
      await loadImports();
      if (selectedId) await loadItems(selectedId);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao vincular lançamento'));
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlink = async (item: StatementItem) => {
    try {
      await fetchApi(`/finance/bank-statements/items/${item.id}/unlink`, { method: 'POST' });
      toast.success('Vínculo removido.');
      await loadImports();
      if (selectedId) await loadItems(selectedId);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao remover vínculo'));
    }
  };

  const handleDeleteImport = async (imp: StatementImport) => {
    const confirmar = window.confirm(
      `Excluir a importação "${imp.filename}" e todos os seus ${imp.totalItems} item(ns)?\n\nOs lançamentos financeiros não serão afetados.`,
    );
    if (!confirmar) return;

    setDeleting(true);
    try {
      await fetchApi(`/finance/bank-statements/${imp.id}`, { method: 'DELETE' });
      toast.success('Importação excluída.');
      if (selectedId === imp.id) setSelectedId(null);
      await loadImports();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao excluir importação'));
    } finally {
      setDeleting(false);
    }
  };

  const selectedImport = imports.find((imp) => imp.id === selectedId) ?? null;

  const visibleItems = items.filter((item) => {
    if (filter === 'pendentes') return !item.conciliado;
    if (filter === 'conciliados') return item.conciliado;
    return true;
  });

  const totalPending = imports.reduce((sum, imp) => sum + imp.pendingItems, 0);
  const totalReconciled = imports.reduce((sum, imp) => sum + imp.reconciledItems, 0);

  const filteredCandidates = (candidates ?? []).filter((candidate) => {
    const query = candidateQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      candidate.tx.descricao.toLowerCase().includes(query) ||
      String(candidate.tx.valor).includes(query) ||
      formatDateBR(candidate.tx.dataTransacao).includes(query)
    );
  });

  return (
    <div className="p-3 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/app/financeiro')}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Voltar ao financeiro"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Conciliação Bancária</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              Importe extratos .csv/.ofx e concilie com os lançamentos financeiros da loja.
            </p>
          </div>
        </div>
        <button
          onClick={() => runReconcile()}
          disabled={reconciling || imports.length === 0}
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${reconciling ? 'animate-spin' : ''}`} />
          {reconciling ? 'Conciliando...' : 'Conciliar tudo'}
        </button>
      </div>

      {/* RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: 'Importações', value: imports.length, icon: FileSpreadsheet, color: 'text-brand-600 bg-brand-50' },
          { label: 'Itens pendentes', value: totalPending, icon: Clock3, color: 'text-amber-600 bg-amber-50' },
          { label: 'Itens conciliados', value: totalReconciled, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* IMPORTAÇÃO */}
      <form onSubmit={handleImport} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Importar extrato</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="statement-file">
              Arquivo (.csv ou .ofx)
            </label>
            <input
              id="statement-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700 file:font-medium hover:file:bg-brand-100 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="statement-wallet">
              Conta / carteira (opcional)
            </label>
            <select
              id="statement-wallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Vincular com qualquer conta</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="statement-banco">
              Banco (opcional)
            </label>
            <input
              id="statement-banco"
              type="text"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ex.: Itaú, Nubank..."
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">
            Conciliação automática por valor exato e data ±2 dias no fuso da loja.
          </p>
          <button
            type="submit"
            disabled={importing || !file}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </form>

      {/* IMPORTAÇÕES + ITENS */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Importações</h2>
            <span className="text-xs text-gray-400">{imports.length} arquivo(s)</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
            {importsLoading && (
              <div className="p-4 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            )}
            {!importsLoading && imports.length === 0 && (
              <div className="p-6 text-center">
                <FileSpreadsheet className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhum extrato importado ainda.</p>
              </div>
            )}
            {!importsLoading &&
              imports.map((imp) => {
                const active = imp.id === selectedId;
                const progress = imp.totalItems > 0 ? (imp.reconciledItems / imp.totalItems) * 100 : 0;
                return (
                  <button
                    key={imp.id}
                    onClick={() => setSelectedId(imp.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      active ? 'bg-brand-50 border-l-4 border-brand-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate" title={imp.filename}>
                        {imp.filename}
                      </p>
                      {imp.pendingItems > 0 && (
                        <span className="shrink-0 bg-amber-100 text-amber-700 text-[11px] font-bold px-1.5 py-0.5 rounded">
                          {imp.pendingItems} pendente(s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {imp.banco} · {formatDateTimeBR(imp.importedAt)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <WalletIcon className="h-3 w-3" />
                      {imp.wallet?.nome ?? 'Qualquer conta'}
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {imp.reconciledItems}/{imp.totalItems} conciliado(s)
                    </p>
                  </button>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {!selectedImport ? (
            <div className="p-10 text-center">
              <Link2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Selecione uma importação para ver os itens.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 text-sm truncate">{selectedImport.filename}</h2>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedImport.banco} · {selectedImport.wallet?.nome ?? 'Qualquer conta'} ·{' '}
                    {formatDateBR(selectedImport.importedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteImport(selectedImport)}
                    disabled={deleting || reconciling}
                    title="Excluir importação"
                    className="flex items-center gap-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 text-gray-600 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden md:inline">{deleting ? 'Excluindo...' : 'Excluir'}</span>
                  </button>
                  <button
                    onClick={() => runReconcile(selectedImport.id)}
                    disabled={reconciling || selectedImport.pendingItems === 0}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${reconciling ? 'animate-spin' : ''}`} />
                    Conciliar automaticamente
                  </button>
                </div>
              </div>

              <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ['pendentes', `Pendentes (${selectedImport.pendingItems})`],
                    ['conciliados', `Conciliados (${selectedImport.reconciledItems})`],
                    ['todos', `Todos (${selectedImport.totalItems})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                      filter === key
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4 overflow-x-auto">
                {itemsLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      {filter === 'pendentes' ? 'Nenhum item pendente. Tudo conciliado!' : 'Nenhum item neste filtro.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                        <th className="py-2 pr-3 font-medium">Data</th>
                        <th className="py-2 pr-3 font-medium">Descrição</th>
                        <th className="py-2 pr-3 font-medium">Tipo</th>
                        <th className="py-2 pr-3 font-medium text-right">Valor</th>
                        <th className="py-2 pr-3 font-medium">Lançamento vinculado</th>
                        <th className="py-2 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleItems.map((item) => (
                        <tr key={item.id} className="align-top hover:bg-gray-50/70">
                          <td className="py-3 pr-3 whitespace-nowrap text-gray-600">
                            {formatDateBR(item.data)}
                          </td>
                          <td className="py-3 pr-3 text-gray-900 max-w-[220px]">
                            <span className="line-clamp-2" title={item.descricao}>
                              {item.descricao || '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isCredit(item.tipo) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isCredit(item.tipo) ? 'Crédito' : 'Débito'}
                            </span>
                          </td>
                          <td
                            className={`py-3 pr-3 text-right font-semibold whitespace-nowrap ${
                              isCredit(item.tipo) ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatBRL(Number(item.valor))}
                          </td>
                          <td className="py-3 pr-3 text-xs text-gray-500 max-w-[240px]">
                            {item.financialTransaction ? (
                              <span className="block line-clamp-2" title={item.financialTransaction.descricao}>
                                {item.financialTransaction.descricao || item.financialTransaction.id.slice(0, 8)}
                                {item.financialTransaction.wallet?.nome
                                  ? ` · ${item.financialTransaction.wallet.nome}`
                                  : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Clock3 className="h-3 w-3" /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            {item.conciliado ? (
                              <button
                                onClick={() => handleUnlink(item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors"
                              >
                                <Unlink className="h-3.5 w-3.5" /> Desvincular
                              </button>
                            ) : (
                              <button
                                onClick={() => openLinkModal(item)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                              >
                                <Link2 className="h-3.5 w-3.5" /> Vincular
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE VÍNCULO MANUAL */}
      <Modal
        open={!!linkItem}
        onClose={() => setLinkItem(null)}
        title="Vincular lançamento ao extrato"
        size="xl"
      >
        {linkItem && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm">
              <p className="font-semibold text-gray-900">
                {formatDateBR(linkItem.data)} · {formatBRL(Number(linkItem.valor))} ·{' '}
                {isCredit(linkItem.tipo) ? 'Crédito' : 'Débito'}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{linkItem.descricao || 'Sem descrição'}</p>
            </div>

            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={candidateQuery}
                onChange={(e) => setCandidateQuery(e.target.value)}
                placeholder="Filtrar por descrição, valor ou data..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="max-h-[45vh] overflow-y-auto divide-y divide-gray-100">
              {candidatesLoading ? (
                <div className="space-y-2 py-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredCandidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Nenhum lançamento compatível nos 7 dias ao redor da data do item.
                </p>
              ) : (
                filteredCandidates.map(({ tx, exact }) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate" title={tx.descricao}>
                        {tx.descricao || tx.id.slice(0, 8)}
                        {exact && (
                          <span className="ml-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded align-middle">
                            VALOR EXATO
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateBR(tx.dataTransacao)} · {tx.wallet?.nome ?? 'Sem conta'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatBRL(Number(tx.valor))}
                      </span>
                      <button
                        onClick={() => handleLink(tx.id)}
                        disabled={linkingId === tx.id}
                        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {linkingId === tx.id ? 'Vinculando...' : 'Vincular'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
