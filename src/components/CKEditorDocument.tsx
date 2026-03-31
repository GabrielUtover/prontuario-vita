/**
 * CKEditorDocument - Editor de Documentos baseado em CKEditor 5
 * 
 * Recursos:
 * - Tabelas completas (merge, resize, toolbar)
 * - Imagens com alinhamento
 * - Variáveis de template {{variavel}}
 * - Exportação para PDF
 * - Layout A4 para impressão
 */

import { useState, useRef, useCallback } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  FontFamily,
  FontSize,
  FontColor,
  FontBackgroundColor,
  Alignment,
  List,
  // Tabelas
  Table,
  TableToolbar,
  TableCellProperties,
  TableProperties,
  TableColumnResize,
  TableCaption,
  // Imagens
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  Base64UploadAdapter,
  // Outros
  Link,
  Indent,
  IndentBlock,
  Undo,
  GeneralHtmlSupport,
  type EditorConfig,
  type Editor
} from 'ckeditor5'

// Importar CSS do CKEditor
import 'ckeditor5/ckeditor5.css'
import './CKEditorDocument.css'

// Tipos
interface DocumentTemplate {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

interface TemplateVariable {
  key: string
  label: string
  group: string
}

interface CKEditorDocumentProps {
  initialContent?: string
  onSave?: (content: string, title: string) => void
  onExportPDF?: (htmlContent: string) => void
}

// Lista de variáveis disponíveis
const templateVariables: TemplateVariable[] = [
  // Médico
  { key: '{{nome_medico}}', label: 'Nome do Médico', group: 'Médico' },
  { key: '{{especialidade}}', label: 'Especialidade', group: 'Médico' },
  { key: '{{n_concelho}}', label: 'Nº Conselho', group: 'Médico' },
  { key: '{{concelho_uf}}', label: 'Conselho UF', group: 'Médico' },
  { key: '{{rqe}}', label: 'RQE', group: 'Médico' },
  // Endereço
  { key: '{{end_logadouro}}', label: 'Logradouro', group: 'Endereço' },
  { key: '{{end_numero}}', label: 'Número', group: 'Endereço' },
  { key: '{{end_complemento}}', label: 'Complemento', group: 'Endereço' },
  { key: '{{end_bairro}}', label: 'Bairro', group: 'Endereço' },
  { key: '{{end_cidade}}', label: 'Cidade', group: 'Endereço' },
  { key: '{{end_uf}}', label: 'UF', group: 'Endereço' },
  // Paciente
  { key: '{{paciente}}', label: 'Nome do Paciente', group: 'Paciente' },
  { key: '{{paciente_end}}', label: 'Endereço do Paciente', group: 'Paciente' },
  // Documento
  { key: '{{receita}}', label: 'Receita', group: 'Documento' },
]

// Configuração do CKEditor
const editorConfig: EditorConfig = {
  // Chave de licença GPL para uso open source
  licenseKey: 'GPL',
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading,
    FontFamily,
    FontSize,
    FontColor,
    FontBackgroundColor,
    Alignment,
    List,
    // Tabelas - configuração completa
    Table,
    TableToolbar,
    TableCellProperties,
    TableProperties,
    TableColumnResize,
    TableCaption,
    // Imagens
    Image,
    ImageToolbar,
    ImageCaption,
    ImageStyle,
    ImageResize,
    ImageUpload,
    Base64UploadAdapter,
    // Outros
    Link,
    Indent,
    IndentBlock,
    Undo,
    GeneralHtmlSupport,
  ],
  toolbar: {
    items: [
      'undo', 'redo',
      '|',
      'heading',
      '|',
      'fontFamily', 'fontSize',
      '|',
      'bold', 'italic', 'underline', 'strikethrough',
      '|',
      'fontColor', 'fontBackgroundColor',
      '|',
      'alignment',
      '|',
      'bulletedList', 'numberedList',
      '|',
      'outdent', 'indent',
      '|',
      'link', 'insertImage', 'insertTable',
    ],
    shouldNotGroupWhenFull: true
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Parágrafo', class: 'ck-heading_paragraph' },
      { model: 'heading1', view: 'h1', title: 'Título 1', class: 'ck-heading_heading1' },
      { model: 'heading2', view: 'h2', title: 'Título 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Título 3', class: 'ck-heading_heading3' },
    ]
  },
  fontFamily: {
    options: [
      'default',
      'Arial, Helvetica, sans-serif',
      'Courier New, Courier, monospace',
      'Georgia, serif',
      'Times New Roman, Times, serif',
      'Verdana, Geneva, sans-serif',
    ]
  },
  fontSize: {
    options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72],
    supportAllValues: true
  },
  // Configuração de tabelas
  table: {
    contentToolbar: [
      'tableColumn', 'tableRow', 'mergeTableCells',
      '|',
      'tableCellProperties', 'tableProperties',
      '|',
      'toggleTableCaption'
    ],
    tableProperties: {
      borderColors: [
        { color: '#000000', label: 'Preto' },
        { color: '#4a4a4a', label: 'Cinza Escuro' },
        { color: '#9a9a9a', label: 'Cinza' },
        { color: '#d1d5db', label: 'Cinza Claro' },
        { color: '#2d5016', label: 'Verde Escuro' },
        { color: '#4a7c23', label: 'Verde' },
        { color: '#1e40af', label: 'Azul' },
        { color: '#dc2626', label: 'Vermelho' },
      ],
      backgroundColors: [
        { color: '#ffffff', label: 'Branco' },
        { color: '#f3f4f6', label: 'Cinza Claro' },
        { color: '#dcfce7', label: 'Verde Claro' },
        { color: '#dbeafe', label: 'Azul Claro' },
        { color: '#fef3c7', label: 'Amarelo Claro' },
        { color: '#fee2e2', label: 'Vermelho Claro' },
        { color: '#f3e8ff', label: 'Roxo Claro' },
      ],
      defaultProperties: {
        borderStyle: 'solid',
        borderColor: '#d1d5db',
        borderWidth: '1px',
      }
    },
    tableCellProperties: {
      borderColors: [
        { color: '#000000', label: 'Preto' },
        { color: '#4a4a4a', label: 'Cinza Escuro' },
        { color: '#9a9a9a', label: 'Cinza' },
        { color: '#d1d5db', label: 'Cinza Claro' },
        { color: '#2d5016', label: 'Verde Escuro' },
        { color: '#4a7c23', label: 'Verde' },
      ],
      backgroundColors: [
        { color: '#ffffff', label: 'Branco' },
        { color: '#f3f4f6', label: 'Cinza Claro' },
        { color: '#dcfce7', label: 'Verde Claro' },
        { color: '#dbeafe', label: 'Azul Claro' },
        { color: '#fef3c7', label: 'Amarelo Claro' },
        { color: '#fee2e2', label: 'Vermelho Claro' },
      ],
      defaultProperties: {
        borderStyle: 'solid',
        borderColor: '#d1d5db',
        borderWidth: '1px',
        padding: '8px',
      }
    }
  },
  // Configuração de imagens
  image: {
    toolbar: [
      'imageStyle:inline', 'imageStyle:block', 'imageStyle:side',
      '|',
      'toggleImageCaption', 'imageTextAlternative',
      '|',
      'resizeImage'
    ],
    resizeOptions: [
      { name: 'resizeImage:original', value: null, label: 'Original' },
      { name: 'resizeImage:25', value: '25', label: '25%' },
      { name: 'resizeImage:50', value: '50', label: '50%' },
      { name: 'resizeImage:75', value: '75', label: '75%' },
    ]
  },
  // Suporte a HTML genérico (para preservar estilos)
  htmlSupport: {
    allow: [
      {
        name: /.*/,
        attributes: true,
        classes: true,
        styles: true
      }
    ]
  },
  // Idioma
  language: 'pt-br',
}

