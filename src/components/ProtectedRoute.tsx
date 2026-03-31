import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfissional?: boolean
  allowRecepcao?: boolean
}

export function ProtectedRoute({ children, requireProfissional = false, allowRecepcao = false }: ProtectedRouteProps) {
  const { user, loading, isProfissional, usuario } = useAuth()
  const location = useLocation()

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  // Se não está logado, redireciona para login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  const hasRequiredAccess =
    !requireProfissional ||
    isProfissional ||
    (allowRecepcao && usuario?.funcao === 'recepcao')

  // Se requer profissional e não tem acesso (nem profissional nem recepção quando permitido)
  if (!hasRequiredAccess) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Acesso Restrito</h2>
          <p>Esta funcionalidade é exclusiva para profissionais de saúde.</p>
          <p>Entre em contato com o administrador para solicitar acesso.</p>
          <button onClick={() => window.history.back()} className="btn btn-primary">
            Voltar
          </button>
        </div>
        <style>{`
          .access-denied {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            padding: 20px;
          }
          .access-denied-content {
            text-align: center;
            background: white;
            padding: 48px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            max-width: 400px;
          }
          .access-denied-content svg {
            color: #f59e0b;
            margin-bottom: 16px;
          }
          .access-denied-content h2 {
            font-size: 24px;
            color: #1e293b;
            margin: 0 0 12px;
          }
          .access-denied-content p {
            color: #64748b;
            margin: 0 0 8px;
            font-size: 15px;
          }
          .access-denied-content .btn {
            margin-top: 24px;
            padding: 12px 32px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
          }
          .access-denied-content .btn:hover {
            background: #2563eb;
          }
        `}</style>
      </div>
    )
  }

  return <>{children}</>
}

// CSS para loading screen (adicionar ao index.css ou App.css)
export const loadingStyles = `
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-screen p {
  color: #64748b;
  font-size: 15px;
}
`
