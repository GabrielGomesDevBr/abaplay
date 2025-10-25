-- ================================================================
-- MIGRATION 016: Atualização - Busca com Múltiplas Disciplinas
-- Data: Outubro 2025
-- Descrição: Permite selecionar múltiplas disciplinas na busca
-- ================================================================

CREATE OR REPLACE FUNCTION search_available_slots(
    p_clinic_id INTEGER,
    p_discipline_ids INTEGER[] DEFAULT NULL,  -- ALTERADO: Array em vez de INTEGER
    p_day_of_week INTEGER DEFAULT NULL,
    p_time_period VARCHAR DEFAULT 'all',
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT 60,
    p_require_specialty BOOLEAN DEFAULT false,
    p_preferred_therapist_id INTEGER DEFAULT NULL,
    p_patient_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
    therapist_id INTEGER,
    therapist_name VARCHAR,
    has_specialty BOOLEAN,
    is_preferred BOOLEAN,
    available_date DATE,
    available_time TIME,
    available_duration INTEGER,
    day_name VARCHAR,
    suggested_room_id INTEGER,
    suggested_room_name VARCHAR
) AS $$
DECLARE
    v_start_time TIME;
    v_end_time TIME;
    v_end_date DATE;
BEGIN
    -- Definir período do dia
    CASE p_time_period
        WHEN 'morning' THEN
            v_start_time := '06:00:00';
            v_end_time := '12:00:00';
        WHEN 'afternoon' THEN
            v_start_time := '12:00:00';
            v_end_time := '18:00:00';
        WHEN 'evening' THEN
            v_start_time := '18:00:00';
            v_end_time := '21:00:00';
        ELSE
            v_start_time := '06:00:00';
            v_end_time := '21:00:00';
    END CASE;

    -- Definir data final (padrão: 2 semanas)
    v_end_date := COALESCE(p_end_date, p_start_date + INTERVAL '14 days');

    RETURN QUERY
    WITH
    -- 1. Terapeutas elegíveis (com ou sem especialidade)
    eligible_therapists AS (
        SELECT
            u.id,
            u.full_name,
            u.max_daily_sessions,
            u.min_break_minutes,
            -- Verificar especialidade
            CASE
                -- ALTERADO: Se array for NULL ou vazio, busca todos
                WHEN p_discipline_ids IS NULL OR array_length(p_discipline_ids, 1) IS NULL THEN true
                -- ALTERADO: Se terapeuta tem especialidade em qualquer uma das disciplinas selecionadas
                WHEN ts.discipline_id = ANY(p_discipline_ids) THEN true
                -- Se não requer especialidade, aceita qualquer terapeuta
                WHEN p_require_specialty = false THEN true
                ELSE false
            END as has_spec,
            -- Verificar preferência
            CASE
                WHEN p_patient_id IS NOT NULL AND ptp.preference_type = 'preferred' THEN true
                WHEN p_preferred_therapist_id IS NOT NULL AND u.id = p_preferred_therapist_id THEN true
                ELSE false
            END as is_pref
        FROM users u
        LEFT JOIN therapist_specialties ts
            ON u.id = ts.therapist_id
            -- ALTERADO: Verificar se especialidade está no array
            AND (p_discipline_ids IS NULL OR ts.discipline_id = ANY(p_discipline_ids))
            AND ts.is_active = true
        LEFT JOIN patient_therapist_preferences ptp
            ON u.id = ptp.therapist_id
            AND ptp.patient_id = p_patient_id
        WHERE u.role = 'terapeuta'
        AND u.clinic_id = p_clinic_id
        AND (ptp.preference_type IS NULL OR ptp.preference_type != 'avoid') -- Não sugerir se é evitar
    ),

    -- 2. Datas a verificar
    dates_to_check AS (
        SELECT
            generate_series(p_start_date, v_end_date, '1 day'::INTERVAL)::DATE as check_date
    ),

    -- 3. Slots de tempo (intervalos de 30 min)
    -- Compatibilidade: gera números e converte para horários
    time_slots AS (
        SELECT
            (v_start_time + (n || ' minutes')::INTERVAL)::TIME as slot_time
        FROM generate_series(
            0,
            EXTRACT(EPOCH FROM (v_end_time - v_start_time - (p_duration_minutes || ' minutes')::INTERVAL)) / 60,
            30
        ) AS n
        WHERE (v_start_time + (n || ' minutes')::INTERVAL)::TIME <= v_end_time - (p_duration_minutes || ' minutes')::INTERVAL
    ),

    -- 4. Combinar terapeutas x datas x horários
    potential_slots AS (
        SELECT
            et.id as therapist_id,
            et.full_name as therapist_name,
            et.has_spec,
            et.is_pref,
            dtc.check_date,
            ts.slot_time,
            EXTRACT(DOW FROM dtc.check_date)::INTEGER as day_of_week,
            TO_CHAR(dtc.check_date, 'TMDay')::VARCHAR as day_name
        FROM eligible_therapists et
        CROSS JOIN dates_to_check dtc
        CROSS JOIN time_slots ts
        WHERE et.has_spec = true -- Apenas se tem especialidade (ou não importa)
        AND (p_day_of_week IS NULL OR EXTRACT(DOW FROM dtc.check_date) = p_day_of_week)
    ),

    -- 5. Filtrar por disponibilidade padrão do terapeuta
    within_working_hours AS (
        SELECT ps.*
        FROM potential_slots ps
        WHERE
            -- Se não tem horário definido, assume disponível
            NOT EXISTS (
                SELECT 1 FROM therapist_availability_template tat
                WHERE tat.therapist_id = ps.therapist_id
                AND tat.is_active = true
            )
            OR
            -- Se tem horário, verificar se está dentro
            EXISTS (
                SELECT 1 FROM therapist_availability_template tat
                WHERE tat.therapist_id = ps.therapist_id
                AND tat.day_of_week = ps.day_of_week
                AND tat.is_active = true
                AND ps.slot_time >= tat.start_time
                AND ps.slot_time + (p_duration_minutes || ' minutes')::INTERVAL <= tat.end_time
            )
    ),

    -- 6. Filtrar ausências
    without_absences AS (
        SELECT ww.*
        FROM within_working_hours ww
        WHERE NOT EXISTS (
            SELECT 1 FROM therapist_absences ta
            WHERE ta.therapist_id = ww.therapist_id
            AND ww.check_date BETWEEN ta.start_date AND ta.end_date
            AND (
                -- Ausência dia inteiro
                (ta.start_time IS NULL AND ta.end_time IS NULL)
                OR
                -- Ausência parcial
                (
                    ta.start_time IS NOT NULL
                    AND ta.end_time IS NOT NULL
                    AND ww.slot_time >= ta.start_time
                    AND ww.slot_time < ta.end_time
                )
            )
        )
    ),

    -- 7. Filtrar conflitos de agendamento
    without_conflicts AS (
        SELECT wa.*
        FROM without_absences wa
        WHERE NOT EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.therapist_id = wa.therapist_id
            AND ss.scheduled_date = wa.check_date
            AND ss.status IN ('scheduled', 'completed')
            AND (
                -- Verificar sobreposição
                (ss.scheduled_time < wa.slot_time + (p_duration_minutes || ' minutes')::INTERVAL)
                AND
                ((ss.scheduled_time + (ss.duration_minutes || ' minutes')::INTERVAL) > wa.slot_time)
            )
        )
    ),

    -- 8. Verificar limite de sessões do dia
    within_capacity AS (
        SELECT wc.*
        FROM without_conflicts wc
        LEFT JOIN users u ON wc.therapist_id = u.id
        WHERE
            -- Sem limite ou dentro do limite
            u.max_daily_sessions IS NULL
            OR
            (
                SELECT COUNT(*)
                FROM scheduled_sessions ss
                WHERE ss.therapist_id = wc.therapist_id
                AND ss.scheduled_date = wc.check_date
                AND ss.status IN ('scheduled', 'completed')
            ) < u.max_daily_sessions
    ),

    -- 9. Calcular tempo disponível até próximo agendamento
    with_duration AS (
        SELECT
            wc.*,
            COALESCE(
                EXTRACT(EPOCH FROM (
                    (
                        SELECT MIN(ss.scheduled_time)
                        FROM scheduled_sessions ss
                        WHERE ss.therapist_id = wc.therapist_id
                        AND ss.scheduled_date = wc.check_date
                        AND ss.scheduled_time > wc.slot_time
                        AND ss.status IN ('scheduled', 'completed')
                    ) - wc.slot_time
                )) / 60,
                180 -- Default: 3 horas disponíveis
            )::INTEGER as available_duration_minutes
        FROM within_capacity wc
    ),

    -- 10. Sugerir sala disponível
    with_room AS (
        SELECT
            wd.*,
            cr.id as room_id,
            cr.name as room_name
        FROM with_duration wd
        LEFT JOIN LATERAL (
            SELECT cr2.id, cr2.name
            FROM clinic_rooms cr2
            WHERE cr2.clinic_id = p_clinic_id
            AND cr2.is_active = true
            -- Sala está livre no horário
            AND NOT EXISTS (
                SELECT 1 FROM scheduled_sessions ss
                WHERE ss.room_id = cr2.id
                AND ss.scheduled_date = wd.check_date
                AND ss.status IN ('scheduled', 'completed')
                AND (
                    (ss.scheduled_time < wd.slot_time + (p_duration_minutes || ' minutes')::INTERVAL)
                    AND
                    ((ss.scheduled_time + (ss.duration_minutes || ' minutes')::INTERVAL) > wd.slot_time)
                )
            )
            ORDER BY cr2.display_order, cr2.id
            LIMIT 1
        ) cr ON true
    )

    -- Resultado final
    SELECT
        wr.therapist_id,
        wr.therapist_name,
        wr.has_spec,
        wr.is_pref,
        wr.check_date,
        wr.slot_time,
        LEAST(wr.available_duration_minutes, 180) as available_duration, -- Max 3h
        wr.day_name,
        wr.room_id,
        wr.room_name
    FROM with_room wr
    WHERE wr.available_duration_minutes >= p_duration_minutes -- Tempo suficiente
    ORDER BY
        wr.is_pref DESC,              -- Preferidos primeiro
        wr.has_spec DESC,              -- Especialistas primeiro
        wr.check_date ASC,             -- Data mais próxima primeiro
        wr.slot_time ASC,              -- Horário mais cedo primeiro
        wr.therapist_name ASC          -- Nome alfabético
    LIMIT 100; -- Limitar resultados

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_available_slots IS
'Busca horários disponíveis considerando:
- MÚLTIPLAS disciplinas (array de IDs)
- Especialidades dos terapeutas em qualquer das disciplinas selecionadas
- Horários de trabalho padrão
- Ausências/férias
- Conflitos de agendamento
- Limite de sessões por dia
- Disponibilidade de salas
- Preferências de pacientes

EXEMPLOS DE USO:
- Todas as disciplinas: p_discipline_ids = NULL
- Uma disciplina: p_discipline_ids = ARRAY[1]
- Múltiplas: p_discipline_ids = ARRAY[1, 2, 4]';
