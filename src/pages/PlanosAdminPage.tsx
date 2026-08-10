import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { Plus, Edit3, Trash2, Check } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useApiQuery, STALE_TIMES } from '../lib/query';
import { formatBRL } from '../utils/format';

interface Plan {
  id: string;
  nome: string;
  precoMensal: number;
  maxControls: number;
  maxStores: number;
  features: string | null;
  createdAt: string;
}

const ALL_FEATURES = [
  { key: 'estoque', label: 'Gestão de Estoque' },
  { key: 'financeiro', label: 'Financeiro (DRE, relatórios)' },
  { key: 'multiplos_vendedores', label: 'Múltiplos Vendedores' },
  { key: 'multiplas_lojas', label: 'Múltiplas Lojas' },
  { key: 'crediario', label: 'Crediário / Fiado' },
  { key: 'relatorios', label: 'Relatórios e BI' },
  { key: 'suporte_prioritario', label: 'Suporte Prioritário' },
];

export function PlanosAdminPage() {
  const [modal, setModal] = useState<{ plan?: Plan } | null>(null);
  const [form, setForm] = useState({ nome: '', precoMensal: '', maxControls: '1', maxStores: '1', features: {} as Record<string, boolean> });

  const { data: plans = [], isLoading, refetch } = useApiQuery<Plan[]>(
    ['super-admin', 'plans'],
    '/super-admin/plans',
    { staleTime: STALE_TIMES.STATIC }
  );

  const openNew = () => {
    setForm({ nome: '', precoMensal: '', maxControls: '1', maxStores: '1', features: {} });
    setModal({});
  };

  const openEdit = (plan: Plan) => {
    const parsed = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : {};
    setForm({
      nome: plan.nome,
      precoMensal: String(plan.precoMensal),
      maxControls: String(plan.maxControls),
      maxStores: String(plan.maxStores),
      features: parsed,
    });
    setModal({ plan });
  };

  const save = async () => {
    if (!form.nome || !form.precoMensal) return toast.error('Nome e preço obrigatórios');
    try {
      const body = {
        nome: form.nome,
        precoMensal: Number(form.precoMensal),
        maxControls: Number(form.maxControls),
        maxStores: Number(form.maxStores),
        features: form.features,
      };
      if (modal?.plan) {
        await fetchApi(`/super-admin/plans/${modal.plan.id}`, { method: 'PUT', body: JSON.stringify(body) });
        toast.success('Plano atualizado!');
      } else {
        await fetchApi('/super-admin/plans', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Plano criado!');
      }
      setModal(null);
      await refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  const remove = async (plan: Plan) => {
    if (!confirm(`Excluir plano "${plan.nome}"?`)) return;
    try {
      await fetchApi(`/super-admin/plans/${plan.id}`, { method: 'DELETE' });
      toast.success('Plano excluído');
      await refetch();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro desconhecido'); }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Assinatura</h1>
          <p className="text-gray-500 text-sm">Gerencie os planos disponíveis para os lojistas.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900">{plan.nome}</h3>
              <p className="text-3xl font-bold text-brand-600 mt-2">
                {formatBRL(Number(plan.precoMensal))}
                <span className="text-sm font-normal text-gray-500">/mês</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Até {plan.maxControls} controle(s)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Até {plan.maxStores} loja(s)</li>
              </ul>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                <Edit3 className="w-4 h-4" /> Editar
              </button>
              <button onClick={() => remove(plan)} className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Nenhum plano criado</p>
          <p className="text-sm">Clique em "Novo Plano" para criar o primeiro.</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        size="sm"
        title={modal?.plan ? 'Editar Plano' : 'Novo Plano'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
            <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço Mensal (R$)</label>
            <input type="number" step="0.01" min="0" value={form.precoMensal} onChange={e => setForm({...form, precoMensal: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max. Controles</label>
              <input type="number" min="1" value={form.maxControls} onChange={e => setForm({...form, maxControls: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max. Lojas</label>
              <input type="number" min="1" value={form.maxStores} onChange={e => setForm({...form, maxStores: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Funcionalidades do Plano</label>
            <div className="space-y-2">
              {ALL_FEATURES.map(f => (
                <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!form.features[f.key]} onChange={e => setForm({...form, features: { ...form.features, [f.key]: e.target.checked }})}
                    className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500" />
                  <span className="text-sm text-gray-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={save} className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition">Salvar</button>
        </div>
      </Modal>
    </div>
  );
}
