-- ============================================
-- TABELA AGENDA_ABERTURA - Configuração "Abrir agenda" (dias e horários de atendimento)
-- Define em quais dias da semana e horários o profissional atende em um período
-- Execute no SQL Editor do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS public.agenda_abertura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  -- Dias da semana (true = atende nesse dia)
  seg BOOLEAN NOT NULL DEFAULT false,
  ter BOOLEAN NOT NULL DEFAULT false,
  qua BOOLEAN NOT NULL DEFAULT false,
  qui BOOLEAN NOT NULL DEFAULT false,
  sex BOOLEAN NOT NULL DEFAULT false,
  sab BOOLEAN NOT NULL DEFAULT false,
  dom BOOLEAN NOT NULL DEFAULT false,
  -- Período manhã
  manha_ativo BOOLEAN NOT NULL DEFAULT true,
  manha_inicio TIME,
  manha_fim TIME,
  manha_pausa_inicio TIME,
  manha_pausa_fim TIME,
  -- Período tarde
  tarde_ativo BOOLEAN NOT NULL DEFAULT true,
  tarde_inicio TIME,
  tarde_fim TIME,
  tarde_pausa_inicio TIME,
  tarde_pausa_fim TIME,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_abertura_datas ON public.agenda_abertura(data_inicio, data_fim);

ALTER TABLE public.agenda_abertura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_abertura_select" ON public.agenda_abertura;
CREATE POLICY "agenda_abertura_select" ON public.agenda_abertura FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "agenda_abertura_insert" ON public.agenda_abertura;
CREATE POLICY "agenda_abertura_insert" ON public.agenda_abertura FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "agenda_abertura_update" ON public.agenda_abertura;
CREATE POLICY "agenda_abertura_update" ON public.agenda_abertura FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agenda_abertura_delete" ON public.agenda_abertura;
CREATE POLICY "agenda_abertura_delete" ON public.agenda_abertura FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.agenda_abertura IS 'Configuração de abertura de agenda: período, dias da semana e horários (manhã/tarde com pausa)';
