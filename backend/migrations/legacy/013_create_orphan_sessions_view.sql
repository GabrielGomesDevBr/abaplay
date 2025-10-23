-- Migration 013: Criar view otimizada para sessões órfãs
-- View robusta e performática para detectar sessões realizadas sem agendamento prévio

-- Drop view se já existir (para permitir recriar com mudanças)
DROP VIEW IF EXISTS v_orphan_sessions;

-- Criar view de sessões órfãs
CREATE VIEW v_orphan_sessions AS
SELECT DISTINCT
    ppp.id as session_id,
    ppp.session_date,
    ppp.created_at as session_created_at,

    -- Dados do paciente
    ppa.patient_id,
    p.name as patient_name,
    p.dob as patient_dob,
    p.clinic_id as patient_clinic_id,

    -- Dados do terapeuta
    ppa.therapist_id,
    u.full_name as therapist_name,
    u.username as therapist_username,
    u.clinic_id as therapist_clinic_id,

    -- Dados da atribuição/programa
    ppa.id as assignment_id,
    ppa.program_id,
    prog.name as program_name,

    -- Dados da disciplina (através de program -> sub_area -> area -> discipline)
    d.id as discipline_id,
    d.name as discipline_name,

    -- Metadados úteis
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ppp.session_date))::INTEGER / 86400 as days_since_session,
    DATE_PART('dow', ppp.session_date) as day_of_week,

    -- Contagem de programas trabalhados nesta sessão
    (
        SELECT COUNT(DISTINCT ppp2.id)
        FROM patient_program_progress ppp2
        WHERE ppp2.assignment_id IN (
            SELECT ppa2.id
            FROM patient_program_assignments ppa2
            WHERE ppa2.patient_id = ppa.patient_id
            AND ppa2.therapist_id = ppa.therapist_id
        )
        AND ppp2.session_date = ppp.session_date
    ) as programs_worked_in_session

FROM patient_program_progress ppp
JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
JOIN patients p ON ppa.patient_id = p.id
JOIN users u ON ppa.therapist_id = u.id
LEFT JOIN programs prog ON ppa.program_id = prog.id
LEFT JOIN program_sub_areas psa ON prog.sub_area_id = psa.id
LEFT JOIN program_areas pa ON psa.area_id = pa.id
LEFT JOIN disciplines d ON pa.discipline_id = d.id

WHERE
    -- Sessão deve ter data registrada
    ppp.session_date IS NOT NULL

    -- NÃO DEVE EXISTIR agendamento correspondente
    AND NOT EXISTS (
        SELECT 1
        FROM scheduled_sessions ss
        WHERE ss.patient_id = ppa.patient_id
        AND ss.therapist_id = ppa.therapist_id
        AND ss.scheduled_date = ppp.session_date
        AND (
            ss.status = 'completed'
            OR ss.progress_session_id = ppp.id
        )
    )

    -- Apenas terapeutas ativos
    AND u.role = 'terapeuta';

-- Comentários para documentação
COMMENT ON VIEW v_orphan_sessions IS 'Sessões realizadas (registradas em patient_program_progress) sem agendamento prévio correspondente em scheduled_sessions. Útil para identificar sessões que precisam de agendamentos retroativos.';

-- Criar índices para melhorar performance das queries na view
-- (Os índices são nas tabelas base, não na view)

-- Índice composto para acelerar a detecção de órfãs
CREATE INDEX IF NOT EXISTS idx_ppp_session_date_assignment
ON patient_program_progress(session_date, assignment_id)
WHERE session_date IS NOT NULL;

-- Índice composto para o NOT EXISTS (verificação de agendamento)
CREATE INDEX IF NOT EXISTS idx_ss_orphan_check
ON scheduled_sessions(patient_id, therapist_id, scheduled_date, status);

-- Índice para filtrar por clínica (query mais comum)
CREATE INDEX IF NOT EXISTS idx_patients_clinic
ON patients(clinic_id);

-- Índice para terapeutas ativos por clínica
CREATE INDEX IF NOT EXISTS idx_users_clinic_role
ON users(clinic_id, role)
WHERE role = 'terapeuta';

-- ANÁLISE: Forçar PostgreSQL a coletar estatísticas para otimizador de consultas
ANALYZE patient_program_progress;
ANALYZE scheduled_sessions;
ANALYZE patient_program_assignments;
ANALYZE patients;
ANALYZE users;
