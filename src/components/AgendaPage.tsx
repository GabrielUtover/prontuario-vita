import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './AgendaPage.css'

const PROCEDIMENTOS = [
  { id: 'consulta_presencial', label: 'Consulta presencial' },
  { id: 'consulta_online', label: 'Consulta online' }
] as const

const DIAS_SEMANA = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' }
] as const

interface Paciente {
  id: string
  nome: string
  telefone: string | null
  [key: string]: unknown
}

interface AgendaItem {
  id: string
  paciente_id: string
  data_agenda: string
  horario: string | null
  periodo_dia: 'manha' | 'tarde'
  procedimento: 'consulta_presencial' | 'consulta_online'
  observacao: string | null
  confirmado_recepcao: boolean
  created_at: string
  paciente?: Paciente
}

interface AgendaAbertura {
  id: string
  data_inicio: string
  data_fim: string
  seg: boolean
  ter: boolean
  qua: boolean
  qui: boolean
  sex: boolean
  sab: boolean
  dom: boolean
  manha_ativo: boolean
  manha_inicio: string | null
  manha_fim: string | null
  manha_pausa_inicio: string | null
  manha_pausa_fim: string | null
  tarde_ativo: boolean
  tarde_inicio: string | null
  tarde_fim: string | null
  tarde_pausa_inicio: string | null
  tarde_pausa_fim: string | null
  created_at: string
}

const getHojeISO = () => new Date().toISOString().slice(0, 10)

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (t: string | null) => {
  if (!t) return '—'
  const part = String(t).slice(0, 5)
  return part
}

const getMonthBounds = (year: number, month: number) => {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return {
    first: first.toISOString().slice(0, 10),
    last: last.toISOString().slice(0, 10)
  }
}

const getProcedimentoLabel = (id: string) => PROCEDIMENTOS.find(p => p.id === id)?.label ?? id

