-- =====================================================
-- QUERIES DE DIAGNÓSTICO PARA ANÁLISE DO BANCO DE DADOS
-- Execute essas queries no PgAdmin para entender a estrutura atual
-- =====================================================

-- 1. ESQUEMA DAS TABELAS PRINCIPAIS
-- =====================================
SELECT 
    t.table_name,
    string_agg(c.column_name || ' (' || c.data_type || ')', ', ' ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
    'disciplines', 'program_areas', 'program_sub_areas', 'programs',
    'patients', 'users', 'clinics',
    'therapist_patient_assignments', 'patient_program_assignments',
    'patient_program_progress', 'case_discussions', 'parent_chats',
    'notifications', 'notification_status'
  )
GROUP BY t.table_name
ORDER BY t.table_name;

-- 2. ESTRUTURA HIERÁRQUICA DOS PROGRAMAS (EXEMPLO DE DADOS)
-- =========================================================
SELECT 
    d.name as disciplina,
    pa.name as area,
    psa.name as sub_area,
    p.id as program_id,
    p.name as program_name,
    p.objective,
    p.skill,
    p.trials
FROM disciplines d
LEFT JOIN program_areas pa ON d.id = pa.discipline_id
LEFT JOIN program_sub_areas psa ON pa.id = psa.area_id
LEFT JOIN programs p ON psa.id = p.sub_area_id
GROUP BY d.name, pa.name, psa.name, p.id, p.name, p.objective, p.skill, p.trials
ORDER BY d.name, pa.name, psa.name, p.name;

-- 3. ANÁLISE DE ATRIBUIÇÕES DE PROGRAMAS
-- =======================================
SELECT 
    pat.id as patient_id,
    pat.name as patient_name,
    d.name as disciplina,
    p.name as program_name,
    ppa.id as assignment_id,
    ppa.status as assignment_status,
    ppa.created_at as assigned_date
FROM patients pat
LEFT JOIN patient_program_assignments ppa ON pat.id = ppa.patient_id
LEFT JOIN programs p ON ppa.program_id = p.id
LEFT JOIN program_sub_areas psa ON p.sub_area_id = psa.id
LEFT JOIN program_areas pa ON psa.area_id = pa.id
LEFT JOIN disciplines d ON pa.discipline_id = d.id
ORDER BY pat.name, d.name, p.name;

-- 4. ANÁLISE DE MENSAGENS (CASE DISCUSSIONS)
-- ==========================================
SELECT 
    cd.id,
    pat.name as patient_name,
    u.name as user_name,
    cd.content,
    cd.created_at
FROM case_discussions cd
JOIN patients pat ON cd.patient_id = pat.id
JOIN users u ON cd.user_id = u.id
ORDER BY pat.name, cd.created_at DESC
LIMIT 20;

-- 5. ANÁLISE DE PROGRESSO DOS PROGRAMAS
-- ======================================
SELECT 
    pat.name as patient_name,
    p.name as program_name,
    ppp.session_date,
    ppp.trials_correct,
    ppp.trials_incorrect,
    ppp.total_trials,
    ROUND((ppp.trials_correct::float / NULLIF(ppp.total_trials, 0)) * 100, 2) as success_percentage
FROM patient_program_progress ppp
JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
JOIN patients pat ON ppa.patient_id = pat.id
JOIN programs p ON ppa.program_id = p.id
ORDER BY pat.name, p.name, ppp.session_date DESC
LIMIT 50;

-- 6. ANÁLISE DE NOTIFICAÇÕES
-- ===========================
SELECT 
    n.id,
    n.type as notification_type,
    n.title,
    n.message,
    pat.name as patient_name,
    ns.read_at,
    n.created_at
FROM notifications n
LEFT JOIN patients pat ON n.patient_id = pat.id
LEFT JOIN notification_status ns ON n.id = ns.notification_id
ORDER BY n.created_at DESC
LIMIT 20;

