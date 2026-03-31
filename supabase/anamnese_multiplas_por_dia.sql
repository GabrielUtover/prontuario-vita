-- ============================================
-- Permitir várias anamneses (tipo 'anamnese') no mesmo dia
-- Cada "Salvar" cria um novo registro no histórico em vez de substituir
-- Execute no SQL Editor do Supabase
-- ============================================

-- Remove a constraint que permitia apenas um registro por (paciente, data, tipo)
ALTER TABLE public.anamnese DROP CONSTRAINT IF EXISTS anamnese_paciente_data_tipo_key;
ALTER TABLE public.anamnese DROP CONSTRAINT IF EXISTS anamnese_paciente_id_data_consulta_tipo_key;

-- Opcional: índice para consultas por paciente + data (performance)
CREATE INDEX IF NOT EXISTS idx_anamnese_paciente_data_tipo
  ON public.anamnese(paciente_id, data_consulta, tipo);

COMMENT ON TABLE public.anamnese IS 'Anamnese do prontuário; múltiplos registros por paciente/data/tipo permitidos (histórico)';
