import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import { useCallback, useRef, useState, useEffect } from 'react'
import html2pdf from 'html2pdf.js'
import { ResizableImageComponent } from './ResizableImageComponent'
import { DraggableTableComponent } from './DraggableTableComponent'
import './DocumentEditor.css'

// Custom Table Extension with styling and drag options
const StyledTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: 'transparent',
        parseHTML: element => element.style.backgroundColor || 'transparent',
        renderHTML: attributes => {
          if (!attributes.backgroundColor || attributes.backgroundColor === 'transparent') {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
      borderColor: {
        default: '#d1d5db',
        parseHTML: element => element.getAttribute('data-border-color') || '#d1d5db',
        renderHTML: attributes => {
          return {
            'data-border-color': attributes.borderColor,
          }
        },
      },
      borderWidth: {
        default: 1,
        parseHTML: element => Number(element.getAttribute('data-border-width')) || 1,
        renderHTML: attributes => {
          return {
            'data-border-width': attributes.borderWidth,
          }
        },
      },
      borderStyle: {
        default: 'solid',
        parseHTML: element => element.getAttribute('data-border-style') || 'solid',
        renderHTML: attributes => {
          return {
            'data-border-style': attributes.borderStyle,
          }
        },
      },
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment') || 'left',
        renderHTML: attributes => {
          return {
            'data-alignment': attributes.alignment,
          }
        },
      },
      positionX: {
        default: 0,
        parseHTML: element => Number(element.getAttribute('data-position-x')) || 0,
        renderHTML: attributes => {
          return {
            'data-position-x': attributes.positionX,
          }
        },
      },
      positionY: {
        default: 0,
        parseHTML: element => Number(element.getAttribute('data-position-y')) || 0,
        renderHTML: attributes => {
          return {
            'data-position-y': attributes.positionY,
          }
        },
      },
      isDraggable: {
        default: false,
        parseHTML: element => element.getAttribute('data-draggable') === 'true',
        renderHTML: attributes => {
          return {
            'data-draggable': attributes.isDraggable ? 'true' : 'false',
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(DraggableTableComponent)
  },
})

// Custom TableCell with background
const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
      rowheight: {
        default: null,
        parseHTML: element => {
          const height = element.style.height
          return height ? parseInt(height, 10) : null
        },
        renderHTML: attributes => {
          if (!attributes.rowheight) {
            return {}
          }
          return {
            style: `height: ${attributes.rowheight}px; min-height: ${attributes.rowheight}px`,
          }
        },
      },
    }
  },
})

// Custom TableHeader with background
const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
      rowheight: {
        default: null,
        parseHTML: element => {
          const height = element.style.height
          return height ? parseInt(height, 10) : null
        },
        renderHTML: attributes => {
          if (!attributes.rowheight) {
            return {}
          }
          return {
            style: `height: ${attributes.rowheight}px; min-height: ${attributes.rowheight}px`,
          }
        },
      },
    }
  },
})

