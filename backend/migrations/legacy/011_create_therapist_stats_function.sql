-- ================================================================
-- MIGRATION 011: Função SQL de Estatísticas do Terapeuta
-- Data: Janeiro 2025
-- Descrição: Cria função get_therapist_schedule_stats que estava faltando
-- Adiciona métricas de horas trabalhadas e relatórios de disponibilidade
-- ================================================================

-- ================================================================
-- 1. FUNÇÃO PRINCIPAL: get_therapist_schedule_stats
-- ================================================================

-- Drop função anterior se existir (pode ter assinatura diferente)
DROP FUNCTION IF EXISTS get_therapist_schedule_stats(INTEGER, DATE, DATE);

CREATE OR REPLACE FUNCTION get_therapist_schedule_stats(
    p_therapist_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_scheduled BIGINT,
    total_completed BIGINT,
    total_missed BIGINT,
    total_cancelled BIGINT,
    completion_rate NUMERIC(5,2),
    attendance_rate NUMERIC(5,2),
    total_hours_worked NUMERIC(10,2),
    total_sessions_duration BIGINT,
    avg_session_duration NUMERIC(6,2)
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Definir período padrão se não fornecido (último mês)
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    RETURN QUERY
    SELECT
        -- Contadores básicos
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed', 'missed', 'cancelled')) as total_scheduled,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'missed') as total_missed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,

        -- Taxa de completude (completed / total)
        CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed', 'missed', 'cancelled')) > 0
            THEN ROUND(
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
                COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed', 'missed', 'cancelled'))::NUMERIC) * 100,
                2
            )
            ELSE 0
        END as completion_rate,

        -- Taxa de presença (completed / (total - cancelled))
        CASE
            WHEN (COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed', 'missed')) > 0)
            THEN ROUND(
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
                COUNT(*) FILTER (WHERE status IN ('scheduled', 'completed', 'missed'))::NUMERIC) * 100,
                2
            )
            ELSE 0
        END as attendance_rate,

        -- === NOVAS MÉTRICAS: Horas Trabalhadas ===

        -- Total de horas trabalhadas (soma de duration_minutes / 60)
        ROUND(
            COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) / 60.0,
            2
        ) as total_hours_worked,

        -- Total de minutos de sessões completadas
        COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) as total_sessions_duration,

        -- Duração média das sessões completadas
        ROUND(
            COALESCE(AVG(duration_minutes) FILTER (WHERE status = 'completed'), 0),
            2
        ) as avg_session_duration

    FROM scheduled_sessions
    WHERE therapist_id = p_therapist_id
      AND scheduled_date BETWEEN v_start_date AND v_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_therapist_schedule_stats IS
'Retorna estatísticas completas de agendamentos de um terapeuta incluindo horas trabalhadas';

-- ================================================================
-- 2. FUNÇÃO: get_therapist_availability_stats
-- Nova função para calcular taxa de utilização da agenda
-- ================================================================

