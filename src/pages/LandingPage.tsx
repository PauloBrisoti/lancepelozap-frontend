import { useState, useEffect } from 'react';
import { Link } from 'react-router';

const IconZap = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const features = [
  {
    icon: '💳',
    title: 'PDV Profissional',
    desc: 'Caixinha moderninha no celular ou desktop. Venda mais rápido com buscas instantâneas e aplicação automática de descontos.',
    color: 'bg-brand-50 text-brand-600',
  },
  {
    icon: '📦',
    title: 'Estoque Inteligente',
    desc: 'Acompanhe cada unidade em tempo real. Alertas de reposição, variações de produto e histórico de movimentação.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: '📊',
    title: 'Financeiro Completo',
    desc: 'DRE automatizado, fluxo de caixa diário e relatórios de lucro. Tudo pra você tomar decisões com dados.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: '🛍️',
    title: 'Catálogo Digital',
    desc: 'Uma vitrine profissional com link único pra compartilhar no WhatsApp. O cliente escolhe, o pedido chega no seu painel.',
    color: 'bg-teal-50 text-teal-600',
  },
  {
    icon: '👥',
    title: 'CRM de Clientes',
    desc: 'Histórico completo de compras, controle de crediário e fidelização. Nunca perca um cliente por falta de informação.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: '📱',
    title: 'Relatórios Práticos',
    desc: 'Exporte dados, acompanhe o fluxo e tenha todas as informações financeiras organizadas na palma da mão para decidir rápido.',
    color: 'bg-green-50 text-green-600',
  },
];

const testimonials = [
  {
    name: 'Andreza S.',
    role: 'Boutique de roupas — São Paulo',
    avatar: 'A',
    color: 'bg-pink-500',
    text: 'Antes eu anotava tudo no caderno. Hoje controlo estoque, vendas e cobranças pelo celular. Não consigo mais imaginar minha loja sem o Lance Pelo Zap.',
    stars: 5
  },
  {
    name: 'Marcos R.',
    role: 'Distribuidora de cosméticos — RJ',
    avatar: 'M',
    color: 'bg-brand-500',
    text: 'Em 3 meses, o controle de estoque eliminou R$4.000 em perdas por vencimento. O sistema se pagou na primeira semana.',
    stars: 5
  },
  {
    name: 'Juliana C.',
    role: 'Loja de calçados — Minas Gerais',
    avatar: 'J',
    color: 'bg-green-500',
    text: 'O catálogo digital mudou tudo. Mando o link no grupo do WhatsApp e as vendas chegam. Já tive dias de R$1.200 só pelo catálogo.',
    stars: 5
  }
];

const faqs = [
  {
    q: 'Preciso de computador para usar?',
    a: 'Não! O sistema funciona 100% pelo celular e tablet. PDV, estoque e relatórios na palma da mão.'
  },
  {
    q: 'Tem limite de produtos no catálogo?',
    a: 'Em todos os planos, não há limite de produtos. Apenas o plano PF (Finanças Pessoais) não inclui gestão de estoque.'
  },
  {
    q: 'Quanto tempo leva para configurar?',
    a: 'Em menos de 10 minutos sua loja está no ar. Importação de produtos por planilha Excel/CSV inclusa.'
  },
  {
    q: 'Posso ter mais de uma loja?',
    a: 'Sim! O plano VIP suporta múltiplas lojas ou filiais com o mesmo acesso. Ideal para redes e franquias.'
  },
  {
    q: 'Como funciona o período de teste?',
    a: '7 dias com acesso completo, sem precisar de cartão de crédito. Cancele quando quiser, sem burocracia.'
  }
];