-- 7. ANÁLISE DE MENSAGENS (PARENT CHATS)
-- ======================================
SELECT 
    pc.id,
    pat.name as patient_name,
    u.name as sender_name,
    pc.message,
    pc.created_at
FROM parent_chats pc
JOIN patients pat ON pc.patient_id = pat.id
JOIN users u ON pc.sender_id = u.id
ORDER BY pat.name, pc.created_at DESC
LIMIT 20;

-- 8. DETALHES DO TERAPEUTA E SEUS PACIENTES
-- =========================================
SELECT 
    u.id as therapist_id,
    u.name as therapist_name,
    u.role,
    pat.id as patient_id,
    pat.name as patient_name,
    tpa.created_at as assigned_date
FROM users u
LEFT JOIN therapist_patient_assignments tpa ON u.id = tpa.therapist_id
LEFT JOIN patients pat ON tpa.patient_id = pat.id
WHERE u.role = 'terapeuta'
ORDER BY u.name, pat.name;

-- 9. CONTAGEM DE REGISTROS POR TABELA
-- ===================================
SELECT 'disciplines' as tabela, COUNT(*) as total FROM disciplines
UNION ALL
SELECT 'program_areas' as tabela, COUNT(*) as total FROM program_areas
UNION ALL
SELECT 'program_sub_areas' as tabela, COUNT(*) as total FROM program_sub_areas
UNION ALL
SELECT 'programs' as tabela, COUNT(*) as total FROM programs
UNION ALL
SELECT 'patients' as tabela, COUNT(*) as total FROM patients
UNION ALL
SELECT 'users' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'clinics' as tabela, COUNT(*) as total FROM clinics
UNION ALL
SELECT 'notifications' as tabela, COUNT(*) as total FROM notifications
UNION ALL
SELECT 'notification_status' as tabela, COUNT(*) as total FROM notification_status
UNION ALL
SELECT 'patient_program_assignments' as tabela, COUNT(*) as total FROM patient_program_assignments
UNION ALL
SELECT 'case_discussions' as tabela, COUNT(*) as total FROM case_discussions
UNION ALL
SELECT 'parent_chats' as tabela, COUNT(*) as total FROM parent_chats
ORDER BY tabela;

-- 8. PASSOS DE UM PROGRAMA ESPECÍFICO
-- ===================================
-- Substitua o ID do programa pelo que você quer analisar
SELECT 
    ps.id as step_id,
    ps.step_number,
    ps.step_name,
    ps.description,
    ps.expected_trials,
    ps.mastery_criteria
FROM program_steps ps
WHERE ps.program_id = (
    SELECT p.id FROM programs p 
    JOIN program_sub_areas psa ON p.sub_area_id = psa.id
    JOIN program_areas pa ON psa.area_id = pa.id
    JOIN disciplines d ON pa.discipline_id = d.id
    WHERE d.name = 'Psicologia'
    LIMIT 1
)
ORDER BY ps.step_number;

-- 9. FOREIGN KEYS E RELACIONAMENTOS
-- =================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 10. EXEMPLO DE DADOS PARA DEBUGAR CARREGAMENTO INCOMPLETO
-- ========================================================
SELECT 
    p.id as program_id,
    p.name as program_name,
    p.objective,
    d.name as disciplina,
    pa.name as area,
    psa.name as sub_area,
    COUNT(ps.id) as steps_count,
    json_agg(
        json_build_object(
            'step_id', ps.id,
            'step_number', ps.step_number, 
            'step_name', ps.step_name,
            'description', ps.description
        ) ORDER BY ps.step_number
    ) as steps_details
FROM programs p
JOIN program_sub_areas psa ON p.sub_area_id = psa.id
JOIN program_areas pa ON psa.area_id = pa.id
JOIN disciplines d ON pa.discipline_id = d.id
LEFT JOIN program_steps ps ON p.id = ps.program_id
WHERE d.name = 'Psicologia'
GROUP BY p.id, p.name, p.objective, d.name, pa.name, psa.name
ORDER BY p.name;