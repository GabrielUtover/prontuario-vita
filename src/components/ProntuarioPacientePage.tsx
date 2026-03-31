import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { bundledDocuments } from '../data'
import { imprimirDocumentoReceitaEspecial } from '../lib/printReceitaEspecial'
import './ProntuarioPacientePage.css'

const TIPOS_ANAMNESE = [
  { id: 'historia_medica_pregressa', label: 'História Médica Pregressa' },
  { id: 'antecedentes_pessoais', label: 'Antecedentes Pessoais' },
  { id: 'antecedentes_familiares', label: 'Antecedentes Familiares' },
  { id: 'habitos_de_vida', label: 'Hábitos de Vida' }
] as const

/** Tipos do popup "Dados do paciente" (anamnese + alergia) */
const DADOS_PACIENTE_TIPOS = [
  ...TIPOS_ANAMNESE,
  { id: 'alergia', label: 'Alergia' }
] as const

type TipoDadoPaciente = (typeof DADOS_PACIENTE_TIPOS)[number]['id']

interface Paciente {
  id: string
  nome: string
  cpf: string | null
  data_nascimento: string | null
  sexo: string | null
  telefone: string | null
  [key: string]: unknown
}

interface ReceitaResumo {
  id: string
  data: string
  tipo: string
  observacao_geral: string | null
}

interface AnamneseEntry {
  id: string
  paciente_id: string
  data_consulta: string
  tipo: string
  texto: string
  created_at: string
  updated_at: string
  cancelado?: boolean
  motivo_cancelamento?: string | null
  profissional_nome?: string | null
}

interface TimelineItem {
  id: string
  tipo: 'receita' | 'anamnese'
  data: string
  titulo: string
  conteudo: string
  created_at: string
  rawId?: string
  fullText?: string
  tipoAnamnese?: TipoDadoPaciente | 'anamnese'
  cancelado?: boolean
  motivo_cancelamento?: string | null
  profissionalNome?: string
}

const getHojeISO = () => new Date().toISOString().slice(0, 10)

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR')
}

