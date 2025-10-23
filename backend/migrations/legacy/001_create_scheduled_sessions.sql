-- Migration 001: Criar tabela scheduled_sessions
-- Data: 26/09/2025
-- Descrição: Implementação do sistema de agendamento - Fase 1 MVP

-- Criar tabela principal de agendamentos
CREATE TABLE scheduled_sessions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES patient_program_assignments(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),

    -- Rastreabilidade
    created_by INTEGER NOT NULL REFERENCES users(id), -- Admin que criou
    progress_session_id INTEGER REFERENCES patient_program_progress(id), -- Sessão realizada vinculada

    -- Justificativas (MVP básico)
    missed_reason TEXT,
    missed_by VARCHAR(20) CHECK (missed_by IN ('patient', 'therapist', 'both', 'other')),
    justified_by INTEGER REFERENCES users(id), -- Quem justificou
    justified_at TIMESTAMP WITH TIME ZONE,

    -- Metadados
    notes TEXT, -- Observações do agendamento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance otimizada
CREATE INDEX idx_scheduled_sessions_assignment ON scheduled_sessions(assignment_id);
CREATE INDEX idx_scheduled_sessions_date_time ON scheduled_sessions(scheduled_date, scheduled_time);
CREATE INDEX idx_scheduled_sessions_status ON scheduled_sessions(status);
CREATE INDEX idx_scheduled_sessions_therapist_date ON scheduled_sessions(assignment_id, scheduled_date);
CREATE INDEX idx_scheduled_sessions_created_by ON scheduled_sessions(created_by);

-- Índice composto para busca por período e terapeuta
CREATE INDEX idx_scheduled_sessions_therapist_period ON scheduled_sessions(assignment_id, scheduled_date, status);

-- Comentários para documentação
COMMENT ON TABLE scheduled_sessions IS 'Tabela de agendamentos de sessões terapêuticas';
COMMENT ON COLUMN scheduled_sessions.assignment_id IS 'Referência à atribuição paciente-programa-terapeuta';
COMMENT ON COLUMN scheduled_sessions.scheduled_date IS 'Data do agendamento';
COMMENT ON COLUMN scheduled_sessions.scheduled_time IS 'Horário do agendamento';
COMMENT ON COLUMN scheduled_sessions.duration_minutes IS 'Duração em minutos (padrão: 60min)';
COMMENT ON COLUMN scheduled_sessions.status IS 'Status: scheduled, completed, missed, cancelled';
COMMENT ON COLUMN scheduled_sessions.created_by IS 'Usuário admin que criou o agendamento';
COMMENT ON COLUMN scheduled_sessions.progress_session_id IS 'Link para sessão realizada (quando completed)';
COMMENT ON COLUMN scheduled_sessions.missed_reason IS 'Justificativa para não comparecimento';
COMMENT ON COLUMN scheduled_sessions.missed_by IS 'Quem faltou: patient, therapist, both, other';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_scheduled_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_sessions_updated_at
    BEFORE UPDATE ON scheduled_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_sessions_updated_at();

-- Função para verificar conflitos de agendamento
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_assignment_id INTEGER,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_duration_minutes INTEGER DEFAULT 60,
    p_exclude_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
    end_time TIME;
BEGIN
    -- Calcular horário de fim
    end_time := p_scheduled_time + (p_duration_minutes || ' minutes')::INTERVAL;

    -- Buscar conflitos (mesmo terapeuta, mesmo dia, horários sobrepostos)
    SELECT COUNT(*) INTO conflict_count
    FROM scheduled_sessions ss
    JOIN patient_program_assignments ppa ON ss.assignment_id = ppa.id
    JOIN patient_program_assignments ppa2 ON ppa2.id = p_assignment_id
    WHERE ss.scheduled_date = p_scheduled_date
      AND ppa.therapist_id = ppa2.therapist_id
      AND ss.status IN ('scheduled', 'completed') -- Não considerar cancelados/perdidos
      AND (p_exclude_id IS NULL OR ss.id != p_exclude_id)
      AND (
          -- Verifica sobreposição de horários
          (ss.scheduled_time < end_time) AND
          ((ss.scheduled_time + (ss.duration_minutes || ' minutes')::INTERVAL) > p_scheduled_time)
      );

    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Constraint para evitar agendamentos duplicados no mesmo horário para o mesmo assignment
