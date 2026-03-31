import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL e Anon Key são obrigatórios. Verifique o arquivo .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para as tabelas do banco
export interface PacienteDB {
  id: string
  nome: string
  cpf: string
  data_nascimento: string | null
  telefone: string | null
  email: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  convenio: string | null
  numero_convenio: string | null
  observacoes: string | null
  status: 'ativo' | 'inativo'
  data_cadastro: string
  data_atualizacao: string
}

export interface ItemReceitaDB {
  id: string
  receita_id: string
  medicacao: string
  dose: string | null
  unidade: string | null
  quantidade: string | null
  apresentacao: string | null
  via: string | null
  posologia: string | null
  observacao: string | null
}

export interface ReceitaDB {
  id: string
  paciente_id: string
  data: string
  tipo: 'normal' | 'especial'
  observacao_geral: string | null
  status: 'rascunho' | 'emitida'
  created_at: string
}

export interface MedicacaoDB {
  id: string
  nome: string
  created_at: string
}

export interface UnidadeDB {
  id: string
  nome: string
  created_at: string
}

export interface ApresentacaoDB {
  id: string
  nome: string
  created_at: string
}

export interface ViaDB {
  id: string
  nome: string
  created_at: string
}

export interface PosologiaDB {
  id: string
  nome: string
  created_at: string
}

export interface ReceitaPadraoDB {
  id: string
  nome: string
  texto: string
  created_at: string
}
