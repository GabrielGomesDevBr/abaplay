-- =====================================================
-- SCRIPT PARA NORMALIZAR STATUS DOS PROGRAMAS
-- Execute no PostgreSQL para corrigir inconsistências
-- =====================================================

-- 1. Verificar os status atuais
SELECT 
    status, 
    COUNT(*) as quantidade,
    CASE 
        WHEN status IN ('Ativo', 'active') THEN 'ATIVO'
        WHEN status IN ('Arquivado', 'archived', 'inactive') THEN 'ARQUIVADO' 
        WHEN status IS NULL THEN 'NULL'
        ELSE 'OUTRO: ' || status
    END as categoria
FROM patient_program_assignments 
GROUP BY status
ORDER BY quantidade DESC;

-- 2. Normalizar todos os status para inglês (padrão do sistema)
UPDATE patient_program_assignments 
SET status = 'active' 
WHERE status = 'Ativo' OR status IS NULL;

UPDATE patient_program_assignments 
SET status = 'archived' 
WHERE status = 'Arquivado' OR status = 'inactive';

-- 3. Verificar se a normalização funcionou
SELECT 
    status, 
    COUNT(*) as quantidade
FROM patient_program_assignments 
GROUP BY status
ORDER BY quantidade DESC;

-- 4. Opcional: Adicionar constraint para evitar valores inconsistentes no futuro
ALTER TABLE patient_program_assignments 
ADD CONSTRAINT check_status_values 
CHECK (status IN ('active', 'archived', 'paused'));