CREATE UNIQUE INDEX idx_scheduled_sessions_unique_assignment_datetime
ON scheduled_sessions(assignment_id, scheduled_date, scheduled_time)
WHERE status IN ('scheduled', 'completed');

-- View para facilitar consultas com dados completos
CREATE VIEW v_scheduled_sessions_complete AS
SELECT
    ss.*,
    ppa.patient_id,
    ppa.program_id,
    ppa.therapist_id,
    p.name as patient_name,
    prog.name as program_name,
    u_therapist.full_name as therapist_name,
    u_creator.full_name as created_by_name,
    u_justified.full_name as justified_by_name,
    ppp.session_date as actual_session_date,
    ppp.score as session_score,
    -- Calcular duração real se sessão foi realizada
    CASE
        WHEN ss.progress_session_id IS NOT NULL THEN
            EXTRACT(EPOCH FROM (ppp.created_at::TIME - ss.scheduled_time))/60
        ELSE NULL
    END as duration_difference_minutes
FROM scheduled_sessions ss
JOIN patient_program_assignments ppa ON ss.assignment_id = ppa.id
JOIN patients p ON ppa.patient_id = p.id
JOIN programs prog ON ppa.program_id = prog.id
JOIN users u_therapist ON ppa.therapist_id = u_therapist.id
JOIN users u_creator ON ss.created_by = u_creator.id
LEFT JOIN users u_justified ON ss.justified_by = u_justified.id
LEFT JOIN patient_program_progress ppp ON ss.progress_session_id = ppp.id;

COMMENT ON VIEW v_scheduled_sessions_complete IS 'View completa com dados de agendamentos e relacionamentos';

-- Criar função para estatísticas básicas por terapeuta
CREATE OR REPLACE FUNCTION get_therapist_appointment_stats(
    p_therapist_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    total_scheduled INTEGER,
    total_completed INTEGER,
    total_missed INTEGER,
    total_cancelled INTEGER,
    completion_rate DECIMAL(5,2),
    attendance_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_scheduled,
        COUNT(CASE WHEN ss.status = 'completed' THEN 1 END)::INTEGER as total_completed,
        COUNT(CASE WHEN ss.status = 'missed' THEN 1 END)::INTEGER as total_missed,
        COUNT(CASE WHEN ss.status = 'cancelled' THEN 1 END)::INTEGER as total_cancelled,
        CASE
            WHEN COUNT(*) > 0 THEN
                ROUND((COUNT(CASE WHEN ss.status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL(5,2)
        END as completion_rate,
        CASE
            WHEN (COUNT(*) - COUNT(CASE WHEN ss.status = 'cancelled' THEN 1 END)) > 0 THEN
                ROUND((COUNT(CASE WHEN ss.status = 'completed' THEN 1 END)::DECIMAL /
                      (COUNT(*) - COUNT(CASE WHEN ss.status = 'cancelled' THEN 1 END))::DECIMAL) * 100, 2)
            ELSE 0::DECIMAL(5,2)
        END as attendance_rate
    FROM scheduled_sessions ss
    JOIN patient_program_assignments ppa ON ss.assignment_id = ppa.id
    WHERE ppa.therapist_id = p_therapist_id
      AND (p_start_date IS NULL OR ss.scheduled_date >= p_start_date)
      AND (p_end_date IS NULL OR ss.scheduled_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Inserir dados de exemplo para testes (apenas em desenvolvimento)
-- NOTA: Remover em produção
DO $$
BEGIN
    -- Verificar se estamos em ambiente de desenvolvimento
    IF current_database() LIKE '%test%' OR current_database() LIKE '%dev%' THEN
        -- Inserir alguns agendamentos de exemplo se existirem dados básicos
        INSERT INTO scheduled_sessions (assignment_id, scheduled_date, scheduled_time, created_by, notes)
        SELECT
            ppa.id,
            CURRENT_DATE + INTERVAL '1 day',
            '14:00:00'::TIME,
            u.id,
            'Agendamento de teste criado automaticamente'
        FROM patient_program_assignments ppa
        JOIN users u ON u.is_admin = true
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
END $$;