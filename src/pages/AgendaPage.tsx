import { useState } from 'react';
import { fetchApi } from '../lib/api';
import { todayLocalDate, formatBRL } from '../utils/format';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../utils/domainMaps';
import { formatDateBR, TZ_BR } from '../lib/dates';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { StatusActions } from '../components/StatusActions';
import { useApiQuery, STALE_TIMES } from '../lib/query';

interface Customer { id: string; nomeCompleto: string; telefoneWhatsapp: string; }
interface Professional { id: string; nome: string; cor: string; telefone?: string; cargo?: string; ativo: boolean; }

interface Appointment {
  id: string; data: string; duracaoMinutos: number;
  servico: string; observacoes: string; status: string; valorCobrado: number;
  customer: Customer | null; professional: { id: string; nome: string; cor: string } | null;
}


const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 to 18:00

export function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(() => todayLocalDate());
  const [filterProf, setFilterProf] = useState('');

  const [modal, setModal] = useState<'criar' | 'detalhe' | 'profissionais' | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    customerId: '', professionalId: '', servico: '', observacoes: '',
    data: '', hora: '', duracaoMinutos: 60, valorCobrado: '',
  });

  // Professional form
  const [profForm, setProfForm] = useState({ nome: '', telefone: '', cor: '#6366f1', cargo: '' });
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  const params = new URLSearchParams({ data: currentDate });
  if (filterProf) params.set('professionalId', filterProf);

  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useApiQuery<Appointment[]>(
    ['agenda', 'appointments', currentDate, filterProf],
    `/appointments?${params}`,
    { staleTime: STALE_TIMES.FREQUENT }
  );

  const { data: customers = [], isLoading: customersLoading } = useApiQuery<Customer[]>(
    ['agenda', 'customers'],
    '/customers',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const { data: professionals = [], isLoading: professionalsLoading, refetch: refetchProfessionals } = useApiQuery<Professional[]>(
    ['agenda', 'professionals'],
    '/appointments/professionals',
    { staleTime: STALE_TIMES.NORMAL }
  );

  const loading = appointmentsLoading || customersLoading || professionalsLoading;

  const openCreate = (hora?: string) => {
    setForm({
      customerId: '', professionalId: filterProf, servico: '', observacoes: '',
      data: currentDate, hora: hora || '', duracaoMinutos: 60, valorCobrado: '',
    });
    setModal('criar');
  };

  const openDetail = async (id: string) => {
    try {
      const data = await fetchApi(`/appointments/${id}`);
      setSelected(data);
      setModal('detalhe');
    } catch { toast.error('Erro ao carregar'); }
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.data || !form.hora) { toast.error('Cliente, data e hora obrigatórios'); return; }
    const dataStr = `${form.data}T${form.hora}:00`;
    try {
      const res = await fetchApi('/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...form, data: dataStr, valorCobrado: Number(form.valorCobrado || 0) }),
      });
      toast.success(`Agendamento criado para ${res.customer?.nomeCompleto || ''}`);
      setModal(null);
      await refetchAppointments();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const transition = async (id: string, action: string) => {
    try {
      await fetchApi(`/appointments/${id}/${action}`, { method: 'POST' });
      toast.success('Status atualizado!');
      setModal(null);
      await refetchAppointments();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const saveProfessional = async () => {
    if (!profForm.nome) { toast.error('Nome obrigatório'); return; }
    try {
      if (editingProf) {
        await fetchApi(`/appointments/professionals/${editingProf.id}`, { method: 'PUT', body: JSON.stringify(profForm) });
        toast.success('Profissional atualizado');
      } else {
        await fetchApi('/appointments/professionals', { method: 'POST', body: JSON.stringify(profForm) });
        toast.success('Profissional criado');
      }
      setProfForm({ nome: '', telefone: '', cor: '#6366f1', cargo: '' });
      setEditingProf(null);
      refetchProfessionals();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro'); }
  };

  const getAppointmentsForHour = (hour: number) =>
    appointments.filter(a => {
      const h = new Date(a.data).getHours();
      return h === hour;
    });

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit' });

  const changeDay = (delta: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(todayLocalDate(d));
  };

  const today = todayLocalDate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie agendamentos de serviços e horários.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingProf(null); setProfForm({ nome: '', telefone: '', cor: '#6366f1', cargo: '' }); setModal('profissionais'); }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition text-sm">
            Profissionais
          </button>
          <button onClick={() => openCreate()} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition shadow-sm">
            + Novo Agendamento
          </button>
        </div>
      </div>

      {/* Date & Filter bar */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDay(-1)} className="text-gray-500 hover:text-gray-700 p-1">&larr;</button>
          <button onClick={() => setCurrentDate(today)} className={`text-sm font-medium px-3 py-1 rounded-lg ${currentDate === today ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}>Hoje</button>
          <button onClick={() => changeDay(1)} className="text-gray-500 hover:text-gray-700 p-1">&rarr;</button>
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
        </div>
        <div className="flex gap-2 items-center">
          <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            value={filterProf} onChange={e => setFilterProf(e.target.value)}>
            <option value="">Todos profissionais</option>
            {professionals.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {HOURS.map(hour => {
              const apts = getAppointmentsForHour(hour);
              const isPast = new Date(`${currentDate}T${String(hour).padStart(2, '0')}:00`) < new Date() && currentDate === today;
              return (
                <div key={hour} className={`flex min-h-[72px] ${isPast ? 'opacity-40' : ''}`}>
                  <div className="w-20 shrink-0 text-right pr-4 py-3 text-sm text-gray-400 font-medium border-r border-gray-100">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 py-1 px-3 space-y-1 relative">
                    {apts.length === 0 && (
                      <button onClick={() => openCreate(`${String(hour).padStart(2, '0')}:00`)}
                        className="w-full h-full min-h-[56px] text-xs text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded transition-colors">
                        + Clique para agendar
                      </button>
                    )}
                    {apts.map(apt => (
                      <div key={apt.id} onClick={() => openDetail(apt.id)}
                        className="p-2 rounded-lg cursor-pointer border-l-4 hover:shadow-sm transition-shadow"
                        style={{ borderLeftColor: apt.professional?.cor || '#6366f1', backgroundColor: (apt.professional?.cor || '#6366f1') + '15' }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{apt.customer?.nomeCompleto || '-'}</p>
                            <p className="text-xs text-gray-500">{formatTime(apt.data)} ({apt.duracaoMinutos}min) {apt.servico && `- ${apt.servico}`}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${APPOINTMENT_STATUS_COLORS[apt.status] || ''}`}>
                            {APPOINTMENT_STATUS_LABELS[apt.status] || apt.status}
                          </span>
                        </div>
                        {apt.professional && <p className="text-xs text-gray-400 mt-0.5">{apt.professional.nome}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Create */}
      <Modal
        open={modal === 'criar'}
        onClose={() => setModal(null)}
        size="md"
        rounded="xl" padded={false}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold">Novo Agendamento</h3>
          <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
              <option value="">— Selecionar —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.nomeCompleto}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário *</label>
              <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={form.duracaoMinutos} onChange={e => setForm({ ...form, duracaoMinutos: Number(e.target.value) })} min={15} step={15} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor R$</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={form.valorCobrado} onChange={e => setForm({ ...form, valorCobrado: e.target.value })} min={0} step={0.01} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profissional</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={form.professionalId} onChange={e => setForm({ ...form, professionalId: e.target.value })}>
              <option value="">— Não atribuído —</option>
              {professionals.filter(p => p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={() => setModal(null)} className="px-5 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancelar</button>
          <button onClick={handleCreate} className="px-5 py-2 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700">Criar</button>
        </div>
      </Modal>

      {/* MODAL: Detail */}
      {modal === 'detalhe' && selected && (
        <Modal
          open={modal === 'detalhe' && !!selected}
          onClose={() => setModal(null)}
          size="md"
          rounded="xl" padded={false}
        >
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-bold">Detalhes do Agendamento</h3>
            <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${APPOINTMENT_STATUS_COLORS[selected.status] || ''}`}>
                  {APPOINTMENT_STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              {selected.valorCobrado > 0 && <p className="text-xl font-bold">{formatBRL(selected.valorCobrado)}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              <div><span className="text-xs text-gray-500">Cliente</span><p className="font-medium">{selected.customer?.nomeCompleto || '-'}</p></div>
              <div><span className="text-xs text-gray-500">WhatsApp</span><p className="font-medium">{selected.customer?.telefoneWhatsapp || '-'}</p></div>
              <div><span className="text-xs text-gray-500">Data</span><p className="font-medium">{formatDateBR(selected.data)}</p></div>
              <div><span className="text-xs text-gray-500">Horário</span><p className="font-medium">{formatTime(selected.data)} ({selected.duracaoMinutos}min)</p></div>
              <div><span className="text-xs text-gray-500">Profissional</span><p className="font-medium">{selected.professional?.nome || '-'}</p></div>
              <div><span className="text-xs text-gray-500">Serviço</span><p className="font-medium">{selected.servico || '-'}</p></div>
            </div>

            {selected.observacoes && <div><span className="text-xs text-gray-500">Observações</span><p className="text-gray-600 mt-1">{selected.observacoes}</p></div>}

            <StatusActions
              status={selected.status}
              actions={[
                { when: 'AGENDADO', label: 'Confirmar', color: 'green', onClick: () => transition(selected.id, 'confirm') },
                { when: ['AGENDADO', 'CONFIRMADO'], label: 'Iniciar', color: 'yellow', onClick: () => transition(selected.id, 'start') },
                { when: ['AGENDADO', 'CONFIRMADO'], label: 'Não Compareceu', color: 'orange', onClick: () => transition(selected.id, 'no-show') },
                { when: 'EM_ANDAMENTO', label: 'Concluir', color: 'green', onClick: () => transition(selected.id, 'complete') },
              ]}
              cancel={{ label: 'Cancelar', hideFor: ['CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'], onClick: () => transition(selected.id, 'cancel') }}
            />
          </div>
        </Modal>
      )}

      {/* MODAL: Professionals */}
      <Modal
        open={modal === 'profissionais'}
        onClose={() => setModal(null)}
        rounded="xl" maxHeight="80vh" padded={false}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0">
          <h3 className="text-lg font-bold">Profissionais</h3>
          <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">{editingProf ? 'Editar' : 'Novo'} Profissional</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Nome *</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={profForm.nome} onChange={e => setProfForm({ ...profForm, nome: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Telefone</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={profForm.telefone} onChange={e => setProfForm({ ...profForm, telefone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cor (calendário)</label>
                <input type="color" className="w-full h-9 border border-gray-300 rounded-lg px-1 focus:ring-2 focus:ring-brand-500"
                  value={profForm.cor} onChange={e => setProfForm({ ...profForm, cor: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cargo</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={profForm.cargo} onChange={e => setProfForm({ ...profForm, cargo: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveProfessional} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
                {editingProf ? 'Atualizar' : 'Adicionar'}
              </button>
              {editingProf && (
                <button onClick={() => { setEditingProf(null); setProfForm({ nome: '', telefone: '', cor: '#6366f1', cargo: '' }); }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">Cancelar</button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {professionals.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.cor || '#6366f1' }} />
                  <div>
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs text-gray-500">{p.cargo || p.telefone || '-'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingProf(p); setProfForm({ nome: p.nome, telefone: p.telefone || '', cor: p.cor || '#6366f1', cargo: p.cargo || '' }); }}
                    className="text-xs text-brand-600 hover:underline">Editar</button>
                  <button onClick={async () => {
                    await fetchApi(`/appointments/professionals/${p.id}`, { method: 'PUT', body: JSON.stringify({ ativo: !p.ativo }) });
                    refetchProfessionals();
                  }} className="text-xs text-gray-500 hover:underline">{p.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button onClick={async () => {
                    if (!confirm(`Excluir ${p.nome}?`)) return;
                    await fetchApi(`/appointments/professionals/${p.id}`, { method: 'DELETE' });
                    refetchProfessionals();
                  }} className="text-xs text-red-600 hover:underline">Excluir</button>
                </div>
              </div>
            ))}
            {professionals.length === 0 && <p className="text-gray-400 text-center py-4 text-sm">Nenhum profissional cadastrado</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
