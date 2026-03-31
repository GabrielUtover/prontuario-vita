-- ============================================
-- Anamnese: registrar profissional (quem fez a evolução)
-- Execute no SQL Editor do Supabase
-- ============================================

-- Se a tabela usuarios existir com coluna id (UUID), descomente e ajuste o nome da tabela se necessário:
-- ALTER TABLE public.anamnese
--   ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Alternativa: coluna de texto para nome do profissional (sem FK)
ALTER TABLE public.anamnese
  ADD COLUMN IF NOT EXISTS profissional_nome TEXT;

COMMENT ON COLUMN public.anamnese.profissional_nome IS 'Nome do profissional que registrou a evolução';
