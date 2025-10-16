-- ==========================================
-- Migration 008: Funções para Migração entre Planos
-- Data: 2025-10
-- Objetivo: Permitir migração automática de dados entre plano Agendamento e Pro
-- ==========================================

-- 1. Função para migrar notas do plano Agendamento para patient_program_progress
-- Quando uma clínica migra de Agendamento → Pro, as notas do scheduled_sessions
-- devem ser transferidas para patient_program_progress (registro detalhado)

CREATE OR REPLACE FUNCTION migrate_scheduling_notes_to_pro(
    p_clinic_id INTEGER
)
RETURNS TABLE(
    migrated_count INTEGER,
    sessions_processed INTEGER,
    message TEXT
) AS $$
DECLARE
    v_migrated_count INTEGER := 0;
    v_sessions_processed INTEGER := 0;
    v_session RECORD;
BEGIN
    -- Buscar todas as sessões completadas com notas do plano Agendamento
    FOR v_session IN
        SELECT
            ss.id as session_id,
            ss.patient_id,
            ss.therapist_id,
            ss.scheduled_date as session_date,
            ss.notes,
            ss.created_at
        FROM scheduled_sessions ss
        JOIN patients p ON ss.patient_id = p.id
        WHERE p.clinic_id = p_clinic_id
          AND ss.status = 'completed'
          AND ss.notes IS NOT NULL
          AND ss.notes != ''
          -- Sessões que ainda não foram migradas (sem progress_session_id)
          AND ss.progress_session_id IS NULL
        ORDER BY ss.scheduled_date ASC
    LOOP
        v_sessions_processed := v_sessions_processed + 1;

        -- Verificar se já existe algum assignment ativo para este paciente/terapeuta
        -- Se não existir, criar um assignment genérico
        IF NOT EXISTS (
            SELECT 1 FROM patient_program_assignments ppa
            WHERE ppa.patient_id = v_session.patient_id
              AND ppa.therapist_id = v_session.therapist_id
              AND ppa.status = 'active'
        ) THEN
            -- Criar assignment genérico (sessão geral sem programa específico)
            INSERT INTO patient_program_assignments (
                patient_id,
                therapist_id,
                program_id,
                assigned_by,
                status,
                created_at
            )
            SELECT
                v_session.patient_id,
                v_session.therapist_id,
                NULL, -- Sessão geral (sem programa)
                v_session.therapist_id, -- Assumir que foi o terapeuta que criou
                'active',
                v_session.created_at
            WHERE NOT EXISTS (
                SELECT 1 FROM patient_program_assignments
                WHERE patient_id = v_session.patient_id
                  AND therapist_id = v_session.therapist_id
                  AND program_id IS NULL
                  AND status = 'active'
            );
        END IF;

        -- Criar entrada no patient_program_progress com as notas
        -- Usar assignment genérico ou o primeiro disponível
        INSERT INTO patient_program_progress (
            assignment_id,
            session_date,
            notes,
            created_at,
            updated_at
        )
        SELECT
            ppa.id,
            v_session.session_date,
            v_session.notes,
            v_session.created_at,
            NOW()
        FROM patient_program_assignments ppa
        WHERE ppa.patient_id = v_session.patient_id
          AND ppa.therapist_id = v_session.therapist_id
          AND ppa.status = 'active'
        ORDER BY
            CASE WHEN ppa.program_id IS NULL THEN 0 ELSE 1 END, -- Preferir assignment genérico
            ppa.created_at ASC
        LIMIT 1
        ON CONFLICT DO NOTHING; -- Ignorar se já existe

        -- Verificar se foi inserido com sucesso
        IF FOUND THEN
            v_migrated_count := v_migrated_count + 1;

            -- Marcar sessão como migrada linkando ao progress criado
            UPDATE scheduled_sessions
            SET progress_session_id = (
                SELECT id FROM patient_program_progress
                WHERE assignment_id IN (
                    SELECT id FROM patient_program_assignments
                    WHERE patient_id = v_session.patient_id
                      AND therapist_id = v_session.therapist_id
                      AND status = 'active'
                )
                AND session_date = v_session.session_date
                AND notes = v_session.notes
                ORDER BY created_at DESC
                LIMIT 1
            )
            WHERE id = v_session.session_id;
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        v_migrated_count,
        v_sessions_processed,
        format('Migração concluída: %s de %s sessões migradas', v_migrated_count, v_sessions_processed);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_scheduling_notes_to_pro IS
  'Migra notas de scheduled_sessions para patient_program_progress quando clínica muda de Agendamento → Pro';

