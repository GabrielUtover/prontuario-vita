import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AppSidebar.css'

/** Retorna primeiro e último nome: "Maria Silva Santos" → "Maria Santos", "João" → "João" */
function getPrimeiroUltimoNome(nomeCompleto: string | null | undefined): string {
  if (!nomeCompleto || !nomeCompleto.trim()) return 'Usuário'
  const parts = nomeCompleto.trim().split(/\s+/)
  const primeiro = parts[0]
  const ultimo = parts.length > 1 ? parts[parts.length - 1] : ''
  return ultimo ? `${primeiro} ${ultimo}` : primeiro
}

const NAV_ITEMS = [
  {
    path: '/home',
    label: 'Início',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    )
  },
  {
    path: '/pacientes',
    label: 'Pacientes',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    path: '/prontuarios',
    label: 'Prontuários',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    )
  },
  {
    path: '/agenda',
    label: 'Agenda',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  {
    path: '/receitas',
    label: 'Receitas',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6"/>
        <path d="M9 16h6"/>
      </svg>
    )
  },
  {
    path: '/ti',
    label: 'Configurações',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
      </svg>
    )
  }
]

interface AppSidebarProps {
  minimized: boolean
  onToggleMinimize: () => void
}

export function AppSidebar({ minimized, onToggleMinimize }: AppSidebarProps) {
  const { usuario, signOut } = useAuth()
  const navigate = useNavigate()
  const nomeExibicao = getPrimeiroUltimoNome(usuario?.nome)

  const handleSair = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <aside className={`app-sidebar ${minimized ? 'app-sidebar-minimized' : ''}`}>
      <div className="app-sidebar-header">
        <div className="app-sidebar-logo">
          <span>SV</span>
        </div>
        <div className="app-sidebar-brand">
          <h2>Silafi Vita</h2>
          <span>Prontuário Eletrônico</span>
        </div>
        <button
          type="button"
          className="app-sidebar-toggle"
          onClick={onToggleMinimize}
          title={minimized ? 'Expandir menu' : 'Recolher menu'}
          aria-label={minimized ? 'Expandir menu' : 'Recolher menu'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {minimized ? (
              <polyline points="9,18 15,12 9,6"/>
            ) : (
              <polyline points="15,18 9,12 15,6"/>
            )}
          </svg>
        </button>
      </div>

      <nav className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `app-sidebar-link ${isActive ? 'active' : ''}`}
            end={item.path === '/home'}
            title={item.label}
          >
            {item.icon}
            <span className="app-sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <div className="app-sidebar-user" title={nomeExibicao}>
          <div className="app-sidebar-user-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="app-sidebar-user-name">{nomeExibicao}</span>
        </div>
        <button type="button" className="app-sidebar-sair" onClick={handleSair} title="Sair">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="app-sidebar-sair-label">Sair</span>
        </button>
      </div>
    </aside>
  )
}
