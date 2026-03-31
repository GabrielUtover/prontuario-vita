declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: {
      type?: string
      quality?: number
    }
    html2canvas?: {
      scale?: number
      useCORS?: boolean
      logging?: boolean
    }
    jsPDF?: {
      unit?: string
      format?: string | number[]
      orientation?: 'portrait' | 'landscape'
    }
    pagebreak?: {
      mode?: string | string[]
      before?: string | string[]
      after?: string | string[]
      avoid?: string | string[]
    }
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker
    from(element: HTMLElement | string): Html2PdfWorker
    save(): Promise<void>
    toPdf(): Html2PdfWorker
    get(type: string): Promise<unknown>
    output(type: string, options?: unknown): Promise<unknown>
    then(callback: () => void): Html2PdfWorker
    catch(callback: (error: Error) => void): Html2PdfWorker
  }

  function html2pdf(): Html2PdfWorker
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Html2PdfWorker

  export = html2pdf
}
