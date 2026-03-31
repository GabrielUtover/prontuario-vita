// Índice de documentos da pasta src/data
// Para adicionar um novo documento:
// 1. Coloque o arquivo .json na pasta src/data
// 2. Importe o arquivo aqui
// 3. Adicione-o ao array bundledDocuments

import receitaEspecial from './RECEITA ESPECIAL 1.0.json'

// Interface para documentos
export interface BundledDocument {
  name: string
  filename: string
  data: {
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
}

// Lista de documentos incluídos no sistema
export const bundledDocuments: BundledDocument[] = [
  {
    name: 'RECEITA ESPECIAL 1.0',
    filename: 'RECEITA ESPECIAL 1.0.json',
    data: receitaEspecial as BundledDocument['data']
  }
]

// Função auxiliar para verificar se um documento é bundled (da pasta data)
export function isBundledDocument(name: string): boolean {
  return bundledDocuments.some(doc => doc.name === name)
}
