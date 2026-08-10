import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useStockAlerts } from '../hooks/useStockAlerts';
import { useCrudList } from '../hooks/useCrudList';
import { formatDateBR, formatDateTimeBR } from '../lib/dates';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

interface Category {
  id: string;
  nome: string;
  corHexadecimal: string;
  aliquotaImposto: number | null;
}

interface Brand {
  id: string;
  nome: string;
}

interface Product {
  id: string;
  codigoBarrasEan: string | null;
  nome: string;
  categoryId: string;
  brandId?: string | null;
  descricaoVariante?: string;
  ncm?: string | null;
  unidade: string;
  pesoBruto?: number | null;
  pesoLiquido?: number | null;
  precoCusto: number;
  precoVendaSugerido: number;
  qtdEstoqueAtual: number;
  estoqueMinimo: number;
  status: string;
  dataPedido?: string | null;
  previsaoChegada?: string | null;
  imageUrl?: string;
  codigoVisual?: string | null;
  impostoEstimadoPercentual?: number;
  category?: {
    nome: string;
    corHexadecimal: string;
  };
  brand?: {
    id: string;
    nome: string;
  } | null;
}

export function EstoquePage() {
  const { user, activeWorkspace } = useAuth();
  const isRestricted = !user?.isImpersonating && activeWorkspace ? ['VENDEDOR', 'CAIXA'].includes(activeWorkspace.role) : false;
  const { count: alertCount, products: alertProducts } = useStockAlerts();
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState<'COM_ESTOQUE' | 'TODOS' | 'SEM_ESTOQUE' | 'ENCOMENDA'>('COM_ESTOQUE');
  const [modalAberto, setModalAberto] = useState(false);
  
  const [form, setForm] = useState<{ id: string | null; nome: string; categoryId: string; brandId: string; precoCusto: string; precoVendaSugerido: string; qtdEstoqueAtual: string; estoqueMinimo: string; imageUrl: string; codigoBarrasEan?: string; codigoVisual?: string | null; descricaoVariante?: string; ncm?: string; unidade: string; pesoBruto?: string; pesoLiquido?: string; status: string; dataPedido: string; previsaoChegada: string; impostoEstimadoPercentual: string }>({ 
    id: null, nome: '', categoryId: '', brandId: '', precoCusto: '', precoVendaSugerido: '', qtdEstoqueAtual: '0', estoqueMinimo: '5', imageUrl: '', codigoBarrasEan: '', codigoVisual: '', descricaoVariante: '', ncm: '', unidade: 'UN', pesoBruto: '', pesoLiquido: '', status: 'ATIVO', dataPedido: '', previsaoChegada: '', impostoEstimadoPercentual: '' 
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'CATALOGO' | 'PRONTA_ENTREGA' | 'MOVIMENTACOES'>('CATALOGO');
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [formEntrada, setFormEntrada] = useState<{ fornecedor: string; valorFreteTotal: string; itens: { productId: string; quantidade: string; custoFornecedor: string }[] }>({
    fornecedor: '', valorFreteTotal: '', itens: []
  });
  const [scannerCadastroAberto, setScannerCadastroAberto] = useState(false);
  const [scannerEntradaAberto, setScannerEntradaAberto] = useState(false);

  const cats = useCrudList<Category, { nome: string; corHexadecimal: string; aliquotaImposto: string }>({
    endpoint: '/categories',
    loadList: () => fetchApi('/categories'),
    createDefault: () => ({ nome: '', corHexadecimal: '#3B82F6', aliquotaImposto: '' }),
    toForm: (c) => ({ nome: c.nome, corHexadecimal: c.corHexadecimal, aliquotaImposto: c.aliquotaImposto != null ? String(c.aliquotaImposto) : '' }),
    messages: {
      loadError: 'Erro de conexão ao carregar categorias.',
      createSuccess: 'Categoria criada com sucesso!',
      updateSuccess: 'Categoria atualizada com sucesso!',
      deleteSuccess: 'Categoria removida com sucesso!',
    },
  });

  const brands = useCrudList<Brand, { nome: string }>({
    endpoint: '/brands',
    loadList: () => fetchApi('/brands'),
    createDefault: () => ({ nome: '' }),
    toForm: (b) => ({ nome: b.nome }),
    messages: {
      loadError: 'Erro de conexão ao carregar marcas.',
      createSuccess: 'Marca criada com sucesso!',
      updateSuccess: 'Marca atualizada com sucesso!',
      deleteSuccess: 'Marca removida com sucesso!',
    },
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      setProdutos(await fetchApi('/products'));
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Erro de conexão ao carregar estoque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     
    carregarDados();
  }, []);

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(termoBusca.toLowerCase());
    if (filtroEstoque === 'COM_ESTOQUE') return matchBusca && p.qtdEstoqueAtual > 0;
    if (filtroEstoque === 'SEM_ESTOQUE') return matchBusca && p.qtdEstoqueAtual <= 0 && p.status !== 'ENCOMENDA';
    if (filtroEstoque === 'ENCOMENDA') return matchBusca && p.status === 'ENCOMENDA';
    return matchBusca; // TODOS
  });

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        codigoBarrasEan: form.codigoBarrasEan || undefined,
        descricaoVariante: form.descricaoVariante || undefined,
        ncm: form.ncm || undefined,
        unidade: form.unidade,
        pesoBruto: form.pesoBruto ? Number(form.pesoBruto) : undefined,
        pesoLiquido: form.pesoLiquido ? Number(form.pesoLiquido) : undefined,
        precoCusto: Number(form.precoCusto),
        precoVendaSugerido: Number(form.precoVendaSugerido),
        qtdEstoqueAtual: Number(form.qtdEstoqueAtual),
        estoqueMinimo: Number(form.estoqueMinimo),
        status: form.status,
        imageUrl: form.imageUrl || undefined,
        codigoVisual: form.codigoVisual || undefined,
        dataPedido: form.dataPedido ? new Date(form.dataPedido).toISOString() : undefined,
        previsaoChegada: form.previsaoChegada ? new Date(form.previsaoChegada).toISOString() : undefined,
        impostoEstimadoPercentual: form.impostoEstimadoPercentual ? Number(form.impostoEstimadoPercentual) : undefined,
      };

      if (form.id) {
        await fetchApi(`/products/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setModalAberto(false);
      carregarDados(); // Recarregar para trazer os dados formatados do banco
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Erro de conexão ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  const abrirModalProduto = (prod: Product | null = null) => {
    if (prod) {
      setForm({ 
        id: prod.id, 
        nome: prod.nome, 
        categoryId: prod.categoryId,
        brandId: prod.brandId || '',
        precoCusto: prod.precoCusto.toString(), 
        precoVendaSugerido: prod.precoVendaSugerido.toString(), 
        qtdEstoqueAtual: prod.qtdEstoqueAtual.toString(),
        estoqueMinimo: (prod.estoqueMinimo || 5).toString(),
        imageUrl: prod.imageUrl || '',
        codigoBarrasEan: prod.codigoBarrasEan || '',
        codigoVisual: prod.codigoVisual || '',
        descricaoVariante: prod.descricaoVariante || '',
        ncm: prod.ncm || '',
        unidade: prod.unidade || 'UN',
        pesoBruto: prod.pesoBruto?.toString() || '',
        pesoLiquido: prod.pesoLiquido?.toString() || '',
        status: prod.status,
        dataPedido: prod.dataPedido ? new Date(prod.dataPedido).toISOString().slice(0, 16) : '',
        previsaoChegada: prod.previsaoChegada ? new Date(prod.previsaoChegada).toISOString().slice(0, 16) : '',
        impostoEstimadoPercentual: prod.impostoEstimadoPercentual?.toString() || ''
      });
    } else {
      setForm({ id: null, nome: '', categoryId: '', brandId: '', precoCusto: '', precoVendaSugerido: '', qtdEstoqueAtual: '0', estoqueMinimo: '5', imageUrl: '', codigoBarrasEan: '', codigoVisual: '', descricaoVariante: '', ncm: '', unidade: 'UN', pesoBruto: '', pesoLiquido: '', status: 'ATIVO', dataPedido: '', previsaoChegada: '', impostoEstimadoPercentual: '' });
    }
    setModalAberto(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const deletarProduto = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto do catálogo?')) {
      try {
        await fetchApi(`/products/${id}`, { method: 'DELETE' });
        setProdutos(produtos.filter(p => p.id !== id));
      } catch (error) {
        console.error(error);
        toast.error((error as Error).message || "Erro de conexão ao excluir.");
      }
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await fetchApi('/import/produtos', {
        method: 'POST',
        body: formData,
      });
      toast.success(`Importação concluída! Sucessos: ${data.successCount}, Erros: ${data.errorCount}`);
      carregarDados();
    } catch (err: any) {
      toast.error(err?.message || 'Erro na importação');
    }
    // Limpa o input
    e.target.value = '';
  };

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let totalSuccess = 0;
    let totalError = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      const loadId = toast.loading(`Lendo catálogo ${i + 1} de ${files.length} via Inteligência Artificial...`);

      try {
        const data = await fetchApi('/import/pdf-catalog', {
          method: 'POST',
          body: formData,
        });
        totalSuccess += data.successCount || 0;
        totalError += data.errorCount || 0;
        toast.success(`PDF ${i + 1} Importado! Novos Produtos: ${data.successCount}.`, { id: loadId });
      } catch (err) {
        totalError++;
        toast.error(`Erro de conexão ao processar PDF ${i + 1}`, { id: loadId });
      }
    }

    if (totalSuccess > 0) {
      carregarDados();
      toast.success(`Concluído! Total importado: ${totalSuccess} produtos (Erros: ${totalError})`);
    }
    
    e.target.value = '';
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Produtos');
      
      worksheet.columns = [
        { header: 'Nome', key: 'nome', width: 30 },
        { header: 'Categoria', key: 'categoria', width: 20 },
        { header: 'Preço de Custo', key: 'precoCusto', width: 15 },
        { header: 'Preço de Venda', key: 'precoVenda', width: 15 },
        { header: 'Estoque Atual', key: 'estoqueAtual', width: 15 },
      ];

      produtos.forEach(p => {
        worksheet.addRow({
          nome: p.nome,
          categoria: p.category?.nome || '',
          precoCusto: p.precoCusto,
          precoVenda: p.precoVendaSugerido,
          estoqueAtual: p.qtdEstoqueAtual
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalogo_produtos.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      doc.text("Catálogo de Produtos", 14, 15);
      
      const tableColumn = ["Nome", "Categoria", "Custo (R$)", "Venda (R$)", "Estoque"];
      const tableRows: string[][] = [];

      produtos.forEach(p => {
        const productData = [
          p.nome,
          p.category?.nome || '',
          (p.precoCusto ?? 0).toFixed(2),
          (p.precoVendaSugerido ?? 0).toFixed(2),
          String(p.qtdEstoqueAtual ?? 0)
        ];
        tableRows.push(productData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      doc.save("catalogo_produtos.pdf");
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleSalvarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formEntrada.itens.length === 0) {
      toast.error('Adicione pelo menos um produto na entrada.');
      return;
    }
    setSaving(true);
    try {
      await fetchApi('/product-entries', {
        method: 'POST',
        body: JSON.stringify({
          fornecedor: formEntrada.fornecedor,
          valorFreteTotal: formEntrada.valorFreteTotal ? Number(formEntrada.valorFreteTotal) : 0,
          itens: formEntrada.itens.map(i => ({
            productId: i.productId,
            quantidade: Number(i.quantidade),
            custoFornecedor: Number(i.custoFornecedor),
          })),
        })
      });
      toast.success('Entrada de produtos registrada com sucesso!');
      setModalEntradaAberto(false);
      setFormEntrada({ fornecedor: '', valorFreteTotal: '', itens: [] });
      carregarDados();
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Erro de conexão ao registrar entrada.");
    } finally {
      setSaving(false);
    }
  };

  const adicionarItemEntrada = () => {
    setFormEntrada(prev => ({
      ...prev,
      itens: [...prev.itens, { productId: '', quantidade: '1', custoFornecedor: '0' }]
    }));
  };

  const buscarProdutoPorEan = async (ean: string) => {
    try {
      return await fetchApi(`/products/by-ean/${encodeURIComponent(ean)}`);
    } catch {
      return null;
    }
  };

  const handleCodigoScannerCadastro = async (codigo: string) => {
    const produto = await buscarProdutoPorEan(codigo);
    if (produto) {
      toast(`Produto "${produto.nome}" já existe no catálogo — dados carregados para edição.`, { icon: 'ℹ️' });
      setForm({
        id: produto.id, nome: produto.nome, categoryId: produto.categoryId, brandId: produto.brandId || '',
        precoCusto: String(produto.precoCusto || ''), precoVendaSugerido: String(produto.precoVendaSugerido || ''),
        qtdEstoqueAtual: String(produto.qtdEstoqueAtual || 0), estoqueMinimo: String(produto.estoqueMinimo ?? 5),
        imageUrl: produto.imageUrl || '', codigoBarrasEan: codigo, codigoVisual: produto.codigoVisual || '',
        descricaoVariante: produto.descricaoVariante || '', ncm: produto.ncm || '', unidade: produto.unidade || 'UN',
        pesoBruto: produto.pesoBruto !== null && produto.pesoBruto !== undefined ? String(produto.pesoBruto) : '',
        pesoLiquido: produto.pesoLiquido !== null && produto.pesoLiquido !== undefined ? String(produto.pesoLiquido) : '',
        status: produto.status || 'ATIVO', dataPedido: produto.dataPedido || '', previsaoChegada: produto.previsaoChegada || '',
        impostoEstimadoPercentual: produto.impostoEstimadoPercentual !== null && produto.impostoEstimadoPercentual !== undefined ? String(produto.impostoEstimadoPercentual) : '',
      });
      setModalAberto(true);
    } else {
      toast.success('Produto não encontrado — complete o cadastro para salvá-lo.');
      setForm({ id: null, nome: '', categoryId: '', brandId: '', precoCusto: '', precoVendaSugerido: '', qtdEstoqueAtual: '0', estoqueMinimo: '5', imageUrl: '', codigoBarrasEan: codigo, codigoVisual: '', descricaoVariante: '', ncm: '', unidade: 'UN', pesoBruto: '', pesoLiquido: '', status: 'ATIVO', dataPedido: '', previsaoChegada: '', impostoEstimadoPercentual: '' });
      setModalAberto(true);
    }
  };

  const handleCodigoScannerEntrada = async (codigo: string) => {
    const produto = await buscarProdutoPorEan(codigo);
    if (!produto) {
      toast.error(`Nenhum produto com o código ${codigo}. Cadastre-o no catálogo primeiro.`);
      return;
    }
    const jaExiste = formEntrada.itens.some(i => i.productId === produto.id);
    if (jaExiste) {
      toast(`"${produto.nome}" já está na entrada.`, { icon: 'ℹ️' });
      return;
    }
    setFormEntrada(prev => ({
      ...prev,
      itens: [...prev.itens, { productId: produto.id, quantidade: '1', custoFornecedor: String(produto.precoCusto || '0') }],
    }));
    toast.success(`${produto.nome} adicionado à entrada.`);
  };

  if (loading && produtos.length === 0) {
    return <div className="text-gray-500">Carregando catálogo...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo e Estoque</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie seus produtos e controle a pronta entrega.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm cursor-pointer flex items-center justify-center text-sm">
            Importar Excel/CSV
            <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleImportCSV} />
          </label>
          <label className="bg-white text-purple-700 border border-purple-300 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition shadow-sm cursor-pointer flex items-center justify-center text-sm">
            Importar PDF
            <input type="file" accept=".pdf" multiple className="hidden" onChange={handleImportPDF} />
          </label>
          <button onClick={handleExportExcel} className="bg-white text-green-700 border border-green-300 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition shadow-sm flex items-center justify-center text-sm">
            Exportar Excel
          </button>
          <button onClick={handleExportPDF} className="bg-white text-red-700 border border-red-300 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition shadow-sm flex items-center justify-center text-sm">
            Exportar PDF
          </button>
          <button onClick={() => cats.openNew()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
            Nova Categoria
          </button>
          <button onClick={() => brands.openNew()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
            Nova Marca
          </button>
          <button onClick={() => setModalEntradaAberto(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            Entrada de Produtos
          </button>
          <button onClick={() => abrirModalProduto()} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex px-4 pt-4 md:pt-0 gap-6 border-b md:border-none">
            <button 
              onClick={() => setActiveTab('CATALOGO')}
              className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'CATALOGO' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Catálogo de Produtos
            </button>
            <button 
              onClick={() => setActiveTab('PRONTA_ENTREGA')}
              className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'PRONTA_ENTREGA' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Pronta Entrega (Estoque)
            </button>
            <button 
              onClick={() => setActiveTab('MOVIMENTACOES')}
              className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'MOVIMENTACOES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Movimentações
            </button>
          </div>
          {alertCount > 0 && (
            <div className="mx-4 mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800">
                <span className="font-bold text-lg">{alertCount}</span>
                <span className="text-sm">produto{alertCount > 1 ? 's' : ''} com estoque baixo</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {alertProducts.slice(0, 5).map(p => (
                  <span key={p.id} className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-md whitespace-nowrap">
                    {p.nome} ({p.qtdEstoqueAtual}/{p.estoqueMinimo})
                  </span>
                ))}
                {alertProducts.length > 5 && (
                  <span className="text-xs text-rose-500 px-2 py-1">+{alertProducts.length - 5} mais</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 p-3 mb-2">
            <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text"
                placeholder="Buscar produto..."
                className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 overflow-x-auto">
              <button
                onClick={() => setFiltroEstoque('COM_ESTOQUE')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filtroEstoque === 'COM_ESTOQUE' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Com Estoque
              </button>
              <button
                onClick={() => setFiltroEstoque('ENCOMENDA')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filtroEstoque === 'ENCOMENDA' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Encomenda
              </button>
              <button
                onClick={() => setFiltroEstoque('SEM_ESTOQUE')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filtroEstoque === 'SEM_ESTOQUE' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sem Estoque
              </button>
              <button
                onClick={() => setFiltroEstoque('TODOS')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  filtroEstoque === 'TODOS' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'CATALOGO' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  {filtroEstoque === 'ENCOMENDA' && <th className="px-6 py-4 font-medium">Cliente</th>}
                  {filtroEstoque === 'ENCOMENDA' && <th className="px-6 py-4 font-medium">Previsão</th>}
                  <th className="px-6 py-4 font-medium">Marca</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium text-center">Qtd</th>
                  {!isRestricted && <th className="px-6 py-4 font-medium text-right">Preço Custo</th>}
                  <th className="px-6 py-4 font-medium text-right">Preço Venda</th>
                  {!isRestricted && <th className="px-6 py-4 font-medium text-right">Margem Lucro</th>}
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum produto encontrado.</td>
                  </tr>
                ) : (
                  produtosFiltrados.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.nome} className="w-10 h-10 rounded object-cover shadow-sm border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                              Sem foto
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">
                              {prod.codigoVisual && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mr-2 text-[11px] font-mono border border-gray-200">{prod.codigoVisual}</span>}
                              {prod.nome}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              EAN: {prod.codigoBarrasEan || 'N/A'} • {prod.category?.nome || 'Geral'}
                            </div>
                            {prod.descricaoVariante && (
                              <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs" title={prod.descricaoVariante}>
                                {prod.descricaoVariante}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {filtroEstoque === 'ENCOMENDA' && (
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {(prod as any).clienteNome || '-'}
                        </td>
                      )}
                      {filtroEstoque === 'ENCOMENDA' && (
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {prod.previsaoChegada ? formatDateBR(prod.previsaoChegada) : '-'}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{prod.brand?.nome || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {prod.category ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `${prod.category.corHexadecimal}20`, color: prod.category.corHexadecimal }}>
                            {prod.category.nome}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Sem categoria</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${Number(prod.qtdEstoqueAtual) <= (prod.estoqueMinimo || 5) ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {prod.qtdEstoqueAtual} un
                          {Number(prod.qtdEstoqueAtual) <= (prod.estoqueMinimo || 5) && (
                            <span className="ml-1 text-rose-500 font-bold">!</span>
                          )}
                        </span>
                      </td>
                      {!isRestricted && <td className="px-6 py-4 text-right text-gray-500">R$ {Number(prod.precoCusto).toFixed(2)}</td>}
                      <td className="px-6 py-4 text-right font-medium text-gray-900">R$ {Number(prod.precoVendaSugerido).toFixed(2)}</td>
                      {!isRestricted && (
                        <td className="px-6 py-4 text-right font-medium text-green-600">
                          {prod.precoCusto > 0 
                            ? `${(((Number(prod.precoVendaSugerido) - Number(prod.precoCusto)) / Number(prod.precoCusto)) * 100).toFixed(1)}% `
                            : '100% '}
                          <span className="text-xs text-gray-500 block">(R$ {(Number(prod.precoVendaSugerido) - Number(prod.precoCusto)).toFixed(2)})</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right space-x-3">
                        <button onClick={() => abrirModalProduto(prod)} className="text-brand-600 hover:text-brand-900 font-medium">Editar</button>
                        <button onClick={() => deletarProduto(prod.id)} className="text-rose-600 hover:text-rose-900 font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'PRONTA_ENTREGA' ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium text-center">Quantidade Atual</th>
                  {!isRestricted && <th className="px-6 py-4 font-medium text-right">Valor Investido</th>}
                  <th className="px-6 py-4 font-medium text-right text-green-700">Valor Potencial</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum produto encontrado.</td>
                  </tr>
                ) : (
                  produtosFiltrados.map((prod) => {
                    const inv = prod.qtdEstoqueAtual * prod.precoCusto;
                    const pot = prod.qtdEstoqueAtual * prod.precoVendaSugerido;
                    return (
                      <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{prod.nome}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${Number(prod.qtdEstoqueAtual) <= (prod.estoqueMinimo || 5) ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {prod.qtdEstoqueAtual} un
                            {Number(prod.qtdEstoqueAtual) <= (prod.estoqueMinimo || 5) && (
                              <span className="ml-1 text-rose-500 font-bold">!</span>
                            )}
                          </span>
                        </td>
                        {!isRestricted && <td className="px-6 py-4 text-right text-gray-500">R$ {inv.toFixed(2)}</td>}
                        <td className="px-6 py-4 text-right font-medium text-green-700">R$ {pot.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => abrirModalProduto(prod)} className="text-brand-600 hover:text-brand-900 font-medium text-xs border border-brand-200 bg-brand-50 px-2 py-1 rounded">Dar Entrada</button>
                        </td>
                      </tr>
                    );
                  })
                )}
                {produtosFiltrados.length > 0 && (
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td className="px-6 py-4 text-gray-900" colSpan={2}>Totais em Estoque:</td>
                    {!isRestricted && <td className="px-6 py-4 text-right text-gray-700">R$ {produtosFiltrados.reduce((a, b) => a + (b.qtdEstoqueAtual * b.precoCusto), 0).toFixed(2)}</td>}
                    <td className="px-6 py-4 text-right text-green-700">R$ {produtosFiltrados.reduce((a, b) => a + (b.qtdEstoqueAtual * b.precoVendaSugerido), 0).toFixed(2)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <StockMovementsContent />
          )}
        </div>
      </div>

      {/* Modal Produto */}
      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title={form.id ? 'Editar Produto' : 'Novo Produto'}
        size="md"
        rounded="xl" maxHeight="85vh"
      >
        <form onSubmit={handleSalvarProduto} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" 
                value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagem (Opcional)</label>
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="w-10 h-10 rounded object-cover border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 border border-gray-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 20M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <label className="cursor-pointer text-sm text-brand-600 font-medium hover:text-brand-800 bg-brand-50 px-3 py-2 rounded border border-brand-200">
                  Escolher Foto
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                {form.imageUrl && (
                  <button type="button" onClick={() => setForm({...form, imageUrl: ''})} className="text-red-500 hover:text-red-700 text-sm font-medium">
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">EAN</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" 
                  value={form.codigoBarrasEan || ''}
                  onChange={e => setForm({...form, codigoBarrasEan: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setScannerCadastroAberto(true)}
                  className="px-3 py-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg text-sm font-medium hover:bg-brand-100 transition whitespace-nowrap"
                  title="Escanear código de barras com a câmera"
                >
                  Escanear
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cód. Visual (Auto)</label>
              <input 
                type="text"
                disabled={!form.id}
                placeholder={form.id ? "P-XXXX" : "Gerado ao salvar"}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 font-mono" 
                value={form.codigoVisual || ''}
                onChange={e => setForm({...form, codigoVisual: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select required className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                <option value="">Selecione uma categoria</option>
                {cats.items.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white" value={form.brandId} onChange={e => setForm({...form, brandId: e.target.value})}>
                <option value="">Sem marca</option>
                {brands.items.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações / Detalhes</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" 
              value={form.descricaoVariante || ''}
              onChange={e => setForm({...form, descricaoVariante: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NCM (Opcional)</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none font-mono"
                value={form.ncm || ''} onChange={e => setForm({...form, ncm: e.target.value})} placeholder="Ex: 6109.10.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}>
                <option value="UN">UN (Unidade)</option>
                <option value="KG">KG (Quilograma)</option>
                <option value="G">G (Grama)</option>
                <option value="M">M (Metro)</option>
                <option value="CM">CM (Centímetro)</option>
                <option value="CX">CX (Caixa)</option>
                <option value="PC">PC (Peça)</option>
                <option value="LT">LT (Litro)</option>
                <option value="ML">ML (Mililitro)</option>
                <option value="PAR">PAR (Par)</option>
                <option value="PCT">PCT (Pacote)</option>
                <option value="MT2">MT2 (Metro²)</option>
                <option value="MT3">MT3 (Metro³)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
              <input type="number" min="0" step="0.001" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.pesoBruto || ''} onChange={e => setForm({...form, pesoBruto: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Líquido (kg)</label>
              <input type="number" min="0" step="0.001" className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none"
                value={form.pesoLiquido || ''} onChange={e => setForm({...form, pesoLiquido: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Custo (R$) *</label>
              <input required type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={form.precoCusto} onChange={e => setForm({...form, precoCusto: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$) *</label>
              <input required type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={form.precoVendaSugerido} onChange={e => setForm({...form, precoVendaSugerido: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alíquota de Imposto (%)</label>
            <input type="number" min="0" max="100" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
              value={form.impostoEstimadoPercentual} 
              onChange={e => setForm({...form, impostoEstimadoPercentual: e.target.value})} 
              placeholder="Deixe vazio para usar alíquota da categoria/loja" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Estoque Inicial</label>
              <input type="number" step="0.001" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={form.qtdEstoqueAtual} onChange={e => setForm({...form, qtdEstoqueAtual: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo</label>
              <input type="number" step="0.001" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={form.estoqueMinimo} onChange={e => setForm({...form, estoqueMinimo: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 bg-white" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="ENCOMENDA">Encomenda</option>
              </select>
            </div>
          </div>
          
          {form.status === 'ENCOMENDA' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">Data do Pedido</label>
                <input type="datetime-local" className="w-full px-3 py-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={form.dataPedido} onChange={e => setForm({...form, dataPedido: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-800 mb-1">Previsão de Chegada</label>
                <input type="datetime-local" className="w-full px-3 py-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500" value={form.previsaoChegada} onChange={e => setForm({...form, previsaoChegada: e.target.value})} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setModalAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Categoria */}
      <Modal
        open={cats.modalOpen}
        onClose={cats.closeModal}
        title="Nova Categoria"
        size="sm"
        rounded="xl"
      >
        <form onSubmit={(e) => { e.preventDefault(); void cats.handleSave(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria *</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={cats.form.nome} onChange={e => cats.setForm({...cats.form, nome: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Hexadecimal</label>
            <div className="flex gap-2 items-center">
              <input type="color" className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer" value={cats.form.corHexadecimal} onChange={e => cats.setForm({...cats.form, corHexadecimal: e.target.value})} />
              <input type="text" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={cats.form.corHexadecimal} onChange={e => cats.setForm({...cats.form, corHexadecimal: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alíquota de Imposto (%)</label>
            <input type="number" min="0" max="100" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" 
              value={cats.form.aliquotaImposto} 
              onChange={e => cats.setForm({...cats.form, aliquotaImposto: e.target.value})} 
              placeholder="Deixe vazio para usar a alíquota da loja" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={cats.closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={cats.saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
              {cats.saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Marca */}
      <Modal
        open={brands.modalOpen}
        onClose={brands.closeModal}
        title="Nova Marca"
        size="sm"
        rounded="xl"
      >
        <form onSubmit={(e) => { e.preventDefault(); void brands.handleSave(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Marca *</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" value={brands.form.nome} onChange={e => brands.setForm({...brands.form, nome: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={brands.closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={brands.saving} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50">
              {brands.saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Entrada de Produtos */}
      <Modal
        open={modalEntradaAberto}
        onClose={() => setModalEntradaAberto(false)}
        title="Entrada de Mercadorias (Rateio de Frete)"
        rounded="xl"
      >
        <p className="text-sm text-gray-500 mb-6">Insira os itens da nota, custos e o frete total. O sistema calculará o custo final e atualizará o estoque.</p>
        
        <form onSubmit={handleSalvarEntrada} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor (Opcional)</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formEntrada.fornecedor} onChange={e => setFormEntrada({...formEntrada, fornecedor: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Frete Total (R$)</label>
              <input required type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formEntrada.valorFreteTotal} onChange={e => setFormEntrada({...formEntrada, valorFreteTotal: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Itens da Entrada</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => setScannerEntradaAberto(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">🔍 Escanear</button>
                <button type="button" onClick={adicionarItemEntrada} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">+ Adicionar Item</button>
              </div>
            </div>
            
            {formEntrada.itens.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 sm:items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Produto</label>
                  <select required className="w-full px-3 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white" value={item.productId} onChange={e => {
                    const newItens = [...formEntrada.itens];
                    newItens[index].productId = e.target.value;
                    setFormEntrada({...formEntrada, itens: newItens});
                  }}>
                    <option value="">Selecione um produto</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.codigoVisual ? `[${p.codigoVisual}] ` : ''}{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qtd</label>
                    <input required type="number" step="0.001" className="w-full px-3 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={item.quantidade} onChange={e => {
                      const newItens = [...formEntrada.itens];
                      newItens[index].quantidade = e.target.value;
                      setFormEntrada({...formEntrada, itens: newItens});
                    }} />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Custo Un. (R$)</label>
                    <input required type="number" step="0.01" className="w-full px-3 py-1.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={item.custoFornecedor} onChange={e => {
                      const newItens = [...formEntrada.itens];
                      newItens[index].custoFornecedor = e.target.value;
                      setFormEntrada({...formEntrada, itens: newItens});
                    }} />
                  </div>
                  <button type="button" onClick={() => {
                    const newItens = formEntrada.itens.filter((_, i) => i !== index);
                    setFormEntrada({...formEntrada, itens: newItens});
                  }} className="mb-1 text-red-500 hover:text-red-700 font-bold px-2">X</button>
                </div>
              </div>
            ))}
            {formEntrada.itens.length === 0 && (
              <p className="text-sm text-gray-500 italic">Nenhum produto adicionado. Clique em "+ Adicionar Item".</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setModalEntradaAberto(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || formEntrada.itens.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Processando...' : 'Finalizar Entrada'}
            </button>
          </div>
        </form>
      </Modal>

      <BarcodeScannerModal
        aberto={scannerCadastroAberto}
        onFechar={() => setScannerCadastroAberto(false)}
        onCodigo={handleCodigoScannerCadastro}
        titulo="Escanear EAN do produto"
      />
      <BarcodeScannerModal
        aberto={scannerEntradaAberto}
        onFechar={() => setScannerEntradaAberto(false)}
        onCodigo={handleCodigoScannerEntrada}
        titulo="Escanear produto para entrada"
      />
    </div>
  );
}

interface StockMovement {
  id: string;
  tipo: string;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  observacao: string | null;
  referenciaId: string | null;
  createdAt: string;
  product: { id: string; nome: string; codigoVisual: string | null };
  user: { id: string; nome: string };
}

function StockMovementsContent() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: '', novaQuantidade: 0, observacao: '' });
  const [products, setProducts] = useState<{ id: string; nome: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMovements();
    fetchApi('/categories').catch(() => {});
    fetchApi('/products').then(d => setProducts(d || [])).catch(() => {});
  }, [page]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (productFilter) params.set('productId', productFilter);
      const data = await fetchApi(`/inventory/movements?${params}`);
      setMovements(data?.records || []);
      setTotal(data?.total || 0);
    } catch { toast.error('Erro ao carregar movimentações'); }
    finally { setLoading(false); }
  };

  const handleAdjust = async () => {
    if (!adjustForm.productId || adjustForm.novaQuantidade < 0) return;
    setSaving(true);
    try {
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(adjustForm),
      });
      toast.success('Estoque ajustado!');
      setAdjustModal(false);
      loadMovements();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro ao ajustar'); }
    finally { setSaving(false); }
  };

  const tipoLabel: Record<string, string> = { ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste' };
  const tipoColor: Record<string, string> = { ENTRADA: 'bg-green-100 text-green-700', SAIDA: 'bg-red-100 text-red-700', AJUSTE: 'bg-amber-100 text-amber-700' };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Histórico de Movimentações</h3>
        <button onClick={() => { setAdjustForm({ productId: '', novaQuantidade: 0, observacao: '' }); setAdjustModal(true); }} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm">
          Ajustar Estoque
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={productFilter}
          onChange={e => { setProductFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os produtos</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-500">Carregando...</p>
      ) : movements.length === 0 ? (
        <p className="text-center py-8 text-gray-500">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left py-3 text-gray-500 font-medium">Produto</th>
                <th className="text-left py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-right py-3 text-gray-500 font-medium">Qtd</th>
                <th className="text-right py-3 text-gray-500 font-medium">Saldo Ant.</th>
                <th className="text-right py-3 text-gray-500 font-medium">Saldo Novo</th>
                <th className="text-left py-3 text-gray-500 font-medium">Observação</th>
                <th className="text-left py-3 text-gray-500 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 text-xs text-gray-500">{formatDateTimeBR(m.createdAt)}</td>
                  <td className="py-3">{m.product.nome}</td>
                  <td className="py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${tipoColor[m.tipo] || 'bg-gray-100'}`}>
                      {tipoLabel[m.tipo] || m.tipo}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold">{Number(m.quantidade)}</td>
                  <td className="py-3 text-right text-gray-500">{Number(m.saldoAnterior)}</td>
                  <td className="py-3 text-right text-gray-500">{Number(m.saldoPosterior)}</td>
                  <td className="py-3 text-gray-500 text-xs">{m.observacao || '-'}</td>
                  <td className="py-3 text-xs text-gray-500">{m.user.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50">Anterior</button>
          <span className="px-3 py-1 text-sm text-gray-500">Página {page}</span>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50">Próxima</button>
        </div>
      )}

      <Modal
        open={adjustModal}
        onClose={() => setAdjustModal(false)}
        size="sm"
        rounded="xl" padded={false}
      >
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Ajustar Estoque</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
            <select value={adjustForm.productId} onChange={e => setAdjustForm({...adjustForm, productId: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option value="">Selecione</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Quantidade em Estoque</label>
            <input type="number" min="0" value={adjustForm.novaQuantidade}
              onChange={e => setAdjustForm({...adjustForm, novaQuantidade: Number(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do Ajuste</label>
            <input type="text" value={adjustForm.observacao}
              onChange={e => setAdjustForm({...adjustForm, observacao: e.target.value})}
              placeholder="Ex: Perda, quebra, contagem física..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button onClick={() => setAdjustModal(false)} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg">Cancelar</button>
          <button onClick={handleAdjust} disabled={saving || !adjustForm.productId} className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50">
            {saving ? 'Ajustando...' : 'Confirmar Ajuste'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
