import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { useCallback, useRef, useState, useEffect } from 'react'

interface TableNodeViewProps {
  node: {
    attrs: {
      backgroundColor?: string
      borderColor?: string
      borderWidth?: number
      borderStyle?: string
      positionX?: number
      positionY?: number
      isDraggable?: boolean
    }
  }
  updateAttributes: (attrs: Record<string, unknown>) => void
  selected: boolean
}

export function DraggableTableComponent({ node, updateAttributes, selected }: TableNodeViewProps) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPos = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const positionX = node.attrs.positionX || 0
  const positionY = node.attrs.positionY || 0
  const isDraggable = node.attrs.isDraggable || false
  const bgColor = node.attrs.backgroundColor ?? 'transparent'
  const borderColor = node.attrs.borderColor ?? '#d1d5db'
  const borderWidth = node.attrs.borderWidth ?? 1
  const borderStyle = node.attrs.borderStyle ?? 'solid'

  // Apply styles directly to the table element
  useEffect(() => {
    if (!containerRef.current) return
    
    const table = containerRef.current.querySelector('table')
    if (table) {
      table.style.setProperty('background-color', bgColor, 'important')
      table.style.setProperty('border', `${borderWidth}px ${borderStyle} ${borderColor}`, 'important')
      
      // Apply border to all cells (th, td, and TipTap specific elements)
      const cells = table.querySelectorAll('th, td, .tableCell, .tableHeader')
      cells.forEach(cell => {
        const el = cell as HTMLElement
        el.style.setProperty('border', `${borderWidth}px ${borderStyle} ${borderColor}`, 'important')
      })
      
      // Also apply to tbody, tr for complete coverage
      const rows = table.querySelectorAll('tr')
      rows.forEach(row => {
        const cells = row.querySelectorAll('th, td')
        cells.forEach(cell => {
          const el = cell as HTMLElement
          el.style.setProperty('border', `${borderWidth}px ${borderStyle} ${borderColor}`, 'important')
        })
      })
    }
  }, [bgColor, borderColor, borderWidth, borderStyle])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionX,
      posY: positionY,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startPos.current.x
      const deltaY = moveEvent.clientY - startPos.current.y

      const newX = Math.max(0, startPos.current.posX + deltaX)
      const newY = Math.max(0, startPos.current.posY + deltaY)

      updateAttributes({ 
        positionX: newX,
        positionY: newY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }

    document.body.style.cursor = 'grabbing'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [isDraggable, positionX, positionY, updateAttributes])

  const toggleDraggable = () => {
    updateAttributes({ isDraggable: !isDraggable })
    if (!isDraggable) {
      // Reset position when enabling drag
      updateAttributes({ positionX: 0, positionY: 0 })
    }
  }

  const containerStyle: React.CSSProperties = isDraggable ? {
    position: 'absolute',
    left: `${positionX}px`,
    top: `${positionY}px`,
    zIndex: 10,
  } : {}

  return (
    <NodeViewWrapper 
      className={`draggable-table-wrapper ${isDraggable ? 'is-draggable' : ''} ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        ...containerStyle,
        '--table-bg-color': bgColor,
        '--table-border-color': borderColor,
        '--table-border-width': `${borderWidth}px`,
        '--table-border-style': borderStyle,
      } as React.CSSProperties}
      ref={containerRef}
    >
      {/* Table Toolbar - sempre visível quando selecionado */}
      {selected && (
        <div className="table-toolbar">
          <button
            className={`table-mode-btn ${isDraggable ? 'active' : ''}`}
            onClick={toggleDraggable}
            title={isDraggable ? 'Clique para fixar tabela' : 'Clique para liberar e arrastar'}
          >
            {isDraggable ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 9l-3 3 3 3"/>
                  <path d="M9 5l3-3 3 3"/>
                  <path d="M15 19l-3 3-3-3"/>
                  <path d="M19 9l3 3-3 3"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
                <span>Livre</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <span>Fixo</span>
              </>
            )}
          </button>
          
          {isDraggable && (
            <div 
              className="drag-handle"
              onMouseDown={handleDragStart}
              title="Segure e arraste para mover a tabela"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
              </svg>
              <span>Mover</span>
            </div>
          )}
        </div>
      )}
      
      {/* Indicador de modo quando não selecionado */}
      {!selected && isDraggable && (
        <div className="table-mode-indicator">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 9l-3 3 3 3"/>
            <path d="M9 5l3-3 3 3"/>
            <path d="M15 19l-3 3-3-3"/>
            <path d="M19 9l3 3-3 3"/>
          </svg>
        </div>
      )}

      <NodeViewContent className="table-node-content" />

      {/* Position indicator */}
      {isDragging && (
        <div className="position-indicator">
          X: {Math.round(positionX)}px, Y: {Math.round(positionY)}px
        </div>
      )}
    </NodeViewWrapper>
  )
}
