-- ================================================================
-- MIGRATION 009: Sistema de Disponibilidade Inteligente
-- Data: Janeiro 2025
-- Descrição: Especialidades, horários, salas e preferências
-- Retrocompatibilidade: 100% - Nenhum campo obrigatório
-- ================================================================

-- ================================================================
-- 1. ESPECIALIDADES DOS TERAPEUTAS
-- ================================================================

CREATE TABLE IF NOT EXISTS therapist_specialties (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,

    -- Informações da especialidade
    main_specialty BOOLEAN DEFAULT false, -- É a especialidade principal?
    years_of_experience INTEGER, -- Anos de experiência nesta área

    -- Controle
    is_active BOOLEAN DEFAULT true,
    added_by INTEGER REFERENCES users(id), -- Admin que cadastrou
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Evitar duplicatas
    UNIQUE(therapist_id, discipline_id)
);

CREATE INDEX IF NOT EXISTS idx_therapist_specialties_therapist ON therapist_specialties(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_specialties_discipline ON therapist_specialties(discipline_id);
CREATE INDEX IF NOT EXISTS idx_therapist_specialties_active ON therapist_specialties(is_active);

COMMENT ON TABLE therapist_specialties IS
'Especialidades/disciplinas que cada terapeuta pode atender.
Se terapeuta não tem registros aqui, pode atender qualquer disciplina.';

COMMENT ON COLUMN therapist_specialties.main_specialty IS
'Marca se esta é a especialidade principal do terapeuta (para priorização)';

-- ================================================================
-- 2. DISPONIBILIDADE PADRÃO (HORÁRIO DE TRABALHO)
-- ================================================================

CREATE TABLE IF NOT EXISTS therapist_availability_template (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Validação: fim depois do início
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_therapist_avail_therapist ON therapist_availability_template(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_avail_day ON therapist_availability_template(day_of_week);
CREATE INDEX IF NOT EXISTS idx_therapist_avail_active ON therapist_availability_template(is_active);

COMMENT ON TABLE therapist_availability_template IS
'Horários padrão de trabalho de cada terapeuta por dia da semana.
Se não houver registro, assume disponível 06:00-21:00.';

-- ================================================================
-- 3. AUSÊNCIAS TEMPORÁRIAS (FÉRIAS, ATESTADOS, ETC)
-- ================================================================

CREATE TABLE IF NOT EXISTS therapist_absences (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Tipo de ausência
    absence_type VARCHAR(30) CHECK (absence_type IN (
        'vacation',         -- Férias
        'sick_leave',       -- Atestado médico
        'training',         -- Curso/treinamento
        'maternity_leave',  -- Licença maternidade
        'personal',         -- Pessoal
        'other'             -- Outro
    )),

    -- Período
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Ausência parcial (apenas parte do dia)
    start_time TIME, -- NULL = dia inteiro
    end_time TIME,   -- NULL = dia inteiro

    -- Informações
    reason TEXT,
    approved_by INTEGER REFERENCES users(id), -- Admin que aprovou

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validação
    CHECK (end_date >= start_date),
    CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

CREATE INDEX IF NOT EXISTS idx_therapist_absences_therapist ON therapist_absences(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_absences_period ON therapist_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_therapist_absences_type ON therapist_absences(absence_type);

COMMENT ON TABLE therapist_absences IS
'Períodos de ausência/indisponibilidade dos terapeutas.
Pode ser dia inteiro ou apenas parte do dia (start_time/end_time).';

-- ================================================================
-- 4. PREFERÊNCIAS PACIENTE-TERAPEUTA
-- ================================================================

CREATE TABLE IF NOT EXISTS patient_therapist_preferences (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Tipo de preferência
    preference_type VARCHAR(20) CHECK (preference_type IN (
        'preferred', -- Paciente gosta/tem rapport
        'neutral',   -- Indiferente
        'avoid'      -- Evitar (problema de rapport/comportamento)
    )) DEFAULT 'neutral',

    -- Histórico de atendimento
    total_sessions INTEGER DEFAULT 0,
    last_session_date DATE,

    -- Observações do coordenador
    notes TEXT,

    -- Auditoria
    set_by INTEGER REFERENCES users(id), -- Quem definiu
    set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(patient_id, therapist_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_therapist_pref_patient ON patient_therapist_preferences(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_therapist_pref_therapist ON patient_therapist_preferences(therapist_id);
CREATE INDEX IF NOT EXISTS idx_patient_therapist_pref_type ON patient_therapist_preferences(preference_type);

COMMENT ON TABLE patient_therapist_preferences IS
'Preferências de rapport e histórico de atendimento entre pacientes e terapeutas.';

-- ================================================================
-- 5. SALAS DA CLÍNICA
-- ================================================================

CREATE TABLE IF NOT EXISTS clinic_rooms (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "Sala ABA 1", "Sala Sensorial"

    -- Tipo/categoria
    room_type VARCHAR(50), -- 'aba', 'speech_therapy', 'ot', 'multipurpose'

    -- Capacidade (quantas sessões simultâneas - geralmente 1)
    capacity INTEGER DEFAULT 1 CHECK (capacity >= 1),

    -- Características
    has_mirror BOOLEAN DEFAULT false,
    has_sensory_equipment BOOLEAN DEFAULT false,
    equipment_notes TEXT,

    -- Controle
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0, -- Ordem de exibição

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_rooms_clinic ON clinic_rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_rooms_active ON clinic_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_clinic_rooms_type ON clinic_rooms(room_type);

COMMENT ON TABLE clinic_rooms IS
'Salas disponíveis na clínica para agendamento de sessões.';

-- ================================================================
-- 6. CONFIGURAÇÕES DE DISCIPLINA POR CLÍNICA
-- ================================================================

CREATE TABLE IF NOT EXISTS clinic_discipline_settings (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,

    -- Duração padrão para esta disciplina nesta clínica
    default_session_duration INTEGER DEFAULT 60 CHECK (default_session_duration > 0),

    -- Opções de duração permitidas
    allowed_durations INTEGER[] DEFAULT ARRAY[30, 45, 60, 90, 120],

    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(clinic_id, discipline_id)
);

CREATE INDEX IF NOT EXISTS idx_clinic_discipline_settings_clinic ON clinic_discipline_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_discipline_settings_discipline ON clinic_discipline_settings(discipline_id);

COMMENT ON TABLE clinic_discipline_settings IS
'Configurações específicas de cada disciplina por clínica (ex: duração padrão de sessão).';

-- ================================================================
-- 7. ADICIONAR CAMPOS EM TABELAS EXISTENTES
-- ================================================================

-- Adicionar sala em agendamentos
ALTER TABLE scheduled_sessions
ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES clinic_rooms(id);

CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_room
ON scheduled_sessions(room_id, scheduled_date, scheduled_time)
WHERE status IN ('scheduled', 'completed');

COMMENT ON COLUMN scheduled_sessions.room_id IS
'Sala onde a sessão será/foi realizada (opcional mas recomendado)';

-- Adicionar capacidade máxima de atendimentos em users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS max_daily_sessions INTEGER CHECK (max_daily_sessions > 0),
ADD COLUMN IF NOT EXISTS min_break_minutes INTEGER DEFAULT 15 CHECK (min_break_minutes >= 0);

COMMENT ON COLUMN users.max_daily_sessions IS
'Número máximo de sessões que o terapeuta pode ter por dia (prevenir burnout)';

COMMENT ON COLUMN users.min_break_minutes IS
'Intervalo mínimo necessário entre sessões consecutivas';

-- Duração customizada por assignment (garantir que existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'patient_program_assignments'
        AND column_name = 'custom_session_duration'
    ) THEN
        ALTER TABLE patient_program_assignments
        ADD COLUMN custom_session_duration INTEGER CHECK (custom_session_duration > 0);

        COMMENT ON COLUMN patient_program_assignments.custom_session_duration IS
        'Duração específica para sessões deste paciente neste programa. NULL = usa padrão da clínica.';
    END IF;
END $$;

-- ================================================================
-- 8. FUNÇÕES E TRIGGERS
-- ================================================================

-- Trigger: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_therapist_specialties_updated_at ON therapist_specialties;
CREATE TRIGGER trigger_therapist_specialties_updated_at
    BEFORE UPDATE ON therapist_specialties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_therapist_availability_updated_at ON therapist_availability_template;
CREATE TRIGGER trigger_therapist_availability_updated_at
    BEFORE UPDATE ON therapist_availability_template
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_therapist_absences_updated_at ON therapist_absences;
CREATE TRIGGER trigger_therapist_absences_updated_at
    BEFORE UPDATE ON therapist_absences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_patient_therapist_pref_updated_at ON patient_therapist_preferences;
CREATE TRIGGER trigger_patient_therapist_pref_updated_at
    BEFORE UPDATE ON patient_therapist_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clinic_rooms_updated_at ON clinic_rooms;
CREATE TRIGGER trigger_clinic_rooms_updated_at
    BEFORE UPDATE ON clinic_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_clinic_discipline_settings_updated_at ON clinic_discipline_settings;
CREATE TRIGGER trigger_clinic_discipline_settings_updated_at
    BEFORE UPDATE ON clinic_discipline_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Validar disponibilidade de sala
CREATE OR REPLACE FUNCTION validate_room_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_room_capacity INTEGER;
    v_concurrent_sessions INTEGER;
BEGIN
    -- Se sala foi especificada
    IF NEW.room_id IS NOT NULL THEN
        -- Buscar capacidade da sala
        SELECT capacity INTO v_room_capacity
        FROM clinic_rooms
        WHERE id = NEW.room_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sala não encontrada ou inativa';
        END IF;

        -- Contar sessões concorrentes nesta sala
        SELECT COUNT(*) INTO v_concurrent_sessions
        FROM scheduled_sessions ss
        WHERE ss.room_id = NEW.room_id
        AND ss.scheduled_date = NEW.scheduled_date
        AND ss.status IN ('scheduled', 'completed')
        AND ss.id != COALESCE(NEW.id, -1)
        AND (
            -- Verificar sobreposição de horários
            (ss.scheduled_time < NEW.scheduled_time + (NEW.duration_minutes || ' minutes')::INTERVAL)
            AND
            ((ss.scheduled_time + (ss.duration_minutes || ' minutes')::INTERVAL) > NEW.scheduled_time)
        );

        -- Validar capacidade
        IF v_concurrent_sessions >= v_room_capacity THEN
            RAISE EXCEPTION 'Sala já está ocupada neste horário (capacidade: %, ocupação: %)',
                v_room_capacity, v_concurrent_sessions;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_room_availability ON scheduled_sessions;
CREATE TRIGGER trigger_validate_room_availability
    BEFORE INSERT OR UPDATE ON scheduled_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_room_availability();

-- Trigger: Avisar sobre conflitos ao criar ausência
CREATE OR REPLACE FUNCTION notify_absence_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    v_conflicts INTEGER;
    v_therapist_name VARCHAR;
BEGIN
    -- Buscar nome do terapeuta
    SELECT full_name INTO v_therapist_name
    FROM users
    WHERE id = NEW.therapist_id;

    -- Contar agendamentos que serão afetados
    SELECT COUNT(*) INTO v_conflicts
    FROM scheduled_sessions ss
    WHERE ss.therapist_id = NEW.therapist_id
    AND ss.scheduled_date BETWEEN NEW.start_date AND NEW.end_date
    AND ss.status = 'scheduled'
    AND (
        -- Se ausência é dia todo
        (NEW.start_time IS NULL AND NEW.end_time IS NULL)
        OR
        -- Se ausência é parcial, verificar sobreposição
        (
            NEW.start_time IS NOT NULL
            AND NEW.end_time IS NOT NULL
            AND ss.scheduled_time >= NEW.start_time
            AND ss.scheduled_time < NEW.end_time
        )
    );

    -- Se houver conflitos, criar notificação para admins da clínica
    IF v_conflicts > 0 THEN
        INSERT INTO notifications (user_id, type, title, message, priority)
        SELECT
            u.id,
            'absence_conflict',
            'Ausência com agendamentos conflitantes',
            'A ausência de ' || v_therapist_name || ' de ' ||
            TO_CHAR(NEW.start_date, 'DD/MM/YYYY') || ' a ' ||
            TO_CHAR(NEW.end_date, 'DD/MM/YYYY') ||
            ' afeta ' || v_conflicts || ' agendamento(s). É necessário reagendar ou cancelar.',
            'high'
        FROM users u
        CROSS JOIN users t
        WHERE u.clinic_id = t.clinic_id
        AND u.is_admin = true
        AND t.id = NEW.therapist_id
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_absence_conflicts ON therapist_absences;
CREATE TRIGGER trigger_notify_absence_conflicts
    AFTER INSERT ON therapist_absences
    FOR EACH ROW
    EXECUTE FUNCTION notify_absence_conflicts();

-- ================================================================
-- 9. VIEWS ÚTEIS
-- ================================================================

-- View: Terapeutas com especialidades
CREATE OR REPLACE VIEW v_therapists_with_specialties AS
SELECT
    u.id as therapist_id,
    u.full_name as therapist_name,
    u.clinic_id,
    u.role,
    u.max_daily_sessions,
    u.min_break_minutes,

    -- Especialidades
    COALESCE(
        ARRAY_AGG(
            d.name ORDER BY ts.main_specialty DESC, d.name
        ) FILTER (WHERE d.name IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) as specialties,

    -- IDs das especialidades
    COALESCE(
        ARRAY_AGG(
            d.id ORDER BY ts.main_specialty DESC, d.id
        ) FILTER (WHERE d.id IS NOT NULL),
        ARRAY[]::INTEGER[]
    ) as specialty_ids,

    -- Contadores
    COALESCE(COUNT(DISTINCT ts.discipline_id), 0) as specialty_count,

    -- Especialidade principal
    MAX(d.name) FILTER (WHERE ts.main_specialty = true) as main_specialty_name,

    -- Status
    CASE
        WHEN COUNT(ts.discipline_id) = 0 THEN 'no_specialty'
        WHEN COUNT(ts.discipline_id) = 1 THEN 'single_specialty'
        ELSE 'multiple_specialties'
    END as specialty_status
FROM users u
LEFT JOIN therapist_specialties ts
    ON u.id = ts.therapist_id AND ts.is_active = true
LEFT JOIN disciplines d
    ON ts.discipline_id = d.id
WHERE u.role = 'terapeuta'
GROUP BY u.id, u.full_name, u.clinic_id, u.role, u.max_daily_sessions, u.min_break_minutes;

COMMENT ON VIEW v_therapists_with_specialties IS
'View com terapeutas e suas especialidades agregadas.';

-- View: Disponibilidade de salas
CREATE OR REPLACE VIEW v_rooms_with_occupancy AS
SELECT
    cr.*,
    c.name as clinic_name,
    COUNT(DISTINCT ss.id) FILTER (WHERE ss.status = 'scheduled' AND ss.scheduled_date >= CURRENT_DATE) as upcoming_sessions,
    COUNT(DISTINCT ss.scheduled_date) FILTER (WHERE ss.status = 'scheduled' AND ss.scheduled_date >= CURRENT_DATE) as occupied_days_upcoming
FROM clinic_rooms cr
JOIN clinics c ON cr.clinic_id = c.id
LEFT JOIN scheduled_sessions ss ON cr.id = ss.room_id
GROUP BY cr.id, c.name;

COMMENT ON VIEW v_rooms_with_occupancy IS
'View de salas com estatísticas de ocupação.';

-- ================================================================
-- 10. NOTIFICAÇÃO PARA ADMINS
-- ================================================================

-- Criar notificação informando sobre nova funcionalidade
DO $$
DECLARE
    v_clinic RECORD;
    v_admin_id INTEGER;
BEGIN
    FOR v_clinic IN
        SELECT DISTINCT clinic_id
        FROM users
        WHERE role = 'terapeuta'
    LOOP
        -- Buscar um admin da clínica
        SELECT id INTO v_admin_id
        FROM users
        WHERE clinic_id = v_clinic.clinic_id
        AND is_admin = true
        LIMIT 1;

        -- Se encontrou admin, criar notificação
        IF v_admin_id IS NOT NULL THEN
            INSERT INTO notifications (
                user_id,
                type,
                title,
                message,
                priority
            ) VALUES (
                v_admin_id,
                'system_update',
                'Nova Funcionalidade: Sistema de Disponibilidade Inteligente',
                'O ABAplay agora possui busca inteligente de horários, assistente de agendamento e gestão de especialidades de terapeutas. Acesse "Configurações > Terapeutas" para começar a configurar.',
                'medium'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- ================================================================
-- FIM DA MIGRATION 009
-- ================================================================
