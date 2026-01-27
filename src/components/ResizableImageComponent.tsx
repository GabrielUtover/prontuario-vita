import { NodeViewWrapper } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'

type TextWrap = 'inline' | 'square' | 'tight' | 'behind' | 'front'
type Alignment = 'left' | 'center' | 'right'

interface ImageNodeViewProps {
  node: {
    attrs: {
      src: string
      alt?: string
      width?: number
      textWrap?: TextWrap
      alignment?: Alignment
      moveWithText?: boolean
    }
  }
  updateAttributes: (attrs: Record<string, unknown>) => void
  selected: boolean
}

export function ResizableImageComponent({ node, updateAttributes, selected }: ImageNodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const startPos = useRef({ x: 0, y: 0, width: 0 })

  const width = node.attrs.width || 300
  const textWrap: TextWrap = node.attrs.textWrap || 'inline'
  const alignment: Alignment = node.attrs.alignment || 'left'
  const moveWithText = node.attrs.moveWithText !== false

  // Calculate aspect ratio when image loads
  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current
      setAspectRatio(naturalWidth / naturalHeight)
    }
  }, [])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: width,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let deltaX = 0
      
      if (direction.includes('e') || direction === 'ne' || direction === 'se') {
        deltaX = moveEvent.clientX - startPos.current.x
      } else if (direction.includes('w') || direction === 'nw' || direction === 'sw') {
        deltaX = startPos.current.x - moveEvent.clientX
      }
      
      if (direction === 'n' || direction === 's') {
        const deltaY = direction === 's' 
          ? moveEvent.clientY - startPos.current.y 
          : startPos.current.y - moveEvent.clientY
        deltaX = deltaY * aspectRatio
      }

      let newWidth = startPos.current.width + deltaX
      newWidth = Math.max(50, Math.min(800, newWidth))
      
      updateAttributes({ width: Math.round(newWidth) })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }

    document.body.style.cursor = direction.includes('e') || direction.includes('w') ? 'ew-resize' : 
                                  direction.includes('n') || direction.includes('s') ? 'ns-resize' : 
                                  'nwse-resize'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, updateAttributes, aspectRatio])

  const height = Math.round(width / aspectRatio)

  const setTextWrap = (wrap: TextWrap) => {
    updateAttributes({ textWrap: wrap })
  }

  const setAlignment = (align: Alignment) => {
    updateAttributes({ alignment: align })
  }

  const setMoveWithText = (value: boolean) => {
    updateAttributes({ moveWithText: value })
  }

  const getContainerStyle = () => {
    const baseStyle: React.CSSProperties = {}
    
    if (textWrap === 'inline') {
      if (alignment === 'center') {
        baseStyle.display = 'block'
        baseStyle.marginLeft = 'auto'
        baseStyle.marginRight = 'auto'
      } else if (alignment === 'right') {
        baseStyle.display = 'block'
        baseStyle.marginLeft = 'auto'
      }
    } else if (textWrap === 'square' || textWrap === 'tight') {
      baseStyle.float = alignment === 'right' ? 'right' : 'left'
      baseStyle.margin = alignment === 'right' ? '0 0 1em 1em' : '0 1em 1em 0'
    }
    
    return baseStyle
  }

  return (
    <NodeViewWrapper 
      className={`resizable-image-wrapper wrap-${textWrap} align-${alignment}`} 
      style={getContainerStyle()}
      data-drag-handle
    >
      <div className={`resizable-image-container ${selected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          style={{ 
            width: `${width}px`,
            height: 'auto',
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />
        
        {/* Resize Handles */}
        {selected && (
          <div className="resize-handles">
            {/* Corner handles */}
            <div className="resize-handle corner handle-nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
            <div className="resize-handle corner handle-ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
            <div className="resize-handle corner handle-sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
            <div className="resize-handle corner handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
            
            {/* Edge handles */}
            <div className="resize-handle edge handle-n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
            <div className="resize-handle edge handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
            <div className="resize-handle edge handle-w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
            <div className="resize-handle edge handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
            
            {/* Selection border */}
            <div className="selection-border" />
            
            {/* Layout options button */}
            <button 
              className="layout-options-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowLayoutMenu(!showLayoutMenu)
              }}
              title="Opções de Layout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </button>
            
            {/* Size indicator */}
            <div className="size-indicator">
              {width} × {height}
            </div>
          </div>
        )}

        {/* Layout Options Menu */}
        {selected && showLayoutMenu && (
          <div className="layout-options-menu" onClick={(e) => e.stopPropagation()}>
            <div className="layout-menu-header">
              <span>Opções de Layout</span>
              <button className="close-btn" onClick={() => setShowLayoutMenu(false)}>×</button>
            </div>
            
            <div className="layout-section">
              <label className="section-label">Alinhado com o Texto</label>
              <div className="layout-options-row">
                <button 
                  className={`layout-option ${textWrap === 'inline' ? 'active' : ''}`}
                  onClick={() => setTextWrap('inline')}
                  title="Em linha com texto"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="6" width="8" height="8" rx="1"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="21" x2="21" y2="21"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="layout-section">
              <label className="section-label">Com Disposição do Texto</label>
              <div className="layout-options-grid">
                <button 
                  className={`layout-option ${textWrap === 'square' && alignment === 'left' ? 'active' : ''}`}
                  onClick={() => { setTextWrap('square'); setAlignment('left'); }}
                  title="Quadrado - Esquerda"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="6" width="8" height="8" rx="1"/>
                    <line x1="14" y1="6" x2="21" y2="6"/>
                    <line x1="14" y1="10" x2="21" y2="10"/>
                    <line x1="14" y1="14" x2="21" y2="14"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button 
                  className={`layout-option ${textWrap === 'square' && alignment === 'center' ? 'active' : ''}`}
                  onClick={() => { setTextWrap('square'); setAlignment('center'); }}
                  title="Quadrado - Centro"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="6" width="8" height="8" rx="1"/>
                    <line x1="3" y1="6" x2="6" y2="6"/>
                    <line x1="18" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="10" x2="6" y2="10"/>
                    <line x1="18" y1="10" x2="21" y2="10"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button 
                  className={`layout-option ${textWrap === 'square' && alignment === 'right' ? 'active' : ''}`}
                  onClick={() => { setTextWrap('square'); setAlignment('right'); }}
                  title="Quadrado - Direita"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="13" y="6" width="8" height="8" rx="1"/>
                    <line x1="3" y1="6" x2="10" y2="6"/>
                    <line x1="3" y1="10" x2="10" y2="10"/>
                    <line x1="3" y1="14" x2="10" y2="14"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button 
                  className={`layout-option ${textWrap === 'tight' ? 'active' : ''}`}
                  onClick={() => setTextWrap('tight')}
                  title="Apertado"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 6 L8 6 L8 8 L10 10 L8 12 L8 14 L3 14"/>
                    <rect x="10" y="6" width="8" height="8" rx="1"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button 
                  className={`layout-option ${textWrap === 'behind' ? 'active' : ''}`}
                  onClick={() => setTextWrap('behind')}
                  title="Atrás do texto"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="6" y="6" width="10" height="10" rx="1" strokeDasharray="2 2"/>
                    <line x1="3" y1="8" x2="21" y2="8"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="16" x2="21" y2="16"/>
                  </svg>
                </button>
                <button 
                  className={`layout-option ${textWrap === 'front' ? 'active' : ''}`}
                  onClick={() => setTextWrap('front')}
                  title="Na frente do texto"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="3" y1="8" x2="21" y2="8" strokeDasharray="2 2"/>
                    <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2"/>
                    <line x1="3" y1="16" x2="21" y2="16" strokeDasharray="2 2"/>
                    <rect x="6" y="6" width="10" height="10" rx="1" fill="white"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="layout-section">
              <div className="radio-option">
                <input 
                  type="radio" 
                  id="moveWithText" 
                  name="position" 
                  checked={moveWithText}
                  onChange={() => setMoveWithText(true)}
                />
                <label htmlFor="moveWithText">Mover com o texto</label>
              </div>
              <div className="radio-option">
                <input 
                  type="radio" 
                  id="fixPosition" 
                  name="position" 
                  checked={!moveWithText}
                  onChange={() => setMoveWithText(false)}
                />
                <label htmlFor="fixPosition">Corrigir a posição na página</label>
              </div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