// Custom Image Extension with resize handles and layout options
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 300,
        parseHTML: element => {
          const width = element.getAttribute('width') || element.style.width?.replace('px', '')
          return width ? Number(width) : 300
        },
        renderHTML: attributes => {
          return {
            width: attributes.width,
          }
        },
      },
      textWrap: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-text-wrap') || 'inline',
        renderHTML: attributes => {
          return {
            'data-text-wrap': attributes.textWrap,
          }
        },
      },
      alignment: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-alignment') || 'left',
        renderHTML: attributes => {
          return {
            'data-alignment': attributes.alignment,
          }
        },
      },
      moveWithText: {
        default: true,
        parseHTML: element => element.getAttribute('data-move-with-text') !== 'false',
        renderHTML: attributes => {
          return {
            'data-move-with-text': attributes.moveWithText ? 'true' : 'false',
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})

type PageOrientation = 'portrait' | 'landscape'
type FontFamily = 'Inter' | 'Arial' | 'Times New Roman' | 'Georgia' | 'Courier New'
type ToolbarTab = 'inicio' | 'inserir' | 'texto' | 'layout' | 'tabela' | 'propriedades' | 'objetos'
type TableMode = 'inline' | 'floating'

interface PageObject {
  id: string
  type: 'table' | 'image' | 'rectangle'
  name: string
  mode: TableMode
  x: number
  y: number
  width?: number
  height?: number
  bgColor?: string
  borderColor?: string
  borderWidth?: number
  text?: string
  textAlign?: 'left' | 'center' | 'right'
  textVAlign?: 'top' | 'middle' | 'bottom'
  element?: HTMLElement
}

interface DocumentModel {
  title: string
  pageOrientation: 'portrait' | 'landscape'
  fontFamily: string
  fontSize: number
  pageMargin: number
  backgroundImage: string | null
  backgroundOpacity: number
  content: string
  objects: PageObject[]
  totalPages: number
  createdAt: string
  updatedAt: string
}

interface DocumentEditorProps {
  onSave?: (content: string, title: string) => void
  initialDocument?: DocumentModel
  documentName?: string
}

export function DocumentEditor({ onSave, initialDocument, documentName }: DocumentEditorProps) {
  const [title, setTitle] = useState(initialDocument?.title || '')
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<ToolbarTab>('inicio')
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait')
  const [fontFamily, setFontFamily] = useState<FontFamily>('Inter')
  const [fontSize, setFontSize] = useState(14)
  const [pageMargin, setPageMargin] = useState(20)
  const [imageWidth, setImageWidth] = useState<number>(100)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(100)
  // Estados da tabela (valores padrão para novas tabelas)
  const [tableBgColor, setTableBgColor] = useState('#d1d5db')
  const [tableBorderColor, setTableBorderColor] = useState('#000000')
  const [tableBorderWidth, setTableBorderWidth] = useState(1)
  const [tableBorderStyle, setTableBorderStyle] = useState('solid')
  const [headerBgColor, setHeaderBgColor] = useState('#d1d5db')
  
  // Estados do objeto selecionado
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [objectName, setObjectName] = useState('')
  const [objectMode, setObjectMode] = useState<TableMode>('floating')
  const [objectX, setObjectX] = useState(0)
  const [objectY, setObjectY] = useState(0)
  
  // Estados do retângulo
  const [rectWidth, setRectWidth] = useState(200)
  const [rectHeight, setRectHeight] = useState(100)
  const [rectBgColor, setRectBgColor] = useState('#e5e7eb')
  const [rectBorderColor, setRectBorderColor] = useState('#000000')
  const [rectBorderWidth, setRectBorderWidth] = useState(1)
  const [rectText, setRectText] = useState('')
  const [rectTextAlign, setRectTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [rectTextVAlign, setRectTextVAlign] = useState<'top' | 'middle' | 'bottom'>('middle')
  
  // Lista de objetos na página
  const [pageObjects, setPageObjects] = useState<PageObject[]>([])
  
  // Sistema de páginas
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [, forceUpdate] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const objectCounter = useRef({ table: 0, image: 0 })

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
      }),
      StyledTable.configure({
        resizable: true,
      }),
      TableRow,
      StyledTableHeader,
      StyledTableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: initialDocument?.content || '<p>Comece a digitar seu documento aqui...</p>',
  })

  // Carregar documento inicial quando fornecido
  useEffect(() => {
    if (initialDocument && editor) {
      // Carregar configurações do documento
      setTitle(initialDocument.title || '')
      setPageOrientation(initialDocument.pageOrientation || 'portrait')
      setFontFamily((initialDocument.fontFamily as FontFamily) || 'Inter')
      setFontSize(initialDocument.fontSize || 14)
      setPageMargin(initialDocument.pageMargin || 20)
      setBackgroundImage(initialDocument.backgroundImage || null)
      setBackgroundOpacity(initialDocument.backgroundOpacity || 100)
      setTotalPages(initialDocument.totalPages || 1)
      
      // Carregar conteúdo do editor
      if (initialDocument.content) {
        editor.commands.setContent(initialDocument.content)
      }
      
      // Carregar objetos (retângulos) se existirem
      if (initialDocument.objects && initialDocument.objects.length > 0 && editorRef.current) {
        // Limpar objetos existentes
        pageObjects.forEach(obj => {
          const el = editorRef.current?.querySelector(`[data-object-id="${obj.id}"]`)
          if (el) el.remove()
        })
        setPageObjects([])
        
        // Recriar objetos do modelo
        setTimeout(() => {
          initialDocument.objects.forEach(obj => {
            if (obj.type === 'rectangle' && editorRef.current) {
              const rect = document.createElement('div')
              rect.setAttribute('data-object-id', obj.id)
              rect.setAttribute('data-object-name', obj.name)
              rect.setAttribute('data-object-type', 'rectangle')
              rect.className = 'page-rectangle floating-object'
              
              // Aplicar estilos exatamente como na função addRectangle
              rect.style.position = 'absolute'
              rect.style.left = `${obj.x}px`
              rect.style.top = `${obj.y}px`
              rect.style.width = `${obj.width || 200}px`
              rect.style.height = `${obj.height || 100}px`
              rect.style.backgroundColor = obj.bgColor || '#e5e7eb'
              rect.style.border = `${obj.borderWidth || 1}px solid ${obj.borderColor || '#000000'}`
              rect.style.zIndex = '10'
              rect.style.cursor = 'move'
              rect.style.boxSizing = 'border-box'
              rect.style.display = 'flex'
              rect.style.alignItems = obj.textVAlign === 'top' ? 'flex-start' : obj.textVAlign === 'bottom' ? 'flex-end' : 'center'
              rect.style.justifyContent = obj.textAlign || 'center'
              rect.style.textAlign = obj.textAlign || 'center'
              rect.style.padding = '8px'
              rect.style.overflow = 'hidden'
              rect.style.fontSize = '14px'
              rect.style.color = '#000000'
              rect.innerHTML = obj.text || ''
              
              // Garantir que o container tenha position relative
              editorRef.current.style.position = 'relative'
              // Adicionar diretamente ao editorRef.current (não ao .doc-content)
              editorRef.current.appendChild(rect)
            }
          })
          
          setPageObjects(initialDocument.objects.map(obj => ({ ...obj, element: undefined })))
        }, 100)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialDocument])

  const addImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    // Aceita PNG, JPEG, GIF, WebP e SVG para melhor qualidade na impressão
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.svg'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && editor) {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          const url = readerEvent.target?.result as string
          editor.chain().focus().setImage({ src: url }).run()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [editor])

  const addTable = useCallback((mode: TableMode = 'inline') => {
    if (editor) {
      objectCounter.current.table += 1
      const tableId = `table-${Date.now()}`
      const tableName = `Tabela ${objectCounter.current.table}`
      
      // Inserir tabela
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      
      // Aguardar a tabela ser renderizada e configurá-la
      setTimeout(() => {
        if (editorRef.current) {
          const tables = editorRef.current.querySelectorAll('table')
          const lastTable = tables[tables.length - 1] as HTMLTableElement
          if (lastTable) {
            lastTable.setAttribute('data-object-id', tableId)
            lastTable.setAttribute('data-object-name', tableName)
            lastTable.setAttribute('data-object-mode', mode)
            
            // Aplicar estilos padrão para visualização
            const defaultBorder = '1px solid #000000'
            const defaultBgColor = '#d1d5db'
            const defaultHeaderBg = '#d1d5db'
            
            lastTable.style.border = defaultBorder
            lastTable.style.borderCollapse = 'collapse'
            lastTable.style.backgroundColor = defaultBgColor
            lastTable.style.width = '100%'
            
            // Aplicar estilos em todas as células
            const cells = lastTable.querySelectorAll('td, th')
            cells.forEach((cell) => {
              const cellEl = cell as HTMLElement
              cellEl.style.border = defaultBorder
              cellEl.style.padding = '8px 12px'
              
              if (cell.tagName === 'TH') {
                cellEl.style.backgroundColor = defaultHeaderBg
                cellEl.style.fontWeight = '600'
              } else {
                cellEl.style.backgroundColor = defaultBgColor
              }
            })
            
            if (mode === 'floating') {
              lastTable.style.position = 'absolute'
              lastTable.style.left = '50px'
              lastTable.style.top = '50px'
              lastTable.style.zIndex = '10'
              lastTable.style.width = 'auto'
              lastTable.classList.add('floating-table')
            }
            
            // Adicionar à lista de objetos
            setPageObjects(prev => [...prev, {
              id: tableId,
              type: 'table',
              name: tableName,
              mode: mode,
              x: mode === 'floating' ? 50 : 0,
              y: mode === 'floating' ? 50 : 0,
              element: lastTable
            }])
          }
        }
      }, 100)
    }
  }, [editor])

  // Função para adicionar retângulo
  const addRectangle = useCallback(() => {
    if (!editorRef.current) return
    
    objectCounter.current.image += 1 // Usar contador de imagem para objetos visuais
    const rectId = `rect-${Date.now()}`
    const rectName = `Retângulo ${objectCounter.current.image}`
    
    // Criar elemento retângulo
    const rect = document.createElement('div')
    rect.setAttribute('data-object-id', rectId)
    rect.setAttribute('data-object-name', rectName)
    rect.setAttribute('data-object-type', 'rectangle')
    rect.className = 'page-rectangle floating-object'
    
    // Estilos padrão
    rect.style.position = 'absolute'
    rect.style.left = '50px'
    rect.style.top = '50px'
    rect.style.width = '200px'
    rect.style.height = '100px'
    rect.style.backgroundColor = '#e5e7eb'
    rect.style.border = '1px solid #000000'
    rect.style.zIndex = '10'
    rect.style.cursor = 'move'
    rect.style.boxSizing = 'border-box'
    rect.style.display = 'flex'
    rect.style.alignItems = 'center'
    rect.style.justifyContent = 'center'
    rect.style.textAlign = 'center'
    rect.style.padding = '8px'
    rect.style.overflow = 'hidden'
    rect.style.fontSize = '14px'
    rect.style.color = '#000000'
    
    // Adicionar ao container da página
    const pageContainer = editorRef.current
    if (pageContainer) {
      pageContainer.style.position = 'relative'
      pageContainer.appendChild(rect)
      
      // Adicionar à lista de objetos
      setPageObjects(prev => [...prev, {
        id: rectId,
        type: 'rectangle',
        name: rectName,
        mode: 'floating',
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        bgColor: '#e5e7eb',
        borderColor: '#000000',
        borderWidth: 1,
        text: '',
        textAlign: 'center',
        textVAlign: 'middle',
        element: rect
      }])
      
      // Selecionar o retângulo recém-criado
      setSelectedObjectId(rectId)
      setObjectName(rectName)
      setObjectMode('floating')
      setObjectX(50)
      setObjectY(50)
      setRectWidth(200)
      setRectHeight(100)
      setRectBgColor('#e5e7eb')
      setRectBorderColor('#000000')
      setRectBorderWidth(1)
      setRectText('')
      setRectTextAlign('center')
      setRectTextVAlign('middle')
      setActiveTab('propriedades')
    }
  }, [])

  // Lista de variáveis disponíveis
  const templateVariables = [
    { key: '{{nome_medico}}', label: 'Nome do Médico', group: 'Médico' },
    { key: '{{especialidade}}', label: 'Especialidade', group: 'Médico' },
    { key: '{{n_concelho}}', label: 'Nº Conselho', group: 'Médico' },
    { key: '{{concelho_uf}}', label: 'Conselho UF', group: 'Médico' },
    { key: '{{rqe}}', label: 'RQE', group: 'Médico' },
    { key: '{{end_logadouro}}', label: 'Logradouro', group: 'Endereço' },
    { key: '{{end_numero}}', label: 'Número', group: 'Endereço' },
    { key: '{{end_complemento}}', label: 'Complemento', group: 'Endereço' },
    { key: '{{end_bairro}}', label: 'Bairro', group: 'Endereço' },
    { key: '{{end_cidade}}', label: 'Cidade', group: 'Endereço' },
    { key: '{{end_uf}}', label: 'UF', group: 'Endereço' },
    { key: '{{paciente}}', label: 'Nome do Paciente', group: 'Paciente' },
    { key: '{{paciente_end}}', label: 'Endereço do Paciente', group: 'Paciente' },
    { key: '{{receita}}', label: 'Receita', group: 'Documento' },
  ]

  const [showVariablesMenu, setShowVariablesMenu] = useState(false)

  const insertVariable = useCallback((variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(variable).run()
      setShowVariablesMenu(false)
    }
  }, [editor])

  const addBackgroundImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    // Aceita PNG, JPEG, GIF, WebP e SVG para melhor qualidade na impressão
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.svg'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          const url = readerEvent.target?.result as string
          setBackgroundImage(url)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [])

  const removeBackgroundImage = useCallback(() => {
    setBackgroundImage(null)
  }, [])

  // Função para encontrar a tabela selecionada
  const getSelectedTable = useCallback((): HTMLTableElement | null => {
    if (!editorRef.current) return null
    
    // Tentar encontrar tabela pelo objeto selecionado
    if (selectedObjectId) {
      const table = editorRef.current.querySelector(`table[data-object-id="${selectedObjectId}"]`) as HTMLTableElement
      if (table) return table
    }
    
    // Fallback: encontrar tabela pelo cursor do editor
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.anchorNode
      while (node) {
        if (node.nodeName === 'TABLE') return node as HTMLTableElement
        if (node.parentElement?.closest('table')) return node.parentElement.closest('table') as HTMLTableElement
        node = node.parentNode
      }
    }
    return null
  }, [selectedObjectId])

  // Selecionar um objeto
  const selectObject = useCallback((objectId: string) => {
    const obj = pageObjects.find(o => o.id === objectId)
    if (obj) {
      setSelectedObjectId(objectId)
      setObjectName(obj.name)
      setObjectMode(obj.mode)
      setObjectX(obj.x)
      setObjectY(obj.y)
      
      // Carregar propriedades do retângulo se for um
      if (obj.type === 'rectangle') {
        setRectWidth(obj.width || 200)
        setRectHeight(obj.height || 100)
        setRectBgColor(obj.bgColor || '#e5e7eb')
        setRectBorderColor(obj.borderColor || '#000000')
        setRectBorderWidth(obj.borderWidth || 1)
        setRectText(obj.text || '')
        setRectTextAlign(obj.textAlign || 'center')
        setRectTextVAlign(obj.textVAlign || 'middle')
      }
      
      setActiveTab('propriedades')
    }
  }, [pageObjects])

  // Atualizar posição do objeto
  const updateObjectPosition = useCallback((x: number, y: number) => {
    if (!selectedObjectId || !editorRef.current) return
    
    // Tentar encontrar o elemento (tabela ou retângulo)
    const element = editorRef.current.querySelector(`[data-object-id="${selectedObjectId}"]`) as HTMLElement
    if (element && objectMode === 'floating') {
      element.style.left = `${x}px`
      element.style.top = `${y}px`
      setObjectX(x)
      setObjectY(y)
      
      setPageObjects(prev => prev.map(obj => 
        obj.id === selectedObjectId ? { ...obj, x, y } : obj
      ))
    }
  }, [selectedObjectId, objectMode])

  // Atualizar nome do objeto
  const updateObjectName = useCallback((name: string) => {
    if (!selectedObjectId || !editorRef.current) return
    
    const element = editorRef.current.querySelector(`[data-object-id="${selectedObjectId}"]`) as HTMLElement
    if (element) {
      element.setAttribute('data-object-name', name)
      setObjectName(name)
      
      setPageObjects(prev => prev.map(obj => 
        obj.id === selectedObjectId ? { ...obj, name } : obj
      ))
    }
  }, [selectedObjectId])

  // Atualizar propriedades do retângulo
  const updateRectangleProperties = useCallback(() => {
    if (!selectedObjectId || !editorRef.current) return
    
    const rect = editorRef.current.querySelector(`[data-object-id="${selectedObjectId}"][data-object-type="rectangle"]`) as HTMLElement
    if (rect) {
      rect.style.width = `${rectWidth}px`
      rect.style.height = `${rectHeight}px`
      rect.style.backgroundColor = rectBgColor === 'transparent' ? 'transparent' : rectBgColor
      rect.style.border = rectBorderWidth === 0 ? 'none' : `${rectBorderWidth}px solid ${rectBorderColor}`
      
      // Aplicar texto
      rect.textContent = rectText
      
      // Alinhamento horizontal
      rect.style.textAlign = rectTextAlign
      rect.style.justifyContent = rectTextAlign === 'left' ? 'flex-start' : rectTextAlign === 'right' ? 'flex-end' : 'center'
      
      // Alinhamento vertical
      rect.style.alignItems = rectTextVAlign === 'top' ? 'flex-start' : rectTextVAlign === 'bottom' ? 'flex-end' : 'center'
      
      setPageObjects(prev => prev.map(obj => 
        obj.id === selectedObjectId ? { 
          ...obj, 
          width: rectWidth, 
          height: rectHeight, 
          bgColor: rectBgColor, 
          borderColor: rectBorderColor,
          borderWidth: rectBorderWidth,
          text: rectText,
          textAlign: rectTextAlign,
          textVAlign: rectTextVAlign
        } : obj
      ))
    }
  }, [selectedObjectId, rectWidth, rectHeight, rectBgColor, rectBorderColor, rectBorderWidth, rectText, rectTextAlign, rectTextVAlign])

  // Alternar modo do objeto (inline/floating)
  const toggleObjectMode = useCallback((mode: TableMode) => {
    if (!selectedObjectId || !editorRef.current) return
    
    const element = editorRef.current.querySelector(`[data-object-id="${selectedObjectId}"]`) as HTMLElement
    if (element) {
      element.setAttribute('data-object-mode', mode)
      
      if (mode === 'floating') {
        element.style.position = 'absolute'
        element.style.left = `${objectX || 50}px`
        element.style.top = `${objectY || 50}px`
        element.style.zIndex = '10'
        element.classList.add('floating-object')
      } else {
        element.style.position = ''
        element.style.left = ''
        element.style.top = ''
        element.style.zIndex = ''
        element.classList.remove('floating-object')
      }
      
      setObjectMode(mode)
      setPageObjects(prev => prev.map(obj => 
        obj.id === selectedObjectId ? { ...obj, mode } : obj
      ))
    }
  }, [selectedObjectId, objectX, objectY])

  // Excluir objeto
  const deleteObject = useCallback((objectId: string) => {
    if (!editorRef.current) return
    
    const element = editorRef.current.querySelector(`[data-object-id="${objectId}"]`)
    if (element) {
      element.remove()
    }
    
    setPageObjects(prev => prev.filter(obj => obj.id !== objectId))
    if (selectedObjectId === objectId) {
      setSelectedObjectId(null)
    }
  }, [selectedObjectId])

  // Table styling functions - aplicar na tabela selecionada
  const applyTableStyles = useCallback(() => {
    const table = getSelectedTable()
    if (!table) return
    
    // Aplicar cor de fundo
    table.style.backgroundColor = tableBgColor === 'transparent' ? 'transparent' : tableBgColor
    
    // Aplicar bordas na tabela
    const borderValue = tableBorderStyle === 'none' || tableBorderWidth === 0 
      ? 'none' 
      : `${tableBorderWidth}px ${tableBorderStyle} ${tableBorderColor}`
    
    table.style.border = borderValue
    table.style.borderCollapse = 'collapse'
    
    // Aplicar bordas em todas as células
    const cells = table.querySelectorAll('td, th')
    cells.forEach((cell) => {
      (cell as HTMLElement).style.border = borderValue
      // Aplicar cor de fundo nas células (exceto cabeçalho)
      if (cell.tagName === 'TD') {
        (cell as HTMLElement).style.backgroundColor = tableBgColor === 'transparent' ? 'transparent' : tableBgColor
      }
    })
  }, [getSelectedTable, tableBgColor, tableBorderColor, tableBorderWidth, tableBorderStyle])

  const applyHeaderBgColor = useCallback(() => {
    const table = getSelectedTable()
    if (!table) return
    
    const headers = table.querySelectorAll('th')
    headers.forEach((header) => {
      (header as HTMLElement).style.backgroundColor = headerBgColor === 'transparent' ? 'transparent' : headerBgColor
    })
  }, [getSelectedTable, headerBgColor])

  // Funções de gerenciamento de páginas
  const addPage = useCallback(() => {
    setTotalPages(prev => prev + 1)
    setCurrentPage(totalPages + 1)
  }, [totalPages])

  const deletePage = useCallback(() => {
    if (totalPages <= 1) return // Não pode excluir a última página
    
    setTotalPages(prev => prev - 1)
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1)
    }
  }, [totalPages, currentPage])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  // Função para imprimir/salvar como PDF nativo (texto selecionável, SVG vetorial)
  const printDocument = useCallback(() => {
    if (!editorRef.current) return

    // Obter o conteúdo do editor TipTap
    const editorElement = editorRef.current.querySelector('.tiptap')
    if (!editorElement) return
    
    const documentContent = editorElement.innerHTML

    // Obter todos os retângulos/objetos flutuantes
    const floatingObjects = editorRef.current.querySelectorAll('[data-object-type="rectangle"]')
    let objectsHTML = ''
    
    floatingObjects.forEach((obj) => {
      const element = obj as HTMLElement
      // Clonar o estilo inline completo do elemento
      const styles = element.getAttribute('style') || ''
      const innerHTML = element.innerHTML
      objectsHTML += `<div class="floating-object" style="${styles}">${innerHTML}</div>`
    })

    // Criar uma nova janela em tela cheia
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o documento.')
      return
    }

    // Dimensões da página em mm
    const pageWidth = pageOrientation === 'landscape' ? '297mm' : '210mm'
    const pageHeight = pageOrientation === 'landscape' ? '210mm' : '297mm'

    // Criar o HTML da página de impressão
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title || 'Documento'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @page {
            size: ${pageWidth} ${pageHeight};
            margin: 0;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            background: #f0f0f0;
          }
          
          body {
            font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: ${fontSize}px;
            line-height: 1.6;
            display: flex;
            justify-content: center;
            padding: 20px;
          }
          
          .doc-page {
            width: ${pageWidth};
            height: ${pageHeight};
            padding: ${pageMargin}mm;
            background: white;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          }
          
          /* Background image - cobre a página toda */
          .page-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
            pointer-events: none;
            z-index: 0;
          }
          
          .doc-content {
            position: relative;
            z-index: 1;
            height: 100%;
          }
          
          /* Objetos flutuantes (retângulos) */
          .floating-object {
            position: absolute;
            display: flex;
            justify-content: center;
            overflow: hidden;
            word-wrap: break-word;
          }
          
          /* Estilos do editor */
          .doc-content p { margin: 0 0 1em; }
          .doc-content h1 { font-size: 2em; font-weight: 700; margin: 0 0 0.5em; }
          .doc-content h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; }
          .doc-content h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em; }
          .doc-content strong { font-weight: 700; }
          .doc-content em { font-style: italic; }
          .doc-content u { text-decoration: underline; }
          .doc-content s { text-decoration: line-through; }
          .doc-content mark { background: #fef08a; padding: 0 2px; border-radius: 2px; }
          .doc-content ul, .doc-content ol { margin: 0 0 1em 1.5em; padding: 0; }
          .doc-content li { margin-bottom: 0.25em; }
          
          /* Tabelas */
          .doc-content table {
            border-collapse: collapse;
            margin: 1em 0;
          }
          .doc-content th, .doc-content td {
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
          }
          
          /* Imagens do conteúdo */
          .doc-content img {
            max-width: 100%;
            height: auto;
          }
          
          /* Esconder elementos de controle do editor */
          .resize-handles,
          .layout-options-btn,
          .layout-options-menu,
          .selection-border,
          .size-indicator,
          .resizable-image-wrapper .resize-handle,
          [data-drag-handle],
          .table-toolbar,
          .drag-handle {
            display: none !important;
          }
          
          /* Para impressão */
          @media print {
            html, body {
              background: white;
              padding: 0;
            }
            
            .doc-page {
              box-shadow: none;
              width: 100%;
              height: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="doc-page">
          ${backgroundImage ? `<div class="page-background" style="background-image: url(${backgroundImage}); opacity: ${backgroundOpacity / 100};"></div>` : ''}
          ${objectsHTML}
          <div class="doc-content">
            ${documentContent}
          </div>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()

    // Esperar o conteúdo carregar e então imprimir
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      // Fechar a janela após imprimir
      printWindow.close()
    }, 500)
  }, [title, pageOrientation, fontFamily, fontSize, pageMargin, backgroundImage, backgroundOpacity])

  // Função para exportar como imagem (método antigo - para compatibilidade)
  const exportPDFAsImage = useCallback(() => {
    if (!editorRef.current) return

    const element = editorRef.current
    
    // Salvar estilos originais
    const originalBoxShadow = element.style.boxShadow
    element.style.boxShadow = 'none'

    // Configuração para gerar PDF como imagem única
    const opt = {
      margin: 0,
      filename: title || 'documento',
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

    // Usar outputImg para capturar como imagem e então gerar PDF
    html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf: { internal: { pageSize: { getWidth: () => number; getHeight: () => number } }; deletePage: (page: number) => void; getNumberOfPages: () => number }) => {
      // Remover páginas extras, manter apenas a primeira
      const totalPages = pdf.getNumberOfPages()
      for (let i = totalPages; i > 1; i--) {
        pdf.deletePage(i)
      }
    }).save().then(() => {
      // Restaurar estilos originais
      element.style.boxShadow = originalBoxShadow
    })
  }, [title, pageOrientation])

  const handleSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getHTML(), title)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }, [editor, title, onSave])

  // Interface do modelo JSON
  interface DocumentModel {
    version: string
    title: string
    pageOrientation: PageOrientation
    fontFamily: FontFamily
    fontSize: number
    pageMargin: number
    backgroundImage: string | null
    backgroundOpacity: number
    content: string
    objects: PageObject[]
    totalPages: number
    createdAt: string
    updatedAt: string
  }

  // Criar modelo a partir do estado atual
  const createModel = useCallback((): DocumentModel => {
    return {
      version: '1.0',
      title: title || 'Sem título',
      pageOrientation,
      fontFamily,
      fontSize,
      pageMargin,
      backgroundImage,
      backgroundOpacity,
      content: editor?.getHTML() || '',
      objects: pageObjects.map(obj => ({
        ...obj,
        element: undefined // Não salvar referência do elemento DOM
      })),
      totalPages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }, [title, pageOrientation, fontFamily, fontSize, pageMargin, backgroundImage, backgroundOpacity, editor, pageObjects, totalPages])

  // Salvar modelo no localStorage
  const saveModel = useCallback(() => {
    const model = createModel()
    const modelName = title || `modelo_${Date.now()}`
    
    // Salvar no localStorage
    const savedModels = JSON.parse(localStorage.getItem('documentModels') || '{}')
    savedModels[modelName] = model
    localStorage.setItem('documentModels', JSON.stringify(savedModels))
    
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    alert(`Modelo "${modelName}" salvo com sucesso!`)
  }, [createModel, title])

  // Exportar modelo como arquivo JSON
  const exportModel = useCallback(() => {
    const model = createModel()
    const jsonString = JSON.stringify(model, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'modelo'}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [createModel, title])

  // Importar modelo de arquivo JSON
  const importModel = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (readerEvent) => {
          try {
            const model: DocumentModel = JSON.parse(readerEvent.target?.result as string)
            
            // Aplicar configurações do modelo
            setTitle(model.title || '')
            setPageOrientation(model.pageOrientation || 'portrait')
            setFontFamily(model.fontFamily || 'Inter')
            setFontSize(model.fontSize || 14)
            setPageMargin(model.pageMargin || 20)
            setBackgroundImage(model.backgroundImage || null)
            setBackgroundOpacity(model.backgroundOpacity || 100)
            setTotalPages(model.totalPages || 1)
            
            // Aplicar conteúdo ao editor
            if (editor && model.content) {
              editor.commands.setContent(model.content)
            }
            
            // Aplicar objetos (retângulos)
            if (model.objects && model.objects.length > 0) {
              // Limpar objetos existentes
              pageObjects.forEach(obj => {
                if (editorRef.current) {
                  const el = editorRef.current.querySelector(`[data-object-id="${obj.id}"]`)
                  if (el) el.remove()
                }
              })
              setPageObjects([])
              
              // Recriar objetos do modelo
              setTimeout(() => {
                model.objects.forEach(obj => {
                  if (obj.type === 'rectangle' && editorRef.current) {
                    const rect = document.createElement('div')
                    rect.setAttribute('data-object-id', obj.id)
                    rect.setAttribute('data-object-name', obj.name)
                    rect.setAttribute('data-object-type', 'rectangle')
                    rect.className = 'page-rectangle floating-object'
                    rect.style.position = 'absolute'
                    rect.style.left = `${obj.x}px`
                    rect.style.top = `${obj.y}px`
                    rect.style.width = `${obj.width || 200}px`
                    rect.style.height = `${obj.height || 100}px`
                    rect.style.backgroundColor = obj.bgColor || '#e5e7eb'
                    rect.style.border = obj.borderWidth ? `${obj.borderWidth}px solid ${obj.borderColor || '#000'}` : 'none'
                    rect.style.zIndex = '10'
                    rect.style.cursor = 'move'
                    rect.style.boxSizing = 'border-box'
                    rect.style.display = 'flex'
                    rect.style.alignItems = obj.textVAlign === 'top' ? 'flex-start' : obj.textVAlign === 'bottom' ? 'flex-end' : 'center'
                    rect.style.justifyContent = obj.textAlign === 'left' ? 'flex-start' : obj.textAlign === 'right' ? 'flex-end' : 'center'
                    rect.style.textAlign = obj.textAlign || 'center'
                    rect.style.padding = '8px'
                    rect.style.overflow = 'hidden'
                    rect.textContent = obj.text || ''
                    
                    editorRef.current.appendChild(rect)
                  }
                })
                
                setPageObjects(model.objects.map(obj => ({ ...obj, element: undefined })))
              }, 100)
            }
            
            alert('Modelo importado com sucesso!')
          } catch (error) {
            alert('Erro ao importar modelo. Verifique se o arquivo é válido.')
            console.error('Erro ao importar:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [editor, pageObjects])

  // Carregar lista de modelos salvos
  const getSavedModels = useCallback((): string[] => {
    const savedModels = JSON.parse(localStorage.getItem('documentModels') || '{}')
    return Object.keys(savedModels)
  }, [])

  // Carregar um modelo salvo
  const loadSavedModel = useCallback((modelName: string) => {
    const savedModels = JSON.parse(localStorage.getItem('documentModels') || '{}')
    const model = savedModels[modelName]
    if (model) {
      // Criar um arquivo temporário e usar importModel
      const jsonString = JSON.stringify(model)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const file = new File([blob], `${modelName}.json`, { type: 'application/json' })
      
      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        try {
          const loadedModel: DocumentModel = JSON.parse(readerEvent.target?.result as string)
          
          setTitle(loadedModel.title || '')
          setPageOrientation(loadedModel.pageOrientation || 'portrait')
          setFontFamily(loadedModel.fontFamily || 'Inter')
          setFontSize(loadedModel.fontSize || 14)
          setPageMargin(loadedModel.pageMargin || 20)
          setBackgroundImage(loadedModel.backgroundImage || null)
          setBackgroundOpacity(loadedModel.backgroundOpacity || 100)
          setTotalPages(loadedModel.totalPages || 1)
          
          if (editor && loadedModel.content) {
            editor.commands.setContent(loadedModel.content)
          }
          
          alert(`Modelo "${modelName}" carregado!`)
        } catch (error) {
          console.error('Erro ao carregar:', error)
        }
      }
      reader.readAsText(file)
    }
  }, [editor])

  // Force re-render when selection changes to update sidebar
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      forceUpdate(n => n + 1)
      
      // Update image width if image is selected
      if (editor.isActive('image')) {
        const attrs = editor.getAttributes('image')
        if (attrs.width) {
          setImageWidth(Number(attrs.width))
        } else {
          setImageWidth(300)
        }
      }
    }

    editor.on('selectionUpdate', handleUpdate)
    editor.on('transaction', handleUpdate)

    return () => {
      editor.off('selectionUpdate', handleUpdate)
      editor.off('transaction', handleUpdate)
    }
  }, [editor])

  // Close variables menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.variables-dropdown')) {
        setShowVariablesMenu(false)
      }
    }
    
    if (showVariablesMenu) {
      document.addEventListener('click', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showVariablesMenu])

  // Function to resize image
  const resizeImage = useCallback((width: number) => {
    if (!editor) return
    setImageWidth(width)
    editor.chain().focus().updateAttributes('image', { width }).run()
  }, [editor])

  // Preset sizes for quick resize
  const imageSizes = [
    { label: 'Pequeno', value: 150 },
    { label: 'Médio', value: 300 },
    { label: 'Grande', value: 500 },
    { label: 'Largo', value: 700 },
  ]

  if (!editor) {
    return null
  }
  return (
    <div className="doc-editor-layout">
      {/* Center - Page Preview */}
      <main className="doc-main">
        {/* Ribbon Toolbar com Abas */}
        <div className="doc-ribbon">
          {/* Abas */}
          <div className="ribbon-tabs">
            <button 
              className={`ribbon-tab ${activeTab === 'inicio' ? 'active' : ''}`}
              onClick={() => setActiveTab('inicio')}
            >
              Início
            </button>
            <button 
              className={`ribbon-tab ${activeTab === 'inserir' ? 'active' : ''}`}
              onClick={() => setActiveTab('inserir')}
            >
              Inserir
            </button>
            <button 
              className={`ribbon-tab ${activeTab === 'texto' ? 'active' : ''}`}
              onClick={() => setActiveTab('texto')}
            >
              Texto
            </button>
            <button 
              className={`ribbon-tab ${activeTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveTab('layout')}
            >
              Layout
            </button>
            <button 
              className={`ribbon-tab ${activeTab === 'tabela' ? 'active' : ''}`}
              onClick={() => setActiveTab('tabela')}
            >
              Tabela
            </button>
            {(editor.isActive('image') || editor.isActive('table')) && (
              <button 
                className={`ribbon-tab highlight ${activeTab === 'propriedades' ? 'active' : ''}`}
                onClick={() => setActiveTab('propriedades')}
              >
                Propriedades
              </button>
            )}
            <button 
              className={`ribbon-tab ${activeTab === 'objetos' ? 'active' : ''}`}
              onClick={() => setActiveTab('objetos')}
            >
              Objetos
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="ribbon-content">
            {/* Aba Início */}
            {activeTab === 'inicio' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Modelo</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={saveModel} title="Salvar modelo localmente">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                      </svg>
                      <span>Salvar</span>
                    </button>
                    <button className="ribbon-btn" onClick={importModel} title="Importar modelo JSON">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17,8 12,3 7,8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span>Importar</span>
                    </button>
                    <button className="ribbon-btn" onClick={exportModel} title="Exportar modelo JSON">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      <span>Exportar</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">PDF / Imprimir</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={printDocument} title="Imprimir ou salvar como PDF (texto selecionável, alta qualidade)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 6,2 18,2 18,9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      <span>Imprimir</span>
                    </button>
                    <button className="ribbon-btn" onClick={exportPDFAsImage} title="Exportar como imagem PDF (sem texto selecionável)">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      <span>PDF Imagem</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Edição</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v6h6"/>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                      </svg>
                      <span>Desfazer</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().redo().run()} title="Refazer">
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
                  <span className="ribbon-group-title">Formatação Rápida</span>
                  <div className="ribbon-buttons row">
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('bold') ? 'active' : ''}`}
                      title="Negrito (Ctrl+B)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('italic') ? 'active' : ''}`}
                      title="Itálico (Ctrl+I)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="4" x2="10" y2="4"/>
                        <line x1="14" y1="20" x2="5" y2="20"/>
                        <line x1="15" y1="4" x2="9" y2="20"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('underline') ? 'active' : ''}`}
                      title="Sublinhado (Ctrl+U)"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
                        <line x1="4" y1="21" x2="20" y2="21"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('strike') ? 'active' : ''}`}
                      title="Tachado"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <path d="M16 6C16 6 14.5 4 12 4C9.5 4 7 6 7 8C7 10 9 11 12 12"/>
                        <path d="M8 18C8 18 9.5 20 12 20C14.5 20 17 18 17 16C17 14 15 13 12 12"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHighlight().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('highlight') ? 'active' : ''}`}
                      title="Destacar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Inserir */}
            {activeTab === 'inserir' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Tabelas</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={addTable} title="Inserir tabela">
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
                    <button className="ribbon-btn large" onClick={addImage} title="Inserir imagem">
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
                  <span className="ribbon-group-title">Formas</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={addRectangle} title="Inserir retângulo flutuante">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="5" width="18" height="14" rx="2"/>
                      </svg>
                      <span>Retângulo</span>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Variáveis</span>
                  <div className="ribbon-buttons">
                    <div className="variables-dropdown">
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
                          {Object.entries(
                            templateVariables.reduce((acc, v) => {
                              if (!acc[v.group]) acc[v.group] = []
                              acc[v.group].push(v)
                              return acc
                            }, {} as Record<string, typeof templateVariables>)
                          ).map(([group, variables]) => (
                            <div key={group} className="dropdown-group">
                              <div className="dropdown-group-title">{group}</div>
                              {variables.map(v => (
                                <button
                                  key={v.key}
                                  className="dropdown-item"
                                  onClick={() => {
                                    insertVariable(v.key)
                                    setShowVariablesMenu(false)
                                  }}
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
                    <button 
                      className="ribbon-btn" 
                      onClick={() => editor.chain().focus().setHorizontalRule().run()} 
                      title="Linha horizontal"
                    >
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
            {activeTab === 'texto' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Formatação</span>
                  <div className="ribbon-buttons row">
                    <button
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('bold') ? 'active' : ''}`}
                      title="Negrito"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('italic') ? 'active' : ''}`}
                      title="Itálico"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="19" y1="4" x2="10" y2="4"/>
                        <line x1="14" y1="20" x2="5" y2="20"/>
                        <line x1="15" y1="4" x2="9" y2="20"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('underline') ? 'active' : ''}`}
                      title="Sublinhado"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/>
                        <line x1="4" y1="21" x2="20" y2="21"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('strike') ? 'active' : ''}`}
                      title="Tachado"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <path d="M16 6C16 6 14.5 4 12 4C9.5 4 7 6 7 8C7 10 9 11 12 12"/>
                        <path d="M8 18C8 18 9.5 20 12 20C14.5 20 17 18 17 16C17 14 15 13 12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Títulos</span>
                  <div className="ribbon-buttons row">
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`ribbon-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
                      title="Título 1"
                    >
                      H1
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`ribbon-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                      title="Título 2"
                    >
                      H2
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={`ribbon-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
                      title="Título 3"
                    >
                      H3
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Alinhamento</span>
                  <div className="ribbon-buttons row">
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className={`ribbon-btn icon-only ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
                      title="Alinhar à esquerda"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="17" y1="10" x2="3" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="17" y1="18" x2="3" y2="18"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className={`ribbon-btn icon-only ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
                      title="Centralizar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="10" x2="6" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="18" y1="18" x2="6" y2="18"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className={`ribbon-btn icon-only ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
                      title="Alinhar à direita"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="21" y1="10" x2="7" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="21" y1="18" x2="7" y2="18"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                      className={`ribbon-btn icon-only ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
                      title="Justificar"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="21" y1="10" x2="3" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="21" y1="18" x2="3" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Listas</span>
                  <div className="ribbon-buttons row">
                    <button
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('bulletList') ? 'active' : ''}`}
                      title="Lista com marcadores"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <circle cx="4" cy="6" r="1" fill="currentColor"/>
                        <circle cx="4" cy="12" r="1" fill="currentColor"/>
                        <circle cx="4" cy="18" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`ribbon-btn icon-only ${editor.isActive('orderedList') ? 'active' : ''}`}
                      title="Lista numerada"
                    >
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
                  <span className="ribbon-group-title">Fonte</span>
                  <div className="ribbon-buttons">
                    <select 
                      value={fontFamily} 
                      onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                      className="ribbon-select"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Courier New">Courier New</option>
                    </select>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min={8}
                      max={72}
                      className="ribbon-input-number"
                      title="Tamanho da fonte (px)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aba Layout */}
            {activeTab === 'layout' && (
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
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Margens</span>
                  <div className="ribbon-buttons">
                    <div className="ribbon-input-group">
                      <label>Margem (mm):</label>
                      <input
                        type="number"
                        value={pageMargin}
                        onChange={(e) => setPageMargin(Number(e.target.value))}
                        min={0}
                        max={50}
                        className="ribbon-input-number"
                      />
                    </div>
                  </div>
                </div>
                <div className="ribbon-divider"></div>
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Imagem de Fundo</span>
                  <div className="ribbon-buttons">
                    {backgroundImage ? (
                      <>
                        <button className="ribbon-btn" onClick={addBackgroundImage} title="Trocar imagem de fundo">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17,8 12,3 7,8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <span>Trocar</span>
                        </button>
                        <button className="ribbon-btn danger" onClick={removeBackgroundImage} title="Remover imagem de fundo">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          <span>Remover</span>
                        </button>
                        <div className="ribbon-input-group">
                          <label>Opacidade:</label>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={backgroundOpacity}
                            onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                            className="ribbon-range"
                            title={`${backgroundOpacity}%`}
                          />
                          <span className="ribbon-range-value">{backgroundOpacity}%</span>
                        </div>
                      </>
                    ) : (
                      <button className="ribbon-btn large" onClick={addBackgroundImage} title="Adicionar imagem de fundo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21,15 16,10 5,21"/>
                        </svg>
                        <span>Background</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Aba Tabela */}
            {activeTab === 'tabela' && (
              <div className="ribbon-panel">
                <div className="ribbon-group">
                  <span className="ribbon-group-title">Inserir</span>
                  <div className="ribbon-buttons">
                    <button className="ribbon-btn large" onClick={addTable} title="Inserir tabela 3x3">
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
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().addRowBefore().run()} title="Inserir linha acima">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="13" rx="1"/>
                        <path d="M12 3v4"/>
                        <path d="M9 5l3-2 3 2"/>
                      </svg>
                      <span>Linha ↑</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().addRowAfter().run()} title="Inserir linha abaixo">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="13" rx="1"/>
                        <path d="M12 21v-4"/>
                        <path d="M9 19l3 2 3-2"/>
                      </svg>
                      <span>Linha ↓</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().addColumnBefore().run()} title="Inserir coluna à esquerda">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="8" y="3" width="13" height="18" rx="1"/>
                        <path d="M3 12h4"/>
                        <path d="M5 9l-2 3 2 3"/>
                      </svg>
                      <span>Coluna ←</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Inserir coluna à direita">
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
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().mergeCells().run()} title="Mesclar células">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="12" y1="3" x2="12" y2="12"/>
                      </svg>
                      <span>Mesclar</span>
                    </button>
                    <button className="ribbon-btn" onClick={() => editor.chain().focus().splitCell().run()} title="Dividir célula">
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
                    <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteRow().run()} title="Excluir linha">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="8" rx="1"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      </svg>
                      <span>Linha</span>
                    </button>
                    <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteColumn().run()} title="Excluir coluna">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="8" y="3" width="8" height="18" rx="1"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                      </svg>
                      <span>Coluna</span>
                    </button>
                    <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                      </svg>
                      <span>Tabela</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Aba Propriedades - Contextual */}
            {activeTab === 'propriedades' && (
              <div className="ribbon-panel">
                {/* Propriedades da Imagem */}
                {editor.isActive('image') && (
                  <>
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Tamanho da Imagem</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Largura:</label>
                          <input
                            type="number"
                            min="50"
                            max="1000"
                            value={imageWidth}
                            onChange={(e) => resizeImage(Number(e.target.value))}
                            className="ribbon-input-number"
                          />
                          <span className="ribbon-range-value">px</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="700"
                          value={imageWidth}
                          onChange={(e) => resizeImage(Number(e.target.value))}
                          className="ribbon-range"
                          style={{ width: '100px' }}
                        />
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Tamanhos Predefinidos</span>
                      <div className="ribbon-buttons">
                        {imageSizes.map((size) => (
                          <button
                            key={size.value}
                            className={`ribbon-btn ${imageWidth === size.value ? 'active' : ''}`}
                            onClick={() => resizeImage(size.value)}
                          >
                            <span>{size.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Propriedades da Tabela */}
                {editor.isActive('table') && (
                  <>
                    {/* Identificação */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Identificação</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Nome:</label>
                          <input
                            type="text"
                            value={objectName}
                            onChange={(e) => updateObjectName(e.target.value)}
                            placeholder="Nome da tabela"
                            className="ribbon-input"
                            style={{ width: '120px' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Posicionamento */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Posicionamento</span>
                      <div className="ribbon-buttons">
                        <button 
                          className={`ribbon-btn ${objectMode === 'inline' ? 'active' : ''}`}
                          onClick={() => toggleObjectMode('inline')}
                          title="Tabela fixa no texto"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                          </svg>
                          <span>Fixa</span>
                        </button>
                        <button 
                          className={`ribbon-btn ${objectMode === 'floating' ? 'active' : ''}`}
                          onClick={() => toggleObjectMode('floating')}
                          title="Tabela flutuante (posicionar livremente)"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="5" width="14" height="14" rx="2"/>
                            <path d="M2 2l4 4M22 2l-4 4M2 22l4-4M22 22l-4-4"/>
                          </svg>
                          <span>Flutuante</span>
                        </button>
                        {objectMode === 'floating' && (
                          <>
                            <div className="ribbon-input-group">
                              <label>X:</label>
                              <input
                                type="number"
                                value={objectX}
                                onChange={(e) => updateObjectPosition(Number(e.target.value), objectY)}
                                className="ribbon-input-number"
                                style={{ width: '60px' }}
                              />
                            </div>
                            <div className="ribbon-input-group">
                              <label>Y:</label>
                              <input
                                type="number"
                                value={objectY}
                                onChange={(e) => updateObjectPosition(objectX, Number(e.target.value))}
                                className="ribbon-input-number"
                                style={{ width: '60px' }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Estrutura */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Estrutura</span>
                      <div className="ribbon-buttons">
                        <button className="ribbon-btn" onClick={() => editor.chain().focus().addRowAfter().run()} title="Adicionar linha">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span>Linha</span>
                        </button>
                        <button className="ribbon-btn" onClick={() => editor.chain().focus().addColumnAfter().run()} title="Adicionar coluna">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span>Coluna</span>
                        </button>
                        <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteRow().run()} title="Remover linha">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span>- Linha</span>
                        </button>
                        <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteColumn().run()} title="Remover coluna">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          <span>- Coluna</span>
                        </button>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Cores */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Cores</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Fundo:</label>
                          <input
                            type="color"
                            value={tableBgColor === 'transparent' ? '#ffffff' : tableBgColor}
                            onChange={(e) => setTableBgColor(e.target.value)}
                            className="ribbon-color-picker"
                          />
                          <button 
                            className={`ribbon-btn icon-only small ${tableBgColor === 'transparent' ? 'active' : ''}`}
                            onClick={() => setTableBgColor('transparent')}
                            title="Sem fundo"
                          >
                            ∅
                          </button>
                        </div>
                        <div className="ribbon-input-group">
                          <label>Cabeçalho:</label>
                          <input
                            type="color"
                            value={headerBgColor === 'transparent' ? '#ffffff' : headerBgColor}
                            onChange={(e) => setHeaderBgColor(e.target.value)}
                            className="ribbon-color-picker"
                          />
                          <button 
                            className={`ribbon-btn icon-only small ${headerBgColor === 'transparent' ? 'active' : ''}`}
                            onClick={() => setHeaderBgColor('transparent')}
                            title="Sem fundo"
                          >
                            ∅
                          </button>
                        </div>
                        <button className="ribbon-btn success" onClick={() => { applyTableStyles(); applyHeaderBgColor(); }} title="Aplicar cores">
                          Aplicar
                        </button>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Bordas */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Bordas</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Cor:</label>
                          <input
                            type="color"
                            value={tableBorderColor}
                            onChange={(e) => setTableBorderColor(e.target.value)}
                            className="ribbon-color-picker"
                          />
                        </div>
                        <div className="ribbon-input-group">
                          <label>{tableBorderWidth}px</label>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            value={tableBorderWidth}
                            onChange={(e) => setTableBorderWidth(Number(e.target.value))}
                            className="ribbon-range"
                          />
                        </div>
                        <select
                          value={tableBorderStyle}
                          onChange={(e) => setTableBorderStyle(e.target.value)}
                          className="ribbon-select"
                        >
                          <option value="solid">Sólido</option>
                          <option value="dashed">Tracejado</option>
                          <option value="dotted">Pontilhado</option>
                          <option value="none">Sem Borda</option>
                        </select>
                        <button className="ribbon-btn success" onClick={applyTableStyles} title="Aplicar bordas">
                          Aplicar
                        </button>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Ações */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Ações</span>
                      <div className="ribbon-buttons">
                        <button className="ribbon-btn danger" onClick={() => editor.chain().focus().deleteTable().run()} title="Excluir tabela">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Propriedades do Retângulo */}
                {selectedObjectId && pageObjects.find(o => o.id === selectedObjectId)?.type === 'rectangle' && (
                  <>
                    {/* Identificação */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Identificação</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Nome:</label>
                          <input
                            type="text"
                            value={objectName}
                            onChange={(e) => updateObjectName(e.target.value)}
                            placeholder="Nome do retângulo"
                            className="ribbon-input"
                            style={{ width: '120px' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Posição */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Posição</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>X:</label>
                          <input
                            type="number"
                            value={objectX}
                            onChange={(e) => updateObjectPosition(Number(e.target.value), objectY)}
                            className="ribbon-input-number"
                            style={{ width: '60px' }}
                          />
                        </div>
                        <div className="ribbon-input-group">
                          <label>Y:</label>
                          <input
                            type="number"
                            value={objectY}
                            onChange={(e) => updateObjectPosition(objectX, Number(e.target.value))}
                            className="ribbon-input-number"
                            style={{ width: '60px' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Tamanho */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Tamanho</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Largura:</label>
                          <input
                            type="number"
                            value={rectWidth}
                            onChange={(e) => setRectWidth(Number(e.target.value))}
                            min={20}
                            max={800}
                            className="ribbon-input-number"
                            style={{ width: '60px' }}
                          />
                        </div>
                        <div className="ribbon-input-group">
                          <label>Altura:</label>
                          <input
                            type="number"
                            value={rectHeight}
                            onChange={(e) => setRectHeight(Number(e.target.value))}
                            min={20}
                            max={800}
                            className="ribbon-input-number"
                            style={{ width: '60px' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Cores */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Preenchimento</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Fundo:</label>
                          <input
                            type="color"
                            value={rectBgColor === 'transparent' ? '#ffffff' : rectBgColor}
                            onChange={(e) => setRectBgColor(e.target.value)}
                            className="ribbon-color-picker"
                          />
                          <button 
                            className={`ribbon-btn icon-only small ${rectBgColor === 'transparent' ? 'active' : ''}`}
                            onClick={() => setRectBgColor('transparent')}
                            title="Sem fundo"
                          >
                            ∅
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Bordas */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Borda</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Cor:</label>
                          <input
                            type="color"
                            value={rectBorderColor}
                            onChange={(e) => setRectBorderColor(e.target.value)}
                            className="ribbon-color-picker"
                          />
                        </div>
                        <div className="ribbon-input-group">
                          <label>{rectBorderWidth}px</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={rectBorderWidth}
                            onChange={(e) => setRectBorderWidth(Number(e.target.value))}
                            className="ribbon-range"
                          />
                        </div>
                        <button 
                          className={`ribbon-btn icon-only small ${rectBorderWidth === 0 ? 'active' : ''}`}
                          onClick={() => setRectBorderWidth(0)}
                          title="Sem borda"
                        >
                          ∅
                        </button>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Texto */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Texto</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <input
                            type="text"
                            value={rectText}
                            onChange={(e) => setRectText(e.target.value)}
                            placeholder="Digite o texto..."
                            className="ribbon-input"
                            style={{ width: '150px' }}
                          />
                        </div>
                        <div className="ribbon-input-group">
                          <select
                            className="ribbon-select"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setRectText(prev => prev + e.target.value)
                              }
                            }}
                            title="Inserir variável"
                          >
                            <option value="">+ Variável</option>
                            <optgroup label="Médico">
                              <option value="{{nome_medico}}">Nome do Médico</option>
                              <option value="{{especialidade}}">Especialidade</option>
                              <option value="{{n_concelho}}">Nº Conselho</option>
                              <option value="{{concelho_uf}}">Conselho UF</option>
                              <option value="{{rqe}}">RQE</option>
                            </optgroup>
                            <optgroup label="Endereço">
                              <option value="{{end_logadouro}}">Logradouro</option>
                              <option value="{{end_numero}}">Número</option>
                              <option value="{{end_complemento}}">Complemento</option>
                              <option value="{{end_bairro}}">Bairro</option>
                              <option value="{{end_cidade}}">Cidade</option>
                              <option value="{{end_uf}}">UF</option>
                            </optgroup>
                            <optgroup label="Paciente">
                              <option value="{{paciente}}">Nome do Paciente</option>
                              <option value="{{paciente_end}}">Endereço do Paciente</option>
                            </optgroup>
                            <optgroup label="Documento">
                              <option value="{{receita}}">Receita</option>
                              <option value="{{data}}">Data Atual</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Alinhamento do Texto */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Alinhamento</span>
                      <div className="ribbon-buttons">
                        <div className="ribbon-input-group">
                          <label>Horizontal:</label>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextAlign === 'left' ? 'active' : ''}`}
                            onClick={() => setRectTextAlign('left')}
                            title="Esquerda"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
                            </svg>
                          </button>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextAlign === 'center' ? 'active' : ''}`}
                            onClick={() => setRectTextAlign('center')}
                            title="Centro"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                            </svg>
                          </button>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextAlign === 'right' ? 'active' : ''}`}
                            onClick={() => setRectTextAlign('right')}
                            title="Direita"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <div className="ribbon-input-group">
                          <label>Vertical:</label>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextVAlign === 'top' ? 'active' : ''}`}
                            onClick={() => setRectTextVAlign('top')}
                            title="Topo"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="3" x2="12" y2="21"/><polyline points="5,10 12,3 19,10"/>
                            </svg>
                          </button>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextVAlign === 'middle' ? 'active' : ''}`}
                            onClick={() => setRectTextVAlign('middle')}
                            title="Meio"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="3" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button 
                            className={`ribbon-btn icon-only ${rectTextVAlign === 'bottom' ? 'active' : ''}`}
                            onClick={() => setRectTextVAlign('bottom')}
                            title="Baixo"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="3" x2="12" y2="21"/><polyline points="5,14 12,21 19,14"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="ribbon-divider"></div>

                    {/* Aplicar e Excluir */}
                    <div className="ribbon-group">
                      <span className="ribbon-group-title">Ações</span>
                      <div className="ribbon-buttons">
                        <button className="ribbon-btn success" onClick={updateRectangleProperties} title="Aplicar alterações">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                          <span>Aplicar</span>
                        </button>
                        <button className="ribbon-btn danger" onClick={() => deleteObject(selectedObjectId)} title="Excluir retângulo">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Mensagem quando nada está selecionado */}
                {!editor.isActive('image') && !editor.isActive('table') && !selectedObjectId && (
                  <div className="ribbon-group">
                    <span className="ribbon-empty-message">
                      Selecione uma imagem, tabela ou objeto para ver as propriedades
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Aba Objetos */}
            {activeTab === 'objetos' && (
              <div className="ribbon-panel objects-panel">
                <div className="ribbon-group full-width">
                  <span className="ribbon-group-title">Objetos na Página</span>
                  <div className="objects-list">
                    {pageObjects.length === 0 ? (
                      <div className="objects-empty">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                        </svg>
                        <span>Nenhum objeto na página</span>
                        <small>Adicione tabelas ou imagens para vê-las aqui</small>
                      </div>
                    ) : (
                      pageObjects.map((obj) => (
                        <div 
                          key={obj.id} 
                          className={`object-item ${selectedObjectId === obj.id ? 'selected' : ''}`}
                          onClick={() => selectObject(obj.id)}
                        >
                          <div className="object-icon">
                            {obj.type === 'table' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <line x1="3" y1="9" x2="21" y2="9"/>
                                <line x1="3" y1="15" x2="21" y2="15"/>
                                <line x1="9" y1="3" x2="9" y2="21"/>
                                <line x1="15" y1="3" x2="15" y2="21"/>
                              </svg>
                            )}
                            {obj.type === 'image' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21,15 16,10 5,21"/>
                              </svg>
                            )}
                            {obj.type === 'rectangle' && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="5" width="18" height="14" rx="2"/>
                              </svg>
                            )}
                          </div>
                          <div className="object-info">
                            <span className="object-name">{obj.name}</span>
                            <span className="object-type">
                              {obj.type === 'table' ? 'Tabela' : obj.type === 'rectangle' ? 'Retângulo' : 'Imagem'} • {obj.mode === 'floating' ? `X:${obj.x} Y:${obj.y}` : 'Fixa'}
                            </span>
                          </div>
                          <div className="object-actions">
                            <button 
                              className="object-action-btn"
                              onClick={(e) => { e.stopPropagation(); selectObject(obj.id); setActiveTab('propriedades'); }}
                              title="Editar propriedades"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button 
                              className="object-action-btn danger"
                              onClick={(e) => { e.stopPropagation(); deleteObject(obj.id); }}
                              title="Excluir"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          </div>
        </div>

        {/* Page Preview Area */}
        <div className="doc-preview-area">
          <div 
            className={`doc-page ${pageOrientation} ${backgroundImage ? 'has-background' : ''}`}
            style={{
              fontFamily: fontFamily,
              fontSize: `${fontSize}px`,
              padding: `${pageMargin}mm`,
            }}
            ref={editorRef}
          >
            {/* Background Image Layer */}
            {backgroundImage && (
              <div 
                className="page-background"
                style={{
                  backgroundImage: `url(${backgroundImage})`,
                  opacity: backgroundOpacity / 100,
                }}
              />
            )}
            <EditorContent editor={editor} className="doc-content" />
          </div>
        </div>

        {/* Barra de Páginas */}
        <div className="page-navigation-bar">
          <div className="page-nav-controls">
            <button 
              className="page-nav-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Página anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
            
            <div className="page-nav-info">
              <span className="page-current">{currentPage}</span>
              <span className="page-separator">/</span>
              <span className="page-total">{totalPages}</span>
            </div>
            
            <button 
              className="page-nav-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              title="Próxima página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>

          <div className="page-nav-actions">
            <button 
              className="page-nav-btn add"
              onClick={addPage}
              title="Adicionar página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>Nova Página</span>
            </button>
            
            <button 
              className="page-nav-btn delete"
              onClick={deletePage}
              disabled={totalPages <= 1}
              title="Excluir página atual"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Excluir</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