CREATE OR REPLACE FUNCTION get_therapist_availability_stats(
    p_therapist_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_available_hours NUMERIC(10,2),
    total_scheduled_hours NUMERIC(10,2),
    total_worked_hours NUMERIC(10,2),
    utilization_rate NUMERIC(5,2),
    total_absence_days INTEGER,
    total_absences INTEGER
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_total_days INTEGER;
    v_available_hours NUMERIC(10,2);
    v_scheduled_hours NUMERIC(10,2);
    v_worked_hours NUMERIC(10,2);
    v_absence_days INTEGER;
    v_total_absences INTEGER;
BEGIN
    -- Definir período padrão se não fornecido (último mês)
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    -- Calcular total de dias no período
    v_total_days := (v_end_date - v_start_date) + 1;

    -- === CALCULAR HORAS DISPONÍVEIS ===
    -- Baseado em therapist_availability_template

    SELECT COALESCE(SUM(
        -- Para cada dia da semana com template definido
        EXTRACT(EPOCH FROM (tat.end_time - tat.start_time)) / 3600.0 *
        -- Multiplicar pelo número de ocorrências desse dia no período
        (
            SELECT COUNT(*)
            FROM generate_series(v_start_date, v_end_date, '1 day'::INTERVAL) AS day_series
            WHERE EXTRACT(DOW FROM day_series) = tat.day_of_week
        )
    ), 0)
    INTO v_available_hours
    FROM therapist_availability_template tat
    WHERE tat.therapist_id = p_therapist_id
      AND tat.is_active = true;

    -- Se não há template definido, assumir 06:00-21:00 (15h/dia)
    IF v_available_hours = 0 THEN
        v_available_hours := v_total_days * 15.0;
    END IF;

    -- === SUBTRAIR AUSÊNCIAS ===
    -- Reduzir horas disponíveis pelas ausências aprovadas

    SELECT
        COALESCE(SUM(
            CASE
                -- Ausência de dia inteiro
                WHEN ta.start_time IS NULL THEN
                    ((ta.end_date - ta.start_date) + 1) * 15.0
                -- Ausência parcial (com horário)
                ELSE
                    EXTRACT(EPOCH FROM (ta.end_time - ta.start_time)) / 3600.0 *
                    ((ta.end_date - ta.start_date) + 1)
            END
        ), 0),
        COUNT(*)
    INTO v_absence_days, v_total_absences
    FROM therapist_absences ta
    WHERE ta.therapist_id = p_therapist_id
      AND ta.status = 'approved'
      AND ta.start_date <= v_end_date
      AND ta.end_date >= v_start_date;

    -- Ajustar horas disponíveis
    v_available_hours := GREATEST(v_available_hours - v_absence_days, 0);

    -- === CALCULAR HORAS AGENDADAS E TRABALHADAS ===

    SELECT
        ROUND(COALESCE(SUM(duration_minutes) FILTER (WHERE status IN ('scheduled', 'completed', 'missed')), 0) / 60.0, 2),
        ROUND(COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) / 60.0, 2)
    INTO v_scheduled_hours, v_worked_hours
    FROM scheduled_sessions
    WHERE therapist_id = p_therapist_id
      AND scheduled_date BETWEEN v_start_date AND v_end_date;

    -- === RETORNAR RESULTADOS ===

    RETURN QUERY
    SELECT
        ROUND(v_available_hours, 2) as total_available_hours,
        v_scheduled_hours as total_scheduled_hours,
        v_worked_hours as total_worked_hours,
        -- Taxa de utilização (horas agendadas / horas disponíveis)
        CASE
            WHEN v_available_hours > 0
            THEN ROUND((v_scheduled_hours / v_available_hours) * 100, 2)
            ELSE 0
        END as utilization_rate,
        v_absence_days::INTEGER as total_absence_days,
        v_total_absences::INTEGER as total_absences;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_therapist_availability_stats IS
'Calcula taxa de utilização da agenda do terapeuta baseado em disponibilidade e ausências';

-- ================================================================
-- 3. FUNÇÃO: get_absence_report
-- Relatório de ausências por período e tipo
-- ================================================================

CREATE OR REPLACE FUNCTION get_absence_report(
    p_therapist_id INTEGER DEFAULT NULL,
    p_clinic_id INTEGER DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    therapist_id INTEGER,
    therapist_name VARCHAR,
    absence_type VARCHAR,
    total_absences BIGINT,
    total_days INTEGER,
    pending_absences BIGINT,
    approved_absences BIGINT,
    rejected_absences BIGINT
) AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Definir período padrão se não fornecido (último mês)
    v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, CURRENT_DATE);

    RETURN QUERY
    SELECT
        ta.therapist_id,
        u.full_name as therapist_name,
        ta.absence_type,
        COUNT(*) as total_absences,
        SUM(((ta.end_date - ta.start_date) + 1))::INTEGER as total_days,
        COUNT(*) FILTER (WHERE ta.status = 'pending') as pending_absences,
        COUNT(*) FILTER (WHERE ta.status = 'approved') as approved_absences,
        COUNT(*) FILTER (WHERE ta.status = 'rejected') as rejected_absences
    FROM therapist_absences ta
    INNER JOIN users u ON u.id = ta.therapist_id
    WHERE ta.start_date <= v_end_date
      AND ta.end_date >= v_start_date
      AND (p_therapist_id IS NULL OR ta.therapist_id = p_therapist_id)
      AND (p_clinic_id IS NULL OR u.clinic_id = p_clinic_id)
    GROUP BY ta.therapist_id, u.full_name, ta.absence_type
    ORDER BY ta.therapist_id, ta.absence_type;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_absence_report IS
'Retorna relatório consolidado de ausências por terapeuta e tipo';

-- ================================================================
-- FIM DA MIGRATION 011
-- ================================================================
