import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Banknote, CalendarCheck, Activity, PawPrint, Clock, MessageCircle, Trash2, Pencil, CheckCircle2, History, HandCoins, Syringe, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ServiceOrder, ServiceOrderItem } from '../types/api';

interface PetTutor {
  id: string; nome: string; telefone: string; email?: string;
  endereco?: string; bairro?: string; cidade?: string; cep?: string;
  observacoes?: string;
  _count?: { pets: number };
  pets?: Pet[];
}

interface Pet {
  id: string; nome: string; especie: string; raca?: string;
  porte?: string; sexo?: string; dataNascimento?: string; cor?: string;
  observacoes?: string; tutorId: string;
  adotado?: boolean; dataAdocao?: string;
  vaccines?: PetVaccine[];
  tutor?: { id: string; nome: string; telefone?: string };
}

interface PetVaccine {
  id: string; nome: string; tipo: string; dose?: string;
  dataAplicacao: string; proximaDose?: string; observacoes?: string;
}

interface PetWeight {
  id: string; pesoKg: number; dataPesagem: string; observacoes?: string;
}

interface PetServiceCatalog {
  id: string; nome: string; descricao?: string;
  preco: number; categoria?: string; tipoDuracao: string;
}

interface PetServiceOrderItem {
  id?: string; catalogItemId: string; quantidade: number;
  precoUnitario: number; valorTotal: number;
  catalog?: { id: string; nome: string };
}

interface PetServiceOrder {
  id: string; petId: string; status: string;
  dataEntrada: string; dataSaida?: string; horaInicio?: string; horaFim?: string;
  dataConclusao?: string; valorTotal: number; desconto: number;
  valorFinal: number; observacoes?: string; formaPagamento?: string;
  recorrente?: boolean; periodicidadeMeses?: number;
  pet: { id: string; nome: string; especie: string; tutor: { id: string; nome: string; telefone?: string } };
  items: PetServiceOrderItem[];
}

const STATUS_OS: Record<string, string> = {
  ORCAMENTO: 'Orçamento', AGENDADO: 'Agendado', EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};
const STATUS_CORES: Record<string, string> = {
  ORCAMENTO: 'bg-purple-100 text-purple-700', AGENDADO: 'bg-blue-100 text-blue-700', EM_ANDAMENTO: 'bg-amber-100 text-amber-700',
  CONCLUIDO: 'bg-emerald-100 text-emerald-700', CANCELADO: 'bg-red-100 text-red-700',
};

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGAMENTO_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO_CREDITO: 'Cartão de Crédito', CARTAO_DEBITO: 'Cartão de Débito', FIADO: 'Fiado', OUTRO: 'Outro',
};

