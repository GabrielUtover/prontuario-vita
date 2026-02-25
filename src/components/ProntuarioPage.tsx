import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './ProntuarioPage.css'

interface Paciente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  data_nascimento: string | null
  [key: string]: unknown
}

interface AgendaItem {
  id: string
  paciente_id: string
  data_agenda: string
  observacao: string | null
  created_at: string
  confirmado_recepcao: boolean
  paciente?: Paciente
}

const getHojeISO = () => new Date().toISOString().slice(0, 10)

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

export function ProntuarioPage() {
  const { usuario } = useAuth()
  const [agendaHoje, setAgendaHoje] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showConsultarModal, setShowConsultarModal] = useState(false)
  const [pacientesLista, setPacientesLista] = useState<Paciente[]>([])
  const [searchConsultar, setSearchConsultar] = useState('')
  const [loadingPacientes, setLoadingPacientes] = useState(false)

  const loadAgendaDia = useCallback(async () => {
    const hoje = getHojeISO()
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('agenda_dia')
        .select(`
          id,
          paciente_id,
          data_agenda,
          observacao,
          created_at,
          confirmado_recepcao,
          paciente:pacientes(id, nome, cpf, telefone, data_nascimento)
        `)
        .eq('data_agenda', hoje)
        .order('created_at', { ascending: true })

      if (error) throw error
      setAgendaHoje((data || []) as AgendaItem[])
    } catch (err) {
      console.error('Erro ao carregar agenda do dia:', err)
      setMessage({ type: 'error', text: 'Erro ao carregar a agenda do dia.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAgendaDia()
  }, [loadAgendaDia])

  const confirmarAtendimento = async (item: AgendaItem) => {
    setConfirmingId(item.id)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('agenda_dia')
        .update({ confirmado_recepcao: true })
        .eq('id', item.id)

      if (error) throw error
      setMessage({ type: 'success', text: `Atendimento de ${item.paciente?.nome || 'paciente'} confirmado.` })
      setTimeout(() => setMessage(null), 4000)
      loadAgendaDia()
    } catch (err) {
      console.error('Erro ao confirmar atendimento:', err)
      setMessage({ type: 'error', text: 'Erro ao confirmar atendimento.' })
    } finally {
      setConfirmingId(null)
    }
  }

  const loadPacientesParaConsultar = useCallback(async () => {
    setLoadingPacientes(true)
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, cpf, telefone, data_nascimento')
        .eq('status', 'ativo')
        .order('nome')
      if (error) throw error
      setPacientesLista(data || [])
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
    } finally {
      setLoadingPacientes(false)
    }
  }, [])

  useEffect(() => {
    if (showConsultarModal) {
      loadPacientesParaConsultar()
      setSearchConsultar('')
    }
  }, [showConsultarModal, loadPacientesParaConsultar])

  const pacientesConsultarFiltrados = pacientesLista.filter(
    p =>
      p.nome?.toLowerCase().includes(searchConsultar.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchConsultar))
  )

  const atendimentosAbertos = agendaHoje.filter(a => a.confirmado_recepcao)
  const aguardandoConfirmacao = agendaHoje.filter(a => !a.confirmado_recepcao)

  return (
    <div className="prontuario-page">
      <header className="prontuario-header">
        <div className="prontuario-header-content">
          <div className="prontuario-header-titulo">
            <h1 className="prontuario-title">
              <span className="prontuario-title-icon" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </span>
              Prontuário
            </h1>
            <p className="prontuario-subtitle">Atendimentos da agenda do dia</p>
          </div>
          <div className="prontuario-header-meta">
            <span className="prontuario-date">{formatDate(new Date().toISOString())}</span>
            <span className="prontuario-header-sep">•</span>
            <span className="prontuario-user">Dr(a). {usuario?.nome || 'Usuário'}</span>
            <span className="prontuario-crm">CRM {usuario?.numero_conselho || '—'}</span>
          </div>
        </div>
        <div className="prontuario-header-actions">
          <button
            type="button"
            className="prontuario-btn-consultar"
            onClick={() => setShowConsultarModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Consultar prontuário
          </button>
          <Link to="/home" className="prontuario-btn-voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
            Voltar ao menu
          </Link>
        </div>
      </header>

      {/* Modal Consultar prontuário - buscar qualquer paciente */}
      {showConsultarModal && (
        <div className="prontuario-modal-overlay" onClick={() => setShowConsultarModal(false)}>
          <div className="prontuario-modal" onClick={e => e.stopPropagation()}>
            <div className="prontuario-modal-header">
              <h3>Consultar prontuário</h3>
              <div className="prontuario-modal-header-actions">
                <button
                  type="button"
                  className="prontuario-btn-atualizar-lista"
                  onClick={() => loadPacientesParaConsultar()}
                  disabled={loadingPacientes}
                  title="Atualizar lista (ex.: paciente novo cadastrado)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loadingPacientes ? 'spin' : ''}>
                    <polyline points="23,4 23,10 17,10"/>
                    <polyline points="1,20 1,14 7,14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {loadingPacientes ? 'Atualizando...' : 'Atualizar lista'}
                </button>
                <button type="button" className="prontuario-modal-close" onClick={() => setShowConsultarModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            <p className="prontuario-modal-desc">Busque um paciente para abrir o prontuário, mesmo sem atendimento na agenda do dia.</p>
            <div className="prontuario-modal-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchConsultar}
                onChange={e => setSearchConsultar(e.target.value)}
                autoFocus
              />
            </div>
            <div className="prontuario-modal-list">
              {loadingPacientes ? (
                <div className="prontuario-modal-loading">Carregando pacientes...</div>
              ) : pacientesConsultarFiltrados.length === 0 ? (
                <div className="prontuario-modal-empty">
                  <p>{searchConsultar ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}</p>
                </div>
              ) : (
                <ul className="prontuario-modal-ul">
                  {pacientesConsultarFiltrados.map(p => (
                    <li key={p.id} className="prontuario-modal-item">
                      <div className="prontuario-item-avatar">
                        {p.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="prontuario-item-info">
                        <span className="prontuario-item-nome">{p.nome || '—'}</span>
                        {p.telefone && <span className="prontuario-item-tel">{p.telefone}</span>}
                      </div>
                      <Link
                        to={`/prontuarios/paciente/${p.id}`}
                        className="prontuario-btn-abrir"
                        onClick={() => setShowConsultarModal(false)}
                      >
                        Abrir prontuário
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast de feedback */}
      {message && (
        <div className={`prontuario-toast prontuario-toast-${message.type}`} role="status">
          <span className="prontuario-toast-icon">
            {message.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
          </span>
          <span className="prontuario-toast-text">{message.text}</span>
        </div>
      )}

      <main className="prontuario-main">
        {loading ? (
          <div className="prontuario-loading">Carregando...</div>
        ) : (
          <>
            {/* Atendimentos abertos (confirmados pela recepção) */}
            <section className="prontuario-section atendimentos-abertos">
              <h2 className="prontuario-section-title">
                <span className="prontuario-section-icon open"/>
                Atendimentos abertos
                <span className="prontuario-section-badge">{atendimentosAbertos.length}</span>
              </h2>
              <p className="prontuario-section-desc">
                Pacientes com atendimento confirmado pela recepção (check-in). Prontuário disponível para consulta.
              </p>
              {atendimentosAbertos.length === 0 ? (
                <div className="prontuario-empty">
                  <p>Nenhum atendimento aberto no momento.</p>
                  <p className="prontuario-empty-hint">A recepção precisa confirmar o check-in do paciente na agenda do dia.</p>
                </div>
              ) : (
                <ul className="prontuario-list">
                  {atendimentosAbertos.map(item => {
                    const p = item.paciente
                    return (
                      <li key={item.id} className="prontuario-list-item aberto">
                        <div className="prontuario-item-avatar">
                          {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="prontuario-item-info">
                          <span className="prontuario-item-nome">{p?.nome || '—'}</span>
                          {p?.telefone && <span className="prontuario-item-tel">{p.telefone}</span>}
                        </div>
                        <div className="prontuario-item-actions">
                          <Link to={`/prontuarios/paciente/${p?.id}`} className="prontuario-btn-abrir">
                            Abrir prontuário
                          </Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Aguardando confirmação da recepção */}
            <section className="prontuario-section aguardando-confirmacao">
              <h2 className="prontuario-section-title">
                <span className="prontuario-section-icon pending"/>
                Aguardando confirmação da recepção
                <span className="prontuario-section-badge">{aguardandoConfirmacao.length}</span>
              </h2>
              <p className="prontuario-section-desc">
                Pacientes na agenda do dia que ainda não tiveram o atendimento confirmado (check-in) pela recepção.
              </p>
              {aguardandoConfirmacao.length === 0 ? (
                <div className="prontuario-empty small">
                  <p>Nenhum paciente aguardando confirmação.</p>
                </div>
              ) : (
                <ul className="prontuario-list">
                  {aguardandoConfirmacao.map(item => {
                    const p = item.paciente
                    return (
                      <li key={item.id} className="prontuario-list-item pendente">
                        <div className="prontuario-item-avatar pendente">
                          {p?.nome?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="prontuario-item-info">
                          <span className="prontuario-item-nome">{p?.nome || '—'}</span>
                          {p?.telefone && <span className="prontuario-item-tel">{p.telefone}</span>}
                        </div>
                        <div className="prontuario-item-actions">
                          <button
                            type="button"
                            className="prontuario-btn-confirmar"
                            onClick={() => confirmarAtendimento(item)}
                            disabled={confirmingId === item.id}
                          >
                            {confirmingId === item.id ? 'Confirmando...' : 'Confirmar atendimento'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
