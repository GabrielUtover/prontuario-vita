import { useState, useCallback, type FormEvent } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { DocumentEditor } from './components/DocumentEditor'
import { DocumentManager } from './components/DocumentManager'
import { PacientesPage } from './components/PacientesPage'
import { ProntuarioPage } from './components/ProntuarioPage'
import { ProntuarioPacientePage } from './components/ProntuarioPacientePage'
import { ReceitasPage } from './components/ReceitasPage'
import { AgendaPage } from './components/AgendaPage'
import { LoginPage } from './components/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { GerenciarUsuarios } from './components/GerenciarUsuarios'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'

// Página Home - Dashboard principal (sidebar já mostra usuário e navegação)
function HomePage() {
  const navigate = useNavigate()
  const { isProfissional } = useAuth()

  const menuItems = [
    {
      id: 'pacientes',
      title: 'Pacientes',
      description: 'Cadastro e gerenciamento de pacientes',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: '#3b82f6',
      path: '/pacientes',
      available: true
    },
    {
      id: 'prontuarios',
      title: 'Prontuários',
      description: 'Atendimentos abertos da agenda do dia',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      ),
      color: '#22c55e',
      path: '/prontuarios',
      available: true
    },
    {
      id: 'agenda',
      title: 'Agenda',
      description: 'Agendamento de consultas',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      color: '#f59e0b',
      path: '/agenda',
      available: true
    },
    {
      id: 'receitas',
      title: 'Receitas',
      description: 'Emitir receitas e documentos',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <path d="M9 12h6"/>
          <path d="M9 16h6"/>
        </svg>
      ),
      color: '#8b5cf6',
      path: '/receitas',
      available: true
    },
    {
      id: 'relatorios',
      title: 'Relatórios',
      description: 'Estatísticas e relatórios',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      color: '#ec4899',
      available: false
    },
    {
      id: 'configuracoes',
      title: 'Configurações',
      description: 'Configurações do sistema',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
        </svg>
      ),
      color: '#6b7280',
      path: '/ti',
      available: true
    }
  ]

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.available && item.path) {
      navigate(item.path)
    }
  }

  return (
    <div className="home-page">
      <main className="home-main">
        <div className="home-welcome">
          <h2>Bem-vindo ao Sistema</h2>
          <p>Selecione uma opção para começar</p>
        </div>

        <div className="home-menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`home-menu-card ${!item.available ? 'disabled' : ''}`}
              onClick={() => handleMenuClick(item)}
              disabled={!item.available}
            >
              <div className="menu-card-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                {item.icon}
              </div>
              <div className="menu-card-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              {!item.available && (
                <span className="menu-card-badge">Em breve</span>
              )}
              {item.available && (
                <div className="menu-card-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9,18 15,12 9,6"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="home-footer">
        <p>Silafi Vita © 2025 - Utover Sistemas</p>
      </footer>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

// Interface para o modelo de documento
interface DocumentModel {
  title: string
  pageOrientation: 'portrait' | 'landscape'
  fontFamily: string
  fontSize: number
  pageMargin: number
  backgroundImage: string | null
  backgroundOpacity: number
  content: string
  objects: unknown[]
  totalPages: number
  createdAt: string
  updatedAt: string
}

// Senha de acesso TI
const TI_PASSWORD = 'Incons55522'

function TiSettingsPage() {
  const navigate = useNavigate()
  
  // Estado de autenticação TI
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  
  const [activeSection, setActiveSection] = useState('usuarios')
  const [docStatus, setDocStatus] = useState('')
  const [companyStatus, setCompanyStatus] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarMinimized, setSidebarMinimized] = useState(false)
  
  // Estados para gerenciamento de documentos
  const [documentView, setDocumentView] = useState<'list' | 'editor'>('list')
  const [editingDocument, setEditingDocument] = useState<{ name: string; data: DocumentModel } | null>(null)

  // Handler para autenticação TI
  const handleTiLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password === TI_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('Senha incorreta. Tente novamente.')
      setPassword('')
    }
  }

  // Handler para criar novo documento
  const handleCreateNew = useCallback(() => {
    setEditingDocument(null)
    setDocumentView('editor')
  }, [])

  // Handler para editar documento existente
  const handleEditDocument = useCallback((docName: string, docData: DocumentModel) => {
    setEditingDocument({ name: docName, data: docData })
    setDocumentView('editor')
  }, [])

  // Handler para voltar à lista de documentos
  const handleBackToList = useCallback(() => {
    setDocumentView('list')
    setEditingDocument(null)
  }, [])

  const handleCompanySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCompanyStatus('Configurações da empresa salvas (simulação).')
    setTimeout(() => setCompanyStatus(''), 3000)
  }

  const handleNavClick = (section: string) => {
    setActiveSection(section)
    setMobileMenuOpen(false)
    // Minimiza o sidebar automaticamente na seção de documentos, expande nas outras
    setSidebarMinimized(section === 'documentos')
  }

  const IconUsers = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )

  const IconDocs = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  )

  const IconCompany = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  )

  const IconBack = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12,19 5,12 12,5"/>
    </svg>
  )

  // Tela de autenticação TI
  if (!isAuthenticated) {
    return (
      <div className="ti-auth-page">
        <div className="ti-auth-container">
          <button className="ti-auth-back" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12,19 5,12 12,5"/>
            </svg>
            Voltar
          </button>
          
          <div className="ti-auth-card">
            <div className="ti-auth-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            
            <h2>Acesso Restrito</h2>
            <p>Digite a senha para acessar as configurações de TI</p>
            
            <form className="ti-auth-form" onSubmit={handleTiLogin}>
              <div className="form-group">
                <label htmlFor="ti-password">Senha de Administrador</label>
                <input
                  type="password"
                  id="ti-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  autoFocus
                />
              </div>
              
              {passwordError && (
                <div className="ti-auth-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {passwordError}
                </div>
              )}
              
              <button type="submit" className="btn btn-primary btn-block">
                Acessar
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`ti-layout ${sidebarMinimized ? 'sidebar-minimized' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''} ${sidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span>SV</span>
          </div>
          <div className="sidebar-brand">
            <h2>Silafi Vita</h2>
            <span>Configurações</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem
            icon={IconUsers}
            label="Usuários"
            active={activeSection === 'usuarios'}
            onClick={() => handleNavClick('usuarios')}
          />
          <NavItem
            icon={IconDocs}
            label="Documentos"
            active={activeSection === 'documentos'}
            onClick={() => handleNavClick('documentos')}
          />
          <NavItem
            icon={IconCompany}
            label="Empresa"
            active={activeSection === 'empresa'}
            onClick={() => handleNavClick('empresa')}
          />
        </nav>

        <div className="sidebar-footer">
          <Link to="/" className="nav-item back-link">
            {IconBack}
            <span>Voltar ao login</span>
          </Link>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header - escondido na seção de documentos */}
        {activeSection !== 'documentos' && (
          <header className="content-header">
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="header-title">
              <h1>Configurações da TI</h1>
              <p>Gerencie usuários, documentos e dados da empresa</p>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="content-body">
          {/* Section Tabs for better UX */}
          <div className="section-tabs">
            <button 
              className={`tab ${activeSection === 'usuarios' ? 'active' : ''}`}
              onClick={() => handleNavClick('usuarios')}
            >
              {IconUsers}
              Usuários
            </button>
            <button 
              className={`tab ${activeSection === 'documentos' ? 'active' : ''}`}
              onClick={() => handleNavClick('documentos')}
            >
              {IconDocs}
              Documentos
            </button>
            <button 
              className={`tab ${activeSection === 'empresa' ? 'active' : ''}`}
              onClick={() => handleNavClick('empresa')}
            >
              {IconCompany}
              Empresa
            </button>
          </div>

          {/* Panels */}
          <div className="panels-container">
            {activeSection === 'usuarios' && (
              <div className="panel panel-full" id="usuarios">
                <GerenciarUsuarios />
              </div>
            )}

            {activeSection === 'documentos' && (
              <div className="panel panel-editor" id="documentos">
                {documentView === 'list' ? (
                  <DocumentManager 
                    onCreateNew={handleCreateNew}
                    onEditDocument={handleEditDocument}
                  />
                ) : (
                  <>
                    {/* Botão voltar */}
                    <button 
                      className="back-to-list-btn"
                      onClick={handleBackToList}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12,19 5,12 12,5"/>
                      </svg>
                      Voltar para lista
                    </button>
                    <DocumentEditor 
                      initialDocument={editingDocument?.data as any}
                      documentName={editingDocument?.name}
                      onSave={(content, title) => {
                        console.log('Documento salvo:', { title, content })
                        setDocStatus(`Modelo "${title || 'Sem título'}" salvo com sucesso!`)
                        setTimeout(() => setDocStatus(''), 3000)
                      }} 
                    />
                  </>
                )}
                {docStatus && <div className="alert alert-success editor-alert">{docStatus}</div>}
              </div>
            )}

            {activeSection === 'empresa' && (
              <div className="panel" id="empresa">
                <div className="panel-header">
                  <h3>Cadastro da Empresa</h3>
                  <p>Configure os dados da sua organização</p>
                </div>
                <form className="panel-form" onSubmit={handleCompanySubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="companyName">Razão social</label>
                      <input type="text" id="companyName" name="companyName" placeholder="Silafi Vita" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cnpj">CNPJ</label>
                      <input type="text" id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="phone">Telefone</label>
                      <input type="tel" id="phone" name="phone" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email-company">E-mail</label>
                      <input type="email" id="email-company" name="emailCompany" placeholder="contato@empresa.com" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="address">Endereço completo</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      placeholder="Rua, número, bairro, cidade - UF"
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit">
                      Salvar cadastro
                    </button>
                  </div>
                  {companyStatus && <div className="alert alert-success">{companyStatus}</div>}
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/ti/*" element={<TiSettingsPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="home" element={<HomePage />} />
        <Route path="pacientes" element={<PacientesPage />} />
        <Route path="prontuarios" element={<ProntuarioPage />} />
        <Route path="prontuarios/paciente/:id" element={<ProntuarioPacientePage />} />
        <Route path="agenda" element={<ProtectedRoute requireProfissional><AgendaPage /></ProtectedRoute>} />
        <Route path="receitas" element={<ProtectedRoute requireProfissional><ReceitasPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
