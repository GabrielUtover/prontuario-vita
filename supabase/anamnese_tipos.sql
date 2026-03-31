-- ============================================
-- Adicionar campo TIPO na anamnese (4 seções do prontuário)
-- Execute no SQL Editor do Supabase após anamnese.sql
-- ============================================

-- Remover constraint UNIQUE antiga (paciente_id, data_consulta)
ALTER TABLE public.anamnese DROP CONSTRAINT IF EXISTS anamnese_paciente_id_data_consulta_key;

-- Adicionar coluna tipo
ALTER TABLE public.anamnese
  ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Preencher registros existentes com valor padrão
UPDATE public.anamnese SET tipo = 'historia_medica_pregressa' WHERE tipo IS NULL;

-- Tornar NOT NULL e criar constraint única por paciente + data + tipo
ALTER TABLE public.anamnese ALTER COLUMN tipo SET NOT NULL;

ALTER TABLE public.anamnese
  ADD CONSTRAINT anamnese_paciente_data_tipo_key UNIQUE (paciente_id, data_consulta, tipo);

COMMENT ON COLUMN public.anamnese.tipo IS 'historia_medica_pregressa | antecedentes_pessoais | antecedentes_familiares | habitos_de_vida';
