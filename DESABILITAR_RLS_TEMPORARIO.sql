-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTE
-- Execute este script no Supabase SQL Editor
-- ============================================
-- ATENÇÃO: Isso desabilita a segurança RLS. Use apenas para teste!
-- Depois de testar, reabilite o RLS e crie as políticas corretas.

-- Desabilitar RLS na tabela receita_itens
ALTER TABLE receita_itens DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename = 'receita_itens';

-- Se funcionar sem RLS, então o problema é nas políticas
-- Depois de confirmar que funciona, execute o script SOLUCAO_DEFINITIVA_RLS.sql
-- para reabilitar o RLS com políticas corretas
