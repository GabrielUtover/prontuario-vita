-- ============================================
-- TABELA ANAMNESE - Anamnese do prontuário por paciente e data
-- Execute no SQL Editor do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS public.anamnese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  data_consulta DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'historia_medica_pregressa',
  texto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paciente_id, data_consulta, tipo)
);

CREATE INDEX IF NOT EXISTS idx_anamnese_paciente_id ON public.anamnese(paciente_id);
CREATE INDEX IF NOT EXISTS idx_anamnese_data_consulta ON public.anamnese(data_consulta);

ALTER TABLE public.anamnese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anamnese_select" ON public.anamnese;
CREATE POLICY "anamnese_select" ON public.anamnese FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "anamnese_insert" ON public.anamnese;
CREATE POLICY "anamnese_insert" ON public.anamnese FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anamnese_update" ON public.anamnese;
CREATE POLICY "anamnese_update" ON public.anamnese FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anamnese_delete" ON public.anamnese;
CREATE POLICY "anamnese_delete" ON public.anamnese FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.anamnese IS 'Anamnese do prontuário por paciente, data e tipo (historia_medica_pregressa, antecedentes_pessoais, antecedentes_familiares, habitos_de_vida)';