// Tipos para as abas
type RibbonTab = 'inicio' | 'inserir' | 'texto' | 'layout' | 'tabela'

export function CKEditorDocument({ initialContent = '', onSave, onExportPDF }: CKEditorDocumentProps) {
  const [title, setTitle] = useState('')
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)
  const [showVariablesMenu, setShowVariablesMenu] = useState(false)
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  // const [savedMessage, setSavedMessage] = useState('') // Removido: não utilizado
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('inicio')
  const pageRef = useRef<HTMLDivElement>(null)

  // Obter conteúdo HTML do editor
  const getEditorContent = useCallback((): string => {
    if (!editorInstance) return ''
    return editorInstance.getData()
  }, [editorInstance])

  // Inserir variável no editor
  const insertVariable = useCallback((variable: string) => {
    if (!editorInstance) return
    
    const viewFragment = editorInstance.data.processor.toView(variable)
    const modelFragment = editorInstance.data.toModel(viewFragment)
    editorInstance.model.insertContent(modelFragment)
    setShowVariablesMenu(false)
  }, [editorInstance])

  // Substituir variáveis por valores reais
  // const replaceVariables = useCallback((content: string, values: Record<string, string>): string => {
  //   let result = content
  //   
  //   // Substituir cada variável pelo seu valor
  //   Object.entries(values).forEach(([key, value]) => {
  //     const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
  //     result = result.replace(regex, value)
  //   })
  //   
  //   return result
  // }, []) // Removido: não utilizado

  // Salvar modelo
  const handleSave = useCallback(() => {
    const content = getEditorContent()
    
    if (onSave) {
      onSave(content, title)
    }
    
    // Exemplo: salvar no localStorage
    const template: DocumentTemplate = {
      id: Date.now().toString(),
      title: title || 'Sem título',
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    // Obter templates existentes
    const existingTemplates = JSON.parse(localStorage.getItem('documentTemplates') || '[]')
    existingTemplates.push(template)
    localStorage.setItem('documentTemplates', JSON.stringify(existingTemplates))
    
    // setSavedMessage('Modelo salvo com sucesso!')
    // setTimeout(() => setSavedMessage(''), 3000) // Removido: variável não existe mais
    
    console.log('Template salvo:', template)
  }, [getEditorContent, title, onSave])

  // Exportar para PDF
  const handleExportPDF = useCallback(async () => {
    if (!pageRef.current) return
    
    // Importar html2pdf dinamicamente
    const html2pdf = (await import('html2pdf.js')).default
    
    // Obter conteúdo do editor
    const content = getEditorContent()
    
    // Criar elemento temporário para o PDF
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    tempDiv.className = 'pdf-export-content'
    tempDiv.style.cssText = `
      width: ${pageOrientation === 'portrait' ? '210mm' : '297mm'};
      min-height: ${pageOrientation === 'portrait' ? '297mm' : '210mm'};
      padding: 20mm;
      background: white;
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
    `
    
    document.body.appendChild(tempDiv)
    
    const options = {
      margin: 0,
      filename: `${title || 'documento'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: pageOrientation,
      },
    }
    
    await html2pdf().set(options).from(tempDiv).save()
    
    document.body.removeChild(tempDiv)
    
    if (onExportPDF) {
      onExportPDF(content)
    }
  }, [getEditorContent, pageOrientation, title, onExportPDF])

  // Gerar documento com variáveis substituídas
  // const generateDocument = useCallback((variableValues: Record<string, string>) => {
  //   const content = getEditorContent()
  //   return replaceVariables(content, variableValues)
  // }, [getEditorContent, replaceVariables]) // Removido: não utilizado

  // Agrupar variáveis por grupo
  const variablesByGroup = templateVariables.reduce((acc, variable) => {
    if (!acc[variable.group]) {
      acc[variable.group] = []
    }
    acc[variable.group].push(variable)
    return acc
  }, {} as Record<string, TemplateVariable[]>)

  // Executar comando do editor
  const executeCommand = useCallback((commandName: string) => {
    if (!editorInstance) return
    editorInstance.execute(commandName)
    editorInstance.editing.view.focus()
  }, [editorInstance])

  // Inserir tabela
  const insertTable = useCallback(() => {
    if (!editorInstance) return
    editorInstance.execute('insertTable', { rows: 3, columns: 3 })
    editorInstance.editing.view.focus()
  }, [editorInstance])

  // Inserir imagem (abre seletor de arquivo)
  const insertImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && editorInstance) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          editorInstance.execute('insertImage', { source: base64 })
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [editorInstance])

  // Inserir link
  const insertLink = useCallback(() => {
    if (!editorInstance) return
    const url = prompt('Digite a URL do link:')
    if (url) {
      editorInstance.execute('link', url)
      editorInstance.editing.view.focus()
    }
  }, [editorInstance])

  // Inserir linha horizontal
  const insertHorizontalLine = useCallback(() => {
    if (!editorInstance) return
    const viewFragment = editorInstance.data.processor.toView('<hr/>')
    const modelFragment = editorInstance.data.toModel(viewFragment)
    editorInstance.model.insertContent(modelFragment)
  }, [editorInstance])

  return (
    <div className="ckeditor-layout">
      {/* Área Principal - Editor */}
      <main className="ckeditor-main">
        {/* Ribbon - Barra de Abas de Ferramentas */}
        <div className="ribbon-container">
          {/* Abas do Ribbon */}
          <div className="ribbon-tabs">
            <button 
              className={`ribbon-tab ${activeRibbonTab === 'inicio' ? 'active' : ''}`}
              onClick={() => setActiveRibbonTab('inicio')}
            >
              Início
            </button>
            <button 
              className={`ribbon-tab ${activeRibbonTab === 'inserir' ? 'active' : ''}`}
              onClick={() => setActiveRibbonTab('inserir')}
            >
              Inserir
            </button>
            <button 
              className={`ribbon-tab ${activeRibbonTab === 'texto' ? 'active' : ''}`}
              onClick={() => setActiveRibbonTab('texto')}
            >
              Texto
            </button>
            <button 
              className={`ribbon-tab ${activeRibbonTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveRibbonTab('layout')}
            >
              Layout
            </button>
            <button 
              className={`ribbon-tab ${activeRibbonTab === 'tabela' ? 'active' : ''}`}
              onClick={() => setActiveRibbonTab('tabela')}
            >
              Tabela
            </button>
          </div>

          {/* Conteúdo do Ribbon */}
          <div className="ribbon-content">
            {/* Aba Início */}
            {activeRibbonTab === 'inicio' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Arquivo</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={handleSave} title="Salvar modelo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                      </svg>
                      <span>Salvar</span>
                    </button>
                    <button className="ribbon-btn" onClick={handleExportPDF} title="Exportar PDF">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <polyline points="9,15 12,18 15,15"/>
                      </svg>
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Edição</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={() => executeCommand('undo')} title="Desfazer">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v6h6"/>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                      </svg>
                      <span>Desfazer</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeCommand('redo')} title="Refazer">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 7v6h-6"/>
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                      </svg>
                      <span>Refazer</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Área de Transferência</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={() => document.execCommand('copy')} title="Copiar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copiar</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => document.execCommand('paste')} title="Colar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                      </svg>
                      <span>Colar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Inserir */}
            {activeRibbonTab === 'inserir' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Tabelas</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={insertTable} title="Inserir tabela">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="3" y1="15" x2="21" y2="15"/>
                        <line x1="9" y1="3" x2="9" y2="21"/>
                        <line x1="15" y1="3" x2="15" y2="21"/>
                      </svg>
                      <span>Tabela</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Ilustrações</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={insertImage} title="Inserir imagem">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      <span>Imagem</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Links</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={insertLink} title="Inserir link">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                      <span>Link</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Variáveis</span>
                  <div className="ribbon-buttons">
                    <div className="ribbon-dropdown">
                      <button 
                        className="ribbon-btn large" 
                        onClick={() => setShowVariablesMenu(!showVariablesMenu)}
                        title="Inserir variável"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 7h6"/>
                          <path d="M4 11h6"/>
                          <path d="M4 15h6"/>
                          <path d="M14 7h6"/>
                          <path d="M14 11h6"/>
                          <path d="M14 15h6"/>
                        </svg>
                        <span>Variável</span>
                      </button>
                      {showVariablesMenu && (
                        <div className="ribbon-dropdown-menu">
                          {Object.entries(variablesByGroup).map(([group, variables]) => (
                            <div key={group} className="dropdown-group">
                              <div className="dropdown-group-title">{group}</div>
                              {variables.map(v => (
                                <button
                                  key={v.key}
                                  className="dropdown-item"
                                  onClick={() => insertVariable(v.key)}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Elementos</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={insertHorizontalLine} title="Linha horizontal">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"/>
                      </svg>
                      <span>Linha</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Texto */}
            {activeRibbonTab === 'texto' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Formatação</span>
                  <div className="ribbon-buttons row">
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('bold')} title="Negrito">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('italic')} title="Itálico">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="4" x2="10" y2="4"/>
                        <line x1="14" y1="20" x2="5" y2="20"/>
                        <line x1="15" y1="4" x2="9" y2="20"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('underline')} title="Sublinhado">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 4v6a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"/>
                        <line x1="4" y1="20" x2="20" y2="20"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('strikethrough')} title="Tachado">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4H9a3 3 0 0 0 0 6h6"/>
                        <path d="M8 20h7a3 3 0 0 0 0-6H8"/>
                        <line x1="4" y1="12" x2="20" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Alinhamento</span>
                  <div className="ribbon-buttons row">
                    <button className="ribbon-btn icon-only" onClick={() => { if (editorInstance) editorInstance.execute('alignment', { value: 'left' }); editorInstance?.editing.view.focus() }} title="Alinhar à esquerda">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="15" y2="12"/>
                        <line x1="3" y1="18" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => { if (editorInstance) editorInstance.execute('alignment', { value: 'center' }); editorInstance?.editing.view.focus() }} title="Centralizar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="6" y1="12" x2="18" y2="12"/>
                        <line x1="4" y1="18" x2="20" y2="18"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => { if (editorInstance) editorInstance.execute('alignment', { value: 'right' }); editorInstance?.editing.view.focus() }} title="Alinhar à direita">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="9" y1="12" x2="21" y2="12"/>
                        <line x1="6" y1="18" x2="21" y2="18"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => { if (editorInstance) editorInstance.execute('alignment', { value: 'justify' }); editorInstance?.editing.view.focus() }} title="Justificar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="3" y1="18" x2="21" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Listas</span>
                  <div className="ribbon-buttons row">
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('bulletedList')} title="Lista com marcadores">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="9" y1="6" x2="20" y2="6"/>
                        <line x1="9" y1="12" x2="20" y2="12"/>
                        <line x1="9" y1="18" x2="20" y2="18"/>
                        <circle cx="4" cy="6" r="1" fill="currentColor"/>
                        <circle cx="4" cy="12" r="1" fill="currentColor"/>
                        <circle cx="4" cy="18" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('numberedList')} title="Lista numerada">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="10" y1="6" x2="21" y2="6"/>
                        <line x1="10" y1="12" x2="21" y2="12"/>
                        <line x1="10" y1="18" x2="21" y2="18"/>
                        <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none">1</text>
                        <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none">2</text>
                        <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none">3</text>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Recuo</span>
                  <div className="ribbon-buttons row">
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('outdent')} title="Diminuir recuo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="7,8 3,12 7,16"/>
                        <line x1="21" y1="12" x2="11" y2="12"/>
                        <line x1="21" y1="6" x2="11" y2="6"/>
                        <line x1="21" y1="18" x2="11" y2="18"/>
                      </svg>
                    </button>
                    <button className="ribbon-btn icon-only" onClick={() => executeCommand('indent')} title="Aumentar recuo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,8 7,12 3,16"/>
                        <line x1="21" y1="12" x2="11" y2="12"/>
                        <line x1="21" y1="6" x2="11" y2="6"/>
                        <line x1="21" y1="18" x2="11" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Layout */}
            {activeRibbonTab === 'layout' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Orientação da Página</span>
                  <div className="ribbon-buttons">
                    <button 
                      className={`ribbon-btn ${pageOrientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => setPageOrientation('portrait')}
                      title="Retrato"
                    >
                      <svg width="20" height="24" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="1" width="16" height="22" rx="2"/>
                      </svg>
                      <span>Retrato</span>
                    </button>
                    <button 
                      className={`ribbon-btn ${pageOrientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => setPageOrientation('landscape')}
                      title="Paisagem"
                    >
                      <svg width="24" height="20" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="2" width="22" height="16" rx="2"/>
                      </svg>
                      <span>Paisagem</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Documento</span>
                  <div className="ribbon-buttons">
                    <div className="ribbon-input-group">
                      <label>Título:</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Nome do documento"
                        className="ribbon-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Tabela */}
            {activeRibbonTab === 'tabela' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Inserir</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={insertTable} title="Inserir tabela 3x3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="9" x2="21" y2="9"/>
                        <line x1="3" y1="15" x2="21" y2="15"/>
                        <line x1="9" y1="3" x2="9" y2="21"/>
                        <line x1="15" y1="3" x2="15" y2="21"/>
                      </svg>
                      <span>Nova Tabela</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Linhas e Colunas</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={() => executeCommand('insertTableRowAbove')} title="Inserir linha acima">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="13" rx="1"/>
                        <path d="M12 3v4"/>
                        <path d="M9 5l3-2 3 2"/>
                      </svg>
                      <span>Linha ↑</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeCommand('insertTableRowBelow')} title="Inserir linha abaixo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="13" rx="1"/>
                        <path d="M12 21v-4"/>
                        <path d="M9 19l3 2 3-2"/>
                      </svg>
                      <span>Linha ↓</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeCommand('insertTableColumnLeft')} title="Inserir coluna à esquerda">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="8" y="3" width="13" height="18" rx="1"/>
                        <path d="M3 12h4"/>
                        <path d="M5 9l-2 3 2 3"/>
                      </svg>
                      <span>Coluna ←</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeCommand('insertTableColumnRight')} title="Inserir coluna à direita">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="13" height="18" rx="1"/>
                        <path d="M21 12h-4"/>
                        <path d="M19 9l2 3-2 3"/>
                      </svg>
                      <span>Coluna →</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Mesclar</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={() => executeCommand('mergeTableCells')} title="Mesclar células">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="12" y1="3" x2="12" y2="12"/>
                      </svg>
                      <span>Mesclar</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => executeCommand('splitTableCellVertically')} title="Dividir célula">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="12" y1="3" x2="12" y2="21"/>
                      </svg>
                      <span>Dividir</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Excluir</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn danger" onClick={() => executeCommand('removeTableRow')} title="Excluir linha">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="8" rx="1"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      <span>Linha</span>
                    </button>
                    <button className="ribbon-btn danger" onClick={() => executeCommand('removeTableColumn')} title="Excluir coluna">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="8" y="3" width="8" height="18" rx="1"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                      </svg>
                      <span>Coluna</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="page-preview-area">
          <div 
            ref={pageRef}
            className={`document-page ${pageOrientation}`}
          >
            <CKEditor
              editor={ClassicEditor}
              config={editorConfig}
              data={initialContent}
              onReady={(editor) => {
                setEditorInstance(editor)
                console.log('CKEditor 5 está pronto!', editor)
              }}
              onChange={() => {
                // Opcional: salvar automaticamente ou mostrar indicador de alterações
              }}
            />
          </div>
        </div>
      </main>

      {/* Sidebar Direita - Informações */}
      <aside className={`ckeditor-sidebar right ${rightSidebarOpen ? 'open' : 'closed'}`}>
        <button 
          className="sidebar-toggle"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          title={rightSidebarOpen ? 'Recolher' : 'Expandir'}
        >
          {rightSidebarOpen ? '▶' : '◀'}
        </button>
        
        {rightSidebarOpen && (
          <div className="sidebar-content">
            <div className="sidebar-section">
              <h4>Dicas</h4>
              <ul className="tips-list">
                <li>Use <strong>Inserir Tabela</strong> na barra de ferramentas</li>
                <li>Clique na tabela para ver opções de células</li>
                <li>Arraste bordas para redimensionar colunas</li>
                <li>Use variáveis para dados dinâmicos</li>
              </ul>
            </div>

            <div className="sidebar-section">
              <h4>Atalhos</h4>
              <div className="shortcuts-list">
                <div className="shortcut">
                  <kbd>Ctrl</kbd> + <kbd>B</kbd>
                  <span>Negrito</span>
                </div>
                <div className="shortcut">
                  <kbd>Ctrl</kbd> + <kbd>I</kbd>
                  <span>Itálico</span>
                </div>
                <div className="shortcut">
                  <kbd>Ctrl</kbd> + <kbd>U</kbd>
                  <span>Sublinhado</span>
                </div>
                <div className="shortcut">
                  <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                  <span>Desfazer</span>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h4>Sobre Variáveis</h4>
              <p className="info-text">
                As variáveis <code>{'{{nome}}'}</code> serão substituídas 
                pelos valores reais quando o documento for gerado.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

// Função utilitária para gerar documento com variáveis
export function generateDocumentWithVariables(
  templateContent: string,
  variables: Record<string, string>
): string {
  let result = templateContent
  
  Object.entries(variables).forEach(([key, value]) => {
    // Escapa caracteres especiais do regex
    const escapedKey = key.replace(/[{}]/g, '\\$&')
    const regex = new RegExp(escapedKey, 'g')
    result = result.replace(regex, value)
  })
  
  return result
}

// Função para carregar modelos salvos
export function loadSavedTemplates(): DocumentTemplate[] {
  const templates = localStorage.getItem('documentTemplates')
  return templates ? JSON.parse(templates) : []
}

// Função para deletar modelo
export function deleteTemplate(id: string): void {
  const templates = loadSavedTemplates()
  const filtered = templates.filter(t => t.id !== id)
  localStorage.setItem('documentTemplates', JSON.stringify(filtered))
}