const planos = [
  {
    categoria: 'PF',
    cor: 'bg-emerald-50 border-emerald-200',
    corBotao: 'bg-emerald-600 hover:bg-emerald-700',
    badge: 'INDIVIDUAL',
    plans: [
      {
        name: 'Finanças Pessoais',
        desc: 'Controle suas contas, cartões e metas financeiras',
        price: 'R$29,90',
        features: ['Controle de gastos pessoais', 'Metas de economia', 'Categorias inteligentes', 'Relatórios mensais', 'Dashboard financeiro PF']
      }
    ]
  },
  {
    categoria: 'PJ',
    cor: 'bg-brand-50 border-brand-200',
    corBotao: 'bg-brand-600 hover:bg-brand-700',
    badge: 'MAIS ESCOLHIDO',
    plans: [
      {
        name: 'Vendas + Estoque',
        desc: 'PDV, catálogo e estoque completo para sua loja',
        price: 'R$97,00',
        features: ['PDV profissional com busca rápida', 'Catálogo Digital com link WhatsApp', 'Gestão de Estoque + alertas', 'Emissão de relatórios', 'Clientes e crediário', 'Integração WhatsApp']
      },
      {
        name: 'Financeiro PJ',
        desc: 'Gestão financeira completa para empresas',
        price: 'R$147,00',
        features: ['Tudo do Vendas + Estoque', 'DRE completo (receitas, despesas)', 'Fluxo de caixa diário', 'Contas a pagar/receber', 'Conciliação bancária', 'Múltiplos vendedores']
      }
    ]
  },
  {
    categoria: 'EMPRESARIAL',
    cor: 'bg-purple-50 border-purple-200',
    corBotao: 'bg-purple-600 hover:bg-purple-700',
    badge: null,
    plans: [
      {
        name: 'Rede / Franquia',
        desc: 'Múltiplas lojas com dados consolidados',
        price: 'R$249,00',
        features: ['Tudo do Financeiro PJ', 'Múltiplas lojas/filiais', 'Dashboard consolidado', 'Relatórios gerenciais', 'Suporte prioritário', 'Gerente de sucesso']
      }
    ]
  }
];

