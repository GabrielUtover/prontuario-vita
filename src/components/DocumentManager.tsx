import { useState, useEffect, useCallback } from 'react'
import { bundledDocuments, isBundledDocument } from '../data'
import './DocumentManager.css'

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

interface DocumentInfo {
  name: string
  data: DocumentModel
  source: 'bundled' | 'local' // 'bundled' = pasta data, 'local' = localStorage
}

interface DocumentManagerProps {
  onCreateNew: () => void
  onEditDocument: (documentName: string, document: DocumentModel) => void
}

export function DocumentManager({ onCreateNew, onEditDocument }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Carregar documentos do localStorage e da pasta data
  const loadDocuments = useCallback(() => {
    const docs: DocumentInfo[] = []
    
    // 1. Carregar documentos da pasta data (bundled)
    bundledDocuments.forEach(bundledDoc => {
      docs.push({
        name: bundledDoc.name,
        data: bundledDoc.data as DocumentModel,
        source: 'bundled'
      })
    })
    
    // 2. Carregar documentos do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('doc_model_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '')
          const name = key.replace('doc_model_', '')
          
          // Não adicionar se já existe um bundled com o mesmo nome
          if (!isBundledDocument(name)) {
            docs.push({ name, data, source: 'local' })
          }
        } catch (e) {
          console.error('Erro ao carregar documento:', key, e)
        }
      }
    }
    
    // Ordenar: bundled primeiro, depois por data de atualização
    docs.sort((a, b) => {
      // Bundled sempre primeiro
      if (a.source === 'bundled' && b.source !== 'bundled') return -1
      if (a.source !== 'bundled' && b.source === 'bundled') return 1
      
      // Depois por data
      const dateA = new Date(a.data.updatedAt || a.data.createdAt || 0)
      const dateB = new Date(b.data.updatedAt || b.data.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })
    
    setDocuments(docs)
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Importar documento JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          try {
            const content = readerEvent.target?.result as string
            const model = JSON.parse(content) as DocumentModel
            
            // Gerar nome único se necessário
            let docName = model.title || file.name.replace('.json', '')
            let counter = 1
            while (localStorage.getItem(`doc_model_${docName}`)) {
              docName = `${model.title || 'Documento'} (${counter})`
              counter++
            }
            
            // Salvar no localStorage
            localStorage.setItem(`doc_model_${docName}`, JSON.stringify(model))
            loadDocuments()
          } catch (error) {
            alert('Erro ao importar documento. Verifique se o arquivo é válido.')
            console.error('Erro ao importar:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [loadDocuments])

  // Deletar documento (apenas localStorage, não pode deletar bundled)
  const handleDelete = useCallback((docName: string) => {
    // Não permite deletar documentos bundled
    if (isBundledDocument(docName)) {
      alert('Este documento faz parte do sistema e não pode ser excluído.')
      setDeleteConfirm(null)
      return
    }
    localStorage.removeItem(`doc_model_${docName}`)
    setDeleteConfirm(null)
    loadDocuments()
  }, [loadDocuments])

  // Exportar documento
  const handleExport = useCallback((docName: string, docData: DocumentModel) => {
    const jsonString = JSON.stringify(docData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  // Duplicar documento
  const handleDuplicate = useCallback((docName: string, docData: DocumentModel) => {
    let newName = `${docName} (cópia)`
    let counter = 1
    while (localStorage.getItem(`doc_model_${newName}`)) {
      newName = `${docName} (cópia ${counter})`
      counter++
    }
    
    const newDoc = {
      ...docData,
      title: newName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    localStorage.setItem(`doc_model_${newName}`, JSON.stringify(newDoc))
    loadDocuments()
  }, [loadDocuments])

  // Filtrar documentos pela busca
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.data.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data desconhecida'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="document-manager">
      {/* Header com ações */}
      <div className="dm-header">
        <div className="dm-title">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
          <div>
            <h2>Modelos de Documentos</h2>
            <p>{documents.length} {documents.length === 1 ? 'modelo salvo' : 'modelos salvos'}</p>
          </div>
        </div>
        
        <div className="dm-actions">
          <button className="dm-btn primary" onClick={onCreateNew}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Criar Novo
          </button>
          <button className="dm-btn secondary" onClick={handleImport}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar
          </button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="dm-toolbar">
        <div className="dm-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Buscar documentos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        
        <div className="dm-view-toggle">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Visualização em grade"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização em lista"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Lista de documentos */}
      {filteredDocuments.length === 0 ? (
        <div className="dm-empty">
          {searchTerm ? (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3>Nenhum documento encontrado</h3>
              <p>Não há documentos com "{searchTerm}"</p>
              <button className="dm-btn secondary" onClick={() => setSearchTerm('')}>
                Limpar busca
              </button>
            </>
          ) : (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <h3>Nenhum documento ainda</h3>
              <p>Comece criando um novo modelo ou importando um existente</p>
              <div className="dm-empty-actions">
                <button className="dm-btn primary" onClick={onCreateNew}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Criar Novo
                </button>
                <button className="dm-btn secondary" onClick={handleImport}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Importar
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`dm-documents ${viewMode}`}>
          {filteredDocuments.map((doc) => (
            <div key={doc.name} className="dm-card">
              {/* Preview do documento */}
              <div 
                className="dm-card-preview"
                onClick={() => onEditDocument(doc.name, doc.data)}
              >
                <div className={`preview-page ${doc.data.pageOrientation || 'portrait'}`}>
                  {doc.data.backgroundImage && (
                    <div 
                      className="preview-bg"
                      style={{ 
                        backgroundImage: `url(${doc.data.backgroundImage})`,
                        opacity: (doc.data.backgroundOpacity || 100) / 100
                      }}
                    />
                  )}
                  <div className="preview-content">
                    <div className="preview-line title"></div>
                    <div className="preview-line"></div>
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <div className="preview-overlay">
                  <span>Abrir</span>
                </div>
              </div>

              {/* Informações do documento */}
              <div className="dm-card-info">
                <div className="dm-card-title-row">
                  <h4>{doc.data.title || doc.name}</h4>
                  {doc.source === 'bundled' && (
                    <span className="dm-badge system">Sistema</span>
                  )}
                </div>
                <span className="dm-card-date">
                  {doc.source === 'bundled' ? 'Modelo do sistema' : `Atualizado em ${formatDate(doc.data.updatedAt || doc.data.createdAt)}`}
                </span>
              </div>

              {/* Ações do documento */}
              <div className="dm-card-actions">
                <button 
                  className="card-action-btn" 
                  onClick={() => onEditDocument(doc.name, doc.data)}
                  title="Editar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button 
                  className="card-action-btn" 
                  onClick={() => handleDuplicate(doc.name, doc.data)}
                  title="Duplicar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button 
                  className="card-action-btn" 
                  onClick={() => handleExport(doc.name, doc.data)}
                  title="Exportar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                {doc.source !== 'bundled' && (
                  <button 
                    className="card-action-btn danger" 
                    onClick={() => setDeleteConfirm(doc.name)}
                    title="Excluir"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Modal de confirmação de exclusão */}
              {deleteConfirm === doc.name && (
                <div className="delete-confirm-overlay">
                  <div className="delete-confirm-modal">
                    <p>Excluir <strong>"{doc.data.title || doc.name}"</strong>?</p>
                    <div className="delete-confirm-actions">
                      <button 
                        className="dm-btn secondary small"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancelar
                      </button>
                      <button 
                        className="dm-btn danger small"
                        onClick={() => handleDelete(doc.name)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
