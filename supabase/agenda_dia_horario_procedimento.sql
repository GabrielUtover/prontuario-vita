-- ============================================
-- Agenda do dia: horário, período (manhã/tarde) e procedimento
-- Execute após agenda_dia.sql e agenda_dia_confirmado.sql
-- ============================================

-- Horário do agendamento (ex.: 09:00)
ALTER TABLE public.agenda_dia
  ADD COLUMN IF NOT EXISTS horario TIME;

-- Período do dia: 'manha' ou 'tarde'
ALTER TABLE public.agenda_dia
  ADD COLUMN IF NOT EXISTS periodo_dia TEXT NOT NULL DEFAULT 'manha'
    CHECK (periodo_dia IN ('manha', 'tarde'));

-- Tipo de procedimento: consulta_presencial ou consulta_online
ALTER TABLE public.agenda_dia
  ADD COLUMN IF NOT EXISTS procedimento TEXT NOT NULL DEFAULT 'consulta_presencial'
    CHECK (procedimento IN ('consulta_presencial', 'consulta_online'));

COMMENT ON COLUMN public.agenda_dia.horario IS 'Horário do agendamento no dia';
COMMENT ON COLUMN public.agenda_dia.periodo_dia IS 'Manhã ou tarde';
COMMENT ON COLUMN public.agenda_dia.procedimento IS 'Consulta presencial ou online';
