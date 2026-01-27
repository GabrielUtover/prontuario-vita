-- ============================================
-- CORRIGIR POLÍTICAS RLS PARA RECEITA_ITENS (VERSÃO 2)
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Primeiro, vamos desabilitar temporariamente o RLS para testar
ALTER TABLE receita_itens DISABLE ROW LEVEL SECURITY;

-- Verificar se desabilitou
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'receita_itens';

-- Se você quiser manter RLS habilitado, use esta versão:
-- Remover todas as políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'receita_itens'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON receita_itens CASCADE';
    END LOOP;
END $$;

-- Habilitar RLS novamente
ALTER TABLE receita_itens ENABLE ROW LEVEL SECURITY;

-- Criar políticas que verificam autenticação explicitamente
CREATE POLICY "auth_insert_receita_itens" 
ON receita_itens 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "auth_select_receita_itens" 
ON receita_itens 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "auth_update_receita_itens" 
ON receita_itens 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "auth_delete_receita_itens" 
ON receita_itens 
FOR DELETE 
TO authenticated
USING (true);

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd as operacao,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'receita_itens'
ORDER BY policyname;
