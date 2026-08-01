import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { fetchApi } from '../lib/api';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Eye, Database } from 'lucide-react';

interface SheetPreview {
  name: string;
  type: string;
  columns: string[];
  rowCount: number;
}

interface ImportResult {
  imported: Record<string, number>;
  warnings: string[];
  errors: { sheet: string; row: number; field: string; message: string }[];
  preview: SheetPreview[];
}

export function PlanilhaImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await fetchApi('/planilha/preview', {
        method: 'POST',
        body: formData,
      });

      setResult(data.data || data);
      toast.success('Preview gerado com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await fetchApi('/planilha/import', {
        method: 'POST',
        body: formData,
      });

      setResult(data.data || data);
      toast.success('Importação concluída com sucesso!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar planilha');
    } finally {
      setLoading(false);
    }
  };

  const totalRows = result?.preview?.reduce((acc, s) => acc + s.rowCount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Planilha</h1>
          <p className="text-gray-500 mt-1">
            Faça upload da planilha do seu sistema anterior. Suportamos .xlsx, .xls e .csv
          </p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              {file ? file.name : 'Clique para selecionar o arquivo'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              .xlsx, .xls ou .csv (máx 10MB)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                {loading ? 'Processando...' : 'Visualizar Preview'}
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                {loading ? 'Importando...' : 'Importar Direto'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Abas detectadas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Abas Detectadas ({result.preview?.length || 0})
            </h2>
            <div className="grid gap-3">
              {result.preview?.map((sheet, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      sheet.type === 'DESCONHECIDA' ? 'bg-amber-400' : 'bg-emerald-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{sheet.name}</p>
                      <p className="text-sm text-gray-500">
                        {sheet.type === 'DESCONHECIDA'
                          ? '⚠️ Não reconhecida'
                          : `${sheet.type} — ${sheet.rowCount} linhas`
                        }
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {sheet.columns?.slice(0, 4).join(', ')}
                    {sheet.columns?.length > 4 ? `... +${sheet.columns.length - 4}` : ''}
                  </span>
                </div>
              ))}
            </div>
            {totalRows > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Total: ~{totalRows} linhas em {result.preview?.length || 0} aba(s)
              </p>
            )}
          </div>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {result.warnings.length} Aviso(s)
              </h3>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-700">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {result.errors.length} Erro(s) de Validação
              </h3>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-700">
                    [{e.sheet} linha {e.row}] {e.field}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resultado da importação */}
          {result.imported && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <h2 className="font-semibold text-emerald-800 flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5" />
                Importação Concluída
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(result.imported).map(([key, val]) => (
                  <div key={key} className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{val}</p>
                    <p className="text-sm text-gray-600 capitalize">{key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview: se não houve importação, mostra botão de importar */}
          {!result.imported && totalRows > 0 && (
            <div className="text-center">
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {loading ? 'Importando...' : `Confirmar Importação (${totalRows} linhas)`}
              </button>
              <p className="text-sm text-gray-400 mt-2">
                A importação é atômica: se algo falhar, nada é salvo.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
