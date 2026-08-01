import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface CatalogoProduct {
  id: string;
  nome: string;
  precoVendaSugerido: number;
  corHexadecimal?: string;
  descricaoVariante?: string;
  category?: { nome: string };
}

interface TenantInfo {
  id: string;
  nomeFantasia: string;
  telefoneWhatsapp: string | null;
  chavePix: string | null;
}

export function CatalogoPublicoPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [products, setProducts] = useState<CatalogoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/catalogo/${tenantId}`);
        if (!res.ok) throw new Error('Loja não encontrada');
        const data = await res.json();
        setTenant(data.tenant);
        setProducts(data.products);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar catálogo');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  const produtosFiltrados = products.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const abrirWhatsApp = (produto: CatalogoProduct) => {
    if (!tenant?.telefoneWhatsapp) {
      toast('Esta loja não cadastrou um número de WhatsApp.');
      return;
    }
    const fone = tenant.telefoneWhatsapp.replace(/\D/g, '');
    const preco = Number(produto.precoVendaSugerido).toFixed(2);
    const msg = encodeURIComponent(
      `Olá! 👋\nVi o produto *${produto.nome}* por *R$ ${preco}* no catálogo e tenho interesse!\nPoderia me dar mais informações?`
    );
    window.open(`https://wa.me/55${fone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Carregando catálogo...</div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">😔</div>
        <h1 className="text-2xl font-bold text-gray-800">Loja não encontrada</h1>
        <p className="text-gray-500">{error || 'O catálogo que você procura não está disponível.'}</p>
        <Link to="/" className="text-brand-600 hover:underline mt-4">Voltar ao início</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tenant.nomeFantasia}</h1>
            <p className="text-sm text-gray-500">Catálogo de Produtos</p>
          </div>
          {tenant.telefoneWhatsapp && (
            <a
              href={`https://wa.me/55${tenant.telefoneWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar com a Loja
            </a>
          )}
        </div>
      </header>

      {/* Barra de busca */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Buscar produto..."
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Grid de produtos */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {produtosFiltrados.map(prod => (
            <div key={prod.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div
                className="h-32 flex items-center justify-center text-white font-bold text-3xl"
                style={{ backgroundColor: prod.corHexadecimal || '#3B82F6' }}
              >
                {prod.nome.charAt(0).toUpperCase()}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 flex-1">{prod.nome}</h3>
                {prod.descricaoVariante && (
                  <p className="text-xs text-gray-500 mt-1">{prod.descricaoVariante}</p>
                )}
                {prod.category && (
                  <span className="text-xs text-gray-400 mt-1">{prod.category.nome}</span>
                )}
                <p className="text-lg font-bold text-green-600 mt-2">
                  R$ {Number(prod.precoVendaSugerido).toFixed(2)}
                </p>
                <button
                  onClick={() => abrirWhatsApp(prod)}
                  className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center justify-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Quero esse!
                </button>
              </div>
            </div>
          ))}
        </div>

        {produtosFiltrados.length === 0 && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">Catálogo digital por <a href="https://www.lancepelozap.com.br" className="text-brand-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">Lance Pelo Zap</a></p>
        </div>
      </footer>
    </div>
  );
}
