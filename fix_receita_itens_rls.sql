-- ============================================
-- CORRIGIR POLÍTICAS RLS PARA RECEITA_ITENS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Habilitar RLS
ALTER TABLE receita_itens ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes (para evitar conflitos)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'receita_itens') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON receita_itens';
    END LOOP;
END $$;

-- Criar políticas novas e simples
CREATE POLICY "allow_all_select_receita_itens" 
ON receita_itens FOR SELECT 
USING (true);

CREATE POLICY "allow_all_insert_receita_itens" 
ON receita_itens FOR INSERT 
WITH CHECK (true);

CREATE POLICY "allow_all_update_receita_itens" 
ON receita_itens FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_all_delete_receita_itens" 
ON receita_itens FOR DELETE 
USING (true);

-- Verificar se as políticas foram criadas
SELECT 
    policyname,
    cmd as operacao,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'receita_itens'
ORDER BY policyname;
