-- ============================================
-- ANAMNESE - Cancelamento (motivo obrigatório)
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor > New query)
-- ============================================

ALTER TABLE public.anamnese ADD COLUMN IF NOT EXISTS cancelado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.anamnese ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT;
ALTER TABLE public.anamnese ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.anamnese.cancelado IS 'Se true, a anamnese foi cancelada e não aparece no histórico ativo';
COMMENT ON COLUMN public.anamnese.motivo_cancelamento IS 'Motivo informado ao cancelar a anamnese';
