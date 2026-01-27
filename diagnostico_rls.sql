-- ============================================
-- SCRIPT DE DIAGNÓSTICO DE POLÍTICAS RLS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Verificar quais tabelas têm RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'receitas',
        'receita_itens',
        'receita_padroes',
        'medicacoes',
        'unidades',
        'apresentacoes',
        'vias',
        'posologias'
    )
ORDER BY tablename;

-- Verificar políticas existentes para cada tabela
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operacao,
    qual as condicao_select,
    with_check as condicao_insert_update
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'receitas',
        'receita_itens',
        'receita_padroes',
        'medicacoes',
        'unidades',
        'apresentacoes',
        'vias',
        'posologias'
    )
ORDER BY tablename, policyname;

-- ============================================
-- CRIAR TODAS AS POLÍTICAS NECESSÁRIAS
-- ============================================

-- RECEITAS
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_receitas" ON receitas;
DROP POLICY IF EXISTS "auth_insert_receitas" ON receitas;
DROP POLICY IF EXISTS "auth_update_receitas" ON receitas;
DROP POLICY IF EXISTS "auth_delete_receitas" ON receitas;
CREATE POLICY "auth_select_receitas" ON receitas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_receitas" ON receitas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_receitas" ON receitas FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_receitas" ON receitas FOR DELETE USING (auth.role() = 'authenticated');

-- RECEITA_ITENS
ALTER TABLE receita_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_receita_itens" ON receita_itens;
DROP POLICY IF EXISTS "auth_insert_receita_itens" ON receita_itens;
DROP POLICY IF EXISTS "auth_update_receita_itens" ON receita_itens;
DROP POLICY IF EXISTS "auth_delete_receita_itens" ON receita_itens;
CREATE POLICY "auth_select_receita_itens" ON receita_itens FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_receita_itens" ON receita_itens FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_receita_itens" ON receita_itens FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_receita_itens" ON receita_itens FOR DELETE USING (auth.role() = 'authenticated');

-- RECEITA_PADROES
ALTER TABLE receita_padroes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_receita_padroes" ON receita_padroes;
DROP POLICY IF EXISTS "auth_insert_receita_padroes" ON receita_padroes;
DROP POLICY IF EXISTS "auth_update_receita_padroes" ON receita_padroes;
DROP POLICY IF EXISTS "auth_delete_receita_padroes" ON receita_padroes;
CREATE POLICY "auth_select_receita_padroes" ON receita_padroes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_receita_padroes" ON receita_padroes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_receita_padroes" ON receita_padroes FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_receita_padroes" ON receita_padroes FOR DELETE USING (auth.role() = 'authenticated');

-- MEDICACOES
ALTER TABLE medicacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_medicacoes" ON medicacoes;
DROP POLICY IF EXISTS "auth_insert_medicacoes" ON medicacoes;
DROP POLICY IF EXISTS "auth_update_medicacoes" ON medicacoes;
DROP POLICY IF EXISTS "auth_delete_medicacoes" ON medicacoes;
CREATE POLICY "auth_select_medicacoes" ON medicacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_medicacoes" ON medicacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_medicacoes" ON medicacoes FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_medicacoes" ON medicacoes FOR DELETE USING (auth.role() = 'authenticated');

-- UNIDADES
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_unidades" ON unidades;
DROP POLICY IF EXISTS "auth_insert_unidades" ON unidades;
DROP POLICY IF EXISTS "auth_update_unidades" ON unidades;
DROP POLICY IF EXISTS "auth_delete_unidades" ON unidades;
CREATE POLICY "auth_select_unidades" ON unidades FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_unidades" ON unidades FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_unidades" ON unidades FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_unidades" ON unidades FOR DELETE USING (auth.role() = 'authenticated');

-- APRESENTACOES
ALTER TABLE apresentacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_apresentacoes" ON apresentacoes;
DROP POLICY IF EXISTS "auth_insert_apresentacoes" ON apresentacoes;
DROP POLICY IF EXISTS "auth_update_apresentacoes" ON apresentacoes;
DROP POLICY IF EXISTS "auth_delete_apresentacoes" ON apresentacoes;
CREATE POLICY "auth_select_apresentacoes" ON apresentacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_apresentacoes" ON apresentacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_apresentacoes" ON apresentacoes FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_apresentacoes" ON apresentacoes FOR DELETE USING (auth.role() = 'authenticated');

-- VIAS
ALTER TABLE vias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_vias" ON vias;
DROP POLICY IF EXISTS "auth_insert_vias" ON vias;
DROP POLICY IF EXISTS "auth_update_vias" ON vias;
DROP POLICY IF EXISTS "auth_delete_vias" ON vias;
CREATE POLICY "auth_select_vias" ON vias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_vias" ON vias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_vias" ON vias FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_vias" ON vias FOR DELETE USING (auth.role() = 'authenticated');

-- POSOLOGIAS
ALTER TABLE posologias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select_posologias" ON posologias;
DROP POLICY IF EXISTS "auth_insert_posologias" ON posologias;
DROP POLICY IF EXISTS "auth_update_posologias" ON posologias;
DROP POLICY IF EXISTS "auth_delete_posologias" ON posologias;
CREATE POLICY "auth_select_posologias" ON posologias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_posologias" ON posologias FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update_posologias" ON posologias FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_delete_posologias" ON posologias FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- VERIFICAR RESULTADO FINAL
-- ============================================
SELECT 
    tablename,
    COUNT(*) as total_politicas,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as politicas
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'receitas',
        'receita_itens',
        'receita_padroes',
        'medicacoes',
        'unidades',
        'apresentacoes',
        'vias',
        'posologias'
    )
GROUP BY tablename
ORDER BY tablename;
