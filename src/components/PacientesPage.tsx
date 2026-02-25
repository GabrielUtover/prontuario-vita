import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './PacientesPage.css'

// Interface do Paciente (snake_case para corresponder ao banco)
interface Paciente {
  id: string
  nome: string
  cpf: string | null
  data_nascimento: string | null
  sexo: 'masculino' | 'feminino' | 'nao_especificar' | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cep: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  convenio: string | null
  numero_convenio: string | null
  observacoes: string | null
  status: 'ativo' | 'inativo'
  data_cadastro: string
  data_atualizacao: string
}

// Função para formatar CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

// Função para formatar telefone
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}

// Função para formatar CEP
const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  return numbers
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')
}

// Função para formatar data
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR')
}

// Calcular idade
const calcularIdade = (data_nascimento: string | null) => {
  if (!data_nascimento) return ''
  const hoje = new Date()
  const nascimento = new Date(data_nascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return `${idade} anos`
}

// Verificar se cadastro está completo (Data nascimento, CPF, Endereço, Telefone)
const isCadastroCompleto = (p: Paciente): boolean => {
  const temDataNasc = !!p.data_nascimento?.trim()
  const temCpf = !!p.cpf?.trim()
  const temEndereco = !!p.endereco?.trim()
  const temTelefone = !!p.telefone?.trim()
  return temDataNasc && temCpf && temEndereco && temTelefone
}

// Retorna lista de campos faltantes para exibir "Cadastro incompleto - faltam: ..."
const getCamposFaltantes = (p: Paciente): string[] => {
  const faltantes: string[] = []
  if (!p.data_nascimento?.trim()) faltantes.push('Data de nascimento')
  if (!p.cpf?.trim()) faltantes.push('CPF')
  if (!p.endereco?.trim()) faltantes.push('Endereço')
  if (!p.telefone?.trim()) faltantes.push('Telefone')
  return faltantes
}

// Interface do item da agenda do dia
interface AgendaItem {
  id: string
  paciente_id: string
  data_agenda: string
  observacao: string | null
  created_at: string
  paciente?: Paciente
}

// Data de hoje no formato YYYY-MM-DD (para comparação com o banco)
const getHojeISO = () => new Date().toISOString().slice(0, 10)

export function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [view, setView] = useState<'list' | 'form' | 'details'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('ativo')
  const [filterCadastro, setFilterCadastro] = useState<'todos' | 'completo' | 'incompleto'>('todos')
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [nomeConfirmacao, setNomeConfirmacao] = useState('')
  const [confirmacaoErro, setConfirmacaoErro] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [openActionsDropdownId, setOpenActionsDropdownId] = useState<string | null>(null)
  const [agendaDia, setAgendaDia] = useState<AgendaItem[]>([])
  const [agendaPopupOpen, setAgendaPopupOpen] = useState(false)

  // Form states (convênio já vem preenchido com PARTICULAR)
  const [formData, setFormData] = useState<Partial<Paciente>>({
    nome: '',
    cpf: '',
    data_nascimento: '',
    sexo: null,
    telefone: '',
    email: '',
    endereco: '',
    cep: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    convenio: 'PARTICULAR',
    numero_convenio: '',
    observacoes: '',
    status: 'ativo'
  })

  // Carregar pacientes do Supabase
  const loadPacientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome')

      if (error) throw error
      setPacientes(data || [])
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
    }
  }, [])

  useEffect(() => {
    loadPacientes()
  }, [loadPacientes])

  // Carregar agenda do dia (pacientes agendados para hoje)
  const loadAgendaDia = useCallback(async () => {
    const hoje = getHojeISO()
    try {
      const { data, error } = await supabase
        .from('agenda_dia')
        .select(`
          id,
          paciente_id,
          data_agenda,
          observacao,
          created_at,
          paciente:pacientes(*)
        `)
        .eq('data_agenda', hoje)
        .order('created_at', { ascending: true })

      if (error) throw error
      const rows = (data || []) as any[]
      const formatted: AgendaItem[] = rows.map(row => ({
        ...row,
        paciente: Array.isArray(row.paciente) ? row.paciente[0] : row.paciente
      }))
      setAgendaDia(formatted)
    } catch (err) {
      console.error('Erro ao carregar agenda do dia:', err)
    }
  }, [])

  useEffect(() => {
    if (view === 'list') loadAgendaDia()
  }, [view, loadAgendaDia])

  const [searchParams] = useSearchParams()
  useEffect(() => {
    const detalheId = searchParams.get('detalhe')
    if (detalheId && pacientes.length > 0) {
      const p = pacientes.find(x => x.id === detalheId)
      if (p) {
        setSelectedPaciente(p)
        setView('details')
      }
    }
  }, [searchParams, pacientes])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const closeDropdown = () => setOpenActionsDropdownId(null)
    document.addEventListener('click', closeDropdown)
    return () => document.removeEventListener('click', closeDropdown)
  }, [])

  // Adicionar paciente na agenda do dia
  const handleAddAgendaDia = async (paciente: Paciente) => {
    const hoje = getHojeISO()
    try {
      const { error } = await supabase.from('agenda_dia').insert({
        paciente_id: paciente.id,
        data_agenda: hoje
      })
      if (error) throw error
      setSuccessMessage(`${paciente.nome} adicionado à agenda do dia!`)
      setTimeout(() => setSuccessMessage(''), 3000)
      setOpenActionsDropdownId(null)
      loadAgendaDia()
    } catch (err) {
      console.error('Erro ao adicionar na agenda:', err)
      setSuccessMessage('Erro ao adicionar na agenda. O paciente já pode estar agendado.')
      setTimeout(() => setSuccessMessage(''), 4000)
    }
  }

  // Remover paciente da agenda do dia
  const handleRemoveAgendaDia = async (item: AgendaItem) => {
    try {
      const { error } = await supabase.from('agenda_dia').delete().eq('id', item.id)
      if (error) throw error
      setSuccessMessage('Paciente removido da agenda do dia.')
      setTimeout(() => setSuccessMessage(''), 3000)
      loadAgendaDia()
    } catch (err) {
      console.error('Erro ao remover da agenda:', err)
    }
  }

  const estaNaAgendaHoje = (pacienteId: string) =>
    agendaDia.some(item => item.paciente_id === pacienteId)

  // Filtrar pacientes (status ativo/inativo + cadastro completo/incompleto)
  const filteredPacientes = pacientes.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.cpf && p.cpf.includes(searchTerm)) ||
                         (p.telefone && p.telefone.includes(searchTerm))
    const matchesStatus = filterStatus === 'todos' || p.status === filterStatus
    const completo = isCadastroCompleto(p)
    const matchesCadastro =
      filterCadastro === 'todos' ||
      (filterCadastro === 'completo' && completo) ||
      (filterCadastro === 'incompleto' && !completo)
    return matchesSearch && matchesStatus && matchesCadastro
  })

  // Estatísticas
  const stats = {
    total: pacientes.length,
    ativos: pacientes.filter(p => p.status === 'ativo').length,
    inativos: pacientes.filter(p => p.status === 'inativo').length,
    cadastroCompleto: pacientes.filter(p => isCadastroCompleto(p)).length,
    cadastroIncompleto: pacientes.filter(p => !isCadastroCompleto(p)).length
  }

  // Handlers
  const handleNewPaciente = () => {
    setFormData({
      nome: '',
      cpf: '',
      data_nascimento: '',
      sexo: null,
      telefone: '',
      email: '',
      endereco: '',
      cep: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      convenio: 'PARTICULAR',
      numero_convenio: '',
      observacoes: '',
      status: 'ativo'
    })
    setIsEditing(false)
    setView('form')
  }

  const handleEditPaciente = (paciente: Paciente) => {
    setFormData(paciente)
    setIsEditing(true)
    setSelectedPaciente(paciente)
    setView('form')
  }

  const handleViewPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setView('details')
  }

  const handleDeletePaciente = async (id: string, nomePaciente: string) => {
    // Verificar se o nome digitado corresponde ao nome do paciente
    if (nomeConfirmacao.trim().toLowerCase() !== nomePaciente.trim().toLowerCase()) {
      setConfirmacaoErro('O nome digitado não corresponde ao nome do paciente!')
      return
    }
    
    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)

      if (error) throw error

      setDeleteConfirm(null)
      setNomeConfirmacao('')
      setConfirmacaoErro('')
      setSuccessMessage('Paciente excluído com sucesso!')
      setTimeout(() => setSuccessMessage(''), 3000)
      loadPacientes()
      if (view === 'details') {
        setView('list')
      }
    } catch (err) {
      console.error('Erro ao excluir paciente:', err)
      setConfirmacaoErro('Erro ao excluir paciente')
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm(null)
    setNomeConfirmacao('')
    setConfirmacaoErro('')
  }

  const handleToggleStatus = async (paciente: Paciente) => {
    try {
      const newStatus = paciente.status === 'ativo' ? 'inativo' : 'ativo'
      const { error } = await supabase
        .from('pacientes')
        .update({ status: newStatus })
        .eq('id', paciente.id)

      if (error) throw error
      loadPacientes()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  // Campos que são salvos em CAIXA ALTA (todos os textos, exceto CPF/telefone/CEP que têm formatação própria)
  const CAMPOS_CAIXA_ALTA: (keyof Paciente)[] = [
    'nome', 'email', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
    'convenio', 'numero_convenio', 'observacoes'
  ]

  const handleFormChange = (field: keyof Paciente, value: string) => {
    let formattedValue = value
    
    if (field === 'cpf') {
      formattedValue = formatCPF(value)
    } else if (field === 'telefone') {
      formattedValue = formatPhone(value)
    } else if (field === 'cep') {
      formattedValue = formatCEP(value)
    } else if (CAMPOS_CAIXA_ALTA.includes(field)) {
      formattedValue = value.toUpperCase()
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditing && selectedPaciente) {
        // Editar paciente existente
        const { error } = await supabase
          .from('pacientes')
          .update({
            nome: formData.nome,
            cpf: formData.cpf || null,
            data_nascimento: formData.data_nascimento || null,
            sexo: formData.sexo || null,
            telefone: formData.telefone || null,
            email: formData.email || null,
            endereco: formData.endereco || null,
            cep: formData.cep || null,
            numero: formData.numero || null,
            complemento: formData.complemento || null,
            bairro: formData.bairro || null,
            cidade: formData.cidade || null,
            estado: formData.estado || null,
            convenio: formData.convenio || null,
            numero_convenio: formData.numero_convenio || null,
            observacoes: formData.observacoes || null,
          })
          .eq('id', selectedPaciente.id)

        if (error) throw error
        setSuccessMessage('Paciente atualizado com sucesso!')
      } else {
        // Criar novo paciente
        const { error } = await supabase
          .from('pacientes')
          .insert({
            nome: formData.nome,
            cpf: formData.cpf || null,
            data_nascimento: formData.data_nascimento || null,
            sexo: formData.sexo || null,
            telefone: formData.telefone || null,
            email: formData.email || null,
            endereco: formData.endereco || null,
            cep: formData.cep || null,
            numero: formData.numero || null,
            complemento: formData.complemento || null,
            bairro: formData.bairro || null,
            cidade: formData.cidade || null,
            estado: formData.estado || null,
            convenio: formData.convenio || null,
            numero_convenio: formData.numero_convenio || null,
            observacoes: formData.observacoes || null,
            status: 'ativo',
          })

        if (error) throw error
        setSuccessMessage('Paciente cadastrado com sucesso!')
      }
      
      loadPacientes()
      setTimeout(() => setSuccessMessage(''), 3000)
      setView('list')
    } catch (err) {
      console.error('Erro ao salvar paciente:', err)
      setSuccessMessage('')
    }
  }

  const handleBack = () => {
    setView('list')
    setSelectedPaciente(null)
    setIsEditing(false)
  }

  // Estados brasileiros
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="pacientes-page">
      {/* Header */}
      <header className="pacientes-header">
        <div className="header-left">
          <Link to="/home" className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
          </Link>
          <div className="header-title">
            <h1>Pacientes</h1>
            <p>Gerenciamento de pacientes</p>
          </div>
        </div>
        {view === 'list' && (
          <button className="btn-primary" onClick={handleNewPaciente}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Paciente
          </button>
        )}
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          {successMessage}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
          <div className="list-view-layout">
            <div className="list-view-main">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total de Pacientes</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.ativos}</span>
                <span className="stat-label">Pacientes Ativos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon inactive">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.inativos}</span>
                <span className="stat-label">Pacientes Inativos</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon completo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.cadastroCompleto}</span>
                <span className="stat-label">Cadastro Completo</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon incompleto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stats.cadastroIncompleto}</span>
                <span className="stat-label">Cadastro Incompleto</span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="list-toolbar">
            <div className="search-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-btn" onClick={() => setSearchTerm('')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-label">Status:</span>
                <div className="filter-tabs">
                  <button 
                    className={`filter-tab ${filterStatus === 'todos' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('todos')}
                  >
                    Todos
                  </button>
                  <button 
                    className={`filter-tab ${filterStatus === 'ativo' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('ativo')}
                  >
                    Ativos
                  </button>
                  <button 
                    className={`filter-tab ${filterStatus === 'inativo' ? 'active' : ''}`}
                    onClick={() => setFilterStatus('inativo')}
                  >
                    Inativos
                  </button>
                </div>
              </div>
              <div className="filter-group">
                <span className="filter-label">Cadastro:</span>
                <div className="filter-tabs">
                  <button 
                    className={`filter-tab ${filterCadastro === 'todos' ? 'active' : ''}`}
                    onClick={() => setFilterCadastro('todos')}
                  >
                    Todos
                  </button>
                  <button 
                    className={`filter-tab ${filterCadastro === 'completo' ? 'active' : ''}`}
                    onClick={() => setFilterCadastro('completo')}
                  >
                    Completo
                  </button>
                  <button 
                    className={`filter-tab ${filterCadastro === 'incompleto' ? 'active' : ''}`}
                    onClick={() => setFilterCadastro('incompleto')}
                  >
                    Incompleto
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="patients-list">
            {filteredPacientes.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="17" y1="11" x2="23" y2="11"/>
                </svg>
                <h3>{searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}</h3>
                <p>{searchTerm ? 'Tente buscar com outros termos' : 'Clique em "Novo Paciente" para começar'}</p>
                {!searchTerm && (
                  <button className="btn-primary" onClick={handleNewPaciente}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Novo Paciente
                  </button>
                )}
              </div>
            ) : (
              <div className="patients-table">
                <div className="table-header">
                  <span className="col-name">Nome</span>
                  <span className="col-cpf">CPF</span>
                  <span className="col-birth">Data Nasc.</span>
                  <span className="col-phone">Telefone</span>
                  <span className="col-status">Status</span>
                  <span className="col-cadastro">Cadastro</span>
                </div>
                {                    filteredPacientes.map((paciente, index) => {
                      const isLastRows = index >= filteredPacientes.length - 4
                      return (
                      <div key={paciente.id} className="table-row table-row-with-dropdown">
                        <div
                          className={`col-name col-name-clickable ${openActionsDropdownId === paciente.id ? 'dropdown-open' : ''}`}
                          onClick={(e) => { e.stopPropagation(); setOpenActionsDropdownId(prev => prev === paciente.id ? null : paciente.id); }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenActionsDropdownId(prev => prev === paciente.id ? null : paciente.id); } }}
                          aria-expanded={openActionsDropdownId === paciente.id}
                          aria-haspopup="true"
                        >
                          <div className="patient-avatar">
                            {paciente.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="patient-info">
                            <span className="patient-name">{paciente.nome}</span>
                            <span className="patient-age">
                              {paciente.data_nascimento && calcularIdade(paciente.data_nascimento)}
                            </span>
                          </div>
                          <svg className="col-name-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9"/>
                          </svg>
                        </div>
                        <span className="col-cpf">{paciente.cpf || '-'}</span>
                        <span className="col-birth">{paciente.data_nascimento ? formatDate(paciente.data_nascimento) : '-'}</span>
                        <span className="col-phone">{paciente.telefone || '-'}</span>
                    <span className="col-status">
                      <span className={`status-badge ${paciente.status}`}>
                        {paciente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </span>
                    <span className="col-cadastro">
                      <span className={`cadastro-badge ${isCadastroCompleto(paciente) ? 'completo' : 'incompleto'}`} title={!isCadastroCompleto(paciente) ? `Faltam: ${getCamposFaltantes(paciente).join(', ')}` : undefined}>
                        {isCadastroCompleto(paciente) ? 'Completo' : 'Incompleto'}
                      </span>
                    </span>

                    {/* Dropdown de Ações - abre para cima nos últimos itens da lista */}
                    {openActionsDropdownId === paciente.id && (
                      <div className={`actions-dropdown ${isLastRows ? 'actions-dropdown-up' : ''}`} onClick={e => e.stopPropagation()} role="menu">
                        <button
                          type="button"
                          className="actions-dropdown-btn primary"
                          onClick={() => handleAddAgendaDia(paciente)}
                          disabled={estaNaAgendaHoje(paciente.id)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {estaNaAgendaHoje(paciente.id) ? 'Já está na agenda do dia' : 'Colocar na agenda do dia'}
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-btn"
                          onClick={() => { handleViewPaciente(paciente); setOpenActionsDropdownId(null); }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          Ver detalhes
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-btn"
                          onClick={() => { handleEditPaciente(paciente); setOpenActionsDropdownId(null); }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-btn"
                          onClick={() => { handleToggleStatus(paciente); setOpenActionsDropdownId(null); }}
                        >
                          {paciente.status === 'ativo' ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                              Inativar
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22,4 12,14.01 9,11.01"/>
                              </svg>
                              Ativar
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="actions-dropdown-btn danger"
                          onClick={() => { setDeleteConfirm(paciente.id); setOpenActionsDropdownId(null); }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          Excluir
                        </button>
                      </div>
                    )}

                    {/* Delete Confirmation */}
                    {deleteConfirm === paciente.id && (
                      <div className="delete-confirm">
                        <div className="delete-confirm-content">
                          <div className="delete-confirm-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                          </div>
                          <p>Tem certeza que deseja excluir <strong>{paciente.nome}</strong>?</p>
                          <p className="delete-warning">Esta ação não pode ser desfeita!</p>
                          <div className="delete-senha-field">
                            <label>Digite o nome do paciente para confirmar:</label>
                            <input
                              type="text"
                              value={nomeConfirmacao}
                              onChange={(e) => { setNomeConfirmacao(e.target.value); setConfirmacaoErro(''); }}
                              placeholder={paciente.nome}
                              autoFocus
                            />
                            {confirmacaoErro && <span className="senha-erro">{confirmacaoErro}</span>}
                          </div>
                          <div className="confirm-actions">
                            <button className="btn-cancel" onClick={handleCancelDelete}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              Cancelar
                            </button>
                            <button className="btn-delete" onClick={() => handleDeletePaciente(paciente.id, paciente.nome)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>

            </div>
            <aside className="list-view-sidebar">
              <div className="agenda-dia-section">
                <div className="agenda-dia-header">
                  <div>
                    <h3 className="agenda-dia-title">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Agenda do dia
                    </h3>
                    <p className="agenda-dia-date">{formatDate(new Date().toISOString())}</p>
                  </div>
                  <button
                    type="button"
                    className="agenda-dia-expand"
                    onClick={() => setAgendaPopupOpen(true)}
                    title="Expandir agenda"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15,3 21,3 21,9"/>
                      <polyline points="9,21 3,21 3,15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                    Expandir
                  </button>
                </div>
                {agendaDia.length === 0 ? (
                  <p className="agenda-dia-empty">Nenhum paciente agendado para hoje.</p>
                ) : (
                  <ul className="agenda-dia-list">
                    {agendaDia.map(item => {
                      const p = item.paciente || pacientes.find(x => x.id === item.paciente_id)
                      return (
                        <li key={item.id} className="agenda-dia-item">
                          <div className="agenda-dia-item-info">
                            <span className="agenda-dia-item-nome">{p?.nome || '—'}</span>
                            {p?.telefone && <span className="agenda-dia-item-tel">{p.telefone}</span>}
                          </div>
                          <button
                            type="button"
                            className="agenda-dia-remove"
                            onClick={() => handleRemoveAgendaDia(item)}
                            title="Remover da agenda"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Remover
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </aside>

            {/* Popup Agenda do dia */}
            {agendaPopupOpen && (
              <div
                className="agenda-popup-overlay"
                onClick={() => setAgendaPopupOpen(false)}
                role="presentation"
              >
                <div className="agenda-popup" onClick={e => e.stopPropagation()} role="dialog">
                  <div className="agenda-popup-header">
                    <h3 className="agenda-popup-title">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Agenda do dia — {formatDate(new Date().toISOString())}
                    </h3>
                    <button
                      type="button"
                      className="agenda-popup-close"
                      onClick={() => setAgendaPopupOpen(false)}
                      aria-label="Fechar"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="agenda-popup-body">
                    {agendaDia.length === 0 ? (
                      <p className="agenda-dia-empty">Nenhum paciente agendado para hoje.</p>
                    ) : (
                      <ul className="agenda-popup-list">
                        {agendaDia.map(item => {
                          const p = item.paciente || pacientes.find(x => x.id === item.paciente_id)
                          return (
                            <li key={item.id} className="agenda-popup-item">
                              <div className="agenda-dia-item-info">
                                <span className="agenda-dia-item-nome">{p?.nome || '—'}</span>
                                {p?.telefone && <span className="agenda-dia-item-tel">{p.telefone}</span>}
                              </div>
                              <button
                                type="button"
                                className="agenda-dia-remove"
                                onClick={() => handleRemoveAgendaDia(item)}
                                title="Remover da agenda"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Remover
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Form View */}
      {view === 'form' && (
        <div className="form-container">
          <div className="form-header">
            <button className="back-btn" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              Voltar
            </button>
            <h2>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</h2>
          </div>

          <form className="patient-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Dados Pessoais</h3>
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="nome">Nome Completo *</label>
                  <input
                    type="text"
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleFormChange('nome', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cpf">CPF</label>
                  <input
                    type="text"
                    id="cpf"
                    value={formData.cpf || ''}
                    onChange={(e) => handleFormChange('cpf', e.target.value)}
                    maxLength={14}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="data_nascimento">Data de Nascimento</label>
                  <input
                    type="date"
                    id="data_nascimento"
                    value={formData.data_nascimento || ''}
                    onChange={(e) => handleFormChange('data_nascimento', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sexo">Sexo</label>
                  <select
                    id="sexo"
                    value={formData.sexo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sexo: (e.target.value || null) as 'masculino' | 'feminino' | 'nao_especificar' | null }))}
                  >
                    <option value="">Selecione...</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="nao_especificar">Não especificar</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Contato</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="telefone">Telefone</label>
                  <input
                    type="text"
                    id="telefone"
                    value={formData.telefone || ''}
                    onChange={(e) => handleFormChange('telefone', e.target.value)}
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-mail</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email || ''}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Endereço</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="cep">CEP</label>
                  <input
                    type="text"
                    id="cep"
                    value={formData.cep || ''}
                    onChange={(e) => handleFormChange('cep', e.target.value)}
                    maxLength={9}
                    placeholder="00000-000"
                  />
                </div>
                <div className="form-group full">
                  <label htmlFor="endereco">Endereço</label>
                  <input
                    type="text"
                    id="endereco"
                    value={formData.endereco || ''}
                    onChange={(e) => handleFormChange('endereco', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numero">Número</label>
                  <input
                    type="text"
                    id="numero"
                    value={formData.numero || ''}
                    onChange={(e) => handleFormChange('numero', e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="complemento">Complemento</label>
                  <input
                    type="text"
                    id="complemento"
                    value={formData.complemento || ''}
                    onChange={(e) => handleFormChange('complemento', e.target.value)}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bairro">Bairro</label>
                  <input
                    type="text"
                    id="bairro"
                    value={formData.bairro || ''}
                    onChange={(e) => handleFormChange('bairro', e.target.value)}
                    placeholder="Nome do bairro"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cidade">Cidade</label>
                  <input
                    type="text"
                    id="cidade"
                    value={formData.cidade || ''}
                    onChange={(e) => handleFormChange('cidade', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="estado">Estado</label>
                  <select
                    id="estado"
                    value={formData.estado || ''}
                    onChange={(e) => handleFormChange('estado', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {estados.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Convênio</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="convenio">Convênio</label>
                  <input
                    type="text"
                    id="convenio"
                    value={formData.convenio || ''}
                    onChange={(e) => handleFormChange('convenio', e.target.value)}
                    placeholder="Nome do convênio"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numero_convenio">Número do Convênio</label>
                  <input
                    type="text"
                    id="numero_convenio"
                    value={formData.numero_convenio || ''}
                    onChange={(e) => handleFormChange('numero_convenio', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Observações</h3>
              <div className="form-group full">
                <textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) => handleFormChange('observacoes', e.target.value)}
                  rows={4}
                  placeholder="Observações adicionais sobre o paciente..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={handleBack}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17,21 17,13 7,13 7,21"/>
                      <polyline points="7,3 7,8 15,8"/>
                    </svg>
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="8.5" cy="7" r="4"/>
                      <line x1="20" y1="8" x2="20" y2="14"/>
                      <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    Cadastrar Paciente
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details View */}
      {view === 'details' && selectedPaciente && (
        <div className="details-container">
          <div className="details-header">
            <button className="back-btn" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              Voltar
            </button>
            <div className="details-actions">
              <button className="btn-secondary" onClick={() => handleEditPaciente(selectedPaciente)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
              </button>
            </div>
          </div>

          <div className="patient-profile">
            <div className="profile-avatar">
              {selectedPaciente.nome.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{selectedPaciente.nome}</h2>
              <span className={`status-badge ${selectedPaciente.status}`}>
                {selectedPaciente.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
              <span className={`cadastro-badge ${isCadastroCompleto(selectedPaciente) ? 'completo' : 'incompleto'}`}>
                {isCadastroCompleto(selectedPaciente) ? 'Cadastro completo' : 'Cadastro incompleto'}
              </span>
            </div>
          </div>

          {!isCadastroCompleto(selectedPaciente) && getCamposFaltantes(selectedPaciente).length > 0 && (
            <div className="cadastro-alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <strong>Cadastro incompleto.</strong> Faltam: {getCamposFaltantes(selectedPaciente).join(', ')}.
              </div>
            </div>
          )}

          <div className="details-grid">
            <div className="detail-card">
              <h4>Dados Pessoais</h4>
              <div className="detail-row">
                <span className="detail-label">CPF</span>
                <span className="detail-value">{selectedPaciente.cpf || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Data de Nascimento</span>
                <span className="detail-value">
                  {selectedPaciente.data_nascimento ? `${formatDate(selectedPaciente.data_nascimento)} (${calcularIdade(selectedPaciente.data_nascimento)})` : '-'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Sexo</span>
                <span className="detail-value">
                  {selectedPaciente.sexo === 'masculino' ? 'Masculino' : 
                   selectedPaciente.sexo === 'feminino' ? 'Feminino' : 
                   selectedPaciente.sexo === 'nao_especificar' ? 'Não especificar' : '-'}
                </span>
              </div>
            </div>

            <div className="detail-card">
              <h4>Contato</h4>
              <div className="detail-row">
                <span className="detail-label">Telefone</span>
                <span className="detail-value">{selectedPaciente.telefone || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">E-mail</span>
                <span className="detail-value">{selectedPaciente.email || '-'}</span>
              </div>
            </div>

            <div className="detail-card">
              <h4>Endereço</h4>
              <div className="detail-row">
                <span className="detail-label">CEP</span>
                <span className="detail-value">{selectedPaciente.cep || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Endereço</span>
                <span className="detail-value">{selectedPaciente.endereco || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Número</span>
                <span className="detail-value">{selectedPaciente.numero || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Complemento</span>
                <span className="detail-value">{selectedPaciente.complemento || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Bairro</span>
                <span className="detail-value">{selectedPaciente.bairro || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cidade/Estado</span>
                <span className="detail-value">
                  {selectedPaciente.cidade || selectedPaciente.estado 
                    ? `${selectedPaciente.cidade || ''}${selectedPaciente.cidade && selectedPaciente.estado ? ' - ' : ''}${selectedPaciente.estado || ''}`
                    : '-'}
                </span>
              </div>
            </div>

            <div className="detail-card">
              <h4>Convênio</h4>
              <div className="detail-row">
                <span className="detail-label">Convênio</span>
                <span className="detail-value">{selectedPaciente.convenio || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Número</span>
                <span className="detail-value">{selectedPaciente.numero_convenio || '-'}</span>
              </div>
            </div>

            {selectedPaciente.observacoes && (
              <div className="detail-card full">
                <h4>Observações</h4>
                <p className="observations">{selectedPaciente.observacoes}</p>
              </div>
            )}

            <div className="detail-card full">
              <h4>Informações do Sistema</h4>
              <div className="detail-row">
                <span className="detail-label">Data de Cadastro</span>
                <span className="detail-value">{formatDate(selectedPaciente.data_cadastro)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Última Atualização</span>
                <span className="detail-value">{formatDate(selectedPaciente.data_atualizacao)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
