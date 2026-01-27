-- ============================================
-- CORRIGIR TODAS AS POLÍTICAS RLS
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Função auxiliar para remover todas as políticas de uma tabela
CREATE OR REPLACE FUNCTION drop_all_policies(table_name text)
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = table_name
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RECEITA_ITENS (PRIORIDADE - está dando erro)
-- ============================================
ALTER TABLE receita_itens ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('receita_itens');

CREATE POLICY "allow_all_select_receita_itens" ON receita_itens FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_receita_itens" ON receita_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_receita_itens" ON receita_itens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_receita_itens" ON receita_itens FOR DELETE USING (true);

-- ============================================
-- RECEITAS
-- ============================================
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('receitas');

CREATE POLICY "allow_all_select_receitas" ON receitas FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_receitas" ON receitas FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_receitas" ON receitas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_receitas" ON receitas FOR DELETE USING (true);

-- ============================================
-- RECEITA_PADROES
-- ============================================
ALTER TABLE receita_padroes ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('receita_padroes');

CREATE POLICY "allow_all_select_receita_padroes" ON receita_padroes FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_receita_padroes" ON receita_padroes FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_receita_padroes" ON receita_padroes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_receita_padroes" ON receita_padroes FOR DELETE USING (true);

-- ============================================
-- MEDICACOES
-- ============================================
ALTER TABLE medicacoes ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('medicacoes');

CREATE POLICY "allow_all_select_medicacoes" ON medicacoes FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_medicacoes" ON medicacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_medicacoes" ON medicacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_medicacoes" ON medicacoes FOR DELETE USING (true);

-- ============================================
-- UNIDADES
-- ============================================
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('unidades');

CREATE POLICY "allow_all_select_unidades" ON unidades FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_unidades" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_unidades" ON unidades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_unidades" ON unidades FOR DELETE USING (true);

-- ============================================
-- APRESENTACOES
-- ============================================
ALTER TABLE apresentacoes ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('apresentacoes');

CREATE POLICY "allow_all_select_apresentacoes" ON apresentacoes FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_apresentacoes" ON apresentacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_apresentacoes" ON apresentacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_apresentacoes" ON apresentacoes FOR DELETE USING (true);

-- ============================================
-- VIAS
-- ============================================
ALTER TABLE vias ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('vias');

CREATE POLICY "allow_all_select_vias" ON vias FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_vias" ON vias FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_vias" ON vias FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_vias" ON vias FOR DELETE USING (true);

-- ============================================
-- POSOLOGIAS
-- ============================================
ALTER TABLE posologias ENABLE ROW LEVEL SECURITY;
SELECT drop_all_policies('posologias');

CREATE POLICY "allow_all_select_posologias" ON posologias FOR SELECT USING (true);
CREATE POLICY "allow_all_insert_posologias" ON posologias FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update_posologias" ON posologias FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete_posologias" ON posologias FOR DELETE USING (true);

-- ============================================
-- VERIFICAÇÃO FINAL
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

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS drop_all_policies(text);
