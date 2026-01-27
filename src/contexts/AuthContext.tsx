import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Tipos baseados na VIEW usuarios_completo
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
  // Dados do profissional (vindos do JOIN na VIEW)
  conselho: string | null
  uf_conselho: string | null
  numero_conselho: string | null
  rqe: string | null
  especialidade: string | null
  is_profissional: boolean  // calculado pela VIEW
  registro_completo: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  usuario: Usuario | null
  loading: boolean
  isProfissional: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, nome: string, cpf?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchingUsuario, setFetchingUsuario] = useState(false) // Flag para evitar buscas duplicadas

  // Buscar dados do usuário - versão otimizada com cache
  const fetchUsuario = async (authId: string, useCache: boolean = true): Promise<Usuario | null> => {
    try {
      const cacheKey = `usuario_cache_${authId}`
      
      // Verificar cache no localStorage primeiro (se permitido)
      if (useCache) {
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData)
            const cacheTime = parsed.cacheTime || 0
            const now = Date.now()
            // Cache válido por 30 minutos (aumentado para melhor performance)
            if (now - cacheTime < 30 * 60 * 1000) {
              return parsed.data as Usuario
            }
          } catch (e) {
            // Cache inválido, continuar com busca
          }
        }
      }

      // Buscar usuário primeiro (obrigatório)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', authId)
        .single()

      if (userError || !userData) {
        if (userError) {
          console.error('Erro ao buscar usuário:', userError)
        }
        return null
      }

      // Buscar profissional com timeout curto (1 segundo) para não bloquear
      let profissionalData = null
      try {
        const profResult = await Promise.race([
          supabase
            .from('profissionais')
            .select('*')
            .eq('usuario_id', userData.id)
            .maybeSingle(),
          new Promise<{ data: null, error: null }>(resolve => 
            setTimeout(() => resolve({ data: null, error: null }), 1000)
          )
        ])
        profissionalData = profResult.data
      } catch (err) {
        // Ignorar erros na busca de profissional (pode não existir)
      }

      // Montar objeto completo do usuário
      const usuarioCompleto: Usuario = {
        ...userData,
        conselho: profissionalData?.conselho || null,
        uf_conselho: profissionalData?.uf_conselho || null,
        numero_conselho: profissionalData?.numero_conselho || null,
        rqe: profissionalData?.rqe || null,
        especialidade: profissionalData?.especialidade || null,
        is_profissional: !!profissionalData,
        registro_completo: profissionalData 
          ? `${profissionalData.conselho || ''} ${profissionalData.uf_conselho || ''} ${profissionalData.numero_conselho || ''}`.trim() || null
          : null,
      }

      // Salvar no cache (sempre, mesmo se useCache for false, para próxima vez)
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: usuarioCompleto,
          cacheTime: Date.now()
        }))
      } catch (e) {
        // Ignorar erros de cache silenciosamente
      }

      return usuarioCompleto
    } catch (err) {
      console.error('Erro ao buscar usuário:', err)
      return null
    }
  }

  // Atualizar dados do usuário (limpa cache antes de buscar)
  const refreshUsuario = async () => {
    if (user) {
      // Limpar cache antes de buscar
      const cacheKey = `usuario_cache_${user.id}`
      localStorage.removeItem(cacheKey)
      
      const usuarioData = await fetchUsuario(user.id)
      setUsuario(usuarioData)
    }
  }

  // Inicializar sessão
  useEffect(() => {
    let isMounted = true

    // Buscar sessão atual
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao buscar sessão:', error)
          if (isMounted) setLoading(false)
          return
        }

        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
        }
        
        if (session?.user && isMounted) {
          // Usar cache primeiro para mostrar dados imediatamente
          const cachedUsuario = await fetchUsuario(session.user.id, true)
          if (isMounted) {
            if (cachedUsuario) {
              setUsuario(cachedUsuario)
            }
            setLoading(false) // Sempre finalizar loading imediatamente
          }
          // Buscar dados atualizados em background (sem bloquear a UI)
          fetchUsuario(session.user.id, false).then(usuarioData => {
            if (isMounted && usuarioData) setUsuario(usuarioData)
          }).catch(() => {
            // Ignorar erros silenciosamente na atualização em background
          })
        } else {
          if (isMounted) setLoading(false)
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão:', err)
        if (isMounted) setLoading(false)
      }
    }

    initSession()

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        // Atualizar sessão e user imediatamente
        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
        }

        // Se não há sessão, limpar dados
        if (!session?.user) {
          if (isMounted) {
            setUsuario(null)
            setFetchingUsuario(false)
            setLoading(false)
          }
          return
        }

        // Recarregar dados do usuário quando houver sessão válida
        if (session.user && isMounted) {
          // IMPORTANTE: Sempre finalizar loading quando há sessão válida
          // O user já foi definido acima, então a autenticação está OK
          setLoading(false)
          
          // Evitar buscas duplicadas apenas se já estiver buscando para o mesmo usuário
          if (fetchingUsuario && usuario?.auth_id === session.user.id) {
            console.log('Busca já em andamento para este usuário, ignorando...')
            return
          }
          
          setFetchingUsuario(true)
          
          // Buscar dados do usuário (com cache primeiro)
          fetchUsuario(session.user.id, true)
            .then(cachedUsuario => {
              if (isMounted && cachedUsuario) {
                setUsuario(cachedUsuario)
              }
              
              // Atualizar em background (sem cache)
              return fetchUsuario(session.user.id, false)
            })
            .then(usuarioData => {
              if (isMounted && usuarioData) {
                setUsuario(usuarioData)
              }
              if (isMounted) setFetchingUsuario(false)
            })
            .catch(err => {
              console.error('Erro ao buscar dados do usuário:', err)
              if (isMounted) setFetchingUsuario(false)
            })
        }
      }
    )

    // Verificar periodicamente se a sessão ainda é válida (menos frequente para evitar timeouts)
    const sessionCheckInterval = setInterval(async () => {
      if (!isMounted) return
      
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (currentSession?.user) {
          // Só recarregar se não houver dados do usuário ou se o cache expirou
          if (!usuario || usuario.auth_id !== currentSession.user.id) {
            console.log('Recarregando dados do usuário (sessão válida mas dados ausentes)...')
            const usuarioData = await fetchUsuario(currentSession.user.id)
            
            if (isMounted) {
              setUsuario(usuarioData)
              setSession(currentSession)
              setUser(currentSession.user)
            }
          } else {
            // Apenas atualizar sessão e user se necessário
            if (isMounted) {
              setSession(currentSession)
              setUser(currentSession.user)
            }
          }
        } else if (isMounted) {
          // Se não há sessão, limpar dados e cache
          if (user) {
            const cacheKey = `usuario_cache_${user.id}`
            localStorage.removeItem(cacheKey)
          }
          setUsuario(null)
          setUser(null)
          setSession(null)
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
      }
    }, 300000) // Verificar a cada 5 minutos (reduzido para evitar timeouts)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearInterval(sessionCheckInterval)
    }
  }, [])

  // Login
  const signIn = async (email: string, password: string) => {
    try {
      // Validar email e senha antes de enviar
      if (!email || !email.trim()) {
        return { error: new Error('E-mail é obrigatório') }
      }
      
      if (!password || !password.trim()) {
        return { error: new Error('Senha é obrigatória') }
      }

      // Normalizar email (trim e lowercase)
      const normalizedEmail = email.trim().toLowerCase()

      console.log('Tentando fazer login com email:', normalizedEmail)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      })

      if (error) {
        console.error('Erro no login:', error)
        // Retornar erro com mensagem mais detalhada
        let errorMessage = error.message
        
        // Traduzir erros comuns
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          errorMessage = 'E-mail ou senha incorretos'
        } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          errorMessage = 'E-mail não confirmado. Verifique sua caixa de entrada.'
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
        }
        
        return { error: new Error(errorMessage) }
      }

      console.log('Login bem-sucedido:', data.user?.id)
      return { error: null }
    } catch (err) {
      console.error('Erro inesperado no login:', err)
      return { error: err as Error }
    }
  }

  // Cadastro
  const signUp = async (email: string, password: string, nome: string, cpf?: string) => {
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        return { error: new Error(authError.message) }
      }

      if (!authData.user) {
        return { error: new Error('Erro ao criar usuário') }
      }

      // 2. Criar registro na tabela usuarios
      const { error: userError } = await supabase
        .from('usuarios')
        .insert({
          auth_id: authData.user.id,
          email: email,
          nome: nome,
          cpf: cpf || '',  // CPF é obrigatório na nova estrutura
          ativo: true,
        })

      if (userError) {
        console.error('Erro ao criar registro de usuário:', userError)
        // Não retornar erro aqui, pois o usuário auth já foi criado
      }

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Logout
  const signOut = async () => {
    // Limpar cache do usuário ao fazer logout
    if (user) {
      const cacheKey = `usuario_cache_${user.id}`
      localStorage.removeItem(cacheKey)
    }
    
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setUsuario(null)
  }

  const value = {
    user,
    session,
    usuario,
    loading,
    isProfissional: usuario?.is_profissional ?? false,
    signIn,
    signUp,
    signOut,
    refreshUsuario,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
