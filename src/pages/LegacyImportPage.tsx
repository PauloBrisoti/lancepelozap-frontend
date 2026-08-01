import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';

export function LegacyImportPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any>(null);

  const handleImportLegacy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setLogMessages([]);
    setRawData(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = useAI ? '/import/smart' : '/import/legacy';

      const result = await fetchApi(endpoint, {
        method: 'POST',
        body: formData,
      });

      toast.success(result.message || 'Importação concluída com sucesso!');
      
      if (useAI) {
        setLogMessages([
          `Clientes processados: ${result.success?.clientes || 0}`,
          `Produtos processados: ${result.success?.produtos || 0}`,
          `Vendas processadas: ${result.success?.vendas || 0}`,
          `Transações processadas: ${result.success?.transacoes || 0}`,
        ]);
        if (result.rawData) setRawData(result.rawData);
      } else if (result.results) {
        setLogMessages([
          `Clientes processados: ${result.results.customers.processed} (${result.results.customers.errors} erros)`,
          `Produtos processados: ${result.results.products.processed} (${result.results.products.errors} erros)`,
          `Vendas processadas: ${result.results.sales.processed} (${result.results.sales.errors} erros)`,
          `Transações processadas: ${result.results.financial.processed} (${result.results.financial.errors} erros)`,
        ]);
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Erro de conexão ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importação Avançada</h1>
          <p className="text-gray-500 mt-1">Importe planilhas ou extratos (PDF) e deixe o sistema organizar tudo.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Instruções</h2>
          <p className="text-gray-600 mb-6">
            Você pode importar os arquivos usando a leitura padrão (apenas planilhas no formato original) ou usar a nova <strong>Inteligência Artificial</strong>, capaz de interpretar qualquer extrato bancário em PDF ou planilha bagunçada!
          </p>

          <div className="flex items-center mb-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
            <input 
              type="checkbox" 
              id="useAI" 
              checked={useAI} 
              onChange={(e) => setUseAI(e.target.checked)} 
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="useAI" className="ml-3 font-medium text-purple-900 cursor-pointer flex items-center">
              <span className="mr-2">✨ Usar Importação Inteligente (IA)</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-purple-200 text-purple-800 rounded-full">BETA</span>
            </label>
            <p className="ml-4 text-sm text-purple-700 hidden sm:block">A IA lerá arquivos Excel (.xlsx), CSV e Extratos em PDF.</p>
          </div>

          <label className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${useAI ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
            {isUploading ? (useAI ? 'A Inteligência Artificial está analisando seu arquivo (isso pode levar 10-30s)...' : 'Processando...') : (useAI ? '✨ Enviar Arquivo para a IA' : 'Fazer Upload Padrão (.xlsx)')}
            <input 
              type="file" 
              accept={useAI ? ".xlsx,.csv,.pdf" : ".xlsx,.csv"} 
              className="hidden" 
              onChange={handleImportLegacy} 
              disabled={isUploading}
            />
          </label>

          {logMessages.length > 0 && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-md font-semibold text-gray-800 mb-2">Resumo da Importação:</h3>
              <ul className="space-y-1 text-sm text-gray-700 mb-4">
                {logMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
              {useAI && rawData && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Dados Interpretados pela IA:</h4>
                  <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded max-h-48 overflow-y-auto">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
