-- ============================================
-- Agenda abertura: vincular ao profissional
-- Execute após agenda_abertura.sql (e existir tabela profissionais)
-- ============================================

-- Se a tabela profissionais não existir, crie apenas a coluna nullable
ALTER TABLE public.agenda_abertura
  ADD COLUMN IF NOT EXISTS profissional_id UUID NULL;

-- Opcional: referência à tabela profissionais (descomente se a tabela existir)
-- ALTER TABLE public.agenda_abertura
--   DROP CONSTRAINT IF EXISTS fk_agenda_abertura_profissional;
-- ALTER TABLE public.agenda_abertura
--   ADD CONSTRAINT fk_agenda_abertura_profissional
--   FOREIGN KEY (profissional_id) REFERENCES public.profissionais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_abertura_profissional_id ON public.agenda_abertura(profissional_id);

COMMENT ON COLUMN public.agenda_abertura.profissional_id IS 'Profissional ao qual esta abertura de agenda se refere';
