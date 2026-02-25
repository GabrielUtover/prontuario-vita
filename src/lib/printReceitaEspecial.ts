import type { BundledDocument } from '../data'

export type DocumentoReceitaEspecial = BundledDocument['data']

/**
 * Abre uma janela e imprime o documento da receita especial (modelo RECEITA ESPECIAL 1.0)
 * com as variáveis substituídas ({{paciente}}, {{idade}}, {{receita}}, {{paciente_end}}).
 */
export function imprimirDocumentoReceitaEspecial(
  documento: DocumentoReceitaEspecial,
  variaveis: Record<string, string>
): void {
  if (!documento?.objects) {
    throw new Error('Documento inválido: objetos não encontrados')
  }

  const isLandscape = documento.pageOrientation === 'landscape'
  const pageWidth = isLandscape ? 297 : 210
  const pageHeight = isLandscape ? 210 : 297

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor, permita popups para imprimir.')
    return
  }

  type Obj = {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    bgColor?: string
    borderColor?: string
    borderWidth?: number
    text?: string
    textAlign?: string
    textVAlign?: string
  }

  const objetosProcessados = (documento.objects as Obj[]).map(obj => {
    let textoProcessado = obj.text || ''
    Object.entries(variaveis).forEach(([chave, valor]) => {
      textoProcessado = textoProcessado.replace(new RegExp(chave.replace(/[{}]/g, '\\$&'), 'g'), valor)
    })
    return { ...obj, text: textoProcessado }
  })

  const retangulosHTML = objetosProcessados.map(obj => {
    const justifyContent = obj.textVAlign === 'top' ? 'flex-start' : obj.textVAlign === 'bottom' ? 'flex-end' : 'center'
    const textAlign = obj.textAlign || 'left'
    return `
      <div style="
        position: absolute;
        left: ${obj.x}px;
        top: ${obj.y}px;
        width: ${obj.width}px;
        height: ${obj.height}px;
        background-color: ${obj.bgColor || 'transparent'};
        border: ${obj.borderWidth || 0}px solid ${obj.borderColor || 'transparent'};
        display: flex;
        align-items: ${justifyContent};
        justify-content: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
        padding: 4px 8px;
        box-sizing: border-box;
        font-family: ${documento.fontFamily || 'Arial'}, sans-serif;
        font-size: ${documento.fontSize || 12}px;
        white-space: pre-wrap;
        overflow: hidden;
      ">${(obj.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receita Especial</title>
      <style>
        @page { size: ${pageWidth}mm ${pageHeight}mm; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: ${pageWidth}mm; height: ${pageHeight}mm; margin: 0; padding: 0; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .page {
          position: relative;
          width: ${pageWidth}mm;
          height: ${pageHeight}mm;
          ${documento.backgroundImage ? `background-image: url('${documento.backgroundImage}');` : ''}
          background-size: 100% 100%;
          background-repeat: no-repeat;
          background-position: center;
          overflow: hidden;
        }
        @media print {
          html, body { width: ${pageWidth}mm; height: ${pageHeight}mm; }
          .page { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page">${retangulosHTML}</div>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }
}
