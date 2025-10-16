-- Migration: Correção de Duplicatas em Agendamentos Recorrentes
-- Data: 15/10/2025
-- Descrição: Corrige a função generate_recurring_appointments para evitar criação de duplicatas

-- ==========================================
-- SUBSTITUIR FUNÇÃO generate_recurring_appointments
-- ==========================================

CREATE OR REPLACE FUNCTION generate_recurring_appointments(
    template_id INTEGER,
    weeks_to_generate INTEGER DEFAULT NULL
) RETURNS TABLE(
    generated_date DATE,
    scheduled_time TIME,
    success BOOLEAN,
    conflict_reason TEXT
) AS $$
DECLARE
    template_record RECORD;
    start_date_calc DATE;
    target_date DATE;
    week_offset INTEGER;
    max_weeks INTEGER;
    conflict_exists BOOLEAN;
    day_diff INTEGER;
BEGIN
    -- Buscar template
    SELECT * INTO template_record
    FROM recurring_appointment_templates
    WHERE id = template_id AND is_active = true AND (is_paused = false OR paused_until < CURRENT_DATE);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template não encontrado ou inativo';
    END IF;

    max_weeks := COALESCE(weeks_to_generate, template_record.generate_weeks_ahead);
    start_date_calc := GREATEST(template_record.start_date, CURRENT_DATE::DATE);

    -- Gerar agendamentos por semanas
    FOR week_offset IN 0..max_weeks-1 LOOP
        -- Calcular data alvo baseada no tipo de recorrência
        CASE template_record.recurrence_type
            WHEN 'weekly' THEN
                -- Calcular próxima ocorrência do dia da semana
                day_diff := template_record.day_of_week - EXTRACT(dow FROM start_date_calc)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := start_date_calc + day_diff + (week_offset * 7);

            WHEN 'biweekly' THEN
                day_diff := template_record.day_of_week - EXTRACT(dow FROM start_date_calc)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := start_date_calc + day_diff + (week_offset * 14);

            WHEN 'monthly' THEN
                -- Para monthly, usar aproximação de 4 semanas
                day_diff := template_record.day_of_week - EXTRACT(dow FROM start_date_calc)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := start_date_calc + day_diff + (week_offset * 28);
        END CASE;

        -- Verificar se data está dentro do período válido
        IF template_record.end_date IS NOT NULL AND target_date > template_record.end_date THEN
            CONTINUE;
        END IF;

        -- ✅ CORREÇÃO: Verificar se já existe agendamento COM MESMA COMBINAÇÃO
        -- Não apenas mesmo paciente/terapeuta/data, mas também mesmo template_id e horário
        SELECT EXISTS(
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.patient_id = template_record.patient_id
            AND ss.therapist_id = template_record.therapist_id
            AND ss.scheduled_date = target_date
            AND ss.scheduled_time = template_record.scheduled_time
            AND (
                ss.recurring_template_id = template_id  -- Mesmo template
                OR ss.status IN ('scheduled', 'completed')  -- Ou outro agendamento ativo
            )
        ) INTO conflict_exists;

        IF NOT conflict_exists THEN
            -- Inserir agendamento
            INSERT INTO scheduled_sessions (
                patient_id, therapist_id, discipline_id,
                scheduled_date, scheduled_time, duration_minutes,
                status, created_by, recurring_template_id,
                is_auto_generated, is_retroactive, detection_source,
                notes
            ) VALUES (
                template_record.patient_id, template_record.therapist_id, template_record.discipline_id,
                target_date, template_record.scheduled_time, template_record.duration_minutes,
                'scheduled', template_record.created_by, template_id,
                true, false, 'recurring_template',
                'Agendamento gerado automaticamente pelo template #' || template_id
            );

            RETURN QUERY SELECT target_date, template_record.scheduled_time, true, NULL::TEXT;
        ELSE
            RETURN QUERY SELECT target_date, template_record.scheduled_time, false, 'Conflito: já existe agendamento para esta data/horário'::TEXT;
        END IF;
    END LOOP;

    -- Atualizar estatísticas do template
    UPDATE recurring_appointment_templates
    SET last_generation_date = NOW(),
        total_appointments_generated = (
            SELECT COUNT(*) FROM scheduled_sessions WHERE recurring_template_id = template_id
        )
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMENTÁRIO ATUALIZADO
-- ==========================================

COMMENT ON FUNCTION generate_recurring_appointments IS 'Gera agendamentos futuros baseados em template de recorrência - VERSÃO CORRIGIDA para evitar duplicatas';
