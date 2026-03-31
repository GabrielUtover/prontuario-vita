-- ============================================
-- TABELA AGENDA_DIA - Agenda do dia (pacientes agendados por data)
-- Execute no SQL Editor do Supabase
-- ============================================

-- Criar tabela agenda_dia
CREATE TABLE IF NOT EXISTS public.agenda_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  data_agenda DATE NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paciente_id, data_agenda)
);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_agenda_dia_data_agenda ON public.agenda_dia(data_agenda);
CREATE INDEX IF NOT EXISTS idx_agenda_dia_paciente_id ON public.agenda_dia(paciente_id);

-- Habilitar RLS
ALTER TABLE public.agenda_dia ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir para usuários autenticados)
DROP POLICY IF EXISTS "agenda_dia_select" ON public.agenda_dia;
CREATE POLICY "agenda_dia_select" ON public.agenda_dia FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "agenda_dia_insert" ON public.agenda_dia;
CREATE POLICY "agenda_dia_insert" ON public.agenda_dia FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "agenda_dia_update" ON public.agenda_dia;
CREATE POLICY "agenda_dia_update" ON public.agenda_dia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "agenda_dia_delete" ON public.agenda_dia;
CREATE POLICY "agenda_dia_delete" ON public.agenda_dia FOR DELETE TO authenticated USING (true);

-- Comentário na tabela
COMMENT ON TABLE public.agenda_dia IS 'Pacientes agendados para atendimento por data (agenda do dia)';
