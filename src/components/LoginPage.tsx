import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validação básica
    const emailTrimmed = email.trim()
    const passwordTrimmed = password.trim()

    if (!emailTrimmed || !passwordTrimmed) {
      setError('Preencha todos os campos')
      setLoading(false)
      return
    }

    // Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      setError('Formato de e-mail inválido')
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(emailTrimmed, passwordTrimmed)

      if (error) {
        setError(translateError(error.message))
        setLoading(false)
        return
      }

      // Aguardar um pouco para garantir que a sessão seja estabelecida
      // O onAuthStateChange vai atualizar o estado automaticamente
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Navegar para home - o ProtectedRoute vai verificar a autenticação
      navigate('/home')
    } catch (err) {
      console.error('Erro no login:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.'
      setError(translateError(errorMessage))
      setLoading(false)
    }
  }

  const translateError = (message: string): string => {
    const translations: Record<string, string> = {
      'Invalid login credentials': 'E-mail ou senha incorretos',
      'invalid_credentials': 'E-mail ou senha incorretos',
      'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
      'email_not_confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
      'User already registered': 'Este e-mail já está cadastrado',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de e-mail inválido',
      'Too many requests': 'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
      'E-mail é obrigatório': 'E-mail é obrigatório',
      'Senha é obrigatória': 'Senha é obrigatória',
      'Formato de e-mail inválido': 'Formato de e-mail inválido',
    }
    return translations[message] || message || 'Erro ao fazer login. Verifique suas credenciais e tente novamente.'
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-logo">
            <span>SV</span>
          </div>
          <h1>Silafi Vita</h1>
          <p>Prontuário eletrônico para uma jornada clínica segura e organizada.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

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

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          
          <Link className="btn btn-secondary btn-block" to="/ti">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
            Acesso TI
          </Link>
        </form>
      </div>
    </div>
  )
}
