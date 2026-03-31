-- ============================================
-- Adicionar confirmação de atendimento pela recepção (agenda_dia)
-- Execute no SQL Editor do Supabase após agenda_dia.sql
-- ============================================

-- Coluna: recepção precisa confirmar o check-in para o atendimento aparecer como "aberto" no prontuário
ALTER TABLE public.agenda_dia
  ADD COLUMN IF NOT EXISTS confirmado_recepcao BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.agenda_dia.confirmado_recepcao IS 'True quando a recepção confirmou o atendimento (check-in). Atendimentos abertos no prontuário são apenas os confirmados.';
