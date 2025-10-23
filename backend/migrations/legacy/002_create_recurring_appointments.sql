-- Migration 002: Sistema de Agendamentos Recorrentes
-- Data: Janeiro 2025
-- Descrição: Implementação completa do sistema de agendamentos recorrentes
-- Adaptado para estrutura atual (patient_id + therapist_id + discipline_id)

-- ==========================================
-- TABELA PRINCIPAL: TEMPLATES DE RECORRÊNCIA
-- ==========================================

-- Tabela principal para templates de recorrência
-- INTEGRADA COM ESTRUTURA EXISTENTE: patient_id + therapist_id + discipline_id
CREATE TABLE recurring_appointment_templates (
    id SERIAL PRIMARY KEY,

    -- Relacionamentos básicos (ESTRUTURA ATUAL)
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discipline_id INTEGER REFERENCES disciplines(id), -- Opcional: área específica ou sessão geral

    -- Configuração de recorrência
    recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('weekly', 'biweekly', 'monthly', 'custom')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 6=sábado
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,

    -- Período de validade
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = sem fim definido

    -- Configurações de geração
    generate_weeks_ahead INTEGER DEFAULT 4, -- Quantas semanas gerar antecipadamente

    -- Status e gestão de exceções
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false, -- NOVO: Pausar temporariamente
    paused_until DATE, -- NOVO: Data até quando está pausado
    pause_reason TEXT, -- NOVO: Motivo da pausa

    -- Tratamento de feriados
    skip_holidays BOOLEAN DEFAULT false, -- NOVO: Pular feriados automaticamente
    holiday_behavior VARCHAR(20) DEFAULT 'skip' CHECK (holiday_behavior IN ('skip', 'next_day', 'previous_day')),

    -- Metadados e auditoria
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Campos de auditoria
    deactivated_by INTEGER REFERENCES users(id),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason TEXT,

    -- Estatísticas de uso (para analytics)
    total_appointments_generated INTEGER DEFAULT 0,
    last_generation_date TIMESTAMP WITH TIME ZONE,

    -- Constraint para evitar duplicatas
    UNIQUE(patient_id, therapist_id, discipline_id, day_of_week, scheduled_time, recurrence_type)
);

-- ==========================================
-- MODIFICAÇÕES NA TABELA EXISTENTE
-- ==========================================

-- Adicionar referência ao template na tabela de agendamentos (NOVO)
ALTER TABLE scheduled_sessions
ADD COLUMN recurring_template_id INTEGER REFERENCES recurring_appointment_templates(id);

-- Adicionar flag para identificar agendamentos gerados automaticamente (NOVO)
ALTER TABLE scheduled_sessions
ADD COLUMN is_auto_generated BOOLEAN DEFAULT false;

-- CAMPOS JÁ EXISTENTES QUE SERÃO UTILIZADOS:
-- - is_retroactive: será FALSE para agendamentos recorrentes gerados prospectivamente
-- - detection_source: será 'recurring_template' para agendamentos gerados por template
-- - patient_id, therapist_id, discipline_id: estrutura base já existente
-- - missed_reason_type, missed_reason_description: para justificativas

-- Adicionar novos valores ao check constraint de detection_source
ALTER TABLE scheduled_sessions
DROP CONSTRAINT IF EXISTS scheduled_sessions_detection_source_check;

ALTER TABLE scheduled_sessions
ADD CONSTRAINT scheduled_sessions_detection_source_check
CHECK (detection_source IN ('manual', 'orphan_converted', 'auto_detected', 'recurring_template'));

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices essenciais para templates de recorrência
CREATE INDEX idx_recurring_templates_patient_therapist ON recurring_appointment_templates(patient_id, therapist_id);
CREATE INDEX idx_recurring_templates_active ON recurring_appointment_templates(is_active, is_paused, start_date, end_date);
CREATE INDEX idx_recurring_templates_day_time ON recurring_appointment_templates(day_of_week, scheduled_time);
CREATE INDEX idx_recurring_templates_generation ON recurring_appointment_templates(is_active, generate_weeks_ahead, last_generation_date);

-- Índices para agendamentos com template
CREATE INDEX idx_scheduled_sessions_template ON scheduled_sessions(recurring_template_id);
CREATE INDEX idx_scheduled_sessions_auto_generated ON scheduled_sessions(is_auto_generated, scheduled_date);
CREATE INDEX idx_scheduled_sessions_recurring_lookup ON scheduled_sessions(patient_id, therapist_id, scheduled_date)
WHERE recurring_template_id IS NOT NULL;

-- Índice composto para verificação de conflitos
CREATE INDEX idx_scheduled_sessions_conflict_check ON scheduled_sessions(therapist_id, scheduled_date, scheduled_time, status)
WHERE status IN ('scheduled', 'completed');

-- ==========================================
-- TRIGGERS E FUNÇÕES
-- ==========================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_recurring_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_templates_updated_at
    BEFORE UPDATE ON recurring_appointment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_templates_updated_at();

-- ==========================================
-- FUNÇÕES DE APOIO
-- ==========================================

