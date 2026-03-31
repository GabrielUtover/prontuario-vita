import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { bundledDocuments } from '../data'
import './ReceitasPage.css'

// Componente Autocomplete Customizado
interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  onAddNew?: (value: string) => void | Promise<void>
  placeholder?: string
  className?: string
}

function AutocompleteInput({ value, onChange, options, onAddNew, placeholder, className }: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState<string[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      const filtered = options.filter(opt => 
        opt.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredOptions(filtered)
    } else {
      setFilteredOptions(options)
    }
  }, [value, options])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
  }

  const handleAddNew = async () => {
    if (value && onAddNew) {
      await onAddNew(value)
      // Recarregar opções após adicionar (será feito pelo componente pai)
    }
    setIsOpen(false)
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text
    return (
      <>
        {text.slice(0, index)}
        <strong>{text.slice(index, index + query.length)}</strong>
        {text.slice(index + query.length)}
      </>
    )
  }

  const showAddOption = value && !options.some(opt => opt.toLowerCase() === value.toLowerCase())

  return (
    <div className={`autocomplete-wrapper ${className || ''}`} ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="autocomplete-input"
      />
      {isOpen && (filteredOptions.length > 0 || showAddOption) && (
        <div className="autocomplete-dropdown">
          {showAddOption && onAddNew && (
            <div className="autocomplete-add-option" onClick={handleAddNew}>
              Adicionar <strong>{value}</strong>...
            </div>
          )}
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className="autocomplete-option"
              onClick={() => handleSelect(option)}
            >
              {highlightMatch(option, value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Interfaces (snake_case para corresponder ao banco)
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

interface ItemReceita {
  id: string
  receita_id?: string
  medicacao: string
  dose: string | null
  unidade: string | null
  quantidade: string | null
  apresentacao: string | null
  via: string | null
  posologia: string | null
  observacao: string | null
}

interface Receita {
  id: string
  paciente_id: string
  paciente_nome?: string // Para exibição, não vem do banco
  data: string
  tipo: 'normal' | 'especial'
  itens: ItemReceita[]
  observacao_geral: string | null
  status: 'rascunho' | 'emitida'
  created_at?: string
}

interface ReceitaPadrao {
  id: string
  nome: string
  texto: string
  dataCriacao?: string
  created_at?: string
}

// Dados padrão para dropdowns
const medicacoesPadrao = [
  'Dipirona', 'Paracetamol', 'Ibuprofeno', 'Amoxicilina', 'Azitromicina',
  'Omeprazol', 'Losartana', 'Metformina', 'Sinvastatina', 'Rivotril',
  'Diazepam', 'Clonazepam', 'Fluoxetina', 'Sertralina', 'Captopril'
]

const unidadesPadrao = ['mg', 'g', 'ml', 'UI', 'mcg', 'gotas']
const apresentacoesPadrao = ['Comprimido', 'Cápsula', 'Solução', 'Suspensão', 'Injetável', 'Pomada', 'Creme', 'Gotas']
const viasPadrao = ['Oral', 'Sublingual', 'Intravenosa', 'Intramuscular', 'Tópica', 'Retal', 'Nasal', 'Oftálmica']
const posologiasPadrao = [
  'tomar 1 comp. ao dia',
  'tomar 1 comp. de 12/12h',
  'tomar 1 comp. de 8/8h',
  'tomar 1 comp. ao deitar',
  'tomar 1 comp. em jejum',
  'aplicar na região afetada'
]

// Data de hoje no formato YYYY-MM-DD
const getHojeISO = () => new Date().toISOString().slice(0, 10)

// Item da agenda do dia
interface AgendaItem {
  id: string
  paciente_id: string
  data_agenda: string
  observacao: string | null
  created_at: string
  paciente?: Paciente
}

// Funções para carregar listas do banco de dados
const loadListFromDB = async (tableName: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('nome')
      .order('nome')

    if (error) {
      console.error(`Erro ao carregar ${tableName}:`, error)
      return []
    }

    return data?.map(item => item.nome) || []
  } catch (err) {
    console.error(`Erro ao carregar ${tableName}:`, err)
    return []
  }
}

const saveItemToDB = async (tableName: string, nome: string): Promise<boolean> => {
  try {
    // Normalizar nome (trim e verificar se não está vazio)
    const nomeNormalizado = nome?.trim()
    if (!nomeNormalizado) {
      console.warn(`Tentativa de salvar ${tableName} com nome vazio`)
      return false
    }

    console.log(`[${tableName}] Tentando salvar:`, nomeNormalizado)

    // Verificar se já existe (case-insensitive) - usar maybeSingle para não dar erro se não existir
    const { data: existing, error: checkError } = await supabase
      .from(tableName)
      .select('id, nome')
      .ilike('nome', nomeNormalizado)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = nenhum resultado encontrado (é esperado)
      console.error(`[${tableName}] Erro ao verificar existente:`, checkError)
      // Continuar mesmo com erro na verificação
    }

    if (existing) {
      console.log(`[${tableName}] "${nomeNormalizado}" já existe no banco (ID: ${existing.id})`)
      return true // Retornar true mesmo se já existe, para não bloquear
    }

    // Inserir novo item
    console.log(`[${tableName}] Inserindo novo item:`, nomeNormalizado)
    const { data, error } = await supabase
      .from(tableName)
      .insert({ nome: nomeNormalizado })
      .select()
      .single()

    if (error) {
      console.error(`[${tableName}] Erro ao inserir:`, error)
      console.error(`[${tableName}] Detalhes completos:`, {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Se o erro for de duplicata (código 23505), considerar sucesso
      if (error.code === '23505') {
        console.log(`[${tableName}] Item já existe (duplicata detectada), considerando sucesso`)
        return true
      }
      
      return false
    }

    if (data) {
      console.log(`[${tableName}] "${nomeNormalizado}" salvo com sucesso! ID:`, data.id)
      return true
    } else {
      console.warn(`[${tableName}] Inserção retornou sem dados`)
      return false
    }
  } catch (err: any) {
    console.error(`[${tableName}] Erro inesperado:`, err)
    console.error(`[${tableName}] Stack:`, err?.stack)
    return false
  }
}

// Funções auxiliares
const generateId = () => `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const calcularIdade = (dataNascimento: string | null) => {
  if (!dataNascimento) return ''
  const hoje = new Date()
  const nascimento = new Date(dataNascimento)
  let anos = hoje.getFullYear() - nascimento.getFullYear()
  let meses = hoje.getMonth() - nascimento.getMonth()
  let dias = hoje.getDate() - nascimento.getDate()
  
  if (dias < 0) {
    meses--
    dias += 30
  }
  if (meses < 0) {
    anos--
    meses += 12
  }
  
  return `${anos} ANOS, ${meses} MESES E ${dias} DIAS`
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR')
}

export function ReceitasPage() {
  // Auth context
  const { usuario } = useAuth()
  
  // Estados
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [receitas, setReceitas] = useState<Receita[]>([])
  const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null)
  const [itensReceita, setItensReceita] = useState<ItemReceita[]>([])
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null)
  const [filtroHistorico, setFiltroHistorico] = useState<'30dias' | '6meses' | '2anos' | 'todos'>('todos')
  const [showPacienteSelector, setShowPacienteSelector] = useState(true)
  const [searchPaciente, setSearchPaciente] = useState('')
  const [showVisualizarModal, setShowVisualizarModal] = useState(false)
  const [receitaVisualizando, setReceitaVisualizando] = useState<Receita | null>(null)
  const [historicoExpandido, setHistoricoExpandido] = useState(true)
  const [agendaDia, setAgendaDia] = useState<AgendaItem[]>([])
  const [tabPacienteSelector, setTabPacienteSelector] = useState<'todos' | 'agenda'>('todos')
  const [showAgendaPopup, setShowAgendaPopup] = useState(false)
  
  // Estados para Padrões de Receita
  const [padroes, setPadroes] = useState<ReceitaPadrao[]>([])
  const [showSalvarPadraoModal, setShowSalvarPadraoModal] = useState(false)
  const [showListarPadroesModal, setShowListarPadroesModal] = useState(false)
  const [nomePadrao, setNomePadrao] = useState('')
  const [searchPadrao, setSearchPadrao] = useState('')
  
  // Listas customizáveis
  const [medicacoes, setMedicacoes] = useState<string[]>([])
  const [unidades, setUnidades] = useState<string[]>([])
  const [apresentacoes, setApresentacoes] = useState<string[]>([])
  const [vias, setVias] = useState<string[]>([])
  const [posologias, setPosologias] = useState<string[]>([])
  
  // Estados do formulário de item
  const [novoItem, setNovoItem] = useState<Partial<ItemReceita>>({
    medicacao: '',
    dose: '',
    unidade: '',
    quantidade: '',
    apresentacao: '',
    via: '',
    posologia: '',
    observacao: ''
  })
  const [textoReceita, setTextoReceita] = useState('')

  // Carregar pacientes do Supabase
  const loadPacientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')

      if (error) throw error
      setPacientes(data || [])
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err)
    }
  }, [])

  // Carregar receitas do Supabase
  const loadReceitas = useCallback(async () => {
    try {
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select('*')
        .order('data', { ascending: false })

      if (receitasError) throw receitasError

      if (receitasData && receitasData.length > 0) {
        // Carregar itens de cada receita
        const receitasComItens = await Promise.all(
          receitasData.map(async (receita) => {
            const { data: itensData, error: itensError } = await supabase
              .from('receita_itens')
              .select('*')
              .eq('receita_id', receita.id)
              .order('id')

            if (itensError) throw itensError

            // Buscar nome do paciente
            const { data: pacienteData } = await supabase
              .from('pacientes')
              .select('nome')
              .eq('id', receita.paciente_id)
              .single()

            return {
              ...receita,
              itens: itensData || [],
              paciente_nome: pacienteData?.nome || 'Paciente não encontrado'
            } as Receita
          })
        )

        setReceitas(receitasComItens)
      } else {
        setReceitas([])
      }
    } catch (err) {
      console.error('Erro ao carregar receitas:', err)
    }
  }, [])

  // Carregar listas do banco de dados
  const loadListas = useCallback(async () => {
    const [meds, unis, apres, viasList, posList] = await Promise.all([
      loadListFromDB('medicacoes'),
      loadListFromDB('unidades'),
      loadListFromDB('apresentacoes'),
      loadListFromDB('vias'),
      loadListFromDB('posologias')
    ])

    // Se não houver dados no banco, usar os padrões e inserir
    if (meds.length === 0 && medicacoesPadrao.length > 0) {
      for (const med of medicacoesPadrao) {
        await saveItemToDB('medicacoes', med)
      }
      setMedicacoes(medicacoesPadrao)
    } else {
      setMedicacoes(meds)
    }

    if (unis.length === 0 && unidadesPadrao.length > 0) {
      for (const uni of unidadesPadrao) {
        await saveItemToDB('unidades', uni)
      }
      setUnidades(unidadesPadrao)
    } else {
      setUnidades(unis)
    }

    if (apres.length === 0 && apresentacoesPadrao.length > 0) {
      for (const apr of apresentacoesPadrao) {
        await saveItemToDB('apresentacoes', apr)
      }
      setApresentacoes(apresentacoesPadrao)
    } else {
      setApresentacoes(apres)
    }

    if (viasList.length === 0 && viasPadrao.length > 0) {
      for (const via of viasPadrao) {
        await saveItemToDB('vias', via)
      }
      setVias(viasPadrao)
    } else {
      setVias(viasList)
    }

    if (posList.length === 0 && posologiasPadrao.length > 0) {
      for (const pos of posologiasPadrao) {
        await saveItemToDB('posologias', pos)
      }
      setPosologias(posologiasPadrao)
    } else {
      setPosologias(posList)
    }
  }, [])

  // Carregar padrões do banco de dados
  const loadPadroes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('receita_padroes')
        .select('*')
        .order('nome')

      if (error) {
        console.error('Erro ao carregar padrões:', error)
        setPadroes([])
        return
      }

      const padroesFormatados: ReceitaPadrao[] = (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        texto: p.texto,
        dataCriacao: p.created_at,
        created_at: p.created_at
      }))

      setPadroes(padroesFormatados)
    } catch (err) {
      console.error('Erro ao carregar padrões:', err)
      setPadroes([])
    }
  }, [])

  // Carregar dados
  useEffect(() => {
    loadPacientes()
    loadReceitas()
    loadListas()
    loadPadroes()
  }, [loadPacientes, loadReceitas, loadListas, loadPadroes])

  // Carregar agenda do dia
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
    loadAgendaDia()
  }, [loadAgendaDia])

  const [searchParams] = useSearchParams()
  useEffect(() => {
    const pacienteId = searchParams.get('paciente')
    if (pacienteId && pacientes.length > 0) {
      const p = pacientes.find(x => x.id === pacienteId)
      if (p) {
        setPacienteSelecionado(p)
        setShowPacienteSelector(false)
      }
    }
  }, [searchParams, pacientes])

  // Recarregar pacientes e agenda quando a aba/janela ganhar foco
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadPacientes()
        loadAgendaDia()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadPacientes, loadAgendaDia])

  // Atualizar lista automaticamente quando a recepção inserir/alterar um paciente (Supabase Realtime)
  useEffect(() => {
    const channel = supabase
      .channel('receitas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pacientes' },
        () => {
          loadPacientes()
          loadAgendaDia()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_dia' },
        () => {
          loadAgendaDia()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadPacientes, loadAgendaDia])

  // Salvar receita no Supabase
  const saveReceita = async (receita: Receita) => {
    try {
      // Buscar nome do paciente se não estiver na receita
      let pacienteNome = receita.paciente_nome
      if (!pacienteNome && receita.paciente_id) {
        const { data: pacienteData } = await supabase
          .from('pacientes')
          .select('nome')
          .eq('id', receita.paciente_id)
          .single()
        pacienteNome = pacienteData?.nome || 'Paciente não encontrado'
      }

      // Salvar receita principal
      const { data: receitaData, error: receitaError } = await supabase
        .from('receitas')
        .insert({
          paciente_id: receita.paciente_id,
          paciente_nome: pacienteNome,
          data: receita.data,
          tipo: receita.tipo,
          observacao_geral: receita.observacao_geral,
          status: receita.status
        })
        .select()
        .single()

      if (receitaError) {
        console.error('Erro ao salvar receita principal:', receitaError)
        throw new Error(`Erro ao salvar receita: ${receitaError.message || receitaError.code || 'Erro desconhecido'}`)
      }

      if (!receitaData) {
        throw new Error('Receita não foi salva. Nenhum dado retornado.')
      }

      // Salvar itens da receita
      if (receita.itens && receita.itens.length > 0) {
        const itensParaSalvar = receita.itens.map(item => {
          // Converter strings vazias para null
          const itemToSave = {
            receita_id: receitaData.id,
            medicacao: item.medicacao || '',
            dose: item.dose && item.dose.trim() ? item.dose.trim() : null,
            unidade: item.unidade && item.unidade.trim() ? item.unidade.trim() : null,
            quantidade: item.quantidade && item.quantidade.trim() ? item.quantidade.trim() : null,
            apresentacao: item.apresentacao && item.apresentacao.trim() ? item.apresentacao.trim() : null,
            via: item.via && item.via.trim() ? item.via.trim() : null,
            posologia: item.posologia && item.posologia.trim() ? item.posologia.trim() : null,
            observacao: item.observacao && item.observacao.trim() ? item.observacao.trim() : null
          }
          
          // Log para debug
          console.log('Item a ser salvo:', itemToSave)
          
          return itemToSave
        })

        console.log('Itens para salvar no banco:', itensParaSalvar)

        // Verificar sessão antes de inserir
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          console.error('Erro de sessão:', sessionError)
          throw new Error('Usuário não autenticado. Faça login novamente.')
        }
        console.log('Sessão válida:', session.user.email)

        // Tentar inserir os itens um por um para identificar qual está falhando
        for (let i = 0; i < itensParaSalvar.length; i++) {
          const item = itensParaSalvar[i]
          console.log(`Inserindo item ${i + 1}/${itensParaSalvar.length}:`, item)
          
          const { data: insertedData, error: itemError } = await supabase
            .from('receita_itens')
            .insert(item)
            .select()
            .single()

          if (itemError) {
            console.error(`Erro ao inserir item ${i + 1}:`, itemError)
            console.error('Detalhes completos:', {
              message: itemError.message,
              code: itemError.code,
              details: itemError.details,
              hint: itemError.hint
            })
            throw new Error(`Erro ao salvar item ${i + 1}: ${itemError.message || itemError.code || 'Erro desconhecido'}`)
          }
          
          console.log(`Item ${i + 1} salvo com sucesso:`, insertedData)
        }
      }

      // Recarregar receitas
      await loadReceitas()
      return receitaData
    } catch (err) {
      console.error('Erro completo ao salvar receita:', err)
      // Se já é um Error com mensagem, relançar
      if (err instanceof Error) {
        throw err
      }
      // Caso contrário, criar um Error com a mensagem
      const errorMessage = typeof err === 'string' ? err : JSON.stringify(err)
      throw new Error(`Erro ao salvar receita: ${errorMessage}`)
    }
  }

  // Funções para Padrões de Receita
  const handleSalvarPadrao = async () => {
    if (!nomePadrao.trim()) {
      alert('Digite um nome para o padrão.')
      return
    }
    if (!textoReceita.trim()) {
      alert('A receita está vazia.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('receita_padroes')
        .insert({
          nome: nomePadrao.trim(),
          texto: textoReceita
        })
        .select()
        .single()

      if (error) throw error

      const novoPadrao: ReceitaPadrao = {
        id: data.id,
        nome: data.nome,
        texto: data.texto,
        dataCriacao: data.created_at,
        created_at: data.created_at
      }

      setPadroes([...padroes, novoPadrao])
      setNomePadrao('')
      setShowSalvarPadraoModal(false)
      alert('Padrão salvo com sucesso!')
    } catch (err) {
      console.error('Erro ao salvar padrão:', err)
      alert('Erro ao salvar padrão. Tente novamente.')
    }
  }

  const handleAdicionarPadrao = (padrao: ReceitaPadrao) => {
    setTextoReceita(prev => prev ? `${prev}\n\n${padrao.texto}` : padrao.texto)
  }

  const handleExcluirPadrao = async (padraoId: string) => {
    if (!confirm('Deseja realmente excluir este padrão?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('receita_padroes')
        .delete()
        .eq('id', padraoId)

      if (error) throw error

      const novosPadroes = padroes.filter(p => p.id !== padraoId)
      setPadroes(novosPadroes)
      alert('Padrão excluído com sucesso!')
    } catch (err) {
      console.error('Erro ao excluir padrão:', err)
      alert('Erro ao excluir padrão. Tente novamente.')
    }
  }

  const getPadroesFiltrados = () => {
    let filtered = padroes
    if (searchPadrao) {
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(searchPadrao.toLowerCase())
      )
    }
    return filtered.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  // Handlers para adicionar novos itens às listas
  const handleAddMedicacao = async (valor: string) => {
    if (valor && !medicacoes.includes(valor)) {
      const saved = await saveItemToDB('medicacoes', valor)
      if (saved) {
        // Recarregar lista do banco
        const updated = await loadListFromDB('medicacoes')
        setMedicacoes(updated)
      }
    }
  }

  const handleAddUnidade = async (valor: string) => {
    if (valor && !unidades.includes(valor)) {
      const saved = await saveItemToDB('unidades', valor)
      if (saved) {
        const updated = await loadListFromDB('unidades')
        setUnidades(updated)
      }
    }
  }

  const handleAddApresentacao = async (valor: string) => {
    const valorTrimmed = valor?.trim()
    if (!valorTrimmed) {
      console.warn('Tentativa de adicionar apresentação vazia')
      return
    }

    // Verificar se já existe (case-insensitive)
    const jaExiste = apresentacoes.some(a => a.toLowerCase() === valorTrimmed.toLowerCase())
    
    if (jaExiste) {
      console.log(`Apresentação "${valorTrimmed}" já existe na lista`)
      // Mesmo assim, tentar salvar no banco caso não esteja sincronizado
      console.log('Verificando se está no banco...')
    }

    console.log(`[APRESENTAÇÃO] Iniciando processo de salvamento: "${valorTrimmed}"`)
    
    // Teste direto de inserção para diagnóstico
    try {
      console.log('[APRESENTAÇÃO] Testando inserção direta...')
      const { data: testData, error: testError } = await supabase
        .from('apresentacoes')
        .insert({ nome: valorTrimmed })
        .select()
        .single()

      if (testError) {
        console.error('[APRESENTAÇÃO] Erro na inserção direta:', testError)
        console.error('[APRESENTAÇÃO] Código do erro:', testError.code)
        console.error('[APRESENTAÇÃO] Mensagem:', testError.message)
        console.error('[APRESENTAÇÃO] Detalhes:', testError.details)
        console.error('[APRESENTAÇÃO] Hint:', testError.hint)
        
        // Se for erro de duplicata, considerar sucesso
        if (testError.code === '23505') {
          console.log('[APRESENTAÇÃO] Item já existe (duplicata), considerando sucesso')
        } else {
          alert(`Erro ao salvar apresentação: ${testError.message || testError.code || 'Erro desconhecido'}`)
          return
        }
      } else if (testData) {
        console.log('[APRESENTAÇÃO] Item salvo com sucesso!', testData)
      }
    } catch (err: any) {
      console.error('[APRESENTAÇÃO] Erro inesperado:', err)
      alert(`Erro inesperado ao salvar apresentação: ${err?.message || 'Erro desconhecido'}`)
      return
    }

    // Recarregar lista após salvar
    console.log('[APRESENTAÇÃO] Recarregando lista do banco...')
    const updated = await loadListFromDB('apresentacoes')
    setApresentacoes(updated)
    console.log('[APRESENTAÇÃO] Lista atualizada:', updated)
  }

  const handleAddVia = async (valor: string) => {
    if (valor && !vias.includes(valor)) {
      const saved = await saveItemToDB('vias', valor)
      if (saved) {
        const updated = await loadListFromDB('vias')
        setVias(updated)
      }
    }
  }

  const handleAddPosologia = async (valor: string) => {
    if (valor && !posologias.includes(valor)) {
      const saved = await saveItemToDB('posologias', valor)
      if (saved) {
        const updated = await loadListFromDB('posologias')
        setPosologias(updated)
      }
    }
  }

  // Filtrar histórico
  const getReceitasFiltradas = useCallback(() => {
    let filtered = receitas
    
    if (pacienteSelecionado) {
      filtered = filtered.filter(r => r.paciente_id === pacienteSelecionado.id)
    }
    
    const hoje = new Date()
    switch (filtroHistorico) {
      case '30dias':
        filtered = filtered.filter(r => {
          const data = new Date(r.data)
          const diff = (hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24)
          return diff <= 30
        })
        break
      case '6meses':
        filtered = filtered.filter(r => {
          const data = new Date(r.data)
          const diff = (hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24)
          return diff <= 180
        })
        break
      case '2anos':
        filtered = filtered.filter(r => {
          const data = new Date(r.data)
          const diff = (hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24)
          return diff <= 730
        })
        break
    }
    
    return filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [receitas, pacienteSelecionado, filtroHistorico])

  // Handlers
  const handleSelectPaciente = (paciente: Paciente) => {
    setPacienteSelecionado(paciente)
    setShowPacienteSelector(false)
    setSearchPaciente('')
    setItensReceita([])
    setReceitaSelecionada(null)
  }

  const gerarTextoItem = (item: ItemReceita) => {
    let texto = `${item.medicacao}`
    if (item.dose) texto += ` ${item.dose}`
    if (item.unidade) texto += ` ${item.unidade}`
    if (item.quantidade) texto += ` -----------${item.quantidade} ${item.apresentacao || 'cx'}`
    if (item.via) texto += `\n${item.via}`
    if (item.posologia) texto += ` - ${item.posologia}`
    if (item.observacao) texto += `\nObs: ${item.observacao}`
    return texto
  }

  const handleAddItem = () => {
    if (!novoItem.medicacao) return
    
    const item: ItemReceita = {
      id: generateId(),
      medicacao: novoItem.medicacao || '',
      dose: novoItem.dose || null,
      unidade: novoItem.unidade || null,
      quantidade: novoItem.quantidade || null,
      apresentacao: novoItem.apresentacao || null,
      via: novoItem.via || null,
      posologia: novoItem.posologia || null,
      observacao: novoItem.observacao || null
    }
    
    const novoTexto = gerarTextoItem(item)
    setTextoReceita(prev => prev ? `${prev}\n\n${novoTexto}` : novoTexto)
    
    setItensReceita([...itensReceita, item])
    
    // Retrair histórico quando adicionar itens
    if (historicoExpandido) {
      setHistoricoExpandido(false)
    }
    setNovoItem({
      medicacao: '',
      dose: '',
      unidade: '',
      quantidade: '',
      apresentacao: '',
      via: '',
      posologia: '',
      observacao: ''
    })
  }

  const handleRemoveItem = (itemId: string) => {
    setItensReceita(itensReceita.filter(i => i.id !== itemId))
  }

  const handleLimpar = () => {
    setItensReceita([])
    setTextoReceita('')
    setNovoItem({
      medicacao: '',
      dose: '',
      unidade: '',
      quantidade: '',
      apresentacao: '',
      via: '',
      posologia: '',
      observacao: ''
    })
  }

  const handleEmitirReceita = async (tipo: 'normal' | 'especial') => {
    if (!pacienteSelecionado) {
      alert('Selecione um paciente.')
      return
    }
    
    if (!textoReceita.trim()) {
      alert('Adicione itens ou digite o texto da receita.')
      return
    }

    const novaReceita: Receita = {
      id: generateId(),
      paciente_id: pacienteSelecionado.id,
      paciente_nome: pacienteSelecionado.nome,
      data: new Date().toISOString(),
      tipo,
      itens: itensReceita,
      observacao_geral: textoReceita,
      status: 'emitida'
    }

    try {
      await saveReceita(novaReceita)
      setReceitaSelecionada(novaReceita)
      
      // Buscar o modelo de documento
      const modeloNome = tipo === 'especial' ? 'RECEITA ESPECIAL 1.0' : null
      const modelo = modeloNome ? bundledDocuments.find(d => d.name === modeloNome) : null
      
      if (modelo) {
        try {
          // Buscar idade do paciente na view pacientes_com_idade
          let idadePaciente = ''
          try {
            const { data: pacienteComIdade, error: idadeError } = await supabase
              .from('pacientes_com_idade')
              .select('idade_anos')
              .eq('id', pacienteSelecionado.id)
              .single()

            if (!idadeError && pacienteComIdade?.idade_anos !== null && pacienteComIdade?.idade_anos !== undefined) {
              idadePaciente = pacienteComIdade.idade_anos.toString()
            } else {
              // Fallback: calcular idade manualmente se a view não estiver disponível
              if (pacienteSelecionado.data_nascimento) {
                const hoje = new Date()
                const nascimento = new Date(pacienteSelecionado.data_nascimento)
                let anos = hoje.getFullYear() - nascimento.getFullYear()
                const mes = hoje.getMonth() - nascimento.getMonth()
                if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
                  anos--
                }
                idadePaciente = anos.toString()
              }
            }
          } catch (err) {
            console.warn('Erro ao buscar idade do paciente:', err)
            // Fallback: calcular idade manualmente
            if (pacienteSelecionado.data_nascimento) {
              const hoje = new Date()
              const nascimento = new Date(pacienteSelecionado.data_nascimento)
              let anos = hoje.getFullYear() - nascimento.getFullYear()
              const mes = hoje.getMonth() - nascimento.getMonth()
              if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
                anos--
              }
              idadePaciente = anos.toString()
            }
          }

          // Preparar variáveis para substituição
          const enderecoCompleto = [
            pacienteSelecionado.endereco,
            pacienteSelecionado.cidade,
            pacienteSelecionado.estado
          ].filter(Boolean).join(', ')
          
          const variaveis: Record<string, string> = {
            '{{paciente}}': pacienteSelecionado.nome.toUpperCase(),
            '{{paciente_end}}': enderecoCompleto || 'Não informado',
            '{{idade}}': idadePaciente || 'Não informado',
            '{{receita}}': textoReceita
          }
          
          // Gerar documento e imprimir
          imprimirDocumento(modelo.data, variaveis)
        } catch (printErr) {
          console.error('Erro ao imprimir documento:', printErr)
          alert('Receita salva com sucesso, mas houve um erro ao abrir a impressão. Verifique o console para mais detalhes.')
        }
      } else {
        if (tipo === 'especial') {
          console.warn('Modelo de receita especial não encontrado. Nome buscado:', modeloNome)
          alert('Receita salva com sucesso, mas o modelo de impressão não foi encontrado.')
        } else {
          alert(`Receita Normal emitida com sucesso!`)
        }
      }
    } catch (err: any) {
      console.error('Erro completo ao salvar receita:', err)
      
      // Tentar extrair mensagem de erro do Supabase
      let errorMessage = 'Erro desconhecido'
      
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.error?.message) {
        errorMessage = err.error.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.code) {
        errorMessage = `Erro ${err.code}: ${err.message || 'Erro ao salvar receita'}`
      }
      
      alert(`Erro ao salvar receita: ${errorMessage}`)
    }
  }

  const imprimirDocumento = (
    documento: typeof bundledDocuments[0]['data'],
    variaveis: Record<string, string>
  ) => {
    try {
      // Validar documento
      if (!documento || !documento.objects) {
        throw new Error('Documento inválido: objetos não encontrados')
      }

      // Dimensões da página
      const isLandscape = documento.pageOrientation === 'landscape'
      const pageWidth = isLandscape ? 297 : 210 // mm
      const pageHeight = isLandscape ? 210 : 297 // mm
      
      // Criar janela de impressão
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Por favor, permita popups para imprimir.')
        return
      }

      // Substituir variáveis nos objetos
      const objetosProcessados = (documento.objects as Array<{
        id: string
        type: string
        x: number
        y: number
        width: number
        height: number
        bgColor?: string
        borderColor?: string
        borderWidth?: number
        text?: string
        textAlign?: string
        textVAlign?: string
      }>).map(obj => {
        let textoProcessado = obj.text || ''
        Object.entries(variaveis).forEach(([chave, valor]) => {
          textoProcessado = textoProcessado.replace(new RegExp(chave.replace(/[{}]/g, '\\$&'), 'g'), valor)
        })
        return { ...obj, text: textoProcessado }
      })

      // Gerar HTML dos retângulos
      const retangulosHTML = objetosProcessados.map(obj => {
        const justifyContent = obj.textVAlign === 'top' ? 'flex-start' : obj.textVAlign === 'bottom' ? 'flex-end' : 'center'
        const textAlign = obj.textAlign || 'left'
        
        return `
          <div style="
            position: absolute;
            left: ${obj.x}px;
            top: ${obj.y}px;
            width: ${obj.width}px;
            height: ${obj.height}px;
            background-color: ${obj.bgColor || 'transparent'};
            border: ${obj.borderWidth || 0}px solid ${obj.borderColor || 'transparent'};
            display: flex;
            align-items: ${justifyContent};
            justify-content: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
            padding: 4px 8px;
            box-sizing: border-box;
            font-family: ${documento.fontFamily || 'Arial'}, sans-serif;
            font-size: ${documento.fontSize || 12}px;
            white-space: pre-wrap;
            overflow: hidden;
          ">${(obj.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        `
      }).join('')

      // Construir HTML da página
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receita Especial</title>
          <style>
            @page {
              size: ${pageWidth}mm ${pageHeight}mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: ${pageWidth}mm;
              height: ${pageHeight}mm;
              margin: 0;
              padding: 0;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page {
              position: relative;
              width: ${pageWidth}mm;
              height: ${pageHeight}mm;
              ${documento.backgroundImage ? `background-image: url('${documento.backgroundImage}');` : ''}
              background-size: 100% 100%;
              background-repeat: no-repeat;
              background-position: center;
              overflow: hidden;
            }
            @media print {
              html, body {
                width: ${pageWidth}mm;
                height: ${pageHeight}mm;
              }
              .page {
                page-break-after: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            ${retangulosHTML}
          </div>
        </body>
        </html>
      `

      printWindow.document.write(html)
      printWindow.document.close()

      // Aguardar carregamento e imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    } catch (err) {
      console.error('Erro ao imprimir documento:', err)
      alert(`Erro ao gerar impressão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      throw err
    }
  }

  // const handleCopiarReceita = (receita: Receita) => {
  //   setItensReceita(receita.itens)
  //   setReceitaSelecionada(receita)
  //   // Gerar texto da receita copiada
  //   const texto = receita.observacao_geral || receita.itens.map(item => gerarTextoItem(item)).join('\n\n')
  //   setTextoReceita(texto)
  // } // Removido: não utilizado

  const handleVisualizarReceita = (receita: Receita) => {
    setReceitaVisualizando(receita)
    setShowVisualizarModal(true)
  }

  const handleImprimirHistorico = async (receita: Receita) => {
    // Buscar paciente
    const paciente = pacientes.find(p => p.id === receita.paciente_id)
    
    if (!paciente) {
      alert('Paciente não encontrado.')
      return
    }
    
    // Buscar o modelo de documento
    const modelo = bundledDocuments.find(d => d.name === 'RECEITA ESPECIAL 1.0')
    
    if (modelo) {
      try {
        // Buscar idade do paciente na view pacientes_com_idade
        let idadePaciente = ''
        try {
          const { data: pacienteComIdade, error: idadeError } = await supabase
            .from('pacientes_com_idade')
            .select('idade_anos')
            .eq('id', paciente.id)
            .single()

          if (!idadeError && pacienteComIdade?.idade_anos !== null && pacienteComIdade?.idade_anos !== undefined) {
            idadePaciente = pacienteComIdade.idade_anos.toString()
          } else {
            // Fallback: calcular idade manualmente
            if (paciente.data_nascimento) {
              const hoje = new Date()
              const nascimento = new Date(paciente.data_nascimento)
              let anos = hoje.getFullYear() - nascimento.getFullYear()
              const mes = hoje.getMonth() - nascimento.getMonth()
              if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
                anos--
              }
              idadePaciente = anos.toString()
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar idade do paciente:', err)
          // Fallback: calcular idade manualmente
          if (paciente.data_nascimento) {
            const hoje = new Date()
            const nascimento = new Date(paciente.data_nascimento)
            let anos = hoje.getFullYear() - nascimento.getFullYear()
            const mes = hoje.getMonth() - nascimento.getMonth()
            if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
              anos--
            }
            idadePaciente = anos.toString()
          }
        }

        // Preparar variáveis para substituição
        const enderecoCompleto = [
          paciente.endereco,
          paciente.cidade,
          paciente.estado
        ].filter(Boolean).join(', ')
        
        // Gerar texto da receita a partir dos itens ou usar observacao_geral
        const textoReceitaHistorico = receita.observacao_geral || receita.itens.map(item => gerarTextoItem(item)).join('\n\n')
        
        const variaveis: Record<string, string> = {
          '{{paciente}}': paciente.nome.toUpperCase(),
          '{{paciente_end}}': enderecoCompleto || 'Não informado',
          '{{idade}}': idadePaciente || 'Não informado',
          '{{receita}}': textoReceitaHistorico
        }
        
        // Gerar documento e imprimir
        imprimirDocumento(modelo.data, variaveis)
      } catch (err) {
        console.error('Erro ao imprimir histórico:', err)
        alert('Erro ao gerar impressão. Verifique o console para mais detalhes.')
      }
    } else {
      alert('Modelo de receita não encontrado.')
    }
  }

  const handleCopiarItensParaReceita = () => {
    if (!receitaVisualizando) return
    
    // Copiar itens
    setItensReceita(receitaVisualizando.itens)
    
    // Gerar texto
    const texto = receitaVisualizando.observacao_geral || receitaVisualizando.itens.map(item => gerarTextoItem(item)).join('\n\n')
    setTextoReceita(texto)
    
    setShowVisualizarModal(false)
    setReceitaVisualizando(null)
  }

  // Pacientes filtrados para seleção
  // Pacientes da agenda do dia (com dados completos)
  const pacientesDaAgenda: Paciente[] = agendaDia
    .map(item => item.paciente || pacientes.find(p => p.id === item.paciente_id))
    .filter((p): p is Paciente => p != null && p.status === 'ativo')

  const filtroPaciente = (p: Paciente) =>
    p.status === 'ativo' &&
    (p.nome.toLowerCase().includes(searchPaciente.toLowerCase()) ||
     (p.cpf && p.cpf.includes(searchPaciente)))

  const pacientesFiltrados =
    tabPacienteSelector === 'agenda'
      ? pacientesDaAgenda.filter(filtroPaciente)
      : pacientes.filter(filtroPaciente)

  const linkProntuario = pacienteSelecionado
    ? `/prontuarios/paciente/${pacienteSelecionado.id}`
    : '/prontuarios'

  return (
    <div className="receitas-page">
      {/* Header */}
      <header className="receitas-header">
        <Link to={linkProntuario} className="receitas-btn-voltar-prontuario">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Voltar ao prontuário
        </Link>
        <div className="header-info">
          {pacienteSelecionado ? (
            <>
              <span className="info-item codigo">
                <strong>CÓDIGO:</strong> {pacienteSelecionado.id.slice(-6).toUpperCase()}
              </span>
              <span className="info-item nome">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {pacienteSelecionado.nome.toUpperCase()}
              </span>
              <span className="info-item convenio">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 12h6"/>
                  <path d="M12 9v6"/>
                </svg>
                {pacienteSelecionado.convenio || 'PARTICULAR'}
              </span>
              <span className="info-item idade">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {calcularIdade(pacienteSelecionado.data_nascimento)}
              </span>
              <button className="change-paciente-btn" onClick={() => setShowPacienteSelector(true)}>
                Trocar Paciente
              </button>
            </>
          ) : (
            <button className="select-paciente-btn" onClick={() => setShowPacienteSelector(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Selecionar Paciente
            </button>
          )}
        </div>
        <div className="header-medico">
          <span>Dr(a). {usuario?.nome || 'Usuário'}</span>
          <span className="crm">CRM: {usuario?.numero_conselho || '0000'}</span>
        </div>
      </header>

      {/* Popup Agenda do dia */}
      {showAgendaPopup && (
        <div className="modal-overlay" onClick={() => setShowAgendaPopup(false)}>
          <div className="modal-agenda-popup" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Agenda do dia
              </h3>
              <button type="button" className="close-btn" onClick={() => setShowAgendaPopup(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="agenda-popup-date">{formatDate(new Date().toISOString())}</p>
            {agendaDia.length === 0 ? (
              <div className="empty-list">
                <p>Nenhum paciente agendado para hoje.</p>
                <p className="agenda-popup-hint">Adicione pacientes na agenda pela tela de Pacientes.</p>
              </div>
            ) : (
              <ul className="agenda-popup-list">
                {agendaDia.map(item => {
                  const p = item.paciente || pacientes.find(x => x.id === item.paciente_id)
                  return (
                    <li key={item.id} className="agenda-popup-item">
                      <div className="agenda-popup-item-info">
                        <span className="agenda-popup-item-nome">{p?.nome || '—'}</span>
                        {p?.telefone && <span className="agenda-popup-item-tel">{p.telefone}</span>}
                      </div>
                      <button
                        type="button"
                        className="btn-selecionar-agenda"
                        onClick={() => {
                          if (p) {
                            setPacienteSelecionado(p)
                            setShowAgendaPopup(false)
                            setShowPacienteSelector(false)
                          }
                        }}
                      >
                        Selecionar para receita
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal Seleção de Paciente */}
      {showPacienteSelector && (
        <div className="modal-overlay" onClick={() => pacienteSelecionado && setShowPacienteSelector(false)}>
          <div className="modal-paciente" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{pacienteSelecionado ? 'Trocar Paciente' : 'Selecionar Paciente'}</h3>
              <div className="modal-header-actions">
                <button
                  type="button"
                  className="btn-atualizar-lista"
                  onClick={() => {
                    loadPacientes()
                    loadAgendaDia()
                  }}
                  title="Atualizar lista de pacientes"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23,4 23,10 17,10"/>
                    <polyline points="1,20 1,14 7,14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Atualizar lista
                </button>
                {pacienteSelecionado && (
                  <button className="close-btn" onClick={() => setShowPacienteSelector(false)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="modal-paciente-tabs">
              <button
                type="button"
                className={`tab-paciente ${tabPacienteSelector === 'todos' ? 'active' : ''}`}
                onClick={() => setTabPacienteSelector('todos')}
              >
                Todos os pacientes
              </button>
              <button
                type="button"
                className={`tab-paciente ${tabPacienteSelector === 'agenda' ? 'active' : ''}`}
                onClick={() => setTabPacienteSelector('agenda')}
              >
                Agenda do dia
              </button>
            </div>
            <div className="modal-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchPaciente}
                onChange={(e) => setSearchPaciente(e.target.value)}
                autoFocus
              />
            </div>
            {!pacienteSelecionado && (
              <div className="modal-aviso-obrigatorio">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Selecione um paciente para continuar</span>
              </div>
            )}
            <div className="modal-list">
              {pacientesFiltrados.length === 0 ? (
                <div className="empty-list">
                  <p>
                    {tabPacienteSelector === 'agenda'
                      ? agendaDia.length === 0
                        ? 'Nenhum paciente na agenda de hoje.'
                        : 'Nenhum paciente encontrado na busca.'
                      : 'Nenhum paciente encontrado'}
                  </p>
                  {tabPacienteSelector === 'todos' && (
                    <Link to="/pacientes" className="link-cadastrar">
                      Cadastrar novo paciente
                    </Link>
                  )}
                </div>
              ) : (
                pacientesFiltrados.map(p => (
                  <button
                    key={p.id}
                    className="paciente-item"
                    onClick={() => handleSelectPaciente(p)}
                  >
                    <div className="paciente-avatar">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="paciente-info">
                      <span className="nome">{p.nome}</span>
                      <span className="cpf">{p.cpf || '-'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            {!pacienteSelecionado && (
              <div className="modal-footer-voltar">
                <Link to="/home" className="btn-voltar-menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5"/>
                    <polyline points="12,19 5,12 12,5"/>
                  </svg>
                  Voltar ao Menu
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Visualizar Receita */}
      {showVisualizarModal && receitaVisualizando && (
        <div className="modal-overlay" onClick={() => { setShowVisualizarModal(false); setReceitaVisualizando(null); }}>
          <div className="modal-visualizar" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes da Receita</h3>
              <button className="close-btn" onClick={() => { setShowVisualizarModal(false); setReceitaVisualizando(null); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-receita-info">
              <div className="info-row">
                <span className="label">Data:</span>
                <span className="value">{formatDate(receitaVisualizando.data)}</span>
              </div>
              <div className="info-row">
                <span className="label">Paciente:</span>
                <span className="value">{receitaVisualizando.paciente_nome || 'Paciente não encontrado'}</span>
              </div>
              <div className="info-row">
                <span className="label">Tipo:</span>
                <span className={`tipo-badge ${receitaVisualizando.tipo}`}>
                  {receitaVisualizando.tipo === 'especial' ? 'Receita Especial' : 'Receita Normal'}
                </span>
              </div>
            </div>

            <div className="modal-receita-itens">
              <h4>Itens da Receita ({receitaVisualizando.itens.length})</h4>
              {receitaVisualizando.itens.length > 0 ? (
                <div className="itens-lista">
                  {receitaVisualizando.itens.map((item, index) => (
                    <div key={item.id} className="item-detalhe">
                      <span className="item-num">{index + 1}</span>
                      <div className="item-content">
                        <strong>{item.medicacao}</strong>
                        <span>
                          {item.dose && `${item.dose} `}
                          {item.unidade && `${item.unidade} `}
                          {item.quantidade && item.apresentacao && `- ${item.quantidade} ${item.apresentacao}`}
                          {item.via && ` | Via: ${item.via}`}
                        </span>
                        {item.posologia && <span className="posologia">{item.posologia}</span>}
                        {item.observacao && <span className="obs">Obs: {item.observacao}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="sem-itens">Receita gerada manualmente (sem itens estruturados)</p>
              )}
            </div>

            {receitaVisualizando.observacao_geral && (
              <div className="modal-receita-texto">
                <h4>Texto da Receita</h4>
                <pre>{receitaVisualizando.observacao_geral}</pre>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-copiar" onClick={handleCopiarItensParaReceita}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copiar para Receita Atual
              </button>
              <button className="btn-imprimir" onClick={() => { handleImprimirHistorico(receitaVisualizando); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 6,2 18,2 18,9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salvar Padrão */}
      {showSalvarPadraoModal && (
        <div className="modal-overlay" onClick={() => setShowSalvarPadraoModal(false)}>
          <div className="modal-padrao-salvar" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Salvar como Padrão</h3>
              <button className="close-btn" onClick={() => setShowSalvarPadraoModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-padrao-content">
              <label>Nome do Padrão:</label>
              <input
                type="text"
                value={nomePadrao}
                onChange={(e) => setNomePadrao(e.target.value)}
                placeholder="Ex: Receita para Ansiedade"
                autoFocus
              />
              <div className="modal-padrao-preview">
                <label>Conteúdo:</label>
                <pre>{textoReceita || '(receita vazia)'}</pre>
              </div>
            </div>
            <div className="modal-padrao-actions">
              <button className="btn-cancelar" onClick={() => setShowSalvarPadraoModal(false)}>
                Cancelar
              </button>
              <button className="btn-salvar" onClick={handleSalvarPadrao}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Listar Padrões */}
      {showListarPadroesModal && (
        <div className="modal-overlay" onClick={() => setShowListarPadroesModal(false)}>
          <div className="modal-padroes-lista" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Padrões Salvos</h3>
              <button className="close-btn" onClick={() => setShowListarPadroesModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Pesquisar padrões..."
                value={searchPadrao}
                onChange={(e) => setSearchPadrao(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-padroes-list">
              {getPadroesFiltrados().length === 0 ? (
                <div className="empty-list">
                  <p>{searchPadrao ? 'Nenhum padrão encontrado' : 'Nenhum padrão salvo'}</p>
                </div>
              ) : (
                getPadroesFiltrados().map(padrao => (
                  <div key={padrao.id} className="padrao-item">
                    <div className="padrao-info">
                      <span className="padrao-nome">{padrao.nome}</span>
                      <span className="padrao-preview">{padrao.texto.substring(0, 80)}...</span>
                    </div>
                    <div className="padrao-actions">
                      <button 
                        className="btn-adicionar-padrao" 
                        onClick={() => handleAdicionarPadrao(padrao)}
                        title="Adicionar à receita"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Adicionar
                      </button>
                      <button 
                        className="btn-excluir-padrao" 
                        onClick={() => handleExcluirPadrao(padrao.id)}
                        title="Excluir padrão"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="receitas-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn agenda-btn" onClick={() => setShowAgendaPopup(true)} title="Agenda do dia">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Agenda
          </button>
          <button className="toolbar-btn primary" onClick={handleLimpar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Nova Receita
          </button>
          <button className="toolbar-btn" onClick={() => setShowListarPadroesModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Listar Padrão
          </button>
          <Link to="/home" className="toolbar-btn exit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </Link>
        </div>
      </div>

      {/* Formulário de Medicação - Fixo no topo */}
      <div className="form-medicacao-header">
        <div className="form-row">
          <div className="form-field medicacao">
            <label>Medicamento</label>
            <AutocompleteInput
              value={novoItem.medicacao || ''}
              onChange={(value) => setNovoItem({...novoItem, medicacao: value})}
              options={medicacoes}
              onAddNew={handleAddMedicacao}
              placeholder="Ex: Rivotril"
            />
          </div>
          <div className="form-field dose">
            <label>Dose</label>
            <input type="text" value={novoItem.dose || ''} onChange={(e) => setNovoItem({...novoItem, dose: e.target.value})} placeholder="Ex: 2" />
          </div>
          <div className="form-field unidade">
            <label>Unidade</label>
            <AutocompleteInput
              value={novoItem.unidade || ''}
              onChange={(value) => setNovoItem({...novoItem, unidade: value})}
              options={unidades}
              onAddNew={handleAddUnidade}
              placeholder="Ex: mg"
            />
          </div>
          <div className="form-field quantidade">
            <label>Quantidade</label>
            <input type="text" value={novoItem.quantidade || ''} onChange={(e) => setNovoItem({...novoItem, quantidade: e.target.value})} placeholder="Ex: 1" />
          </div>
          <div className="form-field small">
            <label>Apresentação</label>
            <AutocompleteInput
              value={novoItem.apresentacao || ''}
              onChange={(value) => setNovoItem({...novoItem, apresentacao: value})}
              options={apresentacoes}
              onAddNew={handleAddApresentacao}
              placeholder="Ex: Cx"
            />
          </div>
          <div className="form-field via">
            <label>Via</label>
            <AutocompleteInput
              value={novoItem.via || ''}
              onChange={(value) => setNovoItem({...novoItem, via: value})}
              options={vias}
              onAddNew={handleAddVia}
              placeholder="Ex: VO"
            />
          </div>
          <div className="form-field posologia">
            <label>Posologia</label>
            <AutocompleteInput
              value={novoItem.posologia || ''}
              onChange={(value) => setNovoItem({...novoItem, posologia: value})}
              options={posologias}
              onAddNew={handleAddPosologia}
              placeholder="Ex: Tomar 1 comp. ao deitar"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field observacao">
            <label>Observação</label>
            <input type="text" value={novoItem.observacao || ''} onChange={(e) => setNovoItem({...novoItem, observacao: e.target.value})} placeholder="Ex: Uso contínuo, não suspender abruptamente" />
          </div>
          <button className="btn-incluir-item" onClick={handleAddItem} disabled={!novoItem.medicacao}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Incluir
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="receitas-content">
        {/* Formulário */}
        <div className="form-section">

          {/* Itens da Receita Atual */}
          {itensReceita.length > 0 && (
            <div className="itens-receita">
              <h4>Itens da Receita ({itensReceita.length})</h4>
              <div className="itens-list">
                {itensReceita.map((item, index) => (
                  <div key={item.id} className="item-receita">
                    <span className="item-numero">{index + 1}</span>
                    <div className="item-info">
                      <strong>{item.medicacao}</strong>
                      <span>
                        {item.dose && `${item.dose} `}
                        {item.unidade && `${item.unidade} `}
                        {item.quantidade && item.apresentacao && `- ${item.quantidade} ${item.apresentacao}`}
                        {item.via && ` | ${item.via}`}
                        {item.posologia && ` | ${item.posologia}`}
                      </span>
                      {item.observacao && <span className="obs">Obs: {item.observacao}</span>}
                    </div>
                    <button className="remove-item" onClick={() => handleRemoveItem(item.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className={`historico-section ${historicoExpandido ? 'expanded' : 'collapsed'}`}>
            <div className="historico-header">
              <button className="toggle-historico" onClick={() => setHistoricoExpandido(!historicoExpandido)}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ transform: historicoExpandido ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
                <h4>HISTÓRICO</h4>
                {!historicoExpandido && <span className="historico-count">({getReceitasFiltradas().length})</span>}
              </button>
              <div className="filtros-periodo" style={{ display: historicoExpandido ? 'flex' : 'none' }}>
                <label>
                  <input
                    type="radio"
                    name="periodo"
                    checked={filtroHistorico === '30dias'}
                    onChange={() => setFiltroHistorico('30dias')}
                  />
                  30 dias
                </label>
                <label>
                  <input
                    type="radio"
                    name="periodo"
                    checked={filtroHistorico === '6meses'}
                    onChange={() => setFiltroHistorico('6meses')}
                  />
                  6 meses
                </label>
                <label>
                  <input
                    type="radio"
                    name="periodo"
                    checked={filtroHistorico === '2anos'}
                    onChange={() => setFiltroHistorico('2anos')}
                  />
                  2 anos
                </label>
                <label>
                  <input
                    type="radio"
                    name="periodo"
                    checked={filtroHistorico === 'todos'}
                    onChange={() => setFiltroHistorico('todos')}
                  />
                  Todos
                </label>
              </div>
            </div>

            {historicoExpandido && (
              <div className="historico-list">
                {getReceitasFiltradas().length === 0 ? (
                  <div className="empty-historico">
                    <p>Nenhuma receita no histórico</p>
                  </div>
                ) : (
                getReceitasFiltradas().map(receita => (
                  <div 
                    key={receita.id} 
                    className={`historico-item ${receitaSelecionada?.id === receita.id ? 'selected' : ''}`}
                    onClick={() => handleVisualizarReceita(receita)}
                  >
                    <div className="item-data">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatDate(receita.data)}
                    </div>
                    <div className="item-paciente">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {receita.paciente_nome || 'Paciente não encontrado'}
                    </div>
                    <span className={`tipo-badge ${receita.tipo}`}>
                      {receita.tipo === 'especial' ? 'Especial' : 'Normal'}
                    </span>
                    <div className="item-actions">
                      <button title="Visualizar" onClick={(e) => { e.stopPropagation(); handleVisualizarReceita(receita); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button title="Imprimir" onClick={(e) => { e.stopPropagation(); handleImprimirHistorico(receita); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6,9 6,2 18,2 18,9"/>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                          <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview da Receita */}
        <div className="preview-section">
          <div className="preview-header">
            <h4>RECEITA</h4>
          </div>
          <div className="preview-content">
            <textarea
              className="receita-textarea"
              value={textoReceita}
              onChange={(e) => setTextoReceita(e.target.value)}
              placeholder="Digite ou adicione itens à receita...&#10;&#10;Você pode editar livremente este texto."
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="receitas-footer">
        <button className="footer-btn padrao" onClick={() => setShowSalvarPadraoModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          Salvar Padrão
        </button>
        <button className="footer-btn limpar" onClick={handleLimpar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Limpar
        </button>
        <button 
          className="footer-btn especial" 
          onClick={() => handleEmitirReceita('especial')}
          disabled={!pacienteSelecionado || !textoReceita.trim()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 6,2 18,2 18,9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Receita Especial
        </button>
      </div>
    </div>
  )
}
