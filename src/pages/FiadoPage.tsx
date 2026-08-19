import { format } from 'date-fns';
import { AlertTriangle, CalendarCheck, DollarSign, Search, User, Wallet, Inbox } from 'lucide-react';
import { SkeletonTable } from '../components/LoadingSkeleton';
import { Modal } from '../components/Modal';
import { formatBRL, formatNome } from '../utils/format';
import { saldoRestante } from '../utils/financeiro';
import { useFiado, deriveReceivable } from '../hooks/useFiado';
import type { Receivable } from '../types/api';

const FILTERS = [
  { key: 'PENDENTE', label: 'A Vencer' },
  { key: 'VENCIDO', label: 'Vencido' },
  { key: 'PAGO_PARCIAL', label: 'Parcial' },
  { key: 'PAGO', label: 'Quitados' },
  { key: 'all', label: 'Todos' },
] as const;

export function FiadoPage() {
  const {
    receivables, isLoading, filter, setFilter, search, setSearch,
    totalPendente, totalVencido, totalEmDia, countBy,
    filtered, totalFiltrado, hasFilters, hoje,
    payModal, setPayModal, payValue, setPayValue, payDate, setPayDate, saving,
    renegModal, setRenegModal, renegForm, setRenegForm, renegSaving,
    openPay, openReneg, handlePay, handleRenegotiate,
  } = useFiado();

  const totalQuitado = filtered
    .filter(r => r.statusExibicao === 'PAGO')
    .reduce((acc, r) => acc + Number(r.valorParcela), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Crediário / Fiado</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5 md:mt-1">Gerencie contas a receber e parcelas pendentes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Total a Receber</p>
            <p className="text-base md:text-2xl font-extrabold text-gray-900 leading-tight">{formatBRL(totalPendente)}</p>
            <p className="text-[10px] text-gray-400 truncate">{receivables.length} parcela(s) no total</p>
          </div>
        </div>
        <div className={`p-3 md:p-4 rounded-2xl shadow-sm border flex items-center gap-3 ${totalVencido > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${totalVencido > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Vencido</p>
            <p className={`text-base md:text-2xl font-extrabold leading-tight ${totalVencido > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatBRL(totalVencido)}</p>
            <p className={`text-[10px] truncate ${totalVencido > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {countBy('VENCIDO') > 0 ? `${countBy('VENCIDO')} parcela(s) em atraso` : 'Nenhuma parcela atrasada'}
            </p>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Em Dia</p>
            <p className="text-base md:text-2xl font-extrabold text-emerald-700 leading-tight">{formatBRL(totalEmDia)}</p>
            <p className="text-[10px] text-gray-400 truncate">{countBy('PENDENTE')} parcela(s) a vencer</p>
          </div>
        </div>
      </div>

      {/* Barra de filtros + busca */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
        <div className="flex gap-2 bg-white rounded-xl p-1 border shadow-sm w-fit overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                filter === f.key ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${filter === f.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {countBy(f.key)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            {hasFilters ? (
              <p className="text-sm text-gray-600">Nenhuma parcela com os filtros aplicados.</p>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma parcela registrada ainda.</p>
            )}
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {filtered.length} parcela(s)
                {filter !== 'all' && (
                  <span className="ml-1 text-gray-400">· {filter === 'PAGO' ? 'quitadas' : filter === 'VENCIDO' ? 'vencidas' : filter === 'PAGO_PARCIAL' ? 'parciais' : 'a vencer'}</span>
                )}
                {search.trim() && <span className="ml-1 text-gray-400">· busca: "{search.trim()}"</span>}
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setFilter('all'); }} className="ml-2 text-brand-600 hover:underline font-medium">Limpar</button>
                )}
              </span>
              <span className="font-semibold text-gray-700">
                {filter !== 'PAGO' ? `Pendente: ${formatBRL(totalFiltrado)}` : `Total quitado: ${formatBRL(totalQuitado)}`}
              </span>
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Parcela</th>
                    <th className="px-5 py-3.5">Compra</th>
                    <th className="px-5 py-3.5">Vencimento</th>
                    <th className="px-5 py-3.5">Valor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r => (
                    <DesktopRow key={r.id} r={r} hoje={hoje} onPay={openPay} onReneg={openReneg} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(r => (
                <MobileCard key={r.id} r={r} hoje={hoje} onPay={openPay} onReneg={openReneg} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pay Modal */}
      {payModal && (
        <Modal open onClose={() => setPayModal(null)} title="Registrar Pagamento" size="sm">
          <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cliente</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatNome(payModal.customer?.nomeCompleto || 'Cliente')}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Parcela {payModal.numeroParcela}/{payModal.totalParcelas}</p>
                <p className="font-semibold text-gray-900 mt-0.5">
                  {payModal.saldoRestante !== undefined && payModal.saldoRestante > 0 && payModal.saldoRestante < Number(payModal.valorParcela) ? (
                    <span>Saldo: {formatBRL(payModal.saldoRestante)} <span className="text-gray-400 text-xs line-through">{formatBRL(Number(payModal.valorParcela))}</span></span>
                  ) : (
                    `${formatBRL(Number(payModal.valorParcela))}`
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold"
                  value={payValue}
                  onChange={e => setPayValue(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                />
              </div>
              <button
                onClick={handlePay}
                disabled={saving || !payValue}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Confirmar Recebimento'}
              </button>
            </div>
        </Modal>
      )}

      {/* Renegotiate Modal */}
      {renegModal && (
        <Modal open onClose={() => setRenegModal(null)} title="Renegociar Dívida" size="sm">
          <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Cliente</p>
                <p className="font-semibold text-gray-900 mt-0.5">{formatNome(renegModal.customer?.nomeCompleto || 'Cliente')}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Saldo devedor da parcela</p>
                <p className="font-semibold text-amber-800 mt-0.5">{formatBRL(saldoRestante(renegModal))}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Novo Valor Total</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={renegForm.novoValor}
                  onChange={e => setRenegForm({ ...renegForm, novoValor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primeiro Vencimento</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={renegForm.novaDataVencimento}
                  onChange={e => setRenegForm({ ...renegForm, novaDataVencimento: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  value={renegForm.novasParcelas}
                  onChange={e => setRenegForm({ ...renegForm, novasParcelas: e.target.value })}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
              {Number(renegForm.novasParcelas) > 1 && (
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">
                    {Number(renegForm.novasParcelas)}x de <strong>{formatBRL(Number(renegForm.novoValor) / Number(renegForm.novasParcelas))}</strong>
                  </p>
                </div>
              )}
              <button
                onClick={handleRenegotiate}
                disabled={renegSaving || !renegForm.novoValor || !renegForm.novaDataVencimento}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition disabled:opacity-50"
              >
                {renegSaving ? 'Salvando...' : 'Confirmar Renegociação'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}

interface RowProps {
  r: Receivable;
  hoje: Date;
  onPay: (r: Receivable) => void;
  onReneg: (r: Receivable) => void;
}

function DesktopRow({ r, hoje, onPay, onReneg }: RowProps) {
  const { isPago, isParcial, isVencido, saldo, temParcial, diasAtraso } = deriveReceivable(r, hoje);
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isVencido ? 'bg-red-50/60' : ''}`}>
      <td className="px-5 py-3.5 font-medium text-gray-900">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isVencido ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="truncate max-w-[220px]">{formatNome(r.customer?.nomeCompleto || 'Cliente')}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
          {r.numeroParcela}/{r.totalParcelas}
        </span>
      </td>
      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
        {r.sale?.dataVenda ? format(new Date(r.sale.dataVenda), 'dd/MM/yyyy') : '-'}
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={isVencido ? 'text-red-600 font-semibold' : 'text-gray-600'}>
            {format(new Date(r.dataVencimento), 'dd/MM/yyyy')}
          </span>
          {diasAtraso > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
              há {diasAtraso} dia{diasAtraso > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
        {isPago ? (
          <span className="text-emerald-700">{formatBRL(Number(r.valorParcela))}</span>
        ) : temParcial ? (
          <span>
            {formatBRL(saldo)}
            <span className="text-gray-400 text-xs ml-1.5 line-through">{formatBRL(Number(r.valorParcela))}</span>
          </span>
        ) : (
          `${formatBRL(Number(r.valorParcela))}`
        )}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge isPago={isPago} isParcial={isParcial} isVencido={isVencido} />
      </td>
      <td className="px-5 py-3.5 text-center">
        {!isPago && (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => onPay(r)}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-1"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Receber
            </button>
            <button
              onClick={() => onReneg(r)}
              className="px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
            >
              Renegociar
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function MobileCard({ r, hoje, onPay, onReneg }: RowProps) {
  const { isPago, isParcial, isVencido, saldo, temParcial, diasAtraso } = deriveReceivable(r, hoje);
  return (
    <div className={`p-4 ${isVencido ? 'bg-red-50/60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isVencido ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{formatNome(r.customer?.nomeCompleto || 'Cliente')}</p>
            <p className="text-[11px] text-gray-400">
              {r.numeroParcela}/{r.totalParcelas} · vence {format(new Date(r.dataVencimento), 'dd/MM/yyyy')}
              {diasAtraso > 0 && <span className="text-red-500 font-bold ml-1">({diasAtraso}d atraso)</span>}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold ${isPago ? 'text-emerald-700' : 'text-gray-900'}`}>
            {formatBRL(isPago ? Number(r.valorParcela) : saldo)}
          </p>
          <StatusBadge isPago={isPago} isParcial={isParcial} isVencido={isVencido} small />
        </div>
      </div>
      {temParcial && (
        <p className="text-[11px] text-gray-400 mb-2">
          Original: <span className="line-through">{formatBRL(Number(r.valorParcela))}</span>
        </p>
      )}
      {!isPago && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onPay(r)}
            className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center gap-1"
          >
            <DollarSign className="w-3.5 h-3.5" /> Receber
          </button>
          <button
            onClick={() => onReneg(r)}
            className="flex-1 py-2 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg"
          >
            Renegociar
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ isPago, isParcial, isVencido, small = false }: {
  isPago: boolean;
  isParcial: boolean;
  isVencido: boolean;
  small?: boolean;
}) {
  return (
    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
      isPago ? 'bg-emerald-100 text-emerald-700' :
      isParcial ? 'bg-blue-100 text-blue-700' :
      isVencido ? 'bg-red-100 text-red-700' :
      'bg-amber-100 text-amber-700'
    } ${small ? 'inline-block mt-0.5 px-2 py-0.5 text-[10px]' : ''}`}>
      {isPago ? '✓ Quitado' : isParcial ? 'Pago Parcial' : isVencido ? 'Vencido' : 'Pendente'}
    </span>
  );
}