export default function OperacionalPetPage() {
  const [activeTab, setActiveTab] = useState<'ORDENS' | 'AGENDA' | 'TUTORES' | 'CATALOGO'>('ORDENS');
  const [loading, setLoading] = useState(true);

  // Dados
  const [tutors, setTutors] = useState<PetTutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [catalog, setCatalog] = useState<PetServiceCatalog[]>([]);
  const [orders, setOrders] = useState<PetServiceOrder[]>([]);

  // Busca
  const [searchTutor, setSearchTutor] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [orcamentoSent, setOrcamentoSent] = useState<Set<string>>(new Set());

  // Modais
  const [modalTutor, setModalTutor] = useState(false);
  const [modalPet, setModalPet] = useState(false);
  const [modalOrder, setModalOrder] = useState(false);
  const [modalCatalog, setModalCatalog] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<PetTutor | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [tutorDetail, setTutorDetail] = useState<PetTutor | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<PetServiceCatalog | null>(null);
  const [receiveModal, setReceiveModal] = useState<PetServiceOrder | null>(null);
  const [receiveForm, setReceiveForm] = useState({ formaPagamento: 'DINHEIRO' });
  const [savingReceive, setSavingReceive] = useState(false);
  const [historyModal, setHistoryModal] = useState<Pet | null>(null);
  const [fichaTab, setFichaTab] = useState<'historico' | 'vacinas' | 'peso'>('historico');
  const [pesosPet, setPesosPet] = useState<PetWeight[]>([]);
  const [formVacina, setFormVacina] = useState({ nome: '', tipo: 'VACINA', dose: '', dataAplicacao: new Date().toISOString().slice(0, 10), proximaDose: '' });
  const [formPeso, setFormPeso] = useState({ pesoKg: '', dataPesagem: new Date().toISOString().slice(0, 10) });
  const [semanaInicio, setSemanaInicio] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  });

  // Formulários
  const [formTutor, setFormTutor] = useState({ nome: '', telefone: '', email: '', endereco: '', bairro: '', cidade: '', cep: '', observacoes: '' });
  const [formPet, setFormPet] = useState({ tutorId: '', nome: '', especie: 'CACHORRO', raca: '', porte: '', sexo: '', dataNascimento: '', cor: '', observacoes: '', pesoKg: '' });
  const [formCatalog, setFormCatalog] = useState({ nome: '', descricao: '', preco: '', categoria: 'BANHO', tipoDuracao: 'INDETERMINADO' });
  const [formOrder, setFormOrder] = useState<any>({ petId: '', dataEntrada: '', horaInicio: '', horaFim: '', dataSaida: '', items: [{ catalogItemId: '', quantidade: 1, precoUnitario: '' }], desconto: 0, observacoes: '', mesesRecorrencia: 1, recorrente: false });

  const carregarTudo = async () => {
    setLoading(true);
    try {
      const [t, p, c, o] = await Promise.all([
        fetchApi('/pet/tutors').catch(() => []),
        fetchApi('/pet/pets').catch(() => []),
        fetchApi('/pet/service-catalog').catch(() => []),
        fetchApi('/pet/service-orders').catch(() => []),
      ]);
      setTutors(t ?? []);
      setPets(p ?? []);
      setCatalog(c ?? []);
      setOrders(o ?? []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { carregarTudo(); }, []);

  // ── Tutor CRUD ──
  const salvarTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTutor) {
        await fetchApi(`/pet/tutors/${selectedTutor.id}`, { method: 'PUT', body: JSON.stringify(formTutor) });
        toast.success('Tutor atualizado!');
      } else {
        await fetchApi('/pet/tutors', { method: 'POST', body: JSON.stringify(formTutor) });
        toast.success('Tutor cadastrado!');
      }
      setModalTutor(false); setSelectedTutor(null);
      setFormTutor({ nome: '', telefone: '', email: '', endereco: '', bairro: '', cidade: '', cep: '', observacoes: '' });
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar tutor'); }
  };

  const excluirTutor = async (id: string) => {
    if (!window.confirm('Excluir este tutor e todos seus pets?')) return;
    try { await fetchApi(`/pet/tutors/${id}`, { method: 'DELETE' }); toast.success('Tutor excluído!'); carregarTudo(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const abrirEditarTutor = (t: PetTutor) => {
    setSelectedTutor(t);
    setFormTutor({ nome: t.nome, telefone: t.telefone || '', email: t.email || '', endereco: t.endereco || '', bairro: t.bairro || '', cidade: t.cidade || '', cep: t.cep || '', observacoes: t.observacoes || '' });
    setModalTutor(true);
  };

  // ── Pet CRUD ──
  const salvarPet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formPet, dataNascimento: formPet.dataNascimento || undefined };
      let petId = selectedPet?.id;
      if (selectedPet) {
        await fetchApi(`/pet/pets/${selectedPet.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Pet atualizado!');
      } else {
        const criado = await fetchApi('/pet/pets', { method: 'POST', body: JSON.stringify(payload) });
        petId = criado.id;
        toast.success('Pet cadastrado!');
      }
      if (petId && formPet.pesoKg) {
        try {
          await fetchApi('/pet/weights', { method: 'POST', body: JSON.stringify({ petId, pesoKg: Number(formPet.pesoKg) }) });
        } catch { /* peso é opcional */ }
      }
      setModalPet(false); setSelectedPet(null);
      setFormPet({ tutorId: '', nome: '', especie: 'CACHORRO', raca: '', porte: '', sexo: '', dataNascimento: '', cor: '', observacoes: '', pesoKg: '' });
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar pet'); }
  };

  const excluirPet = async (id: string) => {
    if (!window.confirm('Excluir este pet?')) return;
    try { await fetchApi(`/pet/pets/${id}`, { method: 'DELETE' }); toast.success('Pet excluído!'); carregarTudo(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const adotarPet = async (pet: Pet) => {
    if (!window.confirm(`Registrar adoção do ${pet.nome}? As OS agendadas do lar temporário serão canceladas e o encerramento entra no histórico.`)) return;
    try {
      await fetchApi(`/pet/pets/${pet.id}/adotar`, { method: 'POST' });
      toast.success(`${pet.nome} adotado! Lar temporário encerrado.`);
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao registrar adoção'); }
  };

  const abrirNovoPet = (tutorId: string) => {
    setSelectedPet(null);
    setFormPet({ ...formPet, tutorId });
    setModalPet(true);
  };

  const abrirEditarPet = (p: Pet) => {
    setSelectedPet(p);
    setFormPet({ tutorId: p.tutorId, nome: p.nome, especie: p.especie, raca: p.raca || '', porte: p.porte || '', sexo: p.sexo || '', dataNascimento: p.dataNascimento ? p.dataNascimento.split('T')[0] : '', cor: p.cor || '', observacoes: p.observacoes || '', pesoKg: '' });
    setModalPet(true);
  };

  // ── Catálogo CRUD ──
  const salvarCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formCatalog, preco: Number(formCatalog.preco) };
      if (selectedCatalog) {
        await fetchApi(`/pet/service-catalog/${selectedCatalog.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast.success('Serviço atualizado!');
      } else {
        await fetchApi('/pet/service-catalog', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Serviço cadastrado!');
      }
      setModalCatalog(false); setSelectedCatalog(null);
      setFormCatalog({ nome: '', descricao: '', preco: '', categoria: 'BANHO', tipoDuracao: 'INDETERMINADO' });
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar'); }
  };

  const abrirNovoCatalog = () => {
    setSelectedCatalog(null);
    setFormCatalog({ nome: '', descricao: '', preco: '', categoria: 'BANHO', tipoDuracao: 'INDETERMINADO' });
    setModalCatalog(true);
  };

  const abrirEditarCatalog = (c: PetServiceCatalog) => {
    setSelectedCatalog(c);
    setFormCatalog({ nome: c.nome, descricao: c.descricao || '', preco: String(c.preco), categoria: c.categoria || 'OUTRO', tipoDuracao: c.tipoDuracao || 'INDETERMINADO' });
    setModalCatalog(true);
  };

  // ── Ordem de Serviço ──
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };

  const abrirNovaOrdem = () => {
    const hoje = new Date().toISOString().slice(0, 16);
    setEditingOrderId(null);
    setFormOrder({ petId: '', dataEntrada: hoje, dataSaida: '', items: [{ catalogItemId: '', quantidade: 1, precoUnitario: '' }], desconto: 0, observacoes: '', mesesRecorrencia: 1, recorrente: false });
    setModalOrder(true);
  };

  const abrirEditarOrdem = (o: PetServiceOrder) => {
    setEditingOrderId(o.id);
    setFormOrder({
      petId: o.petId,
      dataEntrada: toLocalInput(o.dataEntrada),
      dataSaida: o.dataSaida ? toLocalInput(o.dataSaida) : '',
      items: o.items?.length ? o.items.map(i => ({ catalogItemId: i.catalogItemId, quantidade: i.quantidade, precoUnitario: String(i.precoUnitario) })) : [{ catalogItemId: '', quantidade: 1, precoUnitario: '' }],
      desconto: Number(o.desconto || 0),
      observacoes: o.observacoes || '',
      mesesRecorrencia: 1,
      recorrente: false,
    });
    setModalOrder(true);
  };

  // Auto-calcular diárias da hospedagem quando Check-in/Check-out mudam
  // (aplica ao item do catálogo do tipo DIARIA, onde quer que ele esteja)
  useEffect(() => {
    if (formOrder.dataEntrada && formOrder.dataSaida) {
      const checkIn = new Date(formOrder.dataEntrada);
      const checkOut = new Date(formOrder.dataSaida);
      if (checkIn && checkOut && checkOut > checkIn) {
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const diarias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        setFormOrder((prev: ServiceOrder) => {
          const items = [...prev.items];
          const idx = items.findIndex(it => catalog.find(c => c.id === it.catalogItemId)?.tipoDuracao === 'DIARIA');
          if (idx >= 0) items[idx] = { ...items[idx], quantidade: diarias };
          return { ...prev, items };
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOrder.dataEntrada, formOrder.dataSaida]);

  const addItemOrder = () => {
    setFormOrder({ ...formOrder, items: [...formOrder.items, { catalogItemId: '', quantidade: 1, precoUnitario: '' }] });
  };

  const updateOrderItem = (idx: number, field: string, value: any) => {
    const items = [...formOrder.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'catalogItemId') {
      const cat = catalog.find(c => c.id === value);
      if (cat) items[idx].precoUnitario = String(cat.preco);
    }
    setFormOrder({ ...formOrder, items });
  };

  const removeOrderItem = (idx: number) => {
    setFormOrder({ ...formOrder, items: formOrder.items.filter((_: ServiceOrderItem, i: number) => i !== idx) });
  };

  const valorTotalItems = formOrder.items.reduce((acc: number, item: ServiceOrderItem) => {
    return acc + (Number(item.precoUnitario || 0) * Number(item.quantidade || 0));
  }, 0);
  const valorFinal = Math.max(0, valorTotalItems - Number(formOrder.desconto || 0));

  const salvarOrdem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrderId) {
        await fetchApi(`/pet/service-orders/${editingOrderId}`, {
          method: 'PUT',
          body: JSON.stringify({
            dataSaida: formOrder.dataSaida || null,
            desconto: Number(formOrder.desconto),
            observacoes: formOrder.observacoes,
            items: formOrder.items.map((i: ServiceOrderItem) => ({ catalogItemId: i.catalogItemId, quantidade: Number(i.quantidade), precoUnitario: Number(i.precoUnitario) })),
          }),
        });
        toast.success('Ordem de serviço atualizada!');
      } else {
        await fetchApi('/pet/service-orders', {
          method: 'POST',
          body: JSON.stringify({
            ...formOrder,
            desconto: Number(formOrder.desconto),
            recorrente: Boolean(formOrder.recorrente),
            periodicidadeMeses: Number(formOrder.periodicidadeMeses) || 1,
            mesesRecorrencia: formOrder.recorrente ? 1 : (Number(formOrder.mesesRecorrencia) || 1),
            items: formOrder.items.map((i: ServiceOrderItem) => ({ catalogItemId: i.catalogItemId, quantidade: Number(i.quantidade), precoUnitario: Number(i.precoUnitario) })),
          }),
        });
        if (formOrder.recorrente) {
          toast.success('OS criada! A próxima cobrança será gerada automaticamente ao concluir.');
        } else {
          const qtd = Number(formOrder.mesesRecorrencia) || 1;
          toast.success(qtd > 1 ? `${qtd} ordens criadas (recorrência mensal)!` : 'Ordem de serviço criada!');
        }
      }
      setModalOrder(false);
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar ordem'); }
  };

  const gerarOrcamento = async () => {
    if (!formOrder.petId || formOrder.items.length === 0 || !formOrder.items[0].catalogItemId) {
      toast.error('Selecione o pet e ao menos um serviço');
      return;
    }
    const pet = pets.find(p => p.id === formOrder.petId);
    const tutor = tutors.find(t => t.id === pet?.tutorId);
    const waWindow = tutor?.telefone ? window.open('', '_blank') : null;
    try {
      const order = await fetchApi('/pet/service-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...formOrder,
          status: 'ORCAMENTO',
          desconto: Number(formOrder.desconto),
          items: formOrder.items.map((i: ServiceOrderItem) => ({ catalogItemId: i.catalogItemId, quantidade: Number(i.quantidade), precoUnitario: Number(i.precoUnitario) })),
        }),
      });
      toast.success('Orçamento gerado!');
      setModalOrder(false);
      carregarTudo();
      if (tutor?.telefone && waWindow) {
        const servicos = formOrder.items.map((i: ServiceOrderItem) => {
          const cat = catalog.find(c => c.id === i.catalogItemId);
          return `• ${cat?.nome || 'Serviço'}: ${formatBRL(Number(i.precoUnitario) * Number(i.quantidade))}`;
        }).join('\n');
        const msg = `🐾 ORÇAMENTO - ${pet?.nome || 'Pet'}\n\nServiços:\n${servicos}\n\nTotal: ${formatBRL(valorFinal)}\n\nAguardamos sua confirmação! 🐶`;
        waWindow.location.href = whatsappUrl(tutor.telefone, msg);
        setOrcamentoSent(prev => new Set(prev).add(order.id));
      } else if (!tutor?.telefone) {
        toast('Orçamento salvo, mas o tutor não tem telefone para WhatsApp');
      }
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao gerar orçamento'); }
  };

  const atualizarStatus = async (id: string, status: string, formaPagamento?: string) => {
    try {
      await fetchApi(`/pet/service-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(formaPagamento ? { formaPagamento } : {}) }),
      });
      toast.success(`Status atualizado para ${STATUS_OS[status] || status}`);
      carregarTudo();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao atualizar status'); }
  };

  const excluirOrdem = async (id: string) => {
    if (!window.confirm('Excluir esta ordem de serviço?')) return;
    try { await fetchApi(`/pet/service-orders/${id}`, { method: 'DELETE' }); toast.success('Ordem excluída!'); carregarTudo(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const confirmarRecebimento = async () => {
    if (!receiveModal) return;
    setSavingReceive(true);
    try {
      await atualizarStatus(receiveModal.id, 'CONCLUIDO', receiveForm.formaPagamento);
      setReceiveModal(null);
    } catch { /* toast exibido pelo atualizarStatus */ }
    finally { setSavingReceive(false); }
  };

  const historicoPet = (pet: Pet) => orders
    .filter(o => o.petId === pet.id)
    .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime());

  const totalGastoPet = (pet: Pet) => historicoPet(pet)
    .filter(o => o.status === 'CONCLUIDO')
    .reduce((acc, o) => acc + Number(o.valorFinal || 0), 0);

  const whatsappUrl = (telefone: string, msg: string) => {
    const num = telefone.replace(/\D/g, '');
    const finalNum = num.startsWith('55') ? num : `55${num}`;
    return `https://wa.me/${finalNum}?text=${encodeURIComponent(msg)}`;
  };

  // ── Filtros ──
  const tutoresFiltrados = useMemo(() => {
    const q = searchTutor.toLowerCase();
    return tutors.filter(t => t.nome.toLowerCase().includes(q) || t.telefone?.includes(q));
  }, [tutors, searchTutor]);

  const ordensFiltradas = useMemo(() => {
    let list = orders;
    if (filterStatus) list = list.filter(o => o.status === filterStatus);
    if (filterPeriod !== 'ALL') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filterPeriod === 'TODAY') {
        list = list.filter(o => new Date(o.dataEntrada) >= startOfDay);
      } else if (filterPeriod === 'WEEK') {
        const weekStart = new Date(startOfDay);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        list = list.filter(o => new Date(o.dataEntrada) >= weekStart);
      } else if (filterPeriod === 'MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        list = list.filter(o => new Date(o.dataEntrada) >= monthStart);
      }
    }
    if (searchOrder) {
      const q = searchOrder.toLowerCase();
      list = list.filter(o => o.pet.nome.toLowerCase().includes(q) || o.pet.tutor.nome.toLowerCase().includes(q));
    }
    return list;
  }, [orders, filterStatus, filterPeriod, searchOrder]);

  // ── KPIs ──
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const concluidasMes = orders.filter(o => o.status === 'CONCLUIDO' && new Date(o.dataEntrada) >= inicioMes);
  const faturamentoMes = concluidasMes.reduce((acc, o) => acc + Number(o.valorFinal || 0), 0);
  const ticketMedio = concluidasMes.length > 0 ? faturamentoMes / concluidasMes.length : 0;

  const agendadasHoje = orders.filter(o => {
    if (o.status === 'CANCELADO') return false;
    const d = new Date(o.dataEntrada);
    return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth() && d.getDate() === agora.getDate();
  });

  const emAndamento = orders.filter(o => o.status === 'EM_ANDAMENTO').length;

  const hospedadosAgora = orders.filter(o => {
    if (o.status === 'CONCLUIDO' || o.status === 'CANCELADO') return false;
    const entrada = new Date(o.dataEntrada).getTime();
    const saida = o.dataSaida ? new Date(o.dataSaida).getTime() : Infinity;
    return entrada <= agora.getTime() && saida > agora.getTime();
  }).length;

  const agendaHoje = [...agendadasHoje].sort((a, b) => new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime());

  const alertasPet = (pet: Pet) => {
    const alerts: string[] = [];
    if (pet.dataNascimento) {
      const idade = Math.floor((Date.now() - new Date(pet.dataNascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (idade > 7) alerts.push('Idoso');
    }
    if (pet.observacoes?.toLowerCase().includes('medicacao') || pet.observacoes?.toLowerCase().includes('medicação')) alerts.push('Medicação');
    if (pet.observacoes?.toLowerCase().includes('alergia') || pet.observacoes?.toLowerCase().includes('alérgico')) alerts.push('Alergia');
    (pet.vaccines || []).forEach(v => {
      if (!v.proximaDose) return;
      const dias = Math.ceil((new Date(v.proximaDose).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (dias < 0) alerts.push(v.tipo === 'VERMIFUGO' ? 'Vermífugo atrasado' : 'Vacina atrasada');
      else if (dias <= 7) alerts.push(v.tipo === 'VERMIFUGO' ? 'Vermífugo em breve' : 'Vacina em breve');
    });
    return alerts;
  };

  const abrirFicha = (pet: Pet) => {
    setHistoryModal(pet);
    setFichaTab('historico');
    setPesosPet([]);
    fetchApi(`/pet/weights?petId=${pet.id}`).then(w => setPesosPet(Array.isArray(w) ? w : [])).catch(() => setPesosPet([]));
  };

  const salvarVacina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModal) return;
    try {
      await fetchApi('/pet/vaccines', {
        method: 'POST',
        body: JSON.stringify({ ...formVacina, petId: historyModal.id, proximaDose: formVacina.proximaDose || null }),
      });
      toast.success('Registrado com sucesso!');
      setFormVacina({ nome: '', tipo: 'VACINA', dose: '', dataAplicacao: new Date().toISOString().slice(0, 10), proximaDose: '' });
      await carregarTudo();
      setHistoryModal(pets.find(p => p.id === historyModal.id) || historyModal);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao registrar'); }
  };

  const excluirVacina = async (id: string) => {
    if (!window.confirm('Excluir este registro?')) return;
    try { await fetchApi(`/pet/vaccines/${id}`, { method: 'DELETE' }); toast.success('Registro excluído!'); await carregarTudo(); if (historyModal) setHistoryModal(pets.find(p => p.id === historyModal.id) || historyModal); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const salvarPeso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyModal || !formPeso.pesoKg) return;
    try {
      await fetchApi('/pet/weights', {
        method: 'POST',
        body: JSON.stringify({ petId: historyModal.id, pesoKg: Number(formPeso.pesoKg), dataPesagem: formPeso.dataPesagem }),
      });
      toast.success('Peso registrado!');
      setFormPeso({ pesoKg: '', dataPesagem: new Date().toISOString().slice(0, 10) });
      const w = await fetchApi(`/pet/weights?petId=${historyModal.id}`);
      setPesosPet(Array.isArray(w) ? w : []);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao registrar peso'); }
  };

  const excluirPeso = async (id: string) => {
    if (!historyModal || !window.confirm('Excluir esta pesagem?')) return;
    try {
      await fetchApi(`/pet/weights/${id}`, { method: 'DELETE' });
      toast.success('Pesagem excluída!');
      const w = await fetchApi(`/pet/weights?petId=${historyModal.id}`);
      setPesosPet(Array.isArray(w) ? w : []);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const lembrarOrdem = async (id: string) => {
    try {
      await fetchApi(`/pet/service-orders/${id}/lembrar`, { method: 'POST' });
      toast.success('Lembrete enviado!');
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro ao enviar lembrete'); }
  };

  if (loading) return <div className="p-8 text-gray-500">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operacional Pet</h1>
          <p className="text-gray-500 mt-1">Gerencie tutores, pets e ordens de serviço</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'ORDENS' && (
            <button onClick={abrirNovaOrdem} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Nova OS
            </button>
          )}
          {activeTab === 'TUTORES' && (
            <button onClick={() => { setSelectedTutor(null); setFormTutor({ nome: '', telefone: '', email: '', endereco: '', bairro: '', cidade: '', cep: '', observacoes: '' }); setModalTutor(true); }}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Novo Tutor
            </button>
          )}
          {activeTab === 'CATALOGO' && (
            <button onClick={abrirNovoCatalog} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Novo Serviço
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-brand-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Faturamento do Mês</p>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">R$ {formatBRL(faturamentoMes)}</p>
          <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
            {concluidasMes.length} OS concluída(s) · ticket médio R$ {formatBRL(ticketMedio)}
          </p>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Agendadas Hoje</p>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-emerald-700 tracking-tight">{agendadasHoje.length}</p>
          <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Atendimentos com entrada marcada para hoje</p>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Em Andamento</p>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-amber-600 tracking-tight">{emAndamento}</p>
          <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Ordens de serviço em execução agora</p>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <PawPrint className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hospedados Agora</p>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-blue-600 tracking-tight">{hospedadosAgora}</p>
          <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">Pets com check-in ativo (hospedagem/diárias)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-lg">
        {(['ORDENS', 'AGENDA', 'TUTORES', 'CATALOGO'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${activeTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'ORDENS' ? 'Ordens' : tab === 'AGENDA' ? 'Agenda' : tab === 'TUTORES' ? 'Tutores & Pets' : 'Catálogo'}
          </button>
        ))}
      </div>

      {/* ────────────── TAB: ORDENS ────────────── */}
      {activeTab === 'ORDENS' && (
        <>
        {/* AGENDA DE HOJE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-brand-600" />
              </div>
              <h2 className="text-sm md:text-base font-bold text-gray-800">Agenda de Hoje</h2>
              <span className="text-xs text-gray-400">({agendaHoje.length} atendimento{agendaHoje.length !== 1 ? 's' : ''})</span>
            </div>
            <button onClick={abrirNovaOrdem} className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors">+ Nova OS</button>
          </div>
          {agendaHoje.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              Nenhum atendimento agendado para hoje.
              <button onClick={abrirNovaOrdem} className="block mx-auto mt-2 text-brand-600 hover:underline font-medium">Agendar agora</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {agendaHoje.map(o => {
                const hora = new Date(o.dataEntrada);
                const passou = hora < agora;
                return (
                  <button key={o.id} onClick={() => setSearchOrder(o.pet.nome)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="w-12 shrink-0">
                      <p className={`text-sm font-bold ${passou ? 'text-gray-400' : 'text-gray-900'}`}>
                        {hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {passou && <p className="text-[10px] text-gray-400">feito</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {o.pet.nome} <span className="text-gray-400 font-normal">• {o.pet.tutor.nome}</span>
                      </p>
                      <p className="text-xs text-gray-400 truncate">{o.items?.map(i => i.catalog?.nome).filter(Boolean).join(', ') || '-'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_OS[o.status] || o.status}
                    </span>
                    {o.recorrente && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-brand-100 text-brand-700">Recorrente</span>}
                    <span className="text-sm font-bold text-gray-900 shrink-0 w-20 text-right">{formatBRL(Number(o.valorFinal))}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3">
            <input type="text" placeholder="Buscar por pet ou tutor..." className="flex-1 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2"
              value={searchOrder} onChange={e => setSearchOrder(e.target.value)} />
            <select className="px-4 py-2 border rounded-lg text-sm bg-white outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_OS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-1">
              {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map(p => (
                <button key={p} onClick={() => setFilterPeriod(p)}
                  className={`text-xs px-2 py-1 rounded font-medium ${filterPeriod === p ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {p === 'ALL' ? 'Todas' : p === 'TODAY' ? 'Hoje' : p === 'WEEK' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
          {ordensFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">Nenhuma ordem de serviço encontrada.</p>
              <button onClick={abrirNovaOrdem} className="mt-3 text-sm font-bold text-brand-600 hover:underline">+ Criar nova OS</button>
            </div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-gray-500">
                  <th className="p-4 font-medium text-left">Pet / Tutor</th>
                  <th className="p-4 font-medium text-left">Data Entrada</th>
                  <th className="p-4 font-medium text-left">Serviços</th>
                  <th className="p-4 font-medium text-left">Status</th>
                  <th className="p-4 font-medium text-right">Valor</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {ordensFiltradas.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{o.pet.nome}</p>
                        <p className="text-xs text-gray-400">{o.pet.tutor.nome} {o.pet.tutor.telefone ? `• ${o.pet.tutor.telefone}` : ''}</p>
                      </td>
                      <td className="p-4 text-gray-600">{new Date(o.dataEntrada).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-gray-600 text-xs">{o.items?.map(i => i.catalog?.nome).filter(Boolean).join(', ') || '-'}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_OS[o.status] || o.status}</span>
                        {o.recorrente && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 font-medium">Recorrente</span>}
                        {orcamentoSent.has(o.id) && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Enviado</span>}
                      </td>
                      <td className="p-4 text-right font-semibold text-gray-900">{formatBRL(Number(o.valorFinal))}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {o.status === 'ORCAMENTO' && (
                            <button onClick={() => atualizarStatus(o.id, 'AGENDADO')} className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Aprovar
                            </button>
                          )}
                          {o.status === 'AGENDADO' && (
                            <button onClick={() => atualizarStatus(o.id, 'EM_ANDAMENTO')} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">Iniciar</button>
                          )}
                          {o.status === 'EM_ANDAMENTO' && (
                            <button onClick={() => { setReceiveForm({ formaPagamento: 'DINHEIRO' }); setReceiveModal(o); }} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium">Concluir</button>
                          )}
                          {['ORCAMENTO', 'AGENDADO', 'EM_ANDAMENTO'].includes(o.status) && (
                            <button onClick={() => abrirEditarOrdem(o)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium inline-flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Editar
                            </button>
                          )}
                          {(o.status === 'AGENDADO' || o.status === 'EM_ANDAMENTO') && (
                            <button onClick={() => atualizarStatus(o.id, 'CANCELADO')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium">Cancelar</button>
                          )}
                          {o.pet.tutor.telefone && (
                            <a href={whatsappUrl(o.pet.tutor.telefone, `Olá ${o.pet.tutor.nome}! Sobre a ordem de serviço do ${o.pet.nome} (${STATUS_OS[o.status]}):`)} target="_blank" rel="noopener noreferrer"
                              className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium inline-flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                          {o.status === 'AGENDADO' && (
                            <button onClick={() => lembrarOrdem(o.id)} title="Enviar lembrete automático" className="text-xs px-2 py-1 rounded bg-brand-100 text-brand-700 hover:bg-brand-200 font-medium inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Lembrar
                            </button>
                          )}
                          <button onClick={() => excluirOrdem(o.id)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 font-medium inline-flex items-center">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {ordensFiltradas.map(o => (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{o.pet.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{o.pet.tutor.nome} • {new Date(o.dataEntrada).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{o.items?.map(i => i.catalog?.nome).filter(Boolean).join(', ') || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_OS[o.status] || o.status}</span>
                        {o.recorrente && <span className="text-[10px] px-1.5 py-1 rounded bg-brand-100 text-brand-700 font-semibold">Recorrente</span>}
                      </div>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatBRL(Number(o.valorFinal))}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {o.status === 'ORCAMENTO' && (
                      <button onClick={() => atualizarStatus(o.id, 'AGENDADO')} className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aprovar
                      </button>
                    )}
                    {o.status === 'AGENDADO' && (
                      <button onClick={() => atualizarStatus(o.id, 'EM_ANDAMENTO')} className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 font-medium">Iniciar</button>
                    )}
                    {o.status === 'EM_ANDAMENTO' && (
                      <button onClick={() => { setReceiveForm({ formaPagamento: 'DINHEIRO' }); setReceiveModal(o); }} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">Concluir</button>
                    )}
                    {['ORCAMENTO', 'AGENDADO', 'EM_ANDAMENTO'].includes(o.status) && (
                      <button onClick={() => abrirEditarOrdem(o)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium inline-flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    )}
                    {(o.status === 'AGENDADO' || o.status === 'EM_ANDAMENTO') && (
                      <button onClick={() => atualizarStatus(o.id, 'CANCELADO')} className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-medium">Cancelar</button>
                    )}
                    {o.status === 'AGENDADO' && (
                      <button onClick={() => lembrarOrdem(o.id)} className="text-xs px-2.5 py-1 rounded-lg bg-brand-100 text-brand-700 font-medium inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Lembrar
                      </button>
                    )}
                    {o.pet.tutor.telefone && (
                      <a href={whatsappUrl(o.pet.tutor.telefone, `Olá ${o.pet.tutor.nome}! Sobre a ordem de serviço do ${o.pet.nome} (${STATUS_OS[o.status]}):`)} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium inline-flex items-center">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => excluirOrdem(o.id)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 font-medium inline-flex items-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
        </>
      )}

      {/* ────────────── TAB: AGENDA (semanal) ────────────── */}
      {activeTab === 'AGENDA' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h2 className="font-bold text-gray-900">Agenda Semanal</h2>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setSemanaInicio(prev => new Date(prev.getTime() - 7 * 86400000))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Semana anterior">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                setSemanaInicio(d);
              }} className="px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg">Hoje</button>
              <button onClick={() => setSemanaInicio(prev => new Date(prev.getTime() + 7 * 86400000))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Próxima semana">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-3 md:p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">
              {(() => {
                const fim = new Date(semanaInicio);
                fim.setDate(fim.getDate() + 6);
                const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
                const anoIni = semanaInicio.getFullYear();
                const anoFim = fim.getFullYear();
                return `${fmt(semanaInicio)}${anoIni !== anoFim ? ' ' + anoIni : ''} – ${fmt(fim)}${anoFim !== anoIni ? ' ' + anoFim : ''}`;
              })()}
            </p>
            <div className="hidden md:grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const dia = new Date(semanaInicio);
                dia.setDate(dia.getDate() + i);
                const ordensDia = ordensFiltradas.filter(o => {
                  const d = new Date(o.dataEntrada);
                  return d.getFullYear() === dia.getFullYear() && d.getMonth() === dia.getMonth() && d.getDate() === dia.getDate();
                });
                const hoje = new Date().toDateString() === dia.toDateString();
                return (
                  <div key={i} className={`rounded-xl border ${hoje ? 'border-brand-300 bg-brand-50/50' : 'border-gray-100'} min-h-[180px] flex flex-col`}>
                    <div className={`px-3 py-2 border-b border-gray-50 ${hoje ? 'bg-brand-50' : ''}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wide ${hoje ? 'text-brand-700' : 'text-gray-500'}`}>{dia.toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                      <p className={`text-lg font-extrabold ${hoje ? 'text-brand-700' : 'text-gray-900'}`}>{dia.getDate()}</p>
                    </div>
                    <div className="p-1.5 space-y-1 flex-1 overflow-hidden">
                      {ordensDia.length === 0 && <p className="text-[11px] text-gray-300 text-center py-4">—</p>}
                      {ordensDia.slice(0, 6).map(o => (
                        <button key={o.id} onClick={() => { setActiveTab('ORDENS'); setSearchOrder(o.pet.nome); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-gray-800 truncate">{o.horaInicio ? `${o.horaInicio} · ` : ''}{o.pet.nome}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_OS[o.status] || o.status}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{o.items?.map(it => it.catalog?.nome).filter(Boolean).join(', ') || '—'}</p>
                        </button>
                      ))}
                      {ordensDia.length > 6 && <p className="text-[10px] text-gray-400 px-2">+{ordensDia.length - 6} mais</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="md:hidden space-y-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const dia = new Date(semanaInicio);
                dia.setDate(dia.getDate() + i);
                const ordensDia = ordensFiltradas.filter(o => {
                  const d = new Date(o.dataEntrada);
                  return d.getFullYear() === dia.getFullYear() && d.getMonth() === dia.getMonth() && d.getDate() === dia.getDate();
                });
                const hoje = new Date().toDateString() === dia.toDateString();
                return (
                  <div key={i} className={`rounded-xl border p-3 ${hoje ? 'border-brand-300 bg-brand-50/50' : 'border-gray-100'}`}>
                    <p className={`text-xs font-bold ${hoje ? 'text-brand-700' : 'text-gray-700'}`}>
                      {dia.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="mt-2 space-y-1">
                      {ordensDia.length === 0 && <p className="text-xs text-gray-300">Nada agendado</p>}
                      {ordensDia.map(o => (
                        <button key={o.id} onClick={() => { setActiveTab('ORDENS'); setSearchOrder(o.pet.nome); }}
                          className="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-50 hover:bg-brand-50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{o.horaInicio ? `${o.horaInicio} · ` : ''}{o.pet.nome}</p>
                            <p className="text-[11px] text-gray-400 truncate">{o.items?.map(it => it.catalog?.nome).filter(Boolean).join(', ') || '—'}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_OS[o.status] || o.status}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ────────────── TAB: TUTORES & PETS ────────────── */}
      {activeTab === 'TUTORES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <input type="text" placeholder="Buscar tutor por nome ou telefone..." className="w-full px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2"
                value={searchTutor} onChange={e => setSearchTutor(e.target.value)} />
            </div>
            {tutoresFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum tutor encontrado.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tutoresFiltrados.map(t => (
                  <div key={t.id}>
                    <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setTutorDetail(tutorDetail?.id === t.id ? null : t)}>
                      <div>
                        <p className="font-medium text-gray-900">{t.nome}</p>
                        <p className="text-xs text-gray-400">{t.telefone} {t.email ? `• ${t.email}` : ''}</p>
                        <p className="text-xs text-gray-400">{t._count?.pets || t.pets?.length || 0} pet(s)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); abrirEditarTutor(t); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">Editar</button>
                        <button onClick={(e) => { e.stopPropagation(); excluirTutor(t.id); }} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium">Excluir</button>
                        {t.telefone && (
                          <a href={whatsappUrl(t.telefone, `Olá ${t.nome}!`)} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-medium">📱 WhatsApp</a>
                        )}
                      </div>
                    </div>
                    {tutorDetail?.id === t.id && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 text-sm">
                          {t.endereco && <div><span className="text-gray-400">Endereço:</span> <span className="text-gray-700">{t.endereco}</span></div>}
                          {t.bairro && <div><span className="text-gray-400">Bairro:</span> <span className="text-gray-700">{t.bairro}</span></div>}
                          {t.cidade && <div><span className="text-gray-400">Cidade:</span> <span className="text-gray-700">{t.cidade}</span></div>}
                          {t.cep && <div><span className="text-gray-400">CEP:</span> <span className="text-gray-700">{t.cep}</span></div>}
                          {t.observacoes && <div className="col-span-full"><span className="text-gray-400">Obs:</span> <span className="text-gray-700">{t.observacoes}</span></div>}
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-sm text-gray-700">Pets</h4>
                            <button onClick={() => abrirNovoPet(t.id)} className="text-xs px-3 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg font-medium">+ Adicionar Pet</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(t.pets || pets.filter(p => p.tutorId === t.id)).map(pet => {
                              const alerts = alertasPet(pet);
                              return (
                                <div key={pet.id} className="bg-white rounded-xl p-3 border border-gray-200 flex justify-between items-start">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900">{pet.nome} <span className="text-xs text-gray-400">({pet.especie}{pet.raca ? ` • ${pet.raca}` : ''})</span>
                                      {pet.adotado && (
                                        <span className="ml-1.5 align-middle text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                          Adotado {pet.dataAdocao ? new Date(pet.dataAdocao).toLocaleDateString('pt-BR') : ''}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400">{pet.porte ? `${pet.porte} • ` : ''}{pet.sexo}{pet.cor ? ` • ${pet.cor}` : ''}</p>
                                    {alerts.length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        {alerts.map(a => <span key={a} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">{a}</span>)}
                                      </div>
                                    )}
                                    <p className="text-[11px] text-gray-500 mt-1.5">
                                      {historicoPet(pet).length} visita(s) · total {formatBRL(totalGastoPet(pet))}
                                    </p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    {!pet.adotado && (
                                      <button onClick={() => adotarPet(pet)} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-medium" title="Registrar adoção e encerrar lar temporário">
                                        Adotar
                                      </button>
                                    )}
                                    <button onClick={() => abrirFicha(pet)} className="text-xs px-2 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded font-medium inline-flex items-center gap-1">
                                      <History className="w-3 h-3" /> Ficha
                                    </button>
                                    <button onClick={() => abrirEditarPet(pet)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-medium">Editar</button>
                                    <button onClick={() => excluirPet(pet.id)} className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium inline-flex items-center">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────── TAB: CATÁLOGO ────────────── */}
      {activeTab === 'CATALOGO' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-gray-500">
                <th className="p-4 font-medium text-left">Serviço</th>
                <th className="p-4 font-medium text-left">Categoria</th>
                <th className="p-4 font-medium text-left">Duração</th>
                <th className="p-4 font-medium text-right">Preço</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {catalog.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{c.nome}</p>
                      {c.descricao && <p className="text-xs text-gray-400">{c.descricao}</p>}
                    </td>
                    <td className="p-4 text-gray-600">{c.categoria || '-'}</td>
                    <td className="p-4 text-gray-600">{c.tipoDuracao === 'DIARIA' ? 'Por Diária' : c.tipoDuracao === 'HORA' ? 'Por Hora' : c.tipoDuracao === 'FIXO' ? 'Valor Fixo' : c.tipoDuracao === 'MENSAL' ? 'Mensal' : c.tipoDuracao === 'SEMANAL' ? 'Semanal' : 'Indeterminado'}</td>
                    <td className="p-4 text-right font-semibold text-gray-900">{formatBRL(Number(c.preco))}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => abrirEditarCatalog(c)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded font-medium inline-flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={async () => { if (window.confirm(`Excluir "${c.nome}"?`)) { try { await fetchApi(`/pet/service-catalog/${c.id}`, { method: 'DELETE' }); toast.success('Serviço excluído!'); carregarTudo(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erro desconhecido'); } } }}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium inline-flex items-center">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {catalog.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center">
                    <p className="text-gray-400 text-sm">Nenhum serviço no catálogo.</p>
                    <button onClick={abrirNovoCatalog} className="mt-3 text-sm font-bold text-brand-600 hover:underline">+ Cadastrar primeiro serviço</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL TUTOR ─── */}
      {modalTutor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedTutor ? 'Editar Tutor' : 'Novo Tutor'}</h2>
            <form onSubmit={salvarTutor} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.nome} onChange={e => setFormTutor({...formTutor, nome: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.telefone} onChange={e => setFormTutor({...formTutor, telefone: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.email} onChange={e => setFormTutor({...formTutor, email: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.endereco} onChange={e => setFormTutor({...formTutor, endereco: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.bairro} onChange={e => setFormTutor({...formTutor, bairro: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.cidade} onChange={e => setFormTutor({...formTutor, cidade: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">CEP</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.cep} onChange={e => setFormTutor({...formTutor, cep: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formTutor.observacoes} onChange={e => setFormTutor({...formTutor, observacoes: e.target.value})} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalTutor(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL PET ─── */}
      {modalPet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{selectedPet ? 'Editar Pet' : 'Novo Pet'}</h2>
            <form onSubmit={salvarPet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutor</label>
                <select required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formPet.tutorId} onChange={e => setFormPet({...formPet, tutorId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {tutors.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.nome} onChange={e => setFormPet({...formPet, nome: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Espécie *</label>
                  <select required className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formPet.especie} onChange={e => setFormPet({...formPet, especie: e.target.value})}>
                    <option value="CACHORRO">Cachorro</option><option value="GATO">Gato</option><option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Raça</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.raca} onChange={e => setFormPet({...formPet, raca: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Porte</label>
                  <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formPet.porte} onChange={e => setFormPet({...formPet, porte: e.target.value})}>
                    <option value="">Selecione...</option><option value="PEQUENO">Pequeno</option><option value="MEDIO">Médio</option><option value="GRANDE">Grande</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formPet.sexo} onChange={e => setFormPet({...formPet, sexo: e.target.value})}>
                    <option value="">Selecione...</option><option value="MACHO">Macho</option><option value="FEMEA">Fêmea</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cor</label><input type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.cor} onChange={e => setFormPet({...formPet, cor: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label><input type="date" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.dataNascimento} onChange={e => setFormPet({...formPet, dataNascimento: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Peso atual (kg)</label><input type="number" step="0.01" min="0.1" placeholder="Opcional" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.pesoKg} onChange={e => setFormPet({...formPet, pesoKg: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formPet.observacoes} onChange={e => setFormPet({...formPet, observacoes: e.target.value})} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalPet(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL CATÁLOGO ─── */}
      {modalCatalog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{selectedCatalog ? 'Editar Serviço' : 'Novo Serviço'}</h2>
            <form onSubmit={salvarCatalog} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required type="text" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formCatalog.nome} onChange={e => setFormCatalog({...formCatalog, nome: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label><textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formCatalog.descricao} onChange={e => setFormCatalog({...formCatalog, descricao: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label><input required type="number" step="0.01" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formCatalog.preco} onChange={e => setFormCatalog({...formCatalog, preco: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formCatalog.categoria} onChange={e => setFormCatalog({...formCatalog, categoria: e.target.value})}>
                    <option value="BANHO">Banho</option><option value="TOSA">Tosa</option><option value="BANHO_E_TOSA">Banho & Tosa</option><option value="HOSPEDAGEM">Hospedagem</option><option value="VETERINARIO">Veterinário</option><option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Duração</label>
                <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={formCatalog.tipoDuracao} onChange={e => setFormCatalog({...formCatalog, tipoDuracao: e.target.value})}>
                  <option value="INDETERMINADO">Indeterminado</option><option value="FIXO">Valor Fixo</option><option value="DIARIA">Por Diária</option><option value="HORA">Por Hora</option><option value="SEMANAL">Semanal</option><option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCatalog(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-md">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL ORDEM DE SERVIÇO ─── */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-xl font-bold">{editingOrderId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h2>
              <button type="button" onClick={() => setModalOrder(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={salvarOrdem} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto flex-1 min-h-0 space-y-4 px-0">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Pet *</label>
                  <select required disabled={!!editingOrderId} className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white ${editingOrderId ? 'bg-gray-50 text-gray-500' : ''}`} value={formOrder.petId} onChange={e => setFormOrder({...formOrder, petId: e.target.value})}>
                    <option value="">Selecione o pet...</option>
                    {pets.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.especie}) - {p.tutor?.nome || 'Sem tutor'}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-in *</label><input required type="datetime-local" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formOrder.dataEntrada} onChange={e => setFormOrder({...formOrder, dataEntrada: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label><input type="datetime-local" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formOrder.dataSaida} onChange={e => setFormOrder({...formOrder, dataSaida: e.target.value})} /></div>
                </div>
                {formOrder.dataEntrada && formOrder.dataSaida && new Date(formOrder.dataSaida) > new Date(formOrder.dataEntrada) && (
                  <p className="text-xs text-brand-600 font-medium">
                    {(() => {
                      const dias = Math.max(1, Math.ceil((new Date(formOrder.dataSaida).getTime() - new Date(formOrder.dataEntrada).getTime()) / (1000 * 60 * 60 * 24)));
                      const hosp = formOrder.items.find((it: ServiceOrderItem) => catalog.find(c => c.id === it.catalogItemId)?.tipoDuracao === 'DIARIA');
                      const preco = hosp?.precoUnitario ? Number(hosp.precoUnitario) : null;
                      return preco ? `${dias} diária(s) × ${formatBRL(preco)} = ${formatBRL(dias * preco)} — quantidade auto-preenchida na hospedagem` : `${dias} diária(s)`;
                    })()}
                  </p>
                )}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Itens *</label>
                    <button type="button" onClick={addItemOrder} className="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Adicionar Item</button>
                  </div>
                  {formOrder.items.map((item: ServiceOrderItem, idx: number) => (
                    <div key={idx} className="flex gap-2 mb-2 items-start">
                      <div className="flex-1">
                        <select required className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={item.catalogItemId} onChange={e => updateOrderItem(idx, 'catalogItemId', e.target.value)}>
                          <option value="">Selecione...</option>
                          {catalog.map(c => <option key={c.id} value={c.id}>{c.nome} - {formatBRL(Number(c.preco))}</option>)}
                        </select>
                      </div>
                      <div className="w-20"><input type="number" min="1" step="1" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2" value={item.quantidade} onChange={e => updateOrderItem(idx, 'quantidade', e.target.value)} /></div>
                      <button type="button" onClick={() => removeOrderItem(idx)} className="text-red-400 hover:text-red-600 pt-2 text-sm font-bold">✕</button>
                    </div>
                  ))}
                </div>
                {formOrder.items.some((item: ServiceOrderItem) => {
                  const tipo = catalog.find(c => c.id === item.catalogItemId)?.tipoDuracao;
                  return tipo && tipo !== 'DIARIA';
                }) && !editingOrderId && (
                  <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                    <p className="text-sm font-medium text-brand-800 mb-2">Serviço recorrente — cobrança mensal</p>
                    <div className="flex gap-2 mb-3">
                      {['continuo', 'meses'].map(opcao => (
                        <button
                          key={opcao}
                          type="button"
                          onClick={() => setFormOrder({ ...formOrder, recorrente: opcao === 'continuo' })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${(opcao === 'continuo' ? formOrder.recorrente : !formOrder.recorrente) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'}`}
                        >
                          {opcao === 'continuo' ? 'Contínuo (até cancelar)' : 'Por meses'}
                        </button>
                      ))}
                    </div>
                    {formOrder.recorrente ? (
                      <p className="text-xs text-gray-600">Ao concluir cada mês, o sistema gera a próxima OS automaticamente (indicada como <strong>Recorrente</strong>). Para encerrar: cancele a OS agendada do mês seguinte.</p>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-gray-600">Serão criadas ordens agendadas mensalmente (1 por mês), a partir do check-in. Cada mês você executa e recebe normalmente.</p>
                        <div className="w-24 shrink-0">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Meses</label>
                          <input type="number" min="1" max="24" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2" value={formOrder.mesesRecorrencia} onChange={e => setFormOrder({ ...formOrder, mesesRecorrencia: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Desconto (R$)</label><input type="number" step="0.01" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formOrder.desconto} onChange={e => setFormOrder({...formOrder, desconto: e.target.value})} /></div>
                  <div className="flex items-end pb-2">
                    <p className="text-sm font-bold text-gray-900">Total: {formatBRL(valorFinal)}</p>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Observações</label><textarea rows={2} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2" value={formOrder.observacoes} onChange={e => setFormOrder({...formOrder, observacoes: e.target.value})} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4 shrink-0">
                <button type="button" onClick={() => setModalOrder(false)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                {!editingOrderId && (
                  <button type="button" onClick={gerarOrcamento} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md">Gerar Orçamento</button>
                )}
                <button type="submit" className={`flex-1 py-2 text-white font-bold rounded-lg shadow-md ${editingOrderId ? 'bg-brand-600 hover:bg-brand-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {editingOrderId ? 'Salvar Alterações' : 'Criar Ordem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── MODAL RECEBIMENTO ─── */}
      {receiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-emerald-600" /> Concluir e Receber
            </h2>
            <div className="space-y-3 mb-5">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Pet / Tutor</p>
                <p className="font-semibold text-gray-900 mt-0.5">{receiveModal.pet.nome} • {receiveModal.pet.tutor.nome}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Valor Final</p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">{formatBRL(Number(receiveModal.valorFinal))}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-purple-100 text-purple-700">{STATUS_OS[receiveModal.status] || receiveModal.status}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 bg-white" value={receiveForm.formaPagamento} onChange={e => setReceiveForm({ formaPagamento: e.target.value })}>
                {Object.entries(PAGAMENTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-5">
              <button type="button" onClick={() => setReceiveModal(null)} className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button type="button" onClick={confirmarRecebimento} disabled={savingReceive}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50">
                {savingReceive ? 'Salvando...' : 'Confirmar Recebimento'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Fiado cria um título a receber no Financeiro; demais formas geram receita no caixa (carteira padrão)
            </p>
          </div>
        </div>
      )}

      {/* ─── MODAL HISTÓRICO DO PET ─── */}
      {historyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold">{historyModal.nome}</h2>
                <p className="text-xs text-gray-400">{historyModal.especie}{historyModal.raca ? ` • ${historyModal.raca}` : ''} • {historyModal.tutor?.nome || 'Sem tutor'}</p>
              </div>
              <button type="button" onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 shrink-0">
              {([
                ['historico', 'Histórico', History],
                ['vacinas', 'Vacinas & Vermífugos', Syringe],
                ['peso', 'Peso', Scale],
              ] as const).map(([tab, label, Icon]) => (
                <button key={tab} type="button" onClick={() => setFichaTab(tab)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-colors inline-flex items-center justify-center gap-1 ${fichaTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            {fichaTab === 'historico' && (() => {
              const hist = historicoPet(historyModal);
              const concluidas = hist.filter(o => o.status === 'CONCLUIDO');
              return (
                <>
                  <div className="flex gap-2 mb-4 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">{hist.length} visita(s)</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{formatBRL(totalGastoPet(historyModal))} em {concluidas.length} concluída(s)</span>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-gray-50">
                    {hist.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">Nenhuma ordem de serviço para este pet ainda.</p>
                    )}
                    {hist.map(o => (
                      <div key={o.id} className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(o.dataEntrada).toLocaleDateString('pt-BR')}
                            <span className="text-gray-400 font-normal"> • {o.items?.map(i => i.catalog?.nome).filter(Boolean).join(', ') || '-'}</span>
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${STATUS_CORES[o.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_OS[o.status] || o.status}</span>
                          {o.recorrente && <span className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 bg-brand-100 text-brand-700">Recorrente</span>}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">{o.observacoes || ''}</p>
                          <p className="text-sm font-bold text-gray-900">{formatBRL(Number(o.valorFinal))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
            {fichaTab === 'vacinas' && (
              <div className="overflow-y-auto flex-1 min-h-0">
                <form onSubmit={salvarVacina} className="bg-brand-50/60 border border-brand-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-brand-800 mb-2">Novo registro</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><input required placeholder="Nome (ex.: V8, V10, Vermífugo)" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formVacina.nome} onChange={e => setFormVacina({ ...formVacina, nome: e.target.value })} /></div>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formVacina.tipo} onChange={e => setFormVacina({ ...formVacina, tipo: e.target.value })}>
                      <option value="VACINA">Vacina</option><option value="VERMIFUGO">Vermífugo</option>
                    </select>
                    <input placeholder="Dose (ex.: 2ª dose)" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formVacina.dose} onChange={e => setFormVacina({ ...formVacina, dose: e.target.value })} />
                    <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Data aplicação *</label><input required type="date" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formVacina.dataAplicacao} onChange={e => setFormVacina({ ...formVacina, dataAplicacao: e.target.value })} /></div>
                    <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Próxima dose</label><input type="date" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formVacina.proximaDose} onChange={e => setFormVacina({ ...formVacina, proximaDose: e.target.value })} /></div>
                  </div>
                  <button type="submit" className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg">Salvar</button>
                </form>
                {(historyModal.vaccines || []).length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">Nenhuma vacina ou vermífugo registrado.</p>
                )}
                <div className="divide-y divide-gray-50">
                  {(historyModal.vaccines || []).map(v => {
                    const atrasada = v.proximaDose && new Date(v.proximaDose) < new Date();
                    return (
                      <div key={v.id} className="py-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{v.nome}
                            <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle ${v.tipo === 'VERMIFUGO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{v.tipo === 'VERMIFUGO' ? 'Vermífugo' : 'Vacina'}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {v.dose ? `${v.dose} • ` : ''}Aplicada em {new Date(v.dataAplicacao).toLocaleDateString('pt-BR')}
                            {v.proximaDose && (
                              <span className={atrasada ? ' text-red-600 font-semibold' : ''}> • Próxima: {new Date(v.proximaDose).toLocaleDateString('pt-BR')}{atrasada ? ' (atrasada)' : ''}</span>
                            )}
                          </p>
                        </div>
                        <button onClick={() => excluirVacina(v.id)} className="text-red-400 hover:text-red-600 shrink-0 pt-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {fichaTab === 'peso' && (
              <div className="overflow-y-auto flex-1 min-h-0">
                <form onSubmit={salvarPeso} className="bg-brand-50/60 border border-brand-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-brand-800 mb-2">Nova pesagem</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><input required type="number" step="0.01" min="0.1" placeholder="Peso (kg)" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formPeso.pesoKg} onChange={e => setFormPeso({ ...formPeso, pesoKg: e.target.value })} /></div>
                    <div><input required type="date" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 bg-white" value={formPeso.dataPesagem} onChange={e => setFormPeso({ ...formPeso, dataPesagem: e.target.value })} /></div>
                  </div>
                  <button type="submit" className="mt-2 w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg">Salvar</button>
                </form>
                {pesosPet.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">Nenhuma pesagem registrada.</p>
                )}
                <div className="divide-y divide-gray-50">
                  {pesosPet.map((w, idx) => {
                    const anterior = pesosPet[idx + 1];
                    const diff = anterior ? Number(w.pesoKg) - Number(anterior.pesoKg) : null;
                    return (
                      <div key={w.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{Number(w.pesoKg).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg</p>
                          <p className="text-xs text-gray-400">{new Date(w.dataPesagem).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {diff !== null && diff !== 0 && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${diff > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                            </span>
                          )}
                          <button onClick={() => excluirPeso(w.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
