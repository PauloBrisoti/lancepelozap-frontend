import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo, useRef, useCallback, useEffectEvent } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../context/AuthContext';
import { fetchApi } from '../lib/api';
import { STALE_TIMES, useCustomers, usePaymentFees } from '../lib/query';
import { todayLocalDate, formatBRL } from '../utils/format';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useSaleDraft } from '../hooks/useSaleDraft';
import { queueSale } from '../services/offlineSales';
import { cacheProducts, getCachedProducts } from '../services/offlineProducts';

interface Product {
  id: string;
  nome: string;
  precoVendaSugerido?: number;
  qtdEstoqueAtual?: number;
  corHexadecimal?: string;
  codigoBarrasEan?: string;
  category?: { nome: string };
}

interface Customer {
  id: string;
  nomeCompleto: string;
  telefoneWhatsapp?: string;
}

interface CartItem {
  productId: string;
  nome: string;
  precoUnitarioVendido: number;
  quantidade: number;
}

export const PDVPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeStoreId } = useAuthStore();
  const isOnline = useOnlineStatus();
  const offlineCacheRef = useRef(false);

  // Produtos com fallback offline (cache local), clientes e taxas via cache React Query
  const produtosQ = useQuery<Product[]>({
    queryKey: ['products', activeStoreId],
    queryFn: async ({ signal }) => {
      try {
        const data = await fetchApi<Product[]>('/products', { signal });
        await cacheProducts(data);
        offlineCacheRef.current = false;
        return data;
      } catch (err) {
        if (!isOnline) {
          const cached = await getCachedProducts();
          if (cached.length > 0) {
            offlineCacheRef.current = true;
            return cached;
          }
        }
        throw err;
      }
    },
    staleTime: STALE_TIMES.FREQUENT,
    retry: 2,
  });
  const clientesQ = useCustomers<Customer>(activeStoreId);
  const feesQ = usePaymentFees(activeStoreId);

  const produtos = produtosQ.data ?? [];
  const clientes = clientesQ.data ?? [];
  const paymentFees = feesQ.data ?? [];
  const loading = produtosQ.isLoading || clientesQ.isLoading || feesQ.isLoading;
  const { pendingCount, syncing } = useOfflineSync(isOnline);
  
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [busca, setBusca] = useState('');
  const { venda, setVendaField, resetVenda } = useSaleDraft();
  const [saving, setSaving] = useState(false);
  const [itemEmEdicao, setItemEmEdicao] = useState<CartItem | null>(null);
  const [cartAberto, setCartAberto] = useState(false);

  const [scannerAberto, setScannerAberto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  const [ajudaAtalhos, setAjudaAtalhos] = useState(false);

  // Sempre a versão mais recente de finalizarVenda (evita stale closure
  // no listener de teclado, que não é re-registrado a cada render)
  const finalizarVendaEvent = useEffectEvent(() => {
    void finalizarVenda();
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        buscaRef.current?.focus();
      }
      if (e.key === 'F8' && carrinho.length > 0 && !saving) {
        e.preventDefault();
        finalizarVendaEvent();
      }
      if (e.key === 'F1') {
        e.preventDefault();
        setAjudaAtalhos(p => !p);
      }
      if (e.key === 'Escape') {
        setItemEmEdicao(null);
        setAjudaAtalhos(false);
        setCartAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, saving]);

  // Scanner
  const abrirScanner = useCallback(async () => {
    setScannerAberto(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      toast.error('Câmera não disponível. Digite o código manualmente.');
      setScannerAberto(false);
    }
  }, []);

  const fecharScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScannerAberto(false);
  }, []);

  const detectarCodigo = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      fecharScanner();
      toast('Seu navegador não suporta leitura por câmera. Digite o código de barras manualmente.', { icon: 'ℹ️' });
      return;
    }
    const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'qr_code'] });
    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          clearInterval(interval);
          fecharScanner();
          const codigo = barcodes[0].rawValue;
          const produto = produtos.find(p => p.codigoBarrasEan === codigo);
          if (produto) {
            adicionarAoCarrinho(produto);
            toast.success(`${produto.nome} adicionado!`);
          } else {
            setBusca(codigo);
            toast(`Código ${codigo} não encontrado`, { icon: '🔍' });
          }
        }
      } catch { /* scanning */ }
    }, 500);
    setTimeout(() => clearInterval(interval), 30000);
  }, [produtos, fecharScanner]);

  useEffect(() => {
    if (scannerAberto && videoRef.current) {
      detectarCodigo();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [scannerAberto, detectarCodigo]);

  // Modal pós-venda
  const [vendaFinalizada, setVendaFinalizada] = useState<{
    itens: CartItem[];
    total: number;
    formaPagamento: string;
    clienteNome: string;
    clienteTelefone: string;
    valorTaxa?: number;
    repasseTaxa?: boolean;
  } | null>(null);

  // Feedback de offline/erro (mantém o comportamento da versão anterior)
  useEffect(() => {
    if (produtosQ.isSuccess && offlineCacheRef.current) {
      toast('Modo offline — usando dados salvos anteriormente', { icon: '📡' });
      offlineCacheRef.current = false;
    }
  }, [produtosQ.isSuccess]);
  useEffect(() => {
    if (produtosQ.isError) {
      if (!isOnline) {
        toast.error('Sem conexão e sem dados em cache. Conecte-se à internet para usar o PDV.');
      } else {
        toast.error('Erro ao carregar dados do PDV.');
      }
    }
  }, [produtosQ.isError, isOnline]);

  const adicionarAoCarrinho = (prod: Product) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.productId === prod.id);
      if (existente) {
        return prev.map(i => i.productId === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, {
        productId: prod.id,
        nome: prod.nome,
        precoUnitarioVendido: Number(prod.precoVendaSugerido) || 0,
        quantidade: 1
      }];
    });
  };

  const alterarQuantidade = (id: string, delta: number) => {
    setCarrinho(prev => prev.map(i => {
      if (i.productId === id) {
        const novaQte = i.quantidade + delta;
        return { ...i, quantidade: novaQte > 0 ? novaQte : 1 };
      }
      return i;
    }));
  };

  const removerDoCarrinho = (id: string) => {
    setCarrinho(prev => prev.filter(i => i.productId !== id));
  };

  const salvarEdicaoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemEmEdicao) {
      setCarrinho(prev => prev.map(i => i.productId === itemEmEdicao.productId ? itemEmEdicao : i));
      setItemEmEdicao(null);
    }
  };

  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [produtos, busca]);

  const subtotal = carrinho.reduce((acc, item) => acc + (item.precoUnitarioVendido * item.quantidade), 0);

  /* ====================================================================
   * Cálculo reativo de taxas de gateway
   * Sempre que o método de pagamento ou número de parcelas mudar,
   * este useMemo recalcula a taxa aplicável com base nas configurações
   * carregadas do banco (paymentFees).
   * ==================================================================== */
  const feeInfo = useMemo(() => {
    if (!paymentFees || paymentFees.length === 0) {
      return { taxaPercentual: 0, taxaFixa: 0, valorTaxa: 0 };
    }
    const fee = paymentFees.find(
      (f: { formaPagamento: string; parcelas: number }) => f.formaPagamento === venda.formaPagamento && f.parcelas === Number(venda.parcelas)
    );
    if (!fee) return { taxaPercentual: 0, taxaFixa: 0, valorTaxa: 0 };
    const valorPercentual = (subtotal * Number(fee.taxaPercentual)) / 100;
    const valorFixo = Number(fee.taxaFixa) || 0;
    return {
      taxaPercentual: Number(fee.taxaPercentual),
      taxaFixa: valorFixo,
      valorTaxa: Math.max(0, valorPercentual + valorFixo),
    };
  }, [paymentFees, venda.formaPagamento, venda.parcelas, subtotal]);

  const total = Math.max(0, subtotal - Number(venda.desconto || 0) + Number(venda.acrescimo || 0) + (venda.repasseTaxa ? feeInfo.valorTaxa : 0));

  const finalizarVenda = async (): Promise<void> => {
    if (carrinho.length === 0) { toast('Adicione itens ao carrinho.'); return; }
    if (venda.formaPagamento === 'CREDIARIO' && !venda.clienteId) {
      toast('Selecione um cliente para vendas no Crediário.');
      return;
    }

    setSaving(true);
    try {
      const agora = new Date();
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
      const dataVendaEnvio = venda.dataVenda === todayLocalDate()
        ? `${venda.dataVenda}T${horaAtual}`
        : venda.dataVenda;

      const body = {
        customerId: venda.clienteId || undefined,
        itens: carrinho,
        formaPagamento: venda.formaPagamento,
        valorDesconto: Number(venda.desconto),
        valorAcrescimo: Number(venda.acrescimo),
        valorSinal: Number(venda.sinal),
        numeroParcelas: Number(venda.parcelas),
        repasseTaxa: venda.repasseTaxa,
        dataVenda: dataVendaEnvio || undefined
      };

      if (!isOnline) {
        await queueSale(body);
        toast.success('Venda salva offline! Será sincronizada automaticamente.');
        setCarrinho([]);
        resetVenda();
        setCartAberto(false);
        setSaving(false);
        return;
      }

      const clienteSelecionado = clientes.find(c => c.id === venda.clienteId);

      await fetchApi('/sales', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setVendaFinalizada({
        itens: [...carrinho],
        total,
        formaPagamento: venda.formaPagamento,
        valorTaxa: feeInfo.valorTaxa,
        repasseTaxa: venda.repasseTaxa,
        clienteNome: clienteSelecionado?.nomeCompleto || 'Consumidor Final',
        clienteTelefone: clienteSelecionado?.telefoneWhatsapp || ''
      });

      setCarrinho([]);
      resetVenda();
      setCartAberto(false);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['products', activeStoreId] });
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || 'Erro ao finalizar venda.');
    } finally {
      setSaving(false);
    }
  };

  const totalItensCarrinho = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500 text-lg">Carregando Frente de Caixa...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-dvh md:h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden relative">
      
      {/* OFFLINE / SYNC BANNER */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-1.5 text-sm font-medium">
          📡 Modo offline — vendas serão salvas e sincronizadas quando houver conexão
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-brand-600 text-white text-center py-1.5 text-sm font-medium">
          {syncing ? '🔄 Sincronizando vendas offline...' : `📤 ${pendingCount} venda(s) pendente(s) de sincronização`}
        </div>
      )}

      {/* CATÁLOGO */}
      <div className="flex-1 flex flex-col min-h-0 pb-20 md:pb-0 md:border-r border-gray-200">
        <div className="p-3 md:p-4 bg-white shadow-sm z-10 flex gap-2">
          <button onClick={() => window.history.back()} className="md:hidden px-2 py-3 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center" title="Voltar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 relative">
            <input 
              ref={buscaRef}
              type="text" 
              placeholder="Buscar produto... (F2)" 
              className="w-full pl-10 pr-4 py-3 md:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none shadow-sm text-base"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button onClick={abrirScanner} className="px-3 md:px-4 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors shadow-sm flex items-center justify-center gap-1 md:gap-2 min-w-[3rem]" title="Escanear código de barras">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
            <span className="hidden md:inline">Câmera</span>
          </button>
          <button onClick={() => setAjudaAtalhos(true)} className="hidden md:flex px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors shadow-sm items-center justify-center" title="Atalhos do teclado (F1)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {produtosFiltrados.map(prod => (
              <div 
                key={prod.id}
                onClick={() => adicionarAoCarrinho(prod)}
                className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-300 cursor-pointer transition-all active:scale-95 select-none flex flex-col min-h-[8rem]"
              >
                <div 
                  className="h-16 md:h-20 rounded-lg mb-2 md:mb-3 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-inner"
                  style={{ backgroundColor: prod.corHexadecimal || '#3B82F6' }}
                >
                  {prod.nome.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-gray-800 text-sm md:text-base line-clamp-2 leading-tight flex-1">{prod.nome}</h3>
                <div className="mt-2 flex justify-between items-end gap-1">
                  <span className="text-brand-600 font-bold text-sm md:text-base">
                    {formatBRL(prod.precoVendaSugerido ?? 0)}
                  </span>
                  <span className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap ${Number(prod.qtdEstoqueAtual) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {Number(prod.qtdEstoqueAtual)}
                  </span>
                </div>
              </div>
            ))}
            {produtosFiltrados.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-10">Nenhum produto encontrado.</div>
            )}
          </div>
        </div>
      </div>

      {/* CARRINHO — DESKTOP */}
      <div className="hidden md:flex w-96 flex-col bg-white shadow-lg">
        <div className="p-4 bg-gray-800 text-white shadow-md">
          <h2 className="text-lg font-bold flex items-center gap-2">
            🛒 Carrinho
            {totalItensCarrinho > 0 && (
              <span className="bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">{totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}</span>
            )}
          </h2>
        </div>
        <CartContent 
          carrinho={carrinho}
          alterarQuantidade={alterarQuantidade}
          removerDoCarrinho={removerDoCarrinho}
          setItemEmEdicao={setItemEmEdicao}
          subtotal={subtotal}
          total={total}
          venda={venda}
          setVendaField={setVendaField}
          clientes={clientes}
          saving={saving}
          finalizarVenda={finalizarVenda}
          feeInfo={feeInfo}
        />
      </div>

      {/* BOTTOM BAR — MOBILE */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-[60] safe-area-bottom">
        <button
          onClick={() => setCartAberto(true)}
          className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
              {totalItensCarrinho > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {totalItensCarrinho > 99 ? '99+' : totalItensCarrinho}
                </span>
              )}
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">Carrinho</div>
              <div className="font-bold text-gray-800">{totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-green-600">{formatBRL(total)}</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </div>
        </button>
      </div>

      {/* CARRINHO — MOBILE DRAWER */}
      {cartAberto && (
        <div className="md:hidden fixed inset-0 z-[70] flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setCartAberto(false)} />
          <div className="bg-white rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">🛒 Carrinho</h2>
                {totalItensCarrinho > 0 && (
                  <span className="bg-brand-600 text-white text-xs px-2 py-0.5 rounded-full">{totalItensCarrinho}</span>
                )}
              </div>
              <button onClick={() => setCartAberto(false)} className="p-2 text-gray-400 hover:text-gray-600 active:bg-gray-200 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartContent 
                carrinho={carrinho}
                alterarQuantidade={alterarQuantidade}
                removerDoCarrinho={removerDoCarrinho}
                setItemEmEdicao={setItemEmEdicao}
                subtotal={subtotal}
                total={total}
                venda={venda}
                setVendaField={setVendaField}
                clientes={clientes}
                saving={saving}
                finalizarVenda={finalizarVenda}
                feeInfo={feeInfo}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DO ITEM */}
      {itemEmEdicao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-[80] p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-sm overflow-hidden animate-slide-up md:animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Editar Item</h3>
              <button onClick={() => setItemEmEdicao(null)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={salvarEdicaoItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <input 
                  type="text" 
                  disabled
                  value={itemEmEdicao.nome} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-500 cursor-not-allowed text-base" 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    required
                    value={itemEmEdicao.quantidade} 
                    onChange={e => setItemEmEdicao({ ...itemEmEdicao, quantidade: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Unitário (R$)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={itemEmEdicao.precoUnitarioVendido} 
                    onChange={e => setItemEmEdicao({ ...itemEmEdicao, precoUnitarioVendido: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-500 focus:outline-none text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setItemEmEdicao(null)} className="flex-1 md:flex-none px-5 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 md:flex-none bg-brand-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCANNER */}
      {scannerAberto && (
        <div className="fixed inset-0 bg-black z-[70] flex flex-col">
          <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
            <h3 className="font-bold">Escaneie o Código de Barras</h3>
            <button onClick={fecharScanner} className="text-white/70 hover:text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 relative bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-brand-400 rounded-lg opacity-70" />
            </div>
            <p className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm">
              Aponte a câmera para o código de barras
            </p>
          </div>
        </div>
      )}

      {/* AJUDA DE ATALHOS */}
      {ajudaAtalhos && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[70] p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-md p-6 animate-slide-up md:animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Atalhos do Teclado</h3>
              <button onClick={() => setAjudaAtalhos(false)} className="text-gray-400 hover:text-gray-600 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'F2', desc: 'Focar na busca de produtos' },
                { key: 'F8', desc: 'Finalizar venda' },
                { key: 'F1', desc: 'Abrir/fechar esta ajuda' },
                { key: 'Esc', desc: 'Fechar modal / limpar foco' },
              ].map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono font-bold text-gray-700 min-w-[3rem] text-center shadow-sm">{s.key}</kbd>
                  <span className="text-sm text-gray-600">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PÓS-VENDA */}
      {vendaFinalizada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-[90] p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-md overflow-hidden animate-slide-up md:animate-fade-in-up">
            <div className="px-6 py-4 bg-green-500 text-white text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="text-xl font-bold">Venda Finalizada!</h3>
              <p className="text-green-100 text-sm mt-1">{formatBRL(vendaFinalizada.total)} • {vendaFinalizada.formaPagamento}</p>
            </div>
            
            <div className="p-6 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-gray-700">Cliente: {vendaFinalizada.clienteNome}</p>
                {vendaFinalizada.itens.map((item, i) => (
                  <p key={i} className="text-gray-500">{item.quantidade}x {item.nome} — {formatBRL(item.precoUnitarioVendido * item.quantidade)}</p>
                ))}
              </div>

              {vendaFinalizada.clienteTelefone && (
                <button
                  onClick={async () => {
                    const fone = vendaFinalizada.clienteTelefone.replace(/\D/g, '');
                    try {
                      await fetchApi('/whatsapp/send-receipt', {
                        method: 'POST',
                        body: JSON.stringify({
                          phone: fone,
                          customerName: vendaFinalizada.clienteNome,
                          items: vendaFinalizada.itens,
                          total: vendaFinalizada.total,
                          paymentMethod: vendaFinalizada.formaPagamento,
                        }),
                      });
                      toast.success('Comprovante enviado!');
                    } catch {
                      const itensMsg = vendaFinalizada.itens.map(i => `  • ${i.quantidade}x ${i.nome} — ${formatBRL(i.precoUnitarioVendido * i.quantidade)}`).join('\n');
                      const msg = encodeURIComponent(
                        `🧾 *Comprovante de Venda*\n*Lance Pelo Zap*\n\nCliente: ${vendaFinalizada.clienteNome}\n\nItens:\n${itensMsg}\n\n💰 *Total: ${formatBRL(vendaFinalizada.total)}*\n💳 Pagamento: ${vendaFinalizada.formaPagamento}\n\nObrigado pela preferência! 🤝`
                      );
                      window.open(`https://wa.me/55${fone}?text=${msg}`, '_blank');
                    }
                  }}
                  className="w-full bg-green-500 text-white py-4 rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Enviar Comprovante via WhatsApp
                </button>
              )}

              <button
                onClick={() => setVendaFinalizada(null)}
                className="w-full border border-gray-300 text-gray-600 py-4 rounded-lg font-medium hover:bg-gray-50 transition active:scale-[0.98]"
              >
                Fechar e Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ===== COMPONENTE INTERNO: CONTEÚDO DO CARRINHO ===== */
interface CartContentProps {
  carrinho: CartItem[];
  alterarQuantidade: (id: string, delta: number) => void;
  removerDoCarrinho: (id: string) => void;
  setItemEmEdicao: (item: CartItem | null) => void;
  subtotal: number;
  total: number;
  venda: SaleDraft;
  setVendaField: (field: SaleDraftField, value: string | number | boolean) => void;
  clientes: Customer[];
  saving: boolean;
  finalizarVenda: () => Promise<void>;
  feeInfo: { taxaPercentual: number; taxaFixa: number; valorTaxa: number };
}

function CartContent({
  carrinho, alterarQuantidade, removerDoCarrinho, setItemEmEdicao,
  subtotal, total, venda, setVendaField, clientes,
  saving, finalizarVenda, feeInfo,
}: CartContentProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-2">
        {carrinho.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
            <svg className="w-16 h-16 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <p>Carrinho vazio</p>
            <p className="text-xs mt-1 text-gray-300">Toque nos produtos para adicionar</p>
          </div>
        ) : (
          carrinho.map(item => (
            <div key={item.productId} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2 active:bg-gray-50">
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-800 text-sm md:text-base leading-tight pr-2 flex-1">{item.nome}</span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setItemEmEdicao(item)} className="p-2 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => removerDoCarrinho(item.productId)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center bg-gray-100 rounded-xl">
                  <button onClick={() => alterarQuantidade(item.productId, -1)} className="px-4 py-2 hover:bg-gray-200 text-gray-700 rounded-l-xl transition-colors active:bg-gray-300 text-lg font-medium">−</button>
                  <span className="px-4 py-2 font-semibold bg-white min-w-[2.5rem] text-center text-base">{item.quantidade}</span>
                  <button onClick={() => alterarQuantidade(item.productId, 1)} className="px-4 py-2 hover:bg-gray-200 text-gray-700 rounded-r-xl transition-colors active:bg-gray-300 text-lg font-medium">+</button>
                </div>
                <span className="font-bold text-gray-800 text-base">{formatBRL(item.precoUnitarioVendido * item.quantidade)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ÁREA DE PAGAMENTO */}
      <div className="p-4 bg-white border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-gray-500 text-sm">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data da Venda</label>
          <input type="date" value={venda.dataVenda} onChange={e => setVendaField('dataVenda', e.target.value)}
            className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm" />
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Desconto (R$)</label>
            <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={venda.desconto === 0 ? '' : venda.desconto} onChange={e => setVendaField('desconto', e.target.value === '' ? 0 : Number(e.target.value))} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Acréscimo (R$)</label>
            <input type="number" min="0" step="0.01" placeholder="0,00" className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={venda.acrescimo === 0 ? '' : venda.acrescimo} onChange={e => setVendaField('acrescimo', e.target.value === '' ? 0 : Number(e.target.value))} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Pagamento</label>
            <select className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium" value={venda.formaPagamento} onChange={e => setVendaField('formaPagamento', e.target.value)}>
              <option value="PIX">Pix</option>
              <option value="CARTAO_CREDITO">Cartão Crédito</option>
              <option value="CARTAO_DEBITO">Cartão Débito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CREDIARIO">Crediário (A Prazo)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Vincular Cliente</label>
          <select className="w-full px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm" value={venda.clienteId} onChange={e => setVendaField('clienteId', e.target.value)}>
            <option value="">Consumidor Final</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
          </select>
        </div>

        {(venda.formaPagamento === 'CREDIARIO' || venda.formaPagamento === 'CARTAO_CREDITO') && (
          <div className="flex flex-col gap-2 p-3 bg-brand-50 border border-brand-100 rounded-lg">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-brand-700 mb-1">Sinal / Entrada (R$)</label>
                <input type="number" min="0" max={total} step="0.01" placeholder="0,00" className="w-full px-3 py-3 bg-white border border-brand-200 rounded-lg text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" value={venda.sinal === 0 ? '' : venda.sinal} onChange={e => setVendaField('sinal', e.target.value === '' ? 0 : Number(e.target.value))} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-brand-700 mb-1">Parcelas</label>
                <select className="w-full px-3 py-3 bg-white border border-brand-200 rounded-lg text-sm" value={venda.parcelas} onChange={e => setVendaField('parcelas', Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
            </div>
            <div className="text-xs text-brand-800 bg-brand-100 p-2 rounded flex justify-between font-medium mt-1">
              <span>Total: {formatBRL(total)}</span>
              {venda.formaPagamento === 'CREDIARIO' ? (
                <span>Fiado: R$ {Math.max(0, total - venda.sinal).toFixed(2)}</span>
              ) : (
                <span>Saldo no Cartão: R$ {Math.max(0, total - venda.sinal).toFixed(2)}</span>
              )}
            </div>
            <div className="text-xs text-gray-600 bg-white p-2 rounded border border-brand-100">
              {venda.parcelas > 1
                ? `${venda.parcelas}x de R$ ${Math.max(0, (total - venda.sinal) / venda.parcelas).toFixed(2)}${venda.sinal > 0 ? ` (+ R$ ${venda.sinal.toFixed(2)} de entrada)` : ''}`
                : venda.sinal > 0
                  ? `Entrada de R$ ${venda.sinal.toFixed(2)}, saldo restante R$ ${Math.max(0, total - venda.sinal).toFixed(2)}`
                  : 'Pagamento à vista'
              }
            </div>
          </div>
        )}

        {/* Exibição das taxas de gateway — calculadas reativamente
             quando o método de pagamento ou parcelas mudam */}
        {feeInfo.valorTaxa > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-orange-700 font-medium">Taxa ({venda.formaPagamento === 'CARTAO_CREDITO' ? `${venda.parcelas}x ` : ''}{feeInfo.taxaPercentual}%{feeInfo.taxaFixa > 0 ? ` + R$ ${feeInfo.taxaFixa.toFixed(2)}` : ''})</span>
              <span className="text-orange-600 font-semibold">{venda.repasseTaxa ? 'R$ 0,00' : `- R$ ${feeInfo.valorTaxa.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-orange-600">
              <span>{venda.repasseTaxa ? 'Taxa repassada ao cliente' : 'Valor líquido (após taxas)'}</span>
              <span className="font-bold">R$ {Math.max(0, total - (venda.repasseTaxa ? 0 : feeInfo.valorTaxa)).toFixed(2)}</span>
            </div>
            <label className="flex items-center gap-2 pt-2 border-t border-orange-200 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={venda.repasseTaxa} onChange={e => setVendaField('repasseTaxa', e.target.checked)} />
              Repassar taxa ao cliente (acrescentar ao total)
            </label>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-800">Total a Pagar</span>
          <span className="text-2xl md:text-3xl font-black text-green-600">{formatBRL(total)}</span>
        </div>

        <button 
          onClick={finalizarVenda}
          disabled={saving || carrinho.length === 0}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
            saving || carrinho.length === 0 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-xl'
          }`}
        >
          {saving ? 'Processando...' : '💰 Finalizar Venda'}
        </button>
      </div>
    </>
  );
}
