import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './GerenciarUsuarios.css'

// Interface baseada na VIEW usuarios_completo
interface Usuario {
  id: string
  auth_id: string
  email: string
  nome: string
  cpf: string
  data_nascimento: string | null
  telefone: string | null
  funcao: string | null
  ativo: boolean
  created_at: string
  // Dados do profissional (vindos do JOIN)
  conselho: string | null
  uf_conselho: string | null
  numero_conselho: string | null
  rqe: string | null
  especialidade: string | null
  is_profissional: boolean  // calculado pela VIEW
  registro_completo: string | null
}

// Interface para a tabela profissionais (com dados do usuário via JOIN)
interface ProfissionalCompleto {
  id: string
  usuario_id: string
  conselho: string
  uf_conselho: string
  numero_conselho: string
  rqe: string | null
  especialidade: string | null
  ativo: boolean
  // Dados do usuário (via JOIN)
  usuario_nome?: string
  usuario_cpf?: string
}

type ViewMode = 'list' | 'create-user' | 'create-professional' | 'edit-user'

export function GerenciarUsuarios() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [profissionais, setProfissionais] = useState<ProfissionalCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)

  // Form states - Novo usuário
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [funcao, setFuncao] = useState('')
  const [password, setPassword] = useState('')

  // Form states - Novo profissional (vinculado a usuário existente)
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('')
  const [profConselho, setProfConselho] = useState('CRM')
  const [profUfConselho, setProfUfConselho] = useState('')
  const [profNumeroConselho, setProfNumeroConselho] = useState('')
  const [profRqe, setProfRqe] = useState('')
  const [profEspecialidade, setProfEspecialidade] = useState('')

  // Carregar dados
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar usuários via VIEW usuarios_completo
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios_completo')
        .select('*')
        .order('nome')

      if (usuariosError) throw usuariosError
      setUsuarios(usuariosData || [])

      // Carregar profissionais com dados do usuário
      const { data: profissionaisData, error: profissionaisError } = await supabase
        .from('profissionais')
        .select(`
          id,
          usuario_id,
          conselho,
          uf_conselho,
          numero_conselho,
          rqe,
          especialidade,
          ativo,
          usuarios!inner (
            nome,
            cpf
          )
        `)
        .order('created_at', { ascending: false })

      if (profissionaisError) throw profissionaisError
      
      // Mapear dados para incluir nome e cpf do usuário
      const profissionaisMapeados = (profissionaisData || []).map((p: {
        id: string
        usuario_id: string
        conselho: string
        uf_conselho: string
        numero_conselho: string
        rqe: string | null
        especialidade: string | null
        ativo: boolean
        usuarios: { nome: string; cpf: string } | { nome: string; cpf: string }[]
      }) => {
        const usuario = Array.isArray(p.usuarios) ? p.usuarios[0] : p.usuarios
        return {
          ...p,
          usuario_nome: usuario?.nome,
          usuario_cpf: usuario?.cpf,
        }
      })
      
      setProfissionais(profissionaisMapeados)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setNome('')
    setEmail('')
    setCpf('')
    setTelefone('')
    setDataNascimento('')
    setFuncao('')
    setPassword('')
    setSelectedUsuarioId('')
    setProfConselho('CRM')
    setProfUfConselho('')
    setProfNumeroConselho('')
    setProfRqe('')
    setProfEspecialidade('')
    setError('')
    setSuccess('')
  }

  // Criar novo usuário
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!nome || !email || !cpf || !password) {
        throw new Error('Preencha todos os campos obrigatórios')
      }

      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres')
      }

      // 1. Criar usuário no Supabase Auth usando signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome,
          }
        }
      })

      if (signUpError) throw signUpError
      if (!signUpData.user) throw new Error('Erro ao criar usuário')

      // 2. Criar registro na tabela usuarios
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          auth_id: signUpData.user.id,
          email: email,
          nome: nome,
          cpf: cpf,
          telefone: telefone || null,
          data_nascimento: dataNascimento || null,
          funcao: funcao || null,
          ativo: true,
        })

      if (userError) throw userError

      setSuccess('Usuário criado com sucesso! Um e-mail de confirmação foi enviado.')
      resetForm()
      loadData()
      setTimeout(() => setViewMode('list'), 2000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar usuário'
      setError(translateError(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  // Criar novo profissional (vincular usuário existente)
  const handleCreateProfessional = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!selectedUsuarioId || !profConselho || !profUfConselho || !profNumeroConselho) {
        throw new Error('Preencha todos os campos obrigatórios')
      }

      // Verificar se o usuário já é profissional
      const usuarioSelecionado = usuarios.find(u => u.id === selectedUsuarioId)
      if (usuarioSelecionado?.is_profissional) {
        throw new Error('Este usuário já está vinculado como profissional')
      }

      const { error: profError } = await supabase
        .from('profissionais')
        .insert({
          usuario_id: selectedUsuarioId,
          conselho: profConselho,
          uf_conselho: profUfConselho,
          numero_conselho: profNumeroConselho,
          rqe: profRqe || null,
          especialidade: profEspecialidade || null,
          ativo: true,
        })

      if (profError) throw profError

      setSuccess('Profissional cadastrado com sucesso!')
      resetForm()
      loadData()
      setTimeout(() => setViewMode('list'), 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar profissional'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Atualizar usuário
  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          nome: nome,
          cpf: cpf,
          telefone: telefone || null,
          data_nascimento: dataNascimento || null,
          funcao: funcao || null,
        })
        .eq('id', selectedUser.id)

      if (updateError) throw updateError

      setSuccess('Usuário atualizado com sucesso!')
      loadData()
      setTimeout(() => {
        setViewMode('list')
        setSelectedUser(null)
        resetForm()
      }, 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar usuário'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Toggle status do usuário
  const handleToggleUserStatus = async (user: Usuario) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: !user.ativo })
        .eq('id', user.id)

      if (error) throw error
      loadData()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  // Editar usuário
  const handleEditUser = (user: Usuario) => {
    setSelectedUser(user)
    setNome(user.nome)
    setEmail(user.email)
    setCpf(user.cpf || '')
    setTelefone(user.telefone || '')
    setDataNascimento(user.data_nascimento || '')
    setFuncao(user.funcao || '')
    setViewMode('edit-user')
  }

  // Enviar email de recuperação de senha
  const handleResetPassword = async (userEmail: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      setSuccess(`E-mail de recuperação enviado para ${userEmail}`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar e-mail'
      setError(errorMessage)
      setTimeout(() => setError(''), 5000)
    }
  }

  const translateError = (message: string): string => {
    const translations: Record<string, string> = {
      'User already registered': 'Este e-mail já está cadastrado',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de e-mail inválido',
    }
    return translations[message] || message
  }

  const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
  const conselhos = ['CRM', 'CRO', 'COREN', 'CRF', 'CREFITO', 'CRP', 'CRN', 'CRBM', 'CRAS']

  // Renderização
  if (loading && viewMode === 'list' && usuarios.length === 0) {
    return <div className="loading">Carregando...</div>
  }

  return (
    <div className="gerenciar-usuarios">
      {/* Header */}
      <div className="gu-header">
        {viewMode === 'list' ? (
          <>
            <div className="gu-header-info">
              <h3>Gerenciar Usuários</h3>
              <p>Cadastre e gerencie usuários e profissionais do sistema</p>
            </div>
            <div className="gu-header-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => { resetForm(); setViewMode('create-professional'); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Novo Profissional
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => { resetForm(); setViewMode('create-user'); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="16" y1="11" x2="22" y2="11"/>
                </svg>
                Novo Usuário
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="btn-back" onClick={() => { setViewMode('list'); resetForm(); setSelectedUser(null); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12,19 5,12 12,5"/>
              </svg>
              Voltar
            </button>
            <h3>
              {viewMode === 'create-user' && 'Cadastrar Novo Usuário'}
              {viewMode === 'create-professional' && 'Cadastrar Novo Profissional'}
              {viewMode === 'edit-user' && 'Editar Usuário'}
            </h3>
          </>
        )}
      </div>

      {/* Alertas */}
      {error && (
        <div className="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          {success}
        </div>
      )}

      {/* Lista de Usuários */}
      {viewMode === 'list' && (
        <div className="gu-content">
          {/* Profissionais */}
          <div className="gu-section">
            <h4>Profissionais Cadastrados ({profissionais.length})</h4>
            <div className="gu-table-wrapper">
              <table className="gu-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Conselho</th>
                    <th>Especialidade</th>
                    <th>RQE</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profissionais.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">Nenhum profissional cadastrado</td>
                    </tr>
                  ) : (
                    profissionais.map(prof => (
                      <tr key={prof.id}>
                        <td>{prof.usuario_nome || '-'}</td>
                        <td>{prof.conselho} {prof.numero_conselho}/{prof.uf_conselho}</td>
                        <td>{prof.especialidade || '-'}</td>
                        <td>{prof.rqe || '-'}</td>
                        <td>
                          <span className={`status-badge ${prof.ativo ? 'active' : 'inactive'}`}>
                            {prof.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Usuários */}
          <div className="gu-section">
            <h4>Usuários do Sistema ({usuarios.length})</h4>
            <div className="gu-table-wrapper">
              <table className="gu-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">Nenhum usuário cadastrado</td>
                    </tr>
                  ) : (
                    usuarios.map(user => (
                      <tr key={user.id}>
                        <td>{user.nome}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.is_profissional ? (
                            <span className="tipo-badge profissional">
                              {user.registro_completo || 'Profissional'}
                            </span>
                          ) : (
                            <span className="tipo-badge usuario">Usuário</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${user.ativo ? 'active' : 'inactive'}`}>
                            {user.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="actions">
                          <button 
                            className="action-btn edit" 
                            title="Editar"
                            onClick={() => handleEditUser(user)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button 
                            className="action-btn reset" 
                            title="Resetar Senha"
                            onClick={() => handleResetPassword(user.email)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </button>
                          <button 
                            className={`action-btn ${user.ativo ? 'deactivate' : 'activate'}`}
                            title={user.ativo ? 'Desativar' : 'Ativar'}
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            {user.ativo ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22,4 12,14.01 9,11.01"/>
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Formulário Criar Usuário */}
      {viewMode === 'create-user' && (
        <form className="gu-form" onSubmit={handleCreateUser}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nome">Nome completo *</label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cpf">CPF *</label>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">E-mail *</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha inicial *</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input
                type="text"
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="dataNascimento">Data de Nascimento</label>
              <input
                type="date"
                id="dataNascimento"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label htmlFor="funcao">Função</label>
              <select
                id="funcao"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
              >
                <option value="">Selecione uma função...</option>
                <option value="admin">Administrador</option>
                <option value="recepcao">Recepção</option>
                <option value="usuario">Usuário comum</option>
              </select>
              <small>Para criar um profissional de saúde, primeiro crie o usuário e depois vincule-o como profissional.</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setViewMode('list'); resetForm(); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      )}

      {/* Formulário Criar Profissional */}
      {viewMode === 'create-professional' && (
        <form className="gu-form" onSubmit={handleCreateProfessional}>
          <div className="form-row">
            <div className="form-group full">
              <label htmlFor="selectedUsuario">Selecionar Usuário *</label>
              <select
                id="selectedUsuario"
                value={selectedUsuarioId}
                onChange={(e) => setSelectedUsuarioId(e.target.value)}
                required
              >
                <option value="">Selecione um usuário...</option>
                {usuarios.filter(u => u.ativo && !u.is_profissional).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nome} - {user.cpf} ({user.email})
                  </option>
                ))}
              </select>
              <small>Apenas usuários que ainda não são profissionais são exibidos. Cadastre o usuário primeiro se necessário.</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profConselho">Conselho *</label>
              <select
                id="profConselho"
                value={profConselho}
                onChange={(e) => setProfConselho(e.target.value)}
                required
              >
                {conselhos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="profUfConselho">UF *</label>
              <select
                id="profUfConselho"
                value={profUfConselho}
                onChange={(e) => setProfUfConselho(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {ufs.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="profNumeroConselho">Número *</label>
              <input
                type="text"
                id="profNumeroConselho"
                value={profNumeroConselho}
                onChange={(e) => setProfNumeroConselho(e.target.value)}
                placeholder="123456"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profEspecialidade">Especialidade</label>
              <input
                type="text"
                id="profEspecialidade"
                value={profEspecialidade}
                onChange={(e) => setProfEspecialidade(e.target.value)}
                placeholder="Ex: Cardiologia"
              />
            </div>
            <div className="form-group">
              <label htmlFor="profRqe">RQE</label>
              <input
                type="text"
                id="profRqe"
                value={profRqe}
                onChange={(e) => setProfRqe(e.target.value)}
                placeholder="Número do RQE"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setViewMode('list'); resetForm(); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Profissional'}
            </button>
          </div>
        </form>
      )}

      {/* Formulário Editar Usuário */}
      {viewMode === 'edit-user' && selectedUser && (
        <form className="gu-form" onSubmit={handleUpdateUser}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-nome">Nome completo *</label>
              <input
                type="text"
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-cpf">CPF *</label>
              <input
                type="text"
                id="edit-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                value={selectedUser.email}
                disabled
                className="disabled"
              />
              <small>O e-mail não pode ser alterado</small>
            </div>
            <div className="form-group">
              <label htmlFor="edit-telefone">Telefone</label>
              <input
                type="text"
                id="edit-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-dataNascimento">Data de Nascimento</label>
              <input
                type="date"
                id="edit-dataNascimento"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-funcao">Função</label>
              <select
                id="edit-funcao"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
              >
                <option value="">Selecione uma função...</option>
                <option value="admin">Administrador</option>
                <option value="recepcao">Recepção</option>
                <option value="usuario">Usuário comum</option>
              </select>
            </div>
          </div>

          {selectedUser.is_profissional && (
            <div className="form-row">
              <div className="form-group full">
                <label>Dados do Profissional</label>
                <div className="info-box">
                  <strong>{selectedUser.registro_completo}</strong>
                  {selectedUser.especialidade && <span> - {selectedUser.especialidade}</span>}
                  {selectedUser.rqe && <span> (RQE: {selectedUser.rqe})</span>}
                </div>
                <small>Para editar dados do profissional, acesse a seção de profissionais.</small>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setViewMode('list'); resetForm(); setSelectedUser(null); }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
