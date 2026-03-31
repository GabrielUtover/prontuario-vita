-- ============================================
-- TABELA ANAMNESE_MODELOS - Modelos de texto para anamnese (criados pelo usuário)
-- Execute no SQL Editor do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS public.anamnese_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  texto TEXT NOT NULL DEFAULT '',
  auth_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anamnese_modelos_auth_id ON public.anamnese_modelos(auth_id);

ALTER TABLE public.anamnese_modelos ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver todos os modelos (compartilhados para uso)
DROP POLICY IF EXISTS "anamnese_modelos_select" ON public.anamnese_modelos;
CREATE POLICY "anamnese_modelos_select" ON public.anamnese_modelos FOR SELECT TO authenticated USING (true);

-- Inserir: apenas o próprio usuário (auth_id = auth.uid())
DROP POLICY IF EXISTS "anamnese_modelos_insert" ON public.anamnese_modelos;
CREATE POLICY "anamnese_modelos_insert" ON public.anamnese_modelos FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Atualizar e excluir: apenas o criador
DROP POLICY IF EXISTS "anamnese_modelos_update" ON public.anamnese_modelos;
CREATE POLICY "anamnese_modelos_update" ON public.anamnese_modelos FOR UPDATE TO authenticated
  USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "anamnese_modelos_delete" ON public.anamnese_modelos;
CREATE POLICY "anamnese_modelos_delete" ON public.anamnese_modelos FOR DELETE TO authenticated
  USING (auth_id = auth.uid());

COMMENT ON TABLE public.anamnese_modelos IS 'Modelos de texto de anamnese criados pelos usuários para inserir no prontuário';