-- 2. Função reversa: Consolidar notas do Pro para Agendamento (downgrade)
-- Quando uma clínica volta de Pro → Agendamento, consolidar dados de patient_program_progress
-- de volta para scheduled_sessions

CREATE OR REPLACE FUNCTION migrate_pro_notes_to_scheduling(
    p_clinic_id INTEGER
)
RETURNS TABLE(
    migrated_count INTEGER,
    sessions_processed INTEGER,
    message TEXT
) AS $$
DECLARE
    v_migrated_count INTEGER := 0;
    v_sessions_processed INTEGER := 0;
    v_progress RECORD;
BEGIN
    -- Buscar todos os registros de progresso sem agendamento correspondente
    FOR v_progress IN
        SELECT
            ppp.id as progress_id,
            ppp.session_date,
            ppp.notes,
            ppp.created_at,
            ppa.patient_id,
            ppa.therapist_id
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        JOIN patients p ON ppa.patient_id = p.id
        WHERE p.clinic_id = p_clinic_id
          AND ppp.notes IS NOT NULL
          AND ppp.notes != ''
          -- Apenas registros que ainda não têm agendamento correspondente
          AND NOT EXISTS (
              SELECT 1 FROM scheduled_sessions ss
              WHERE ss.patient_id = ppa.patient_id
                AND ss.therapist_id = ppa.therapist_id
                AND ss.scheduled_date = ppp.session_date
                AND ss.progress_session_id = ppp.id
          )
        ORDER BY ppp.session_date ASC
    LOOP
        v_sessions_processed := v_sessions_processed + 1;

        -- Criar agendamento retroativo com as notas consolidadas
        INSERT INTO scheduled_sessions (
            patient_id,
            therapist_id,
            discipline_id,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            status,
            notes,
            detection_source,
            is_retroactive,
            progress_session_id,
            created_at,
            updated_at
        )
        VALUES (
            v_progress.patient_id,
            v_progress.therapist_id,
            NULL, -- Sem disciplina específica (sessão geral)
            v_progress.session_date,
            '10:00', -- Horário padrão
            60, -- Duração padrão
            'completed',
            v_progress.notes,
            'plan_downgrade_migration',
            true,
            v_progress.progress_id,
            v_progress.created_at,
            NOW()
        )
        ON CONFLICT DO NOTHING;

        IF FOUND THEN
            v_migrated_count := v_migrated_count + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        v_migrated_count,
        v_sessions_processed,
        format('Migração reversa concluída: %s de %s sessões migradas', v_migrated_count, v_sessions_processed);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_pro_notes_to_scheduling IS
  'Migra notas de patient_program_progress para scheduled_sessions quando clínica muda de Pro → Agendamento';

-- 3. View para visualizar o status de migração de uma clínica

CREATE OR REPLACE VIEW v_clinic_migration_status AS
SELECT
    c.id as clinic_id,
    c.name as clinic_name,
    c.subscription_plan,
    -- Contar sessões no scheduled_sessions
    COALESCE(
        (SELECT COUNT(*) FROM scheduled_sessions ss
         JOIN patients p ON ss.patient_id = p.id
         WHERE p.clinic_id = c.id AND ss.status = 'completed'),
        0
    ) as total_scheduled_sessions,
    -- Contar sessões no scheduled_sessions COM notas
    COALESCE(
        (SELECT COUNT(*) FROM scheduled_sessions ss
         JOIN patients p ON ss.patient_id = p.id
         WHERE p.clinic_id = c.id
           AND ss.status = 'completed'
           AND ss.notes IS NOT NULL
           AND ss.notes != ''),
        0
    ) as scheduled_sessions_with_notes,
    -- Contar sessões no scheduled_sessions SEM link para progress
    COALESCE(
        (SELECT COUNT(*) FROM scheduled_sessions ss
         JOIN patients p ON ss.patient_id = p.id
         WHERE p.clinic_id = c.id
           AND ss.status = 'completed'
           AND ss.notes IS NOT NULL
           AND ss.notes != ''
           AND ss.progress_session_id IS NULL),
        0
    ) as unmigrated_scheduling_notes,
    -- Contar registros de progresso
    COALESCE(
        (SELECT COUNT(*) FROM patient_program_progress ppp
         JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
         JOIN patients p ON ppa.patient_id = p.id
         WHERE p.clinic_id = c.id),
        0
    ) as total_progress_records,
    -- Contar registros de progresso SEM agendamento correspondente
    COALESCE(
        (SELECT COUNT(*) FROM patient_program_progress ppp
         JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
         JOIN patients p ON ppa.patient_id = p.id
         WHERE p.clinic_id = c.id
           AND ppp.notes IS NOT NULL
           AND ppp.notes != ''
           AND NOT EXISTS (
               SELECT 1 FROM scheduled_sessions ss
               WHERE ss.progress_session_id = ppp.id
           )),
        0
    ) as unmigrated_pro_notes
