import { useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchApi, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';


export function CompletarCadastroPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cnpjCpf: '',
    telefoneWhatsapp: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi('/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      toast.success('Cadastro completado com sucesso!');
      await refreshUser();
      navigate('/app', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao salvar dados';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const data = await (await fetch(`https://viacep.com.br/ws/${cep}/json/`)).json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          uf: data.uf || f.uf,
        }));
      }
    } catch {}
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete seu cadastro</h1>
          <p className="text-gray-500 mt-2">
            Antes de começar, precisamos de algumas informações adicionais.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ / CPF</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.cnpjCpf} onChange={set('cnpjCpf')} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.telefoneWhatsapp} onChange={set('telefoneWhatsapp')} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.cep} onChange={set('cep')} onBlur={buscarCep} placeholder="00000-000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.numero} onChange={set('numero')} placeholder="123" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.logradouro} onChange={set('logradouro')} placeholder="Rua, Avenida..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.complemento} onChange={set('complemento')} placeholder="Sala, Bloco..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.bairro} onChange={set('bairro')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none" value={form.cidade} onChange={set('cidade')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none bg-white" value={form.uf} onChange={set('uf')}>
                    <option value="">--</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl transition-colors">
            {loading ? 'Salvando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