function StarIcon() {
  return (
    <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [count, setCount] = useState({ lojas: 0, vendas: 0, produtos: 0 });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => ({
        lojas: prev.lojas < 2847 ? Math.min(prev.lojas + 47, 2847) : 2847,
        vendas: prev.vendas < 184000 ? Math.min(prev.vendas + 3100, 184000) : 184000,
        produtos: prev.produtos < 12 ? Math.min(prev.produtos + 1, 12) : 12,
      }));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-brand-500/30 overflow-x-hidden">

      {/* NAVBAR */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand-600/20">
                <IconZap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-brand-600">
                Lance Pelo Zap
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-brand-600 text-sm font-semibold transition-colors">Funcionalidades</a>
              <a href="#pricing" className="text-gray-600 hover:text-brand-600 text-sm font-semibold transition-colors">Planos</a>
              <a href="#depoimentos" className="text-gray-600 hover:text-brand-600 text-sm font-semibold transition-colors">Depoimentos</a>
              <a href="#faq" className="text-gray-600 hover:text-brand-600 text-sm font-semibold transition-colors">FAQ</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/login" className="text-gray-600 hover:text-brand-600 text-sm font-semibold transition-colors hidden sm:block">
                Entrar
              </Link>
              <Link to="/cadastro" className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20">
                Teste grátis →
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-20">

        {/* HERO */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-brand-100 blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-96 h-96 rounded-full bg-brand-50 blur-3xl opacity-50 pointer-events-none" />
          
          <div className="max-w-7xl mx-auto w-full relative z-10 text-center flex flex-col items-center">
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>
              7 dias de acesso completo grátis
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight mb-6 max-w-4xl mx-auto">
              O controle financeiro do seu negócio na <span className="text-brand-600">palma da mão</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium mb-10">
              Gerencie fluxo de caixa, DRE, estoque e vendas em um painel completo. Venda mais integrando seu catálogo ao WhatsApp.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20 w-full max-w-md mx-auto">
              <Link to="/cadastro" className="flex-1 bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/30">
                Começar grátis agora
                <span>→</span>
              </Link>
            </div>

            {/* Social proof numbers */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto w-full border-t border-gray-200 pt-10">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-black text-gray-900">{count.lojas.toLocaleString('pt-BR')}+</div>
                <div className="text-sm text-gray-500 mt-1 font-medium">Lojas ativas</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-3xl md:text-4xl font-black text-gray-900">R${(count.vendas / 1000).toFixed(0)}M+</div>
                <div className="text-sm text-gray-500 mt-1 font-medium">Vendas processadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-black text-gray-900">{count.produtos}+</div>
                <div className="text-sm text-gray-500 mt-1 font-medium">Estados atendidos</div>
              </div>
            </div>
            
          </div>
        </section>

        {/* LOGOS / TRUST BAR */}
        <section className="py-10 bg-white border-y border-gray-200 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">A plataforma preferida para negócios como</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 opacity-50">
              {['Moda & Vestuário', 'Calçados', 'Cosméticos', 'Eletrônicos', 'Alimentação', 'Pet Shop', 'Serviços'].map((s, i) => (
                <span key={i} className="text-gray-500 font-bold text-sm tracking-wide">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-24 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-600 text-sm font-bold uppercase tracking-widest mb-2 block">Funcionalidades</span>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900">Tudo integrado em um lugar só</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 ${feat.color}`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feat.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Comece a vender em 3 passos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gray-100 z-0" />
              {[
                { step: '1', title: 'Crie sua conta', desc: 'Cadastro simples e rápido. Sem necessidade de cartão.' },
                { step: '2', title: 'Monte seu catálogo', desc: 'Cadastre produtos ou importe planilhas instantaneamente.' },
                { step: '3', title: 'Compartilhe e venda', desc: 'Envie links pelo WhatsApp e acompanhe pedidos no painel.' }
              ].map((step, i) => (
                <div key={i} className="relative z-10 text-center bg-white px-4">
                  <div className="w-16 h-16 mx-auto bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-black mb-6 shadow-lg shadow-brand-600/30">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="depoimentos" className="py-24 px-4 bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Quem usa, aprova</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col shadow-sm">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => <StarIcon key={j} />)}
                  </div>
                  <p className="text-gray-700 leading-relaxed flex-1 text-base italic mb-8">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${t.color} rounded-full flex items-center justify-center text-white font-bold`}>{t.avatar}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        {/* PRICING */}
        <section id="pricing" className="py-24 px-4 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-600 text-sm font-bold uppercase tracking-widest mb-2 block">Investimento</span>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900">Escolha o plano ideal para o seu momento</h2>
              <p className="mt-4 text-lg text-gray-500">Do controle pessoal à gestão empresarial completa. Sem fidelidade.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              
              {/* PLANO PF */}
              <div className="bg-white rounded-3xl p-6 border-2 border-emerald-100 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider bg-emerald-50 text-emerald-700">PF</span>
                  <h3 className="text-xl font-black text-gray-900 mt-3">Finanças Pessoais</h3>
                  <p className="text-xs mt-1 text-gray-500">Controle contas e metas</p>
                </div>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-gray-900">R$29,90</span>
                  <span className="text-gray-500 text-xs">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">✓ Controle de gastos pessoais</li>
                  <li className="flex items-start gap-2">✓ Metas de economia</li>
                  <li className="flex items-start gap-2">✓ Categorias inteligentes</li>
                  <li className="flex items-start gap-2">✓ Dashboard financeiro PF</li>
                </ul>
                <Link to="/cadastro" className="block w-full py-3 px-4 rounded-xl text-center font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all text-sm">
                  Testar 7 dias grátis
                </Link>
              </div>

              {/* PLANO VENDAS + ESTOQUE */}
              <div className="bg-white rounded-3xl p-6 border-2 border-brand-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider bg-brand-50 text-brand-700">PJ INICIAL</span>
                  <h3 className="text-xl font-black text-gray-900 mt-3">Vendas + Estoque</h3>
                  <p className="text-xs mt-1 text-gray-500">PDV e catálogo para sua loja</p>
                </div>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-gray-900">R$97,00</span>
                  <span className="text-gray-500 text-xs">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">✓ PDV com busca rápida</li>
                  <li className="flex items-start gap-2">✓ Catálogo Digital</li>
                  <li className="flex items-start gap-2">✓ Gestão de Estoque + alertas</li>
                  <li className="flex items-start gap-2">✓ Clientes e crediário</li>
                </ul>
                <Link to="/cadastro" className="block w-full py-3 px-4 rounded-xl text-center font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all text-sm">
                  Testar 7 dias grátis
                </Link>
              </div>

              {/* PLANO FINANCEIRO PJ (DESTAQUE / MAIS ESCOLHIDO) */}
              <div className="bg-white rounded-3xl p-6 border-2 border-brand-600 relative flex flex-col shadow-lg">
                <div className="absolute -top-3 inset-x-0 flex justify-center">
                  <span className="bg-brand-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm">
                    Mais Escolhido
                  </span>
                </div>
                <div className="mb-4 mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider bg-brand-50 text-brand-700">PJ COMPLETO</span>
                  <h3 className="text-xl font-black text-gray-900 mt-3">Financeiro PJ</h3>
                  <p className="text-xs mt-1 text-gray-500">Gestão financeira total</p>
                </div>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-gray-900">R$147,00</span>
                  <span className="text-gray-500 text-xs">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">✓ Tudo do Vendas + Estoque</li>
                  <li className="flex items-start gap-2">✓ DRE completo (receitas/despesas)</li>
                  <li className="flex items-start gap-2">✓ Fluxo de caixa diário</li>
                  <li className="flex items-start gap-2">✓ Contas a pagar/receber</li>

                </ul>
                <Link to="/cadastro" className="block w-full py-3 px-4 rounded-xl text-center font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all text-sm shadow-md">
                  Testar 7 dias grátis
                </Link>
              </div>

              {/* PLANO EMPRESARIAL */}
              <div className="bg-white rounded-3xl p-6 border-2 border-purple-200 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider bg-purple-50 text-purple-700">EMPRESARIAL</span>
                  <h3 className="text-xl font-black text-gray-900 mt-3">Rede / Franquia</h3>
                  <p className="text-xs mt-1 text-gray-500">Múltiplas lojas consolidadas</p>
                </div>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-black text-gray-900">R$249,00</span>
                  <span className="text-gray-500 text-xs">/mês</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-700">
                  <li className="flex items-start gap-2">✓ Tudo do Financeiro PJ</li>
                  <li className="flex items-start gap-2">✓ Múltiplas lojas/filiais</li>
                  <li className="flex items-start gap-2">✓ Dashboard consolidado</li>
                  <li className="flex items-start gap-2">✓ Suporte prioritário</li>
                </ul>
                <Link to="/cadastro" className="block w-full py-3 px-4 rounded-xl text-center font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all text-sm">
                  Testar 7 dias grátis
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-4 bg-gray-50 border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-gray-900">Perguntas Frequentes</h2>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{faq.q}</span>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 px-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-brand-600 rounded-3xl p-12 md:p-16 shadow-xl shadow-brand-600/20">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                Pronto para assumir o controle financeiro do seu negócio?
              </h2>
              <p className="text-lg text-brand-100 mb-10 max-w-2xl mx-auto">
                Junte-se a lojistas que organizaram o caixa, eliminaram planilhas e escalaram a gestão com o Lance Pelo Zap.
              </p>
              <Link to="/cadastro" className="inline-block bg-white text-brand-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg">
                Criar conta gratuita
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-gray-800 pt-16 pb-8 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                  <IconZap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Lance Pelo Zap</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">Acelerando o varejo brasileiro com tecnologia acessível e descomplicada.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Produto</h4>
              <ul className="space-y-3">
                {['Funcionalidades', 'Preços', 'Catálogo Digital', 'PDV', 'Estoque'].map(item => (
                  <li key={item}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Empresa</h4>
              <ul className="space-y-3">
                {['Sobre nós', 'Blog', 'Parceiros', 'Contato'].map(item => (
                  <li key={item}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Legal</h4>
              <ul className="space-y-3">
                {['Termos de Uso', 'Política de Privacidade', 'LGPD'].map(item => (
                  <li key={item}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">© 2026 Lance Pelo Zap. Todos os direitos reservados.</p>
            <p className="text-gray-500 text-sm">Feito com ❤️ no Brasil</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
