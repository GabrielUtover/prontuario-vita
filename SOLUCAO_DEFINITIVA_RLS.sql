-- ============================================
-- SOLUÇÃO DEFINITIVA PARA RLS - RECEITA_ITENS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- OPÇÃO 1: DESABILITAR RLS TEMPORARIAMENTE (PARA TESTAR)
-- Descomente a linha abaixo se quiser desabilitar RLS completamente
-- ALTER TABLE receita_itens DISABLE ROW LEVEL SECURITY;

-- OPÇÃO 2: REMOVER TODAS AS POLÍTICAS E RECRIAR (RECOMENDADO)
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
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON receita_itens';
    END LOOP;
END $$;

-- Garantir que RLS está habilitado
ALTER TABLE receita_itens ENABLE ROW LEVEL SECURITY;

-- Criar políticas usando role 'authenticated' explicitamente
CREATE POLICY "authenticated_insert_receita_itens" 
ON receita_itens 
FOR INSERT 
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_select_receita_itens" 
ON receita_itens 
FOR SELECT 
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_update_receita_itens" 
ON receita_itens 
FOR UPDATE 
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_receita_itens" 
ON receita_itens 
FOR DELETE 
TO authenticated
USING (auth.role() = 'authenticated');

-- Verificar resultado
SELECT 
    tablename,
    rowsecurity as rls_habilitado,
    COUNT(*) as total_politicas
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = t.tablename
WHERE t.schemaname = 'public' 
    AND t.tablename = 'receita_itens'
GROUP BY tablename, rowsecurity;

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
