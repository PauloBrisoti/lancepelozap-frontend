import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { isValidCPFOrCNPJ } from '../utils/cpfCnpj';

interface Customer {
  id: string;
  nomeCompleto: string;
  cpf?: string;
  telefoneWhatsapp?: string;
  cep?: string;
  enderecoCompleto?: string;
  email?: string;
  rg?: string;
  dataNascimento?: string;
  observacoes?: string;
  aceitaMarketing: boolean;
  aceitaLembreteCobranca: boolean;
  saldoDevedor?: number;
}

export function ClientesPage() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState<Partial<Customer>>({
    nomeCompleto: '',
    cpf: '',
    telefoneWhatsapp: '',
    enderecoCompleto: '',
    email: '',
    rg: '',
    dataNascimento: '',
    observacoes: '',
    aceitaMarketing: true,
    aceitaLembreteCobranca: true,
  });

  const carregarClientes = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/customers');
      setClientes(data);
    } catch (error) {
      console.error('Erro ao carregar clientes', error);
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     
    carregarClientes();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formulario.cpf && !isValidCPFOrCNPJ(formulario.cpf)) {
      toast.error("CPF/CNPJ inválido! Verifique o número informado.");
      return;
    }
    if (!formulario.telefoneWhatsapp) {
      toast("O número de WhatsApp é obrigatório.");
      return;
    }
    try {
      if (formulario.id) {
        await fetchApi(`/customers/${formulario.id}`, {
          method: 'PUT',
          body: JSON.stringify(formulario)
        });
      } else {
        await fetchApi('/customers', {
          method: 'POST',
          body: JSON.stringify(formulario)
        });
      }
      setModalAberto(false);
      carregarClientes();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar cliente';
      toast(msg);
    }
  };

  const handleEditar = (cliente: Customer) => {
    setFormulario({ ...cliente });
    setModalAberto(true);
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente excluir este cliente?')) {
      try {
        await fetchApi(`/customers/${id}`, { method: 'DELETE' });
        carregarClientes();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro ao excluir cliente';
        toast(msg);
      }
    }
  };

  const handleGerarLink = async (id: string, nome: string) => {
    try {
      const data = await fetchApi(`/customers/${id}/portal-token`, { method: 'POST' });
      navigator.clipboard.writeText(data.portalUrl);
      toast.success(`Link de acesso copiado para ${nome}!`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao gerar link';
      toast.error(msg);
    }
  };

  const abrirModalNovo = () => {
    setFormulario({
      nomeCompleto: '',
      cpf: '',
      telefoneWhatsapp: '',
      cep: '',
      enderecoCompleto: '',
      email: '',
      rg: '',
      dataNascimento: '',
      observacoes: '',
      aceitaMarketing: true,
      aceitaLembreteCobranca: true,
    });
    setModalAberto(true);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await fetchApi('/import/clientes', {
        method: 'POST',
        body: formData,
      });
      toast.success(`Importação concluída! Sucessos: ${data.successCount}, Erros: ${data.errorCount}`);
      carregarClientes();
    } catch (err: any) {
      toast.error(err?.message || 'Erro na importação');
    }
    // Limpa o input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie sua base de contatos e clientes.</p>
        </div>
        <div className="flex gap-3">
          <label className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm cursor-pointer flex items-center justify-center">
            Importar
            <input type="file" accept=".csv, .xlsx, .pdf" className="hidden" onChange={handleImportCSV} />
          </label>
          <button 
            onClick={abrirModalNovo}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition shadow-sm"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Nome Completo</th>
                <th className="px-6 py-4 font-medium">WhatsApp</th>
                <th className="px-6 py-4 font-medium">CPF</th>
                <th className="px-6 py-4 font-medium">Endereço</th>
                <th className="px-6 py-4 font-medium text-right">Saldo Devedor</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando clientes...</td></tr>
              ) : clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{cliente.nomeCompleto}</td>
                    <td className="px-6 py-4 text-gray-600">{cliente.telefoneWhatsapp || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{cliente.cpf || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{cliente.enderecoCompleto || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {cliente.saldoDevedor && cliente.saldoDevedor > 0 ? (
                        <span className="font-bold text-red-600">R$ {cliente.saldoDevedor.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => handleGerarLink(cliente.id, cliente.nomeCompleto)} className="text-green-600 hover:text-green-900 font-medium text-sm" title="Copiar link de acesso do portal">Link</button>
                      <button onClick={() => handleEditar(cliente)} className="text-brand-600 hover:text-brand-900 font-medium text-sm">Editar</button>
                      <button onClick={() => handleExcluir(cliente.id)} className="text-red-600 hover:text-red-900 font-medium text-sm">Excluir</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden animate-slide-up sm:animate-none">
            {/* Handle de arraste (mobile) */}
            <div className="md:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Cabeçalho fixo */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{formulario.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setModalAberto(false)} aria-label="Fechar" className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition text-2xl leading-none">&times;</button>
            </div>
            {/* Formulário rolável */}
            <form id="form-cliente" onSubmit={handleSalvar} className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" value={formulario.nomeCompleto} onChange={(e) => setFormulario({...formulario, nomeCompleto: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="Opcional" value={formulario.cpf || ''} onChange={(e) => setFormulario({...formulario, cpf: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" placeholder="(00) 00000-0000" value={formulario.telefoneWhatsapp || ''} onChange={(e) => setFormulario({...formulario, telefoneWhatsapp: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formulario.email} onChange={e => setFormulario({...formulario, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                  <input type="text" value={formulario.rg} onChange={e => setFormulario({...formulario, rg: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                  <input type="date" value={formulario.dataNascimento} onChange={e => setFormulario({...formulario, dataNascimento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="00000-000"
                    value={formulario.cep || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      let formatted = val;
                      if (val.length > 5) formatted = val.slice(0,5) + '-' + val.slice(5,8);
                      setFormulario({...formulario, cep: formatted});
                      if (val.length === 8) {
                        fetch(`https://viacep.com.br/ws/${val}/json/`)
                          .then(res => res.json())
                          .then(data => {
                            if (!data.erro) {
                              setFormulario(prev => ({
                                ...prev,
                                enderecoCompleto: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
                              }));
                            }
                          });
                      }
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" value={formulario.enderecoCompleto || ''} onChange={(e) => setFormulario({...formulario, enderecoCompleto: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações / Histórico</label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none" value={formulario.observacoes || ''} onChange={(e) => setFormulario({...formulario, observacoes: e.target.value})} />
                </div>
              </div>

              <div className="pt-1">
                <div className="flex items-center mb-2">
                  <input id="marketing" type="checkbox" className="w-5 h-5 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500" checked={formulario.aceitaMarketing} onChange={(e) => setFormulario({...formulario, aceitaMarketing: e.target.checked})} />
                  <label htmlFor="marketing" className="ml-2.5 text-sm font-medium text-gray-900">Aceita promoções e marketing no WhatsApp</label>
                </div>
                <div className="flex items-center">
                  <input id="lembrete" type="checkbox" className="w-5 h-5 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500" checked={formulario.aceitaLembreteCobranca} onChange={(e) => setFormulario({...formulario, aceitaLembreteCobranca: e.target.checked})} />
                  <label htmlFor="lembrete" className="ml-2.5 text-sm font-medium text-gray-900">Aceita lembretes de cobrança via sistema</label>
                </div>
              </div>
            </form>
            {/* Rodapé fixo — ações sempre visíveis */}
            <div className="px-4 sm:px-6 pt-3 pb-3 border-t border-gray-100 bg-white shrink-0 flex justify-end gap-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
              <button type="button" onClick={() => setModalAberto(false)} className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition text-base sm:text-sm">Cancelar</button>
              <button type="submit" form="form-cliente" className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 transition shadow-sm text-base sm:text-sm">Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