export function AgendaPage() {
  const { usuario } = useAuth()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [agendaMes, setAgendaMes] = useState<AgendaItem[]>([])
  const [agendaDiaSelecionado, setAgendaDiaSelecionado] = useState<AgendaItem[]>([])
  const [aberturas, setAberturas] = useState<AgendaAbertura[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDia, setLoadingDia] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAbrirModal, setShowAbrirModal] = useState(false)
  const [showAgendarModal, setShowAgendarModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadAberturas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agenda_abertura')
        .select('*')
        .order('data_inicio', { ascending: false })
      if (error) throw error
      setAberturas((data ?? []) as AgendaAbertura[])
    } catch (err) {
      console.error('Erro ao carregar aberturas:', err)
      setAberturas([])
    }
  }, [])

  const loadAgendaMes = useCallback(async () => {
    setLoading(true)
    const { first, last } = getMonthBounds(year, month)
    try {
      const { data, error } = await supabase
        .from('agenda_dia')
        .select(`
          id, paciente_id, data_agenda, horario, periodo_dia, procedimento, observacao, confirmado_recepcao, created_at,
          paciente:pacientes(id, nome, telefone)
        `)
        .gte('data_agenda', first)
        .lte('data_agenda', last)
        .order('data_agenda')
        .order('horario')
      if (error) throw error
      setAgendaMes((data || []) as AgendaItem[])
    } catch (err) {
      console.error('Erro ao carregar agenda do mês:', err)
      setAgendaMes([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  const loadAgendaDia = useCallback(async (dataISO: string) => {
    setLoadingDia(true)
    try {
      const { data, error } = await supabase
        .from('agenda_dia')
        .select(`
          id, paciente_id, data_agenda, horario, periodo_dia, procedimento, observacao, confirmado_recepcao, created_at,
          paciente:pacientes(id, nome, telefone)
        `)
        .eq('data_agenda', dataISO)
        .order('horario')
      if (error) throw error
      setAgendaDiaSelecionado((data || []) as AgendaItem[])
    } catch (err) {
      console.error('Erro ao carregar dia:', err)
      setAgendaDiaSelecionado([])
    } finally {
      setLoadingDia(false)
    }
  }, [])

  const loadPacientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, telefone')
        .eq('status', 'ativo')
        .order('nome')
      if (error) throw error
      setPacientes((data ?? []) as Paciente[])
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
      setPacientes([])
    }
  }, [])

  useEffect(() => {
    loadAgendaMes()
  }, [loadAgendaMes])

  useEffect(() => {
    loadAberturas()
  }, [loadAberturas])

  useEffect(() => {
    if (selectedDate) loadAgendaDia(selectedDate)
  }, [selectedDate, loadAgendaDia])

  useEffect(() => {
    if (showAgendarModal) loadPacientes()
  }, [showAgendarModal, loadPacientes])

  const countByDay = (dataISO: string) => {
    const items = agendaMes.filter(a => a.data_agenda === dataISO)
    const manha = items.filter(a => a.periodo_dia === 'manha').length
    const tarde = items.filter(a => a.periodo_dia === 'tarde').length
    return { manha, tarde, total: items.length }
  }

  const calendarDays = (() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startPad = first.getDay()
    const daysInMonth = last.getDate()
    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7
    const days: { date: Date; iso: string; isCurrentMonth: boolean; dayNum: number }[] = []
    const start = new Date(first)
    start.setDate(start.getDate() - startPad)
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      days.push({
        date: d,
        iso,
        isCurrentMonth: d.getMonth() === month,
        dayNum: d.getDate()
      })
    }
    return days
  })()

  const selectedDayCount = selectedDate ? countByDay(selectedDate) : null
  const manhaCount = selectedDayCount?.manha ?? 0
  const tardeCount = selectedDayCount?.tarde ?? 0
  const totalCount = selectedDayCount?.total ?? 0

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const goPrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1))
  const goNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1))
  const goHoje = () => {
    const hoje = new Date()
    setCurrentDate(hoje)
    setSelectedDate(getHojeISO())
  }

  return (
    <div className="agenda-page">
      <header className="agenda-header">
        <div className="agenda-header-content">
          <h1 className="agenda-title">Agenda</h1>
          <p className="agenda-subtitle">Agendamento de consultas com o profissional</p>
        </div>
        <div className="agenda-header-actions">
          <button type="button" className="agenda-btn-abrir" onClick={() => setShowAbrirModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Abrir agenda
          </button>
          <Link to="/home" className="agenda-btn-voltar">Voltar ao menu</Link>
        </div>
      </header>

      <div className="agenda-layout">
        <section className="agenda-calendar-section">
          <div className="agenda-calendar-nav">
            <button type="button" className="agenda-nav-btn" onClick={goPrevMonth} aria-label="Mês anterior">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            <h2 className="agenda-calendar-month">{monthName}</h2>
            <button type="button" className="agenda-nav-btn" onClick={goNextMonth} aria-label="Próximo mês">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>
          <button type="button" className="agenda-btn-hoje" onClick={goHoje}>Hoje</button>

          <div className="agenda-calendar-weekdays">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} className="agenda-weekday">{d}</span>
            ))}
          </div>

          {loading ? (
            <div className="agenda-loading">Carregando calendário...</div>
          ) : (
            <div className="agenda-calendar-grid">
              {calendarDays.map(({ date, iso, isCurrentMonth, dayNum }) => {
                const { manha, tarde, total } = countByDay(iso)
                const isSelected = selectedDate === iso
                const isHoje = iso === getHojeISO()
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`agenda-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isHoje ? 'hoje' : ''}`}
                    onClick={() => setSelectedDate(iso)}
                  >
                    <span className="agenda-day-num">{dayNum}</span>
                    {total > 0 && (
                      <span className="agenda-day-badge" title={`Manhã: ${manha} | Tarde: ${tarde}`}>
                        {total}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="agenda-detail-panel">
          <div className="agenda-detail-header">
            <h3>{selectedDate ? formatDate(selectedDate) : 'Selecione um dia'}</h3>
            {selectedDate && (
              <button
                type="button"
                className="agenda-btn-agendar"
                onClick={() => setShowAgendarModal(true)}
              >
                + Agendar
              </button>
            )}
          </div>

          {!selectedDate ? (
            <p className="agenda-detail-empty">Clique em um dia no calendário para ver os agendamentos.</p>
          ) : loadingDia ? (
            <div className="agenda-loading">Carregando...</div>
          ) : (
            <>
              <div className="agenda-resumo-dia">
                <div className="agenda-resumo-item manha">
                  <span className="agenda-resumo-label">Manhã</span>
                  <span className="agenda-resumo-valor">{manhaCount}</span>
                </div>
                <div className="agenda-resumo-item tarde">
                  <span className="agenda-resumo-label">Tarde</span>
                  <span className="agenda-resumo-valor">{tardeCount}</span>
                </div>
                <div className="agenda-resumo-item total">
                  <span className="agenda-resumo-label">Total do dia</span>
                  <span className="agenda-resumo-valor">{totalCount}</span>
                </div>
              </div>

              <ul className="agenda-list">
                {agendaDiaSelecionado.length === 0 ? (
                  <li className="agenda-list-empty">Nenhum agendamento neste dia.</li>
                ) : (
                  agendaDiaSelecionado
                    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
                    .map(item => (
                      <li key={item.id} className="agenda-list-item">
                        <div className="agenda-item-main">
                          <span className="agenda-item-hora">{formatTime(item.horario)}</span>
                          <span className="agenda-item-paciente">{item.paciente?.nome ?? '—'}</span>
                          <span className={`agenda-item-procedimento ${item.procedimento}`}>
                            {getProcedimentoLabel(item.procedimento)}
                          </span>
                        </div>
                        {item.observacao && (
                          <p className="agenda-item-obs">{item.observacao}</p>
                        )}
                        <div className="agenda-item-actions">
                          <Link
                            to={`/prontuarios/paciente/${item.paciente_id}`}
                            className="agenda-item-link"
                          >
                            Abrir prontuário
                          </Link>
                        </div>
                      </li>
                    ))
                )}
              </ul>
            </>
          )}
        </aside>
      </div>

      {message && (
        <div className={`agenda-toast agenda-toast-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      {showAbrirModal && (
        <AbrirAgendaModal
          onClose={() => setShowAbrirModal(false)}
          onSaved={() => {
            setShowAbrirModal(false)
            loadAberturas()
            setMessage({ type: 'success', text: 'Agenda aberta com sucesso.' })
            setTimeout(() => setMessage(null), 3000)
          }}
          setMessage={setMessage}
        />
      )}

      {showAgendarModal && selectedDate && (
        <AgendarModal
          dataAgenda={selectedDate}
          pacientes={pacientes}
          onClose={() => setShowAgendarModal(false)}
          onSaved={() => {
            setShowAgendarModal(false)
            loadAgendaMes()
            loadAgendaDia(selectedDate)
            setMessage({ type: 'success', text: 'Agendamento realizado.' })
            setTimeout(() => setMessage(null), 3000)
          }}
          setMessage={setMessage}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </div>
  )
}

interface AbrirAgendaModalProps {
  onClose: () => void
  onSaved: () => void
  setMessage: (m: { type: 'success' | 'error'; text: string } | null) => void
}

interface ProfissionalOption {
  id: string
  nome: string
}

function AbrirAgendaModal({ onClose, onSaved, setMessage }: AbrirAgendaModalProps) {
  const hoje = getHojeISO()
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [profissionalId, setProfissionalId] = useState('')
  const [loadingProfissionais, setLoadingProfissionais] = useState(true)
  const [dataInicio, setDataInicio] = useState(hoje)
  const [dataFim, setDataFim] = useState('')
  const [dias, setDias] = useState<Record<string, boolean>>({
    seg: false, ter: false, qua: false, qui: false, sex: false, sab: false, dom: false
  })
  const [manhaAtivo, setManhaAtivo] = useState(true)
  const [manhaInicio, setManhaInicio] = useState('08:00')
  const [manhaFim, setManhaFim] = useState('12:00')
  const [manhaPausaInicio, setManhaPausaInicio] = useState('')
  const [manhaPausaFim, setManhaPausaFim] = useState('')
  const [tardeAtivo, setTardeAtivo] = useState(true)
  const [tardeInicio, setTardeInicio] = useState('14:00')
  const [tardeFim, setTardeFim] = useState('18:00')
  const [tardePausaInicio, setTardePausaInicio] = useState('')
  const [tardePausaFim, setTardePausaFim] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleDia = (key: string) => setDias(prev => ({ ...prev, [key]: !prev[key] }))
  const hasAnyDia = Object.values(dias).some(Boolean)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingProfissionais(true)
      try {
        const { data: profData, error: profError } = await supabase
          .from('profissionais')
          .select('id, usuarios!inner(nome)')
          .eq('ativo', true)
        if (!cancelled && !profError && profData?.length) {
          const list: ProfissionalOption[] = profData.map((p: { id: string; usuarios: { nome: string } | { nome: string }[] }) => ({
            id: p.id,
            nome: Array.isArray(p.usuarios) ? (p.usuarios[0]?.nome ?? '') : (p.usuarios?.nome ?? '')
          }))
          setProfissionais(list)
          if (list.length === 1) setProfissionalId(list[0].id)
          return
        }
        const { data: userData, error: userError } = await supabase
          .from('usuarios_completo')
          .select('id, nome')
          .eq('is_profissional', true)
          .order('nome')
        if (!cancelled && !userError && userData?.length) {
          setProfissionais((userData as { id: string; nome: string }[]).map(u => ({ id: u.id, nome: u.nome ?? '' })))
          if (userData.length === 1) setProfissionalId((userData[0] as { id: string }).id)
        }
      } catch (_) {
        if (!cancelled) setProfissionais([])
      } finally {
        if (!cancelled) setLoadingProfissionais(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    if (!profissionalId) {
      setMessage({ type: 'error', text: 'Selecione o profissional.' })
      return
    }
    if (!dataFim) {
      setMessage({ type: 'error', text: 'Informe a data final do período.' })
      return
    }
    if (!hasAnyDia) {
      setMessage({ type: 'error', text: 'Marque pelo menos um dia da semana.' })
      return
    }
    if (manhaAtivo && (!manhaInicio || !manhaFim)) {
      setMessage({ type: 'error', text: 'Manhã: informe início e fim.' })
      return
    }
    if (tardeAtivo && (!tardeInicio || !tardeFim)) {
      setMessage({ type: 'error', text: 'Tarde: informe início e fim.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('agenda_abertura').insert({
        profissional_id: profissionalId || null,
        data_inicio: dataInicio,
        data_fim: dataFim,
        seg: dias.seg,
        ter: dias.ter,
        qua: dias.qua,
        qui: dias.qui,
        sex: dias.sex,
        sab: dias.sab,
        dom: dias.dom,
        manha_ativo: manhaAtivo,
        manha_inicio: manhaAtivo ? manhaInicio : null,
        manha_fim: manhaAtivo ? manhaFim : null,
        manha_pausa_inicio: manhaAtivo && manhaPausaInicio ? manhaPausaInicio : null,
        manha_pausa_fim: manhaAtivo && manhaPausaFim ? manhaPausaFim : null,
        tarde_ativo: tardeAtivo,
        tarde_inicio: tardeAtivo ? tardeInicio : null,
        tarde_fim: tardeAtivo ? tardeFim : null,
        tarde_pausa_inicio: tardeAtivo && tardePausaInicio ? tardePausaInicio : null,
        tarde_pausa_fim: tardeAtivo && tardePausaFim ? tardePausaFim : null
      })
      if (error) throw error
      onSaved()
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Erro ao salvar. Execute supabase/agenda_abertura.sql no Supabase.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal" onClick={e => e.stopPropagation()}>
        <div className="agenda-modal-header">
          <h3>Abrir agenda</h3>
          <button type="button" className="agenda-modal-close" onClick={onClose}>×</button>
        </div>
        <p className="agenda-modal-desc">
          Selecione o profissional e defina o período e os dias da semana em que atende, e os horários de manhã e tarde (com pausa opcional).
        </p>
        <div className="agenda-modal-body">
          <div className="agenda-form-group">
            <label>Profissional *</label>
            <select
              value={profissionalId}
              onChange={e => setProfissionalId(e.target.value)}
              disabled={loadingProfissionais}
            >
              <option value="">
                {loadingProfissionais ? 'Carregando...' : 'Selecione o profissional'}
              </option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="agenda-form-group">
            <label>Período</label>
            <div className="agenda-form-row">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              <span>até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="agenda-form-group">
            <label>Dias da semana</label>
            <div className="agenda-form-dias">
              {DIAS_SEMANA.map(({ key, label }) => (
                <label key={key} className="agenda-dia-check">
                  <input type="checkbox" checked={dias[key]} onChange={() => toggleDia(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="agenda-form-group periodo">
            <h4>Manhã</h4>
            <label className="agenda-check-row">
              <input type="checkbox" checked={manhaAtivo} onChange={e => setManhaAtivo(e.target.checked)} />
              Ativo
            </label>
            {manhaAtivo && (
              <div className="agenda-form-row horarios">
                <input type="time" value={manhaInicio} onChange={e => setManhaInicio(e.target.value)} />
                <span>até</span>
                <input type="time" value={manhaFim} onChange={e => setManhaFim(e.target.value)} />
                <span className="agenda-pausa-label">Pausa</span>
                <input type="time" value={manhaPausaInicio} onChange={e => setManhaPausaInicio(e.target.value)} placeholder="Início" />
                <span>até</span>
                <input type="time" value={manhaPausaFim} onChange={e => setManhaPausaFim(e.target.value)} placeholder="Fim" />
              </div>
            )}
          </div>
          <div className="agenda-form-group periodo">
            <h4>Tarde</h4>
            <label className="agenda-check-row">
              <input type="checkbox" checked={tardeAtivo} onChange={e => setTardeAtivo(e.target.checked)} />
              Ativo
            </label>
            {tardeAtivo && (
              <div className="agenda-form-row horarios">
                <input type="time" value={tardeInicio} onChange={e => setTardeInicio(e.target.value)} />
                <span>até</span>
                <input type="time" value={tardeFim} onChange={e => setTardeFim(e.target.value)} />
                <span className="agenda-pausa-label">Pausa</span>
                <input type="time" value={tardePausaInicio} onChange={e => setTardePausaInicio(e.target.value)} />
                <span>até</span>
                <input type="time" value={tardePausaFim} onChange={e => setTardePausaFim(e.target.value)} />
              </div>
            )}
          </div>
        </div>
        <div className="agenda-modal-footer">
          <button type="button" className="agenda-btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="agenda-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AgendarModalProps {
  dataAgenda: string
  pacientes: Paciente[]
  onClose: () => void
  onSaved: () => void
  setMessage: (m: { type: 'success' | 'error'; text: string } | null) => void
  saving: boolean
  setSaving: (v: boolean) => void
}

function AgendarModal({
  dataAgenda,
  pacientes,
  onClose,
  onSaved,
  setMessage,
  saving,
  setSaving
}: AgendarModalProps) {
  const [pacienteId, setPacienteId] = useState('')
  const [horario, setHorario] = useState('08:00')
  const [periodoDia, setPeriodoDia] = useState<'manha' | 'tarde'>('manha')
  const [procedimento, setProcedimento] = useState<'consulta_presencial' | 'consulta_online'>('consulta_presencial')
  const [observacao, setObservacao] = useState('')

  const handleSave = async () => {
    if (!pacienteId) {
      setMessage({ type: 'error', text: 'Selecione o paciente.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('agenda_dia').insert({
        paciente_id: pacienteId,
        data_agenda: dataAgenda,
        horario: horario,
        periodo_dia: periodoDia,
        procedimento,
        observacao: observacao.trim() || null
      })
      if (error) throw error
      onSaved()
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      if (e.message?.includes('duplicate') || e.code === '23505') {
        setMessage({ type: 'error', text: 'Este paciente já está agendado nesta data.' })
      } else {
        setMessage({ type: 'error', text: 'Erro ao agendar. Verifique se as migrações da agenda foram executadas.' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal" onClick={e => e.stopPropagation()}>
        <div className="agenda-modal-header">
          <h3>Agendar consulta — {formatDate(dataAgenda)}</h3>
          <button type="button" className="agenda-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="agenda-modal-body">
          <div className="agenda-form-group">
            <label>Paciente *</label>
            <select value={pacienteId} onChange={e => setPacienteId(e.target.value)}>
              <option value="">Selecione...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="agenda-form-group">
            <label>Horário</label>
            <input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
          </div>
          <div className="agenda-form-group">
            <label>Período</label>
            <select value={periodoDia} onChange={e => setPeriodoDia(e.target.value as 'manha' | 'tarde')}>
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
          <div className="agenda-form-group">
            <label>Procedimento</label>
            <select value={procedimento} onChange={e => setProcedimento(e.target.value as 'consulta_presencial' | 'consulta_online')}>
              {PROCEDIMENTOS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="agenda-form-group">
            <label>Observação (opcional)</label>
            <input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: retorno" />
          </div>
        </div>
        <div className="agenda-modal-footer">
          <button type="button" className="agenda-btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="agenda-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