const formatDateLong = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const calcularIdade = (data_nascimento: string | null) => {
  if (!data_nascimento) return ''
  const hoje = new Date()
  const nascimento = new Date(data_nascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--
  return `${idade} anos`
}

const getLabelTipo = (tipo: string) => TIPOS_ANAMNESE.find(t => t.id === tipo)?.label || tipo
const getLabelDadoPaciente = (tipo: string) => DADOS_PACIENTE_TIPOS.find(t => t.id === tipo)?.label || tipo

/** Remove tags HTML e converte <br> em quebra de linha — exibe só o texto, tags ficam ocultas */
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Primeiro e último nome: "Maria Silva Santos" → "Maria Santos" */
function getPrimeiroUltimoNome(nome: string | null | undefined): string {
  if (!nome || !nome.trim()) return 'Usuário'
  const parts = nome.trim().split(/\s+/)
  const primeiro = parts[0]
  const ultimo = parts.length > 1 ? parts[parts.length - 1] : ''
  return ultimo ? `${primeiro} ${ultimo}` : primeiro
}

interface ModeloAnamnese {
  id: string
  nome: string
  descricao: string | null
  texto: string
  auth_id: string
  created_at: string
}

const MODELOS_PADRAO: { nome: string; descricao: string; texto: string }[] = [
  { nome: 'Consulta geral', descricao: 'Modelo básico de anamnese para consulta de rotina.', texto: 'Paciente relata queixa principal há X dias/semanas. Negava comorbidades. Sem alergias conhecidas. Medicações em uso: não referidas.' },
  { nome: 'Antecedentes clínicos', descricao: 'Modelo para história médica pregressa (comorbidades).', texto: 'HAS em acompanhamento. DM tipo 2. Dislipidemia. Sem eventos cardiovasculares prévios. Cirurgias: não referidas.' },
  { nome: 'Antecedentes familiares', descricao: 'Modelo para antecedentes familiares.', texto: 'Pai: HAS. Mãe: DM. Irmãos: sem doenças referidas. Sem história de câncer na família.' },
  { nome: 'Hábitos de vida', descricao: 'Modelo para hábitos de vida.', texto: 'Não tabagista. Etilismo social. Atividade física irregular. Alimentação referida como regular. Sono preservado.' }
]

export function ProntuarioPacientePage() {
  const { id } = useParams<{ id: string }>()
  const { usuario, user } = useAuth()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showModelosModal, setShowModelosModal] = useState(false)
  const [modelosAnamnese, setModelosAnamnese] = useState<ModeloAnamnese[]>([])
  const [showCriarModeloModal, setShowCriarModeloModal] = useState(false)
  const [novoModeloNome, setNovoModeloNome] = useState('')
  const [novoModeloDescricao, setNovoModeloDescricao] = useState('')
  const [novoModeloTexto, setNovoModeloTexto] = useState('')
  const [savingModelo, setSavingModelo] = useState(false)
  const [excluindoModeloId, setExcluindoModeloId] = useState<string | null>(null)
  const [showFiltroHistorio, setShowFiltroHistorio] = useState(false)
  const [filtroData, setFiltroData] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'anamnese' | 'receita'>('todos')
  const [filtroProfissional, setFiltroProfissional] = useState<string>('todos')
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)
  const [showDadosPacienteModal, setShowDadosPacienteModal] = useState(false)
  const [dadosPacienteTabAtivo, setDadosPacienteTabAtivo] = useState<TipoDadoPaciente>('historia_medica_pregressa')
  const [dadosPacienteTextos, setDadosPacienteTextos] = useState<Record<TipoDadoPaciente, string>>({
    historia_medica_pregressa: '',
    antecedentes_pessoais: '',
    antecedentes_familiares: '',
    habitos_de_vida: '',
    alergia: ''
  })
  const [dadosPacienteHistoricos, setDadosPacienteHistoricos] = useState<Record<TipoDadoPaciente, AnamneseEntry[]>>({
    historia_medica_pregressa: [],
    antecedentes_pessoais: [],
    antecedentes_familiares: [],
    habitos_de_vida: [],
    alergia: []
  })
  const [dadosPacienteIdsHoje, setDadosPacienteIdsHoje] = useState<Record<TipoDadoPaciente, string | null>>({
    historia_medica_pregressa: null,
    antecedentes_pessoais: null,
    antecedentes_familiares: null,
    habitos_de_vida: null,
    alergia: null
  })
  const [savingDadosPaciente, setSavingDadosPaciente] = useState(false)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [itemCancelar, setItemCancelar] = useState<TimelineItem | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [savingCancelar, setSavingCancelar] = useState(false)
  const [mainAnamneseTexto, setMainAnamneseTexto] = useState('')
  const anamneseEditorRef = useRef<HTMLDivElement>(null)

  const loadPaciente = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setPaciente(data)
    } catch (err) {
      console.error('Erro ao carregar paciente:', err)
      setMessage({ type: 'error', text: 'Paciente não encontrado.' })
    }
  }, [id])

  const loadReceitas = useCallback(async (pacienteId: string): Promise<ReceitaResumo[]> => {
    const { data, error } = await supabase
      .from('receitas')
      .select('id, data, tipo, observacao_geral')
      .eq('paciente_id', pacienteId)
      .order('data', { ascending: false })
    if (error) throw error
    return data || []
  }, [])

  const loadAnamneseList = useCallback(async (pacienteId: string): Promise<AnamneseEntry[]> => {
    const { data, error } = await supabase
      .from('anamnese')
      .select('id, paciente_id, data_consulta, tipo, texto, created_at, updated_at, cancelado, motivo_cancelamento, profissional_nome')
      .eq('paciente_id', pacienteId)
      .order('updated_at', { ascending: false })
    if (error) {
      if (error.message?.includes('cancelado') || error.message?.includes('profissional_nome') || error.code === 'PGRST204') {
        const { data: dataFallback, error: errFallback } = await supabase
          .from('anamnese')
          .select('id, paciente_id, data_consulta, tipo, texto, created_at, updated_at')
          .eq('paciente_id', pacienteId)
          .order('updated_at', { ascending: false })
        if (errFallback) throw errFallback
        return (dataFallback || []).map((row: AnamneseEntry) => ({ ...row, cancelado: false, motivo_cancelamento: null, profissional_nome: null }))
      }
      throw error
    }
    return (data || []) as AnamneseEntry[]
  }, [])

  /** Carrega dados para o modal Dados do paciente: último texto + histórico por tipo (inclui alergia); exclui canceladas */
  const loadDadosPacienteModal = useCallback(async (pacienteId: string) => {
    let entries: AnamneseEntry[] = []
    const { data: allEntries, error } = await supabase
      .from('anamnese')
      .select('id, paciente_id, data_consulta, tipo, texto, created_at, updated_at, cancelado, motivo_cancelamento')
      .eq('paciente_id', pacienteId)
      .order('updated_at', { ascending: false })
    if (error) {
      if (error.message?.includes('cancelado') || error.code === 'PGRST204') {
        const { data: fallback, error: err2 } = await supabase
          .from('anamnese')
          .select('id, paciente_id, data_consulta, tipo, texto, created_at, updated_at')
          .eq('paciente_id', pacienteId)
          .order('updated_at', { ascending: false })
        if (err2) throw err2
        entries = (fallback || []) as AnamneseEntry[]
      } else throw error
    } else {
      entries = ((allEntries || []) as AnamneseEntry[]).filter(row => !row.cancelado)
    }
    const tiposDado = DADOS_PACIENTE_TIPOS.map(t => t.id)
    const txt: Record<TipoDadoPaciente, string> = {
      historia_medica_pregressa: '',
      antecedentes_pessoais: '',
      antecedentes_familiares: '',
      habitos_de_vida: '',
      alergia: ''
    }
    const historicos: Record<TipoDadoPaciente, AnamneseEntry[]> = {
      historia_medica_pregressa: [],
      antecedentes_pessoais: [],
      antecedentes_familiares: [],
      habitos_de_vida: [],
      alergia: []
    }
    const seen = new Set<string>()
    entries.forEach(row => {
      if (tiposDado.includes(row.tipo as TipoDadoPaciente)) {
        if (!seen.has(row.tipo)) {
          seen.add(row.tipo)
          txt[row.tipo as TipoDadoPaciente] = row.texto || ''
        }
        historicos[row.tipo as TipoDadoPaciente].push(row)
      }
    })
    setDadosPacienteTextos(txt)
    setDadosPacienteHistoricos(historicos)
    const hoje = getHojeISO()
    const idsHoje: Record<TipoDadoPaciente, string | null> = {
      historia_medica_pregressa: null,
      antecedentes_pessoais: null,
      antecedentes_familiares: null,
      habitos_de_vida: null,
      alergia: null
    }
    const hojeStr = String(hoje).slice(0, 10)
    entries.forEach(row => {
      const rowData = String(row.data_consulta || '').slice(0, 10)
      if (rowData === hojeStr && tiposDado.includes(row.tipo as TipoDadoPaciente)) {
        idsHoje[row.tipo as TipoDadoPaciente] = row.id
      }
    })
    setDadosPacienteIdsHoje(idsHoje)
  }, [])

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      await loadPaciente()
      const [receitas, anamneses] = await Promise.all([
        loadReceitas(id),
        loadAnamneseList(id)
      ])
      const items: TimelineItem[] = []
      receitas.forEach(r => {
        items.push({
          id: `receita-${r.id}`,
          tipo: 'receita',
          data: r.data,
          titulo: `RECEITA ${r.tipo === 'especial' ? 'ESPECIAL' : 'NORMAL'}`,
          conteudo: (r.observacao_geral || '').slice(0, 200) + (r.observacao_geral && r.observacao_geral.length > 200 ? '...' : ''),
          created_at: r.data,
          fullText: r.observacao_geral || ''
        })
      })
      anamneses.forEach(a => {
        const label = a.tipo === 'anamnese' ? 'Anamnese' : (DADOS_PACIENTE_TIPOS.some(t => t.id === a.tipo) ? getLabelDadoPaciente(a.tipo) : getLabelTipo(a.tipo))
        items.push({
          id: `anamnese-${a.id}`,
          tipo: 'anamnese',
          data: a.data_consulta,
          titulo: label,
          conteudo: (a.texto || '').slice(0, 200) + (a.texto && a.texto.length > 200 ? '...' : ''),
          created_at: a.updated_at || a.created_at,
          rawId: a.id,
          fullText: a.texto || '',
          tipoAnamnese: a.tipo as TipoDadoPaciente | 'anamnese',
          cancelado: a.cancelado,
          motivo_cancelamento: a.motivo_cancelamento ?? null,
          profissionalNome: a.profissional_nome ?? undefined
        })
      })
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setTimeline(items)
    } catch (err) {
      console.error('Erro ao carregar prontuário:', err)
    } finally {
      setLoading(false)
    }
  }, [id, loadPaciente, loadReceitas, loadAnamneseList])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (anamneseEditorRef.current && mainAnamneseTexto !== undefined) {
      anamneseEditorRef.current.innerHTML = mainAnamneseTexto
    }
  }, [mainAnamneseTexto])

  useEffect(() => {
    if (showDadosPacienteModal && id) loadDadosPacienteModal(id)
  }, [showDadosPacienteModal, id, loadDadosPacienteModal])

  const loadModelosAnamnese = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('anamnese_modelos')
        .select('id, nome, descricao, texto, auth_id, created_at')
        .order('nome')
      if (error) throw error
      setModelosAnamnese(data ?? [])
    } catch (err) {
      console.error('Erro ao carregar modelos de anamnese:', err)
      setModelosAnamnese([])
    }
  }, [])

  useEffect(() => {
    if (showModelosModal) loadModelosAnamnese()
  }, [showModelosModal, loadModelosAnamnese])

  const getAnamneseEditorHtml = () => anamneseEditorRef.current?.innerHTML ?? ''

  const handleSalvarAnamnese = async () => {
    if (!id) return
    const texto = getAnamneseEditorHtml()
    setSaving(true)
    setMessage(null)
    const hoje = getHojeISO()
    const tipo = 'anamnese'
    try {
      const { error } = await supabase
        .from('anamnese')
        .insert({ paciente_id: id, data_consulta: hoje, tipo, texto, profissional_nome: usuario?.nome ?? null })
      if (error) throw error
      setMessage({ type: 'success', text: 'Anamnese salva no histórico.' })
      setTimeout(() => setMessage(null), 3000)
      await loadAll()
      setMainAnamneseTexto('')
      if (anamneseEditorRef.current) anamneseEditorRef.current.innerHTML = ''
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar. Execute supabase/anamnese_multiplas_por_dia.sql no Supabase para permitir várias anamneses por dia.' })
    } finally {
      setSaving(false)
    }
  }

  const handleFormatarAnamnese = (cmd: 'bold' | 'italic' | 'underline') => {
    document.execCommand(cmd, false)
    anamneseEditorRef.current?.focus()
  }

  const handleAnamneseEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.execCommand('insertLineBreak', false)
    }
  }

  const handleImprimir = (item: TimelineItem) => {
    if (item.tipo === 'receita' && item.titulo.includes('ESPECIAL')) {
      const modelo = bundledDocuments.find(d => d.name === 'RECEITA ESPECIAL 1.0')
      if (modelo && paciente) {
        const enderecoCompleto = [
          (paciente as { endereco?: string }).endereco,
          (paciente as { cidade?: string }).cidade,
          (paciente as { estado?: string }).estado
        ].filter(Boolean).join(', ')
        const variaveis: Record<string, string> = {
          '{{paciente}}': (paciente.nome || '').toUpperCase(),
          '{{paciente_end}}': enderecoCompleto || 'Não informado',
          '{{idade}}': calcularIdade(paciente.data_nascimento ?? null) || 'Não informado',
          '{{receita}}': item.fullText || item.conteudo || ''
        }
        try {
          imprimirDocumentoReceitaEspecial(modelo.data, variaveis)
        } catch (err) {
          console.error('Erro ao imprimir receita especial:', err)
          setMessage({ type: 'error', text: 'Erro ao imprimir receita especial.' })
        }
      }
      return
    }

    const titulo = item.titulo
    const dataStr = formatDateLong(item.data)
    const raw = item.fullText || item.conteudo || ''
    const conteudo = item.tipo === 'anamnese' ? stripHtml(raw) : raw
    const nomePaciente = paciente?.nome ?? '—'
    const cpfPaciente = paciente?.cpf ?? '—'
    const nascimentoPaciente = paciente?.data_nascimento ? formatDate(paciente.data_nascimento) : '—'
    const idadePaciente = calcularIdade(paciente?.data_nascimento ?? null) || '—'
    const nomeProf = usuario?.nome ?? '—'
    const crmProf = usuario?.numero_conselho ?? '—'
    const rqeProf = usuario?.rqe ?? '—'
    const janela = window.open('', '_blank')
    if (!janela) return
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${titulo} - ${dataStr}</title>
          <style>
            @media print {
              .print-header { position: fixed; top: 0; left: 0; right: 0; padding: 12px 24px; font-size: 16px; border-bottom: 1px solid #ccc; background: #fff; line-height: 1.4; }
              .print-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 24px; font-size: 16px; text-align: center; border-top: 1px solid #ccc; background: #fff; }
              .print-body { padding-top: 80px; padding-bottom: 60px; }
            }
          </style>
        </head>
        <body style="font-family: Calibri, Arial, sans-serif; padding: 24px; max-width: 800px; margin: 0 auto;">
          <div class="print-header">
            <div><strong>Paciente:</strong> ${nomePaciente} &nbsp;|&nbsp; <strong>Idade:</strong> ${idadePaciente}</div>
            <div><strong>Data de nascimento:</strong> ${nascimentoPaciente} &nbsp;|&nbsp; <strong>CPF:</strong> ${cpfPaciente}</div>
          </div>
          <div class="print-body">
            <h2 style="margin-top: 0;">${titulo}</h2>
            <p><strong>Data:</strong> ${dataStr}</p>
            <hr/>
            <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px;">${conteudo || '(sem conteúdo)'}</pre>
          </div>
          <div class="print-footer">
            <strong>Profissional:</strong> ${nomeProf} &nbsp;|&nbsp; <strong>CRM:</strong> ${crmProf} &nbsp;|&nbsp; <strong>RQE:</strong> ${rqeProf}
          </div>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => {
      janela.print()
      janela.close()
    }, 300)
  }

  const handleEditar = (item: TimelineItem) => {
    if (item.tipo !== 'anamnese' || !item.tipoAnamnese) return
    const tipo = item.tipoAnamnese
    if (tipo === 'anamnese') {
      const html = item.fullText || ''
      setMainAnamneseTexto(html)
      if (anamneseEditorRef.current) anamneseEditorRef.current.innerHTML = html
      return
    }
    if (tipo === 'alergia') {
      setDadosPacienteTextos(prev => ({ ...prev, alergia: item.fullText || '' }))
      setDadosPacienteTabAtivo('alergia')
      setShowDadosPacienteModal(true)
    } else if (DADOS_PACIENTE_TIPOS.some(t => t.id === tipo)) {
      setDadosPacienteTextos(prev => ({ ...prev, [tipo]: item.fullText || '' } as Record<TipoDadoPaciente, string>))
      setDadosPacienteTabAtivo(tipo)
      setShowDadosPacienteModal(true)
    }
  }

  const handleChamarPaciente = () => {
    setMessage({ type: 'success', text: `Chamando: ${paciente?.nome || 'Paciente'}` })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleInserirModelo = (texto: string) => {
    const el = anamneseEditorRef.current
    if (el) {
      const html = (el.innerHTML ? el.innerHTML + '<br><br>' : '') + texto.replace(/\n/g, '<br>')
      el.innerHTML = html
      setMainAnamneseTexto(html)
    }
    setShowModelosModal(false)
  }

  const handleAbrirCriarModelo = () => {
    setNovoModeloNome('')
    setNovoModeloDescricao('')
    setNovoModeloTexto('')
    setShowCriarModeloModal(true)
  }

  const handleUsarTextoEditorNoModelo = () => {
    const html = getAnamneseEditorHtml()
    setNovoModeloTexto(stripHtml(html))
  }

  const handleSalvarNovoModelo = async () => {
    const nome = novoModeloNome.trim()
    if (!nome) {
      setMessage({ type: 'error', text: 'Informe o nome do modelo.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    if (!user?.id) {
      setMessage({ type: 'error', text: 'Faça login para criar modelos.' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    setSavingModelo(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('anamnese_modelos')
        .insert({ nome, descricao: novoModeloDescricao.trim() || null, texto: novoModeloTexto.trim() || '', auth_id: user.id })
      if (error) throw error
      setMessage({ type: 'success', text: 'Modelo criado. Ele aparecerá na lista de modelos.' })
      setTimeout(() => setMessage(null), 3000)
      setShowCriarModeloModal(false)
      await loadModelosAnamnese()
    } catch (err) {
      console.error('Erro ao criar modelo:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar modelo. Execute supabase/anamnese_modelos.sql no Supabase.' })
      setTimeout(() => setMessage(null), 4000)
    } finally {
      setSavingModelo(false)
    }
  }

  const handleExcluirModelo = async (modeloId: string) => {
    if (!window.confirm('Excluir este modelo? Esta ação não pode ser desfeita.')) return
    setExcluindoModeloId(modeloId)
    try {
      const { error } = await supabase.from('anamnese_modelos').delete().eq('id', modeloId)
      if (error) throw error
      setModelosAnamnese(prev => prev.filter(m => m.id !== modeloId))
      setMessage({ type: 'success', text: 'Modelo excluído.' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('Erro ao excluir modelo:', err)
      setMessage({ type: 'error', text: 'Não foi possível excluir o modelo.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setExcluindoModeloId(null)
    }
  }

  const handleCopiar = (item: TimelineItem) => {
    const raw = item.fullText || item.conteudo || ''
    const el = anamneseEditorRef.current
    if (!el) return
    const htmlAtual = el.innerHTML || ''
    const novoConteudo = item.tipo === 'anamnese'
      ? (raw || '').trim()
      : (raw || '').replace(/\n/g, '<br>').trim()
    const htmlNovo = htmlAtual ? `${htmlAtual}<br><br>${novoConteudo}` : novoConteudo
    el.innerHTML = htmlNovo
    setMainAnamneseTexto(htmlNovo)
    setMessage({ type: 'success', text: 'Texto inserido no campo de anamnese.' })
    setTimeout(() => setMessage(null), 2000)
  }

  const handleAbrirCancelar = (item: TimelineItem) => {
    setItemCancelar(item)
    setMotivoCancelamento('')
    setShowCancelarModal(true)
  }

  const handleConfirmarCancelar = async () => {
    const motivo = motivoCancelamento.trim()
    if (!motivo) {
      setMessage({ type: 'error', text: 'Informe o motivo do cancelamento.' })
      return
    }
    if (!itemCancelar?.rawId) return
    setSavingCancelar(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('anamnese')
        .update({
          cancelado: true,
          motivo_cancelamento: motivo,
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', itemCancelar.rawId)
      if (error) throw error
      setMessage({ type: 'success', text: 'Anamnese cancelada.' })
      setTimeout(() => setMessage(null), 3000)
      setShowCancelarModal(false)
      setItemCancelar(null)
      setMotivoCancelamento('')
      await loadAll()
    } catch (err) {
      console.error('Erro ao cancelar anamnese:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setMessage({ type: 'error', text: `Erro ao cancelar: ${msg}. Execute o script supabase/anamnese_cancelar.sql no Supabase.` })
    } finally {
      setSavingCancelar(false)
    }
  }

  const timelineFiltrada = timeline.filter(item => {
    if (!mostrarCanceladas && item.cancelado) return false
    if (filtroData && item.data.slice(0, 10) !== filtroData) return false
    if (filtroTipo === 'anamnese' && item.tipo !== 'anamnese') return false
    if (filtroTipo === 'receita' && item.tipo !== 'receita') return false
    return true
  })

  const temFiltroAtivo = Boolean(filtroData || filtroTipo !== 'todos' || filtroProfissional !== 'todos' || mostrarCanceladas)
  const limparFiltros = () => {
    setFiltroData('')
    setFiltroTipo('todos')
    setFiltroProfissional('todos')
    setMostrarCanceladas(false)
    setShowFiltroHistorio(false)
  }

  const handleSalvarDadoPaciente = async () => {
    if (!id) return
    const tipo = dadosPacienteTabAtivo
    const texto = dadosPacienteTextos[tipo]
    setSavingDadosPaciente(true)
    setMessage(null)
    const hoje = getHojeISO()
    try {
      const existingId = dadosPacienteIdsHoje[tipo]
      if (existingId) {
        const { error } = await supabase
          .from('anamnese')
          .update({ texto, updated_at: new Date().toISOString() })
          .eq('id', existingId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('anamnese')
          .insert({ paciente_id: id, data_consulta: hoje, tipo, texto: texto || '' })
          .select('id')
          .single()
        if (error) throw error
        if (data) setDadosPacienteIdsHoje(prev => ({ ...prev, [tipo]: data.id }))
      }
      setMessage({ type: 'success', text: `${getLabelDadoPaciente(tipo)} salvo.` })
      setTimeout(() => setMessage(null), 3000)
      loadDadosPacienteModal(id)
      loadAll()
    } catch (err) {
      console.error('Erro ao salvar dado paciente:', err)
      setMessage({ type: 'error', text: 'Erro ao salvar.' })
    } finally {
      setSavingDadosPaciente(false)
    }
  }

  if (!id) {
    return (
      <div className="prontuario-paciente-page">
        <div className="prontuario-paciente-erro prontuario-paciente-erro-inline">
          <p>Paciente não informado.</p>
          <Link to="/prontuarios" className="prontuario-paciente-btn-link">← Voltar aos prontuários</Link>
        </div>
      </div>
    )
  }

  if (loading && !paciente) {
    return (
      <div className="prontuario-paciente-page">
        <div className="prontuario-paciente-loading">
          <div className="prontuario-paciente-loading-spinner" aria-hidden />
          <p>Carregando prontuário...</p>
        </div>
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="prontuario-paciente-page">
        <div className="prontuario-paciente-erro">
          <div className="prontuario-paciente-erro-icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
          </div>
          <p>Paciente não encontrado.</p>
          <Link to="/prontuarios" className="prontuario-paciente-btn-link">← Voltar aos prontuários</Link>
        </div>
      </div>
    )
  }

  const sexoLabel = paciente.sexo === 'masculino' ? 'Masculino' : paciente.sexo === 'feminino' ? 'Feminino' : 'Não especificado'
  const inicialPaciente = paciente.nome?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="prontuario-paciente-page">
      <header className="prontuario-paciente-header">
        <div className="prontuario-paciente-header-left">
          <nav className="prontuario-paciente-breadcrumb" aria-label="Navegação">
            <Link to="/prontuarios" className="prontuario-paciente-breadcrumb-link">Prontuários</Link>
            <span className="prontuario-paciente-breadcrumb-sep">/</span>
            <span className="prontuario-paciente-breadcrumb-current">{paciente.nome}</span>
          </nav>
          <div className="prontuario-paciente-header-info">
            <div className="prontuario-paciente-avatar" aria-hidden>
              {inicialPaciente}
            </div>
            <div>
              <h1 className="prontuario-paciente-nome">{paciente.nome}</h1>
              <div className="prontuario-paciente-meta">
                {calcularIdade(paciente.data_nascimento) && <span>{calcularIdade(paciente.data_nascimento)}</span>}
                {paciente.data_nascimento && <span>Nasc. {formatDate(paciente.data_nascimento)}</span>}
                <span>{sexoLabel}</span>
                {paciente.telefone && <span>{paciente.telefone}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="prontuario-paciente-header-user">
          <span className="prontuario-paciente-header-user-nome">
            Dr(a). {getPrimeiroUltimoNome(usuario?.nome)}
          </span>
          <span className="prontuario-paciente-header-user-crm">
            CRM {usuario?.numero_conselho || '—'}
          </span>
        </div>
      </header>

      {/* Toast de feedback */}
      {message && (
        <div className={`prontuario-paciente-toast prontuario-paciente-toast-${message.type}`} role="status">
          <span className="prontuario-paciente-toast-icon">
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
          <span className="prontuario-paciente-toast-text">{message.text}</span>
        </div>
      )}

      <div className="prontuario-paciente-layout">
        <aside className="prontuario-paciente-timeline">
          <div className="prontuario-paciente-timeline-header">
            <h2 className="prontuario-paciente-timeline-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Histórico
            </h2>
            <div className="prontuario-paciente-timeline-filtro-wrap">
              <button
                type="button"
                className={`prontuario-paciente-btn-filtro ${temFiltroAtivo ? 'active' : ''}`}
                onClick={() => setShowFiltroHistorio(v => !v)}
                title="Filtrar histórico"
                aria-expanded={showFiltroHistorio}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"/>
                </svg>
                Filtros
                {temFiltroAtivo && <span className="prontuario-paciente-filtro-badge"/>}
              </button>
              {showFiltroHistorio && (
                <>
                  <div className="prontuario-paciente-filtro-backdrop" onClick={() => setShowFiltroHistorio(false)} aria-hidden />
                  <div className="prontuario-paciente-filtro-dropdown">
                    <div className="prontuario-paciente-filtro-campo">
                      <label htmlFor="filtro-data-hist">Data</label>
                      <input
                        id="filtro-data-hist"
                        type="date"
                        value={filtroData}
                        onChange={e => setFiltroData(e.target.value)}
                      />
                    </div>
                    <div className="prontuario-paciente-filtro-campo">
                      <label htmlFor="filtro-tipo-hist">Tipo</label>
                      <select
                        id="filtro-tipo-hist"
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value as 'todos' | 'anamnese' | 'receita')}
                      >
                        <option value="todos">Todos</option>
                        <option value="anamnese">Anamnese</option>
                        <option value="receita">Receita</option>
                      </select>
                    </div>
                    <div className="prontuario-paciente-filtro-campo">
                      <label htmlFor="filtro-prof-hist">Profissional</label>
                      <select
                        id="filtro-prof-hist"
                        value={filtroProfissional}
                        onChange={e => setFiltroProfissional(e.target.value)}
                      >
                        <option value="todos">Todos</option>
                      </select>
                    </div>
                    <div className="prontuario-paciente-filtro-campo prontuario-paciente-filtro-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={mostrarCanceladas}
                          onChange={e => setMostrarCanceladas(e.target.checked)}
                        />
                        Mostrar canceladas
                      </label>
                    </div>
                    <button type="button" className="prontuario-paciente-filtro-limpar" onClick={limparFiltros}>
                      Limpar filtros
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="prontuario-paciente-timeline-scroll">
          {timelineFiltrada.length === 0 ? (
            <div className="prontuario-paciente-timeline-empty">
              <div className="prontuario-paciente-timeline-empty-icon" aria-hidden>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <p>{timeline.length === 0 ? 'Nenhum registro no histórico.' : 'Nenhum resultado com os filtros aplicados.'}</p>
              <span className="prontuario-paciente-timeline-empty-hint">
                {timeline.length === 0 ? 'Receitas e anamneses salvas aparecerão aqui.' : 'Tente alterar ou limpar os filtros.'}
              </span>
            </div>
          ) : (
            <ul className="prontuario-paciente-timeline-list">
              {timelineFiltrada.map(item => (
                <li key={item.id} className={`prontuario-paciente-timeline-card prontuario-paciente-timeline-card-${item.tipo} ${item.cancelado ? 'timeline-card-cancelada' : ''}`}>
                  <div className="timeline-card-header">
                    <span className="timeline-card-type-icon" aria-hidden>
                      {item.tipo === 'receita' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                      )}
                    </span>
                    <span className="timeline-card-date">{formatDateLong(item.data)}</span>
                  </div>
                  <div className="timeline-card-meta">
                    {item.tipo === 'anamnese' && item.rawId && (
                      <span className="timeline-card-evolucao-id" title={`ID: ${item.rawId}`}>Evolução: {item.rawId.slice(0, 8)}</span>
                    )}
                    {item.profissionalNome && (
                      <span className="timeline-card-profissional">Dr(a). {item.profissionalNome}</span>
                    )}
                    {item.cancelado && (
                      <span className="timeline-card-badge-cancelada">Cancelada</span>
                    )}
                  </div>
                  <strong className="timeline-card-titulo">{item.titulo}</strong>
                  {item.cancelado && item.motivo_cancelamento && (
                    <p className="timeline-card-motivo-cancelamento">Motivo: {item.motivo_cancelamento}</p>
                  )}
                  {(item.conteudo || item.fullText) && (
                    <p className="timeline-card-conteudo">
                      {stripHtml(item.fullText || item.conteudo).slice(0, 200)}
                      {stripHtml(item.fullText || item.conteudo).length > 200 ? '...' : ''}
                    </p>
                  )}
                  <div className="timeline-card-actions">
                    <button type="button" className="timeline-card-btn" onClick={() => handleImprimir(item)} title="Imprimir">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 6,2 18,2 18,9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                    </button>
                    {item.tipo === 'anamnese' && (
                      <button type="button" className="timeline-card-btn" onClick={() => handleEditar(item)} title="Editar na anamnese">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                    {item.tipo === 'anamnese' && !item.cancelado && (
                      <button type="button" className="timeline-card-btn timeline-card-btn-cancelar" onClick={() => handleAbrirCancelar(item)} title="Cancelar anamnese">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </button>
                    )}
                    <button type="button" className="timeline-card-btn" onClick={() => handleCopiar(item)} title="Copiar texto">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
        </aside>

        <main className="prontuario-paciente-anamnese">
          <div className="prontuario-anamnese-editor-wrap">
            <div className="prontuario-anamnese-toolbar">
              <h3 className="prontuario-anamnese-toolbar-title">Anamnese</h3>
              <button
                type="button"
                className="prontuario-anamnese-toolbar-btn"
                onClick={() => handleFormatarAnamnese('bold')}
                title="Negrito"
              >
                <strong>N</strong>
              </button>
              <button
                type="button"
                className="prontuario-anamnese-toolbar-btn"
                onClick={() => handleFormatarAnamnese('italic')}
                title="Itálico"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className="prontuario-anamnese-toolbar-btn"
                onClick={() => handleFormatarAnamnese('underline')}
                title="Sublinhado"
              >
                <span style={{ textDecoration: 'underline' }}>S</span>
              </button>
              <button
                type="button"
                className="prontuario-paciente-btn-modelos"
                onClick={() => setShowModelosModal(true)}
                title="Inserir modelo de texto"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Modelos
              </button>
              <div className="prontuario-anamnese-toolbar-contexto">
                <span className="prontuario-paciente-header-date">
                  {formatDate(new Date().toISOString())} · {formatDateTime(new Date().toISOString())}
                </span>
              </div>
            </div>
            <div
              ref={anamneseEditorRef}
              className="prontuario-paciente-anamnese-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Digite a anamnese do paciente e clique em Salvar para enviar ao histórico..."
              role="textbox"
              aria-label="Anamnese do paciente"
              onKeyDown={handleAnamneseEditorKeyDown}
            />
          </div>
          <div className="prontuario-paciente-anamnese-actions">
            <button
              type="button"
              className="prontuario-paciente-btn-salvar"
              onClick={() => handleSalvarAnamnese()}
              disabled={saving}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </main>

        {/* Sidebar: Voltar, Receita, Chamar Paciente, Modelos, Sair */}
        <aside className="prontuario-paciente-sidebar">
          <nav className="prontuario-sidebar-nav">
            <Link to="/prontuarios" className="prontuario-sidebar-item prontuario-sidebar-item-voltar">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              <span>Voltar</span>
            </Link>
            <button type="button" className="prontuario-sidebar-item" onClick={() => setShowDadosPacienteModal(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M12 14v6"/>
                <path d="M9 17h6"/>
              </svg>
              <span>Dados do paciente</span>
            </button>
            <Link to={`/receitas?paciente=${id}`} className="prontuario-sidebar-item">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Receita</span>
            </Link>
            <Link to="/home" className="prontuario-sidebar-item sair">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sair</span>
            </Link>
            <button type="button" className="prontuario-sidebar-item" onClick={handleChamarPaciente}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="7" y1="21" x2="17" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span>Chamar Paciente</span>
            </button>
            <button type="button" className="prontuario-sidebar-item" onClick={() => setShowModelosModal(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              <span>Modelos de Anamnese</span>
            </button>
          </nav>
        </aside>
      </div>

      {/* Modal Modelos de Anamnese */}
      {showModelosModal && (
        <div className="prontuario-modal-overlay" onClick={() => setShowModelosModal(false)}>
          <div className="prontuario-modal modelos-modal" onClick={e => e.stopPropagation()}>
            <div className="prontuario-modal-header">
              <h3>Modelos de Anamnese</h3>
              <button type="button" className="prontuario-modal-close" onClick={() => setShowModelosModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="prontuario-modal-desc">Clique em um modelo para inserir na anamnese do paciente.</p>
            <div className="modelos-modal-actions">
              <button type="button" className="prontuario-btn-criar-modelo" onClick={handleAbrirCriarModelo}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Criar modelo de anamnese
              </button>
            </div>
            <div className="modelos-lista">
              {MODELOS_PADRAO.map((m, i) => (
                <button key={`padrao-${i}`} type="button" className="modelo-item" onClick={() => handleInserirModelo(m.texto)}>
                  <strong>{m.nome}</strong>
                  <span>{m.descricao}</span>
                </button>
              ))}
              {modelosAnamnese.map(m => (
                <div key={m.id} className="modelo-item-wrapper">
                  <button type="button" className="modelo-item" onClick={() => handleInserirModelo(m.texto)}>
                    <strong>{m.nome}</strong>
                    <span>{m.descricao || stripHtml(m.texto).slice(0, 80)}{stripHtml(m.texto).length > 80 ? '...' : ''}</span>
                  </button>
                  {user?.id && m.auth_id === user.id && (
                    <button
                      type="button"
                      className="modelo-item-excluir"
                      title="Excluir modelo"
                      disabled={excluindoModeloId === m.id}
                      onClick={e => { e.stopPropagation(); handleExcluirModelo(m.id); }}
                    >
                      {excluindoModeloId === m.id ? '...' : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar modelo de anamnese */}
      {showCriarModeloModal && (
        <div className="prontuario-modal-overlay" onClick={() => !savingModelo && setShowCriarModeloModal(false)}>
          <div className="prontuario-modal criar-modelo-modal" onClick={e => e.stopPropagation()}>
            <div className="prontuario-modal-header">
              <h3>Criar modelo de anamnese</h3>
              <button type="button" className="prontuario-modal-close" onClick={() => !savingModelo && setShowCriarModeloModal(false)} disabled={savingModelo}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="prontuario-modal-desc">Salve um texto como modelo para usar em outros prontuários.</p>
            <div className="criar-modelo-form">
              <label className="criar-modelo-label">Nome do modelo *</label>
              <input
                type="text"
                className="criar-modelo-input"
                value={novoModeloNome}
                onChange={e => setNovoModeloNome(e.target.value)}
                placeholder="Ex: Retorno HAS"
              />
              <label className="criar-modelo-label">Descrição (opcional)</label>
              <input
                type="text"
                className="criar-modelo-input"
                value={novoModeloDescricao}
                onChange={e => setNovoModeloDescricao(e.target.value)}
                placeholder="Ex: Modelo para retorno de hipertensão"
              />
              <label className="criar-modelo-label">Texto do modelo</label>
              <div className="criar-modelo-texto-actions">
                <button type="button" className="prontuario-btn-usar-editor" onClick={handleUsarTextoEditorNoModelo}>
                  Usar texto do editor
                </button>
              </div>
              <textarea
                className="criar-modelo-textarea"
                value={novoModeloTexto}
                onChange={e => setNovoModeloTexto(e.target.value)}
                placeholder="Digite o texto do modelo ou use o botão acima para trazer o que está no editor."
                rows={8}
              />
            </div>
            <div className="prontuario-modal-footer">
              <button type="button" className="prontuario-paciente-btn-cancelar" onClick={() => !savingModelo && setShowCriarModeloModal(false)} disabled={savingModelo}>
                Cancelar
              </button>
              <button type="button" className="prontuario-paciente-btn-salvar" onClick={handleSalvarNovoModelo} disabled={savingModelo}>
                {savingModelo ? 'Salvando...' : 'Criar modelo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dados do paciente - abas com último + histórico */}
      {showDadosPacienteModal && paciente && (
        <div className="prontuario-modal-overlay" onClick={() => setShowDadosPacienteModal(false)}>
          <div className="prontuario-modal dados-paciente-modal" onClick={e => e.stopPropagation()}>
            <div className="prontuario-modal-header">
              <h3>Dados do paciente — {paciente.nome}</h3>
              <button type="button" className="prontuario-modal-close" onClick={() => setShowDadosPacienteModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="dados-paciente-tabs">
              {DADOS_PACIENTE_TIPOS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`dados-paciente-tab ${dadosPacienteTabAtivo === t.id ? 'active' : ''}`}
                  onClick={() => setDadosPacienteTabAtivo(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="dados-paciente-content">
              <p className="dados-paciente-ultimo-label">Última avaliação (atual)</p>
              <textarea
                className="dados-paciente-textarea"
                placeholder={`Informe ${getLabelDadoPaciente(dadosPacienteTabAtivo).toLowerCase()}...`}
                value={dadosPacienteTextos[dadosPacienteTabAtivo]}
                onChange={e => setDadosPacienteTextos(prev => ({ ...prev, [dadosPacienteTabAtivo]: e.target.value }))}
                rows={5}
                aria-label={getLabelDadoPaciente(dadosPacienteTabAtivo)}
              />
              <div className="dados-paciente-actions">
                <button
                  type="button"
                  className="prontuario-paciente-btn-salvar"
                  onClick={handleSalvarDadoPaciente}
                  disabled={savingDadosPaciente}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  {savingDadosPaciente ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
              <div className="dados-paciente-historico">
                <h4 className="dados-paciente-historico-title">Histórico de alterações</h4>
                {dadosPacienteHistoricos[dadosPacienteTabAtivo].length === 0 ? (
                  <p className="dados-paciente-historico-empty">Nenhum registro anterior.</p>
                ) : (
                  <ul className="dados-paciente-historico-list">
                    {dadosPacienteHistoricos[dadosPacienteTabAtivo].map(entry => (
                      <li key={entry.id} className="dados-paciente-historico-item">
                        <span className="dados-paciente-historico-data">
                          {formatDateLong(entry.data_consulta)} — {formatDateTime(entry.updated_at)}
                        </span>
                        <p className="dados-paciente-historico-texto">{stripHtml(entry.texto || '').slice(0, 200)}{stripHtml(entry.texto || '').length > 200 ? '...' : ''}</p>
                        {entry.texto && stripHtml(entry.texto).length > 200 && (
                          <details className="dados-paciente-historico-details">
                            <summary>Ver completo</summary>
                            <pre className="dados-paciente-historico-full">{stripHtml(entry.texto)}</pre>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar anamnese - pede motivo */}
      {showCancelarModal && itemCancelar && (
        <div className="prontuario-modal-overlay" onClick={() => { setShowCancelarModal(false); setItemCancelar(null); setMotivoCancelamento('') }}>
          <div className="prontuario-modal modal-cancelar-anamnese" onClick={e => e.stopPropagation()}>
            <div className="prontuario-modal-header">
              <h3>Cancelar anamnese</h3>
              <button type="button" className="prontuario-modal-close" onClick={() => { setShowCancelarModal(false); setItemCancelar(null); setMotivoCancelamento('') }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-cancelar-anamnese-body">
              <p className="modal-cancelar-desc">A anamnese &quot;{itemCancelar.titulo}&quot; será cancelada e deixará de aparecer no histórico. Informe o motivo (obrigatório):</p>
              <textarea
                className="modal-cancelar-motivo"
                placeholder="Motivo do cancelamento..."
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
                rows={4}
                aria-label="Motivo do cancelamento"
              />
              <div className="prontuario-paciente-anamnese-actions">
                <button
                  type="button"
                  className="prontuario-paciente-btn-cancelar"
                  onClick={() => { setShowCancelarModal(false); setItemCancelar(null); setMotivoCancelamento('') }}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="timeline-card-btn-cancelar-confirm"
                  onClick={handleConfirmarCancelar}
                  disabled={savingCancelar || !motivoCancelamento.trim()}
                >
                  {savingCancelar ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
