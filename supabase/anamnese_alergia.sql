-- ============================================
-- Tipo 'alergia' na anamnese (Dados do paciente)
-- A coluna tipo já é TEXT; não é obrigatório alterar nada.
-- Use este script apenas para documentar o novo valor.
-- ============================================

COMMENT ON COLUMN public.anamnese.tipo IS 'historia_medica_pregressa | antecedentes_pessoais | antecedentes_familiares | habitos_de_vida | alergia';
