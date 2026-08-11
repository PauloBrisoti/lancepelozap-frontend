import { type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { formatDateBR } from '../lib/dates';
import { formatBRL } from '../utils/format';
import { useApiQuery, STALE_TIMES, useWallets } from '../lib/query';
import type { Customer, FinancialCategory } from '../hooks/useFinanceiroDashboard';

export interface LancamentoForm {
  id: string;
  tipo: string;
  valor: string;
  descricao: string;
  walletId: string;
  categoria: string;
  dataTransacao: string;
  customerId: string;
  fornecedor: string;
  isParcelado: boolean;
  numeroParcelas: number;
  frequencia: string;
  isFirstPaid: boolean;
  comprovante: File | null;
}

export interface PayableForm {
  id: string;
  descricao: string;
  categoria: string;
  fornecedor: string;
  dataVencimento: string;
  valor: string;
  isParcelado: boolean;
  numeroParcelas: number;
  frequencia: string;
  isFirstPaid: boolean;
}

type TipoLancamento = 'RECEITA' | 'DESPESA_VISTA' | 'CONTA_PAGAR';

interface Props {
  open: boolean;
  onClose: () => void;
  activeStoreId: string | null;
  tipoLancamento: TipoLancamento;
  onTipoLancamentoChange: (tipo: TipoLancamento) => void;
  formTx: LancamentoForm;
  setFormTx: (form: LancamentoForm) => void;
  formPayable: PayableForm;
  setFormPayable: (form: PayableForm) => void;
  onSubmitTx: (e: FormEvent) => void;
  onSubmitPayable: (e: FormEvent) => void;
  onCriarCategoria: (tipo: 'ENTRADA' | 'SAIDA') => Promise<void>;
  /** Modo "criar categoria" ativo (estado vem do container via useFinanceiroModals) */
  criarCategoriaAberto: boolean;
  novaCategoriaNome: string;
  setNovaCategoriaNome: (nome: string) => void;
  abrirCriarCategoria: () => void;
  cancelarCriarCategoria: () => void;
}

/** Modal unificado de lançamento: Receita / Despesa à Vista / Conta a Pagar */
export function LancamentoModal({
  open,
  onClose,
  activeStoreId,
  tipoLancamento,
  onTipoLancamentoChange,
  formTx,
  setFormTx,
  formPayable,
  setFormPayable,
  onSubmitTx,
  onSubmitPayable,
  onCriarCategoria,
  criarCategoriaAberto,
  novaCategoriaNome,
  setNovaCategoriaNome,
  abrirCriarCategoria,
  cancelarCriarCategoria,
}: Props) {
  const queryClient = useQueryClient();

  // Dados próprios do modal (carteiras, clientes, categorias) via cache React Query
  const walletsQ = useWallets(activeStoreId, open);
  const customersQ = useApiQuery<Customer[]>(
    ['customers', activeStoreId],
    '/customers',
    { staleTime: STALE_TIMES.NORMAL, enabled: open }
  );
  const categoriesQ = useApiQuery<FinancialCategory[]>(
    ['finance-categories', activeStoreId],
    '/finance/categories',
    { staleTime: STALE_TIMES.STATIC, enabled: open }
  );
  const wallets = walletsQ.data?.wallets ?? [];
  const customers = customersQ.data ?? [];
  const categories = categoriesQ.data ?? [];

  const handleCriarCategoria = async (tipo: 'ENTRADA' | 'SAIDA') => {
    await onCriarCategoria(tipo);
    queryClient.invalidateQueries({ queryKey: ['finance-categories', activeStoreId] });
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" maxHeight="85vh">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          {tipoLancamento === 'CONTA_PAGAR' ? (formPayable.id ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar') : (formTx.id ? 'Editar Lançamento' : 'Novo Lançamento')}
        </h2>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <form onSubmit={tipoLancamento === 'CONTA_PAGAR' ? onSubmitPayable : onSubmitTx} className="space-y-4">

        {/* ─── SELETOR DE TIPO ─── */}
        {!formTx.id && !formPayable.id && (
          <div className="grid grid-cols-3 gap-2">
            <TipoButton active={tipoLancamento === 'RECEITA'} activeClass="bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" onClick={() => onTipoLancamentoChange('RECEITA')} iconPath="M12 6v6m0 0v6m0-6h6m-6 0H6" label="Receita" />
            <TipoButton active={tipoLancamento === 'DESPESA_VISTA'} activeClass="bg-red-50 border-red-500 text-red-700 shadow-sm" onClick={() => onTipoLancamentoChange('DESPESA_VISTA')} iconPath="M20 12H4" label="Despesa à Vista" />
            <TipoButton active={tipoLancamento === 'CONTA_PAGAR'} activeClass="bg-orange-50 border-orange-500 text-orange-700 shadow-sm" onClick={() => onTipoLancamentoChange('CONTA_PAGAR')} iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Conta a Pagar" />
          </div>
        )}

        {/* ─── CAMPOS: RECEITA / DESPESA À VISTA ─── */}
        {tipoLancamento !== 'CONTA_PAGAR' && (
          <>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
                <input required type="datetime-local" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.dataTransacao} onChange={e => setFormTx({ ...formTx, dataTransacao: e.target.value })} />
              </div>
              <div className="flex-[2]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.descricao} onChange={e => setFormTx({ ...formTx, descricao: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.valor} onChange={e => setFormTx({ ...formTx, valor: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <CategoriaField
                  categories={categories}
                  tipo={formTx.tipo}
                  value={formTx.categoria}
                  onChange={v => setFormTx({ ...formTx, categoria: v })}
                  aberto={criarCategoriaAberto}
                  nome={novaCategoriaNome}
                  setNome={setNovaCategoriaNome}
                  abrir={abrirCriarCategoria}
                  cancelar={cancelarCriarCategoria}
                  confirmar={() => handleCriarCategoria(formTx.tipo as 'ENTRADA' | 'SAIDA')}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contato (Opcional)</label>
                {tipoLancamento === 'RECEITA' ? (
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.customerId} onChange={e => setFormTx({ ...formTx, customerId: e.target.value })}>
                    <option value="">Selecione o Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
                  </select>
                ) : (
                  <input type="text" placeholder="Nome do Fornecedor..." className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formTx.fornecedor} onChange={e => setFormTx({ ...formTx, fornecedor: e.target.value })} />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comprovante</label>
                <input type="file" accept="image/*,.pdf" className="w-full px-2 py-1.5 border rounded-lg text-sm" onChange={e => setFormTx({ ...formTx, comprovante: e.target.files?.[0] || null })} />
              </div>
            </div>

            {!formTx.id && (
              <ParcelamentoFields
                isParcelado={formTx.isParcelado}
                onToggleParcelado={v => setFormTx({ ...formTx, isParcelado: v })}
                numeroParcelas={formTx.numeroParcelas}
                onNumeroParcelas={v => setFormTx({ ...formTx, numeroParcelas: v })}
                frequencia={formTx.frequencia}
                onFrequencia={v => setFormTx({ ...formTx, frequencia: v })}
                isFirstPaid={formTx.isFirstPaid}
                onFirstPaid={v => setFormTx({ ...formTx, isFirstPaid: v })}
                checkboxId="firstPaid"
                primeiraDataLabel={formTx.dataTransacao ? formatDateBR(formTx.dataTransacao) : 'hoje'}
                footer={
                  <div className="col-span-2 text-xs text-gray-500 mt-1">
                    O valor inserido de <b>R$ {formTx.valor || '0,00'}</b> será o valor de <b>cada parcela</b>.
                  </div>
                }
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carteira de Origem/Destino</label>
              <select required className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-gray-50" value={formTx.walletId} onChange={e => setFormTx({ ...formTx, walletId: e.target.value })}>
                <option value="">Selecione...</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
              </select>
            </div>
          </>
        )}

        {/* ─── CAMPOS: CONTA A PAGAR ─── */}
        {tipoLancamento === 'CONTA_PAGAR' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" placeholder="Ex: Aluguel, compra de estoque..." value={formPayable.descricao} onChange={e => setFormPayable({ ...formPayable, descricao: e.target.value })} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento</label>
                <input required type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.dataVencimento} onChange={e => setFormPayable({ ...formPayable, dataVencimento: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input required type="number" step="0.01" min="0.01" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.valor} onChange={e => setFormPayable({ ...formPayable, valor: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor (Opcional)</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={formPayable.fornecedor} onChange={e => setFormPayable({ ...formPayable, fornecedor: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <CategoriaField
                  categories={categories}
                  tipo="SAIDA"
                  value={formPayable.categoria}
                  onChange={v => setFormPayable({ ...formPayable, categoria: v })}
                  aberto={criarCategoriaAberto}
                  nome={novaCategoriaNome}
                  setNome={setNovaCategoriaNome}
                  abrir={abrirCriarCategoria}
                  cancelar={cancelarCriarCategoria}
                  confirmar={() => handleCriarCategoria('SAIDA')}
                />
              </div>
            </div>

            {!formPayable.id && (
              <ParcelamentoFields
                isParcelado={formPayable.isParcelado}
                onToggleParcelado={v => setFormPayable({ ...formPayable, isParcelado: v })}
                numeroParcelas={formPayable.numeroParcelas}
                onNumeroParcelas={v => setFormPayable({ ...formPayable, numeroParcelas: v })}
                frequencia={formPayable.frequencia}
                onFrequencia={v => setFormPayable({ ...formPayable, frequencia: v })}
                isFirstPaid={formPayable.isFirstPaid}
                onFirstPaid={v => setFormPayable({ ...formPayable, isFirstPaid: v })}
                checkboxId="firstPaidPayable"
                primeiraDataLabel={formPayable.dataVencimento ? formatDateBR(formPayable.dataVencimento) : 'hoje'}
                footer={
                  <div className="col-span-2 text-xs text-gray-500 mt-1">
                    Valor total da conta: <b>{formatBRL(Number(formPayable.valor || 0))}</b>. Serão <b>{formPayable.numeroParcelas}x</b> de <b>{formatBRL(Number(formPayable.valor || 0) / formPayable.numeroParcelas)}</b> cada.
                  </div>
                }
              />
            )}
          </>
        )}

        <div className="pt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button type="submit" className={`flex-1 py-2 font-bold rounded-lg shadow-md ${tipoLancamento === 'CONTA_PAGAR' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-brand-600 hover:bg-brand-700'} text-white`}>
            {tipoLancamento === 'CONTA_PAGAR' ? 'Salvar Conta' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TipoButton({ active, activeClass, onClick, iconPath, label }: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  iconPath: string;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center font-bold transition-all text-[11px] leading-tight ${active ? activeClass : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} /></svg>
      <span>{label}</span>
    </button>
  );
}

function CategoryGroups({ categories, tipo }: { categories: FinancialCategory[]; tipo: string }) {
  const padrao = categories.filter(c => c.tipo === tipo && c.isDefault);
  const personalizadas = categories.filter(c => c.tipo === tipo && !c.isDefault);
  return (
    <>
      {padrao.length > 0 && (
        <optgroup label="─ Padrão ─">
          {padrao.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </optgroup>
      )}
      {personalizadas.length > 0 && (
        <optgroup label="─ Personalizadas ─">
          {personalizadas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </optgroup>
      )}
      <option disabled>──────────</option>
      <option value="__NOVA__" className="text-brand-600 font-medium">✚ Criar nova categoria...</option>
    </>
  );
}

interface CategoriaFieldProps {
  categories: FinancialCategory[];
  tipo: string;
  value: string;
  onChange: (value: string) => void;
  aberto: boolean;
  nome: string;
  setNome: (nome: string) => void;
  abrir: () => void;
  cancelar: () => void;
  confirmar: () => void;
}

/** Select de categoria com opção inline de criar nova (bloco compartilhado por Receita/Despesa e Conta a Pagar) */
function CategoriaField({ categories, tipo, value, onChange, aberto, nome, setNome, abrir, cancelar, confirmar }: CategoriaFieldProps) {
  if (aberto) {
    return (
      <div className="flex gap-1">
        <input type="text" autoFocus placeholder="Nome da nova categoria..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 outline-none text-sm" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }} />
        <button type="button" onClick={confirmar} className="px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">OK</button>
        <button type="button" onClick={cancelar} className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm">✕</button>
      </div>
    );
  }
  return (
    <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-white" value={value} onChange={e => {
      if (e.target.value === '__NOVA__') {
        setNome('');
        abrir();
      } else {
        onChange(e.target.value);
      }
    }}>
      <option value="">Selecione...</option>
      <CategoryGroups categories={categories} tipo={tipo} />
    </select>
  );
}

interface ParcelamentoFieldsProps {
  isParcelado: boolean;
  onToggleParcelado: (v: boolean) => void;
  numeroParcelas: number;
  onNumeroParcelas: (v: number) => void;
  frequencia: string;
  onFrequencia: (v: string) => void;
  isFirstPaid: boolean;
  onFirstPaid: (v: boolean) => void;
  checkboxId: string;
  primeiraDataLabel: string;
  footer: ReactNode;
}

/** Bloco "Parcelado / Recorrente" compartilhado por Receita/Despesa e Conta a Pagar */
function ParcelamentoFields({
  isParcelado, onToggleParcelado, numeroParcelas, onNumeroParcelas,
  frequencia, onFrequencia, isFirstPaid, onFirstPaid,
  checkboxId, primeiraDataLabel, footer,
}: ParcelamentoFieldsProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" checked={isParcelado} onChange={e => onToggleParcelado(e.target.checked)} />
        Lançamento Parcelado / Recorrente
      </label>

      {isParcelado && (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nº de Parcelas</label>
            <input type="number" min="2" max="120" className="w-full px-3 py-1.5 border rounded-lg text-sm" value={numeroParcelas} onChange={e => onNumeroParcelas(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
            <select className="w-full px-3 py-1.5 border rounded-lg text-sm" value={frequencia} onChange={e => onFrequencia(e.target.value)}>
              <option value="MENSAL">Mensal</option>
              <option value="QUINZENAL">Quinzenal</option>
              <option value="SEMANAL">Semanal</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id={checkboxId} className="w-4 h-4 rounded border-gray-300 text-indigo-600" checked={isFirstPaid} onChange={e => onFirstPaid(e.target.checked)} />
            <label htmlFor={checkboxId} className="text-xs font-medium text-gray-700 cursor-pointer">
              A 1ª parcela ({primeiraDataLabel}) já está paga?
            </label>
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}