FROM clinics c;

COMMENT ON VIEW v_clinic_migration_status IS
  'Visualiza o status de migração de dados entre planos para cada clínica';

-- 4. Trigger automático para migrar ao mudar subscription_plan

CREATE OR REPLACE FUNCTION auto_migrate_on_plan_change()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Se mudou de 'scheduling' → 'pro'
    IF OLD.subscription_plan = 'scheduling' AND NEW.subscription_plan = 'pro' THEN
        -- Migrar notas de scheduled_sessions para patient_program_progress
        SELECT * INTO v_result FROM migrate_scheduling_notes_to_pro(NEW.id);

        RAISE NOTICE 'Auto-migração Agendamento → Pro: %', v_result.message;
    END IF;

    -- Se mudou de 'pro' → 'scheduling'
    IF OLD.subscription_plan = 'pro' AND NEW.subscription_plan = 'scheduling' THEN
        -- Migrar notas de patient_program_progress para scheduled_sessions
        SELECT * INTO v_result FROM migrate_pro_notes_to_scheduling(NEW.id);

        RAISE NOTICE 'Auto-migração Pro → Agendamento: %', v_result.message;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_migrate_on_plan_change
    AFTER UPDATE OF subscription_plan ON clinics
    FOR EACH ROW
    WHEN (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan)
    EXECUTE FUNCTION auto_migrate_on_plan_change();

COMMENT ON TRIGGER trigger_auto_migrate_on_plan_change ON clinics IS
  'Migra dados automaticamente quando subscription_plan é alterado';

-- 5. Função helper para testar migração sem efeitos colaterais

CREATE OR REPLACE FUNCTION preview_migration(
    p_clinic_id INTEGER,
    p_direction VARCHAR(20) -- 'to_pro' ou 'to_scheduling'
)
RETURNS TABLE(
    session_date DATE,
    patient_name VARCHAR,
    therapist_name VARCHAR,
    notes_preview TEXT,
    would_migrate BOOLEAN
) AS $$
BEGIN
    IF p_direction = 'to_pro' THEN
        RETURN QUERY
        SELECT
            ss.scheduled_date,
            p.name,
            u.full_name,
            LEFT(ss.notes, 100) || '...',
            true
        FROM scheduled_sessions ss
        JOIN patients p ON ss.patient_id = p.id
        JOIN users u ON ss.therapist_id = u.id
        WHERE p.clinic_id = p_clinic_id
          AND ss.status = 'completed'
          AND ss.notes IS NOT NULL
          AND ss.notes != ''
          AND ss.progress_session_id IS NULL
        ORDER BY ss.scheduled_date DESC;
    ELSE
        RETURN QUERY
        SELECT
            ppp.session_date,
            p.name,
            u.full_name,
            LEFT(ppp.notes, 100) || '...',
            true
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        JOIN patients p ON ppa.patient_id = p.id
        JOIN users u ON ppa.therapist_id = u.id
        WHERE p.clinic_id = p_clinic_id
          AND ppp.notes IS NOT NULL
          AND ppp.notes != ''
          AND NOT EXISTS (
              SELECT 1 FROM scheduled_sessions ss
              WHERE ss.progress_session_id = ppp.id
          )
        ORDER BY ppp.session_date DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION preview_migration IS
  'Visualiza quais dados seriam migrados sem executar a migração (para testes)';