-- Função para gerar próximos agendamentos de um template
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
    current_date DATE;
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
    current_date := GREATEST(template_record.start_date, CURRENT_DATE::DATE);

    -- Gerar agendamentos por semanas
    FOR week_offset IN 0..max_weeks-1 LOOP
        -- Calcular data alvo baseada no tipo de recorrência
        CASE template_record.recurrence_type
            WHEN 'weekly' THEN
                -- Calcular próxima ocorrência do dia da semana
                day_diff := template_record.day_of_week - EXTRACT(dow FROM current_date)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := current_date + day_diff + (week_offset * 7);

            WHEN 'biweekly' THEN
                day_diff := template_record.day_of_week - EXTRACT(dow FROM current_date)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := current_date + day_diff + (week_offset * 14);

            WHEN 'monthly' THEN
                -- Para monthly, usar aproximação de 4 semanas
                day_diff := template_record.day_of_week - EXTRACT(dow FROM current_date)::INTEGER;
                IF day_diff < 0 THEN
                    day_diff := day_diff + 7;
                END IF;
                target_date := current_date + day_diff + (week_offset * 28);
        END CASE;

        -- Verificar se data está dentro do período válido
        IF template_record.end_date IS NOT NULL AND target_date > template_record.end_date THEN
            CONTINUE;
        END IF;

        -- Verificar se já existe agendamento
        SELECT EXISTS(
            SELECT 1 FROM scheduled_sessions
            WHERE patient_id = template_record.patient_id
            AND therapist_id = template_record.therapist_id
            AND scheduled_date = target_date
            AND status IN ('scheduled', 'completed')
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
            RETURN QUERY SELECT target_date, template_record.scheduled_time, false, 'Conflito: já existe agendamento'::TEXT;
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

-- Função para pausar template
CREATE OR REPLACE FUNCTION pause_recurring_template(
    template_id INTEGER,
    pause_until DATE DEFAULT NULL,
    pause_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE recurring_appointment_templates
    SET is_paused = true,
        paused_until = pause_until,
        pause_reason = pause_reason,
        updated_at = NOW()
    WHERE id = template_id AND is_active = true;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para reativar template
CREATE OR REPLACE FUNCTION resume_recurring_template(
    template_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE recurring_appointment_templates
    SET is_paused = false,
        paused_until = NULL,
        pause_reason = NULL,
        updated_at = NOW()
    WHERE id = template_id AND is_active = true;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VIEW PARA CONSULTAS COMPLETAS
-- ==========================================

CREATE VIEW v_recurring_templates_complete AS
SELECT
    rat.*,
    p.name as patient_name,
    p.clinic_id,
    u.full_name as therapist_name,
    u.username as therapist_email,
    d.name as discipline_name,
    u_creator.full_name as created_by_name,
    u_deactivated.full_name as deactivated_by_name,

    -- Estatísticas dos agendamentos
    COUNT(ss.id) as total_appointments,
    COUNT(CASE WHEN ss.status = 'scheduled' THEN 1 END) as scheduled_appointments,
    COUNT(CASE WHEN ss.status = 'completed' THEN 1 END) as completed_appointments,
    COUNT(CASE WHEN ss.status = 'missed' THEN 1 END) as missed_appointments,
    COUNT(CASE WHEN ss.status = 'cancelled' THEN 1 END) as cancelled_appointments,

    -- Próximos 5 agendamentos
    ARRAY_AGG(
        ss.scheduled_date ORDER BY ss.scheduled_date
    ) FILTER (WHERE ss.scheduled_date > CURRENT_DATE AND ss.status = 'scheduled') as upcoming_dates,

    -- Status calculado
    CASE
        WHEN NOT rat.is_active THEN 'inactive'
        WHEN rat.is_paused AND (rat.paused_until IS NULL OR rat.paused_until > CURRENT_DATE) THEN 'paused'
        WHEN rat.end_date IS NOT NULL AND rat.end_date < CURRENT_DATE THEN 'expired'
        ELSE 'active'
    END as status_calculated

FROM recurring_appointment_templates rat
JOIN patients p ON rat.patient_id = p.id
JOIN users u ON rat.therapist_id = u.id
LEFT JOIN disciplines d ON rat.discipline_id = d.id
JOIN users u_creator ON rat.created_by = u_creator.id
LEFT JOIN users u_deactivated ON rat.deactivated_by = u_deactivated.id
LEFT JOIN scheduled_sessions ss ON rat.id = ss.recurring_template_id
GROUP BY
    rat.id, p.name, p.clinic_id, u.full_name, u.email, d.name,
    u_creator.full_name, u_deactivated.full_name;

-- ==========================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ==========================================

COMMENT ON TABLE recurring_appointment_templates IS 'Templates para agendamentos recorrentes - integrado com estrutura atual (patient_id + therapist_id + discipline_id)';
COMMENT ON COLUMN recurring_appointment_templates.recurrence_type IS 'Tipo: weekly, biweekly, monthly, custom';
COMMENT ON COLUMN recurring_appointment_templates.day_of_week IS '0=domingo, 1=segunda, ..., 6=sábado';
COMMENT ON COLUMN recurring_appointment_templates.generate_weeks_ahead IS 'Quantas semanas gerar antecipadamente';
COMMENT ON COLUMN recurring_appointment_templates.is_paused IS 'Pausar template temporariamente';
COMMENT ON COLUMN recurring_appointment_templates.skip_holidays IS 'Pular feriados automaticamente';
COMMENT ON VIEW v_recurring_templates_complete IS 'View completa dos templates com estatísticas e dados relacionados';

COMMENT ON FUNCTION generate_recurring_appointments IS 'Gera agendamentos futuros baseados em template de recorrência';
COMMENT ON FUNCTION pause_recurring_template IS 'Pausa template temporariamente';
COMMENT ON FUNCTION resume_recurring_template IS 'Reativa template pausado';