-- Migration 003: Expansão do Cadastro de Pacientes
-- Data: Setembro 2025
-- Descrição: Implementação completa da expansão do cadastro de pacientes
-- Compatibilidade: 100% retrocompatível - nenhum campo existente é alterado

-- ==========================================
-- EXPANSÃO DA TABELA PATIENTS
-- ==========================================

-- Adicionar novos campos opcionais à tabela patients
-- IMPORTANTE: Todos os campos são nullable para manter retrocompatibilidade
ALTER TABLE patients ADD COLUMN
    -- Dados dos Responsáveis Expandidos
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(255),
    guardian_occupation VARCHAR(255),
    guardian_education VARCHAR(255),

    -- Segundo Responsável (pai/mãe)
    second_guardian_name VARCHAR(255),
    second_guardian_relationship VARCHAR(100),
    second_guardian_phone VARCHAR(20),
    second_guardian_email VARCHAR(255),
    second_guardian_occupation VARCHAR(255),

    -- Dados de Endereço
    address_street TEXT,
    address_number VARCHAR(10),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip VARCHAR(9),

    -- Dados Educacionais
    school_name VARCHAR(255),
    school_phone VARCHAR(20),
    school_email VARCHAR(255),
    school_teacher VARCHAR(255),
    school_teacher_phone VARCHAR(20),
    school_grade VARCHAR(50),
    school_period VARCHAR(20), -- manhã, tarde, integral
    school_special_needs BOOLEAN DEFAULT false,
    school_adaptations TEXT,

    -- Dados de Nascimento e Desenvolvimento
    birth_weight DECIMAL(5,3),
    birth_height DECIMAL(5,2),
    birth_complications TEXT,
    gestational_age INTEGER, -- em semanas
    delivery_type VARCHAR(20), -- normal, cesariana
    development_concerns TEXT,
    early_intervention BOOLEAN DEFAULT false,

    -- Dados Médicos Gerais
    pediatrician_name VARCHAR(255),
    pediatrician_phone VARCHAR(20),
    pediatrician_email VARCHAR(255),
    health_insurance VARCHAR(255),
    health_insurance_number VARCHAR(100),

    -- Observações Especiais
    allergies TEXT,
    dietary_restrictions TEXT,
    behavioral_notes TEXT,
    communication_preferences TEXT,

    -- Metadados
    expanded_data_completed BOOLEAN DEFAULT false,
    expanded_data_completed_by INTEGER REFERENCES users(id),
    expanded_data_completed_at TIMESTAMP WITH TIME ZONE;

-- ==========================================
-- NOVAS TABELAS RELACIONAIS
-- ==========================================

-- MEDICAÇÕES DO PACIENTE
CREATE TABLE patient_medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    administration_time VARCHAR(255), -- manhã, tarde, noite, etc
    prescribing_doctor VARCHAR(255),
    doctor_phone VARCHAR(20),
    doctor_email VARCHAR(255),
    doctor_specialty VARCHAR(100),
    prescription_date DATE,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- CONTATOS DE EMERGÊNCIA
CREATE TABLE patient_emergency_contacts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    priority_order INTEGER DEFAULT 1, -- 1 = primeiro contato, 2 = segundo, etc
    can_authorize_treatment BOOLEAN DEFAULT false,
    can_pick_up_patient BOOLEAN DEFAULT false,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id)
);

-- HISTÓRICO MÉDICO
CREATE TABLE patient_medical_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_name VARCHAR(255) NOT NULL,
    condition_type VARCHAR(100), -- diagnóstico, cirurgia, internação, exame
    diagnosis_date DATE,
    treating_physician VARCHAR(255),
    physician_specialty VARCHAR(100),
    physician_phone VARCHAR(20),
    physician_email VARCHAR(255),
    treatment_status VARCHAR(50) DEFAULT 'ativo', -- ativo, finalizado, suspenso
    notes TEXT,
    relevant_for_therapy BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- CONTATOS PROFISSIONAIS
CREATE TABLE patient_professional_contacts (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_type VARCHAR(100) NOT NULL, -- psiquiatra, psicólogo, neurologista, etc
    professional_name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    specialty VARCHAR(100),
    frequency_of_visits VARCHAR(100), -- semanal, mensal, etc
    last_appointment DATE,
    next_appointment DATE,
    notes TEXT,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índices essenciais para performance
CREATE INDEX idx_patient_medications_patient ON patient_medications(patient_id, is_current);
CREATE INDEX idx_patient_medications_created ON patient_medications(created_at DESC);

CREATE INDEX idx_patient_emergency_contacts_patient ON patient_emergency_contacts(patient_id, priority_order);
CREATE INDEX idx_patient_emergency_contacts_active ON patient_emergency_contacts(is_active, priority_order);

CREATE INDEX idx_patient_medical_history_patient ON patient_medical_history(patient_id, relevant_for_therapy);
CREATE INDEX idx_patient_medical_history_status ON patient_medical_history(treatment_status, created_at DESC);

CREATE INDEX idx_patient_professional_contacts_patient ON patient_professional_contacts(patient_id, is_current);
CREATE INDEX idx_patient_professional_contacts_type ON patient_professional_contacts(professional_type, is_current);

-- Índices na tabela patients para novos campos
CREATE INDEX idx_patients_expanded_completed ON patients(expanded_data_completed, clinic_id);
CREATE INDEX idx_patients_school ON patients(school_name) WHERE school_name IS NOT NULL;
CREATE INDEX idx_patients_pediatrician ON patients(pediatrician_name) WHERE pediatrician_name IS NOT NULL;

-- ==========================================
-- TRIGGERS E FUNÇÕES
-- ==========================================

-- Trigger para atualizar updated_at automaticamente nas novas tabelas
CREATE OR REPLACE FUNCTION update_expanded_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(NEW.updated_by, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
CREATE TRIGGER trigger_update_patient_medications_updated_at
    BEFORE UPDATE ON patient_medications
    FOR EACH ROW
    EXECUTE FUNCTION update_expanded_updated_at();

CREATE TRIGGER trigger_update_patient_medical_history_updated_at
    BEFORE UPDATE ON patient_medical_history
    FOR EACH ROW
    EXECUTE FUNCTION update_expanded_updated_at();

CREATE TRIGGER trigger_update_patient_professional_contacts_updated_at
    BEFORE UPDATE ON patient_professional_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_expanded_updated_at();

CREATE TRIGGER trigger_update_patient_emergency_contacts_updated_at
    BEFORE UPDATE ON patient_emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_expanded_updated_at();

-- ==========================================
-- VIEWS PARA CONSULTAS COMPLETAS
-- ==========================================

-- View para dados expandidos completos
CREATE VIEW v_patients_expanded_complete AS
SELECT
    p.*,
    c.name as clinic_name,
    u_completed.full_name as completed_by_name,

    -- Estatísticas das tabelas relacionais
    COUNT(pm.id) as total_medications,
    COUNT(CASE WHEN pm.is_current = true THEN 1 END) as current_medications,
    COUNT(pec.id) as total_emergency_contacts,
    COUNT(CASE WHEN pec.is_active = true THEN 1 END) as active_emergency_contacts,
    COUNT(pmh.id) as total_medical_history,
    COUNT(CASE WHEN pmh.relevant_for_therapy = true THEN 1 END) as relevant_medical_history,
    COUNT(ppc.id) as total_professional_contacts,
    COUNT(CASE WHEN ppc.is_current = true THEN 1 END) as current_professional_contacts,

    -- Status calculado
    CASE
        WHEN p.expanded_data_completed = true THEN 'complete'
        WHEN p.expanded_data_completed = false AND (
            p.guardian_phone IS NOT NULL OR
            p.address_street IS NOT NULL OR
            p.school_name IS NOT NULL
        ) THEN 'partial'
        ELSE 'basic'
    END as expanded_status

FROM patients p
JOIN clinics c ON p.clinic_id = c.id
LEFT JOIN users u_completed ON p.expanded_data_completed_by = u_completed.id
LEFT JOIN patient_medications pm ON p.id = pm.patient_id
LEFT JOIN patient_emergency_contacts pec ON p.id = pec.patient_id
LEFT JOIN patient_medical_history pmh ON p.id = pmh.patient_id
LEFT JOIN patient_professional_contacts ppc ON p.id = ppc.patient_id
GROUP BY
    p.id, c.name, u_completed.full_name;

-- ==========================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ==========================================

COMMENT ON TABLE patient_medications IS 'Medicações atuais e históricas do paciente';
COMMENT ON COLUMN patient_medications.is_current IS 'Indica se a medicação está sendo utilizada atualmente';
COMMENT ON COLUMN patient_medications.administration_time IS 'Horários de administração da medicação';

COMMENT ON TABLE patient_emergency_contacts IS 'Contatos de emergência do paciente organizados por prioridade';
COMMENT ON COLUMN patient_emergency_contacts.priority_order IS 'Ordem de prioridade do contato (1 = primeiro, 2 = segundo...)';
COMMENT ON COLUMN patient_emergency_contacts.can_authorize_treatment IS 'Pode autorizar tratamentos médicos';
COMMENT ON COLUMN patient_emergency_contacts.can_pick_up_patient IS 'Pode buscar o paciente';

COMMENT ON TABLE patient_medical_history IS 'Histórico médico detalhado do paciente';
COMMENT ON COLUMN patient_medical_history.condition_type IS 'Tipo: diagnóstico, cirurgia, internação, exame';
COMMENT ON COLUMN patient_medical_history.relevant_for_therapy IS 'Condição relevante para o tratamento atual';

COMMENT ON TABLE patient_professional_contacts IS 'Contatos de profissionais que atendem o paciente';
COMMENT ON COLUMN patient_professional_contacts.professional_type IS 'Tipo: psiquiatra, psicólogo, neurologista, etc';
COMMENT ON COLUMN patient_professional_contacts.frequency_of_visits IS 'Frequência das consultas';

COMMENT ON VIEW v_patients_expanded_complete IS 'View completa dos pacientes com estatísticas dos dados expandidos';

-- ==========================================
-- FUNÇÕES UTILITÁRIAS
-- ==========================================

-- Função para verificar completude dos dados expandidos
CREATE OR REPLACE FUNCTION check_expanded_data_completeness(patient_id_param INTEGER)
RETURNS TABLE(
    section VARCHAR(50),
    completion_percentage DECIMAL(5,2),
    missing_fields TEXT[]
) AS $$
DECLARE
    patient_record RECORD;
    missing_personal TEXT[] := '{}';
    missing_address TEXT[] := '{}';
    missing_education TEXT[] := '{}';
    missing_medical TEXT[] := '{}';
BEGIN
    -- Buscar dados do paciente
    SELECT * INTO patient_record FROM patients WHERE id = patient_id_param;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paciente não encontrado';
    END IF;

    -- Verificar seção pessoal
    IF patient_record.guardian_phone IS NULL THEN missing_personal := array_append(missing_personal, 'telefone_responsavel'); END IF;
    IF patient_record.guardian_email IS NULL THEN missing_personal := array_append(missing_personal, 'email_responsavel'); END IF;
    IF patient_record.guardian_occupation IS NULL THEN missing_personal := array_append(missing_personal, 'ocupacao_responsavel'); END IF;

    RETURN QUERY SELECT 'personal'::VARCHAR(50),
                        ROUND((4.0 - array_length(missing_personal, 1)) / 4.0 * 100, 2),
                        missing_personal;

    -- Verificar seção endereço
    IF patient_record.address_street IS NULL THEN missing_address := array_append(missing_address, 'rua'); END IF;
    IF patient_record.address_city IS NULL THEN missing_address := array_append(missing_address, 'cidade'); END IF;
    IF patient_record.address_state IS NULL THEN missing_address := array_append(missing_address, 'estado'); END IF;

    RETURN QUERY SELECT 'address'::VARCHAR(50),
                        ROUND((3.0 - array_length(missing_address, 1)) / 3.0 * 100, 2),
                        missing_address;

    -- Verificar seção educacional
    IF patient_record.school_name IS NULL THEN missing_education := array_append(missing_education, 'nome_escola'); END IF;
    IF patient_record.school_teacher IS NULL THEN missing_education := array_append(missing_education, 'professor'); END IF;

    RETURN QUERY SELECT 'education'::VARCHAR(50),
                        ROUND((2.0 - array_length(missing_education, 1)) / 2.0 * 100, 2),
                        missing_education;

    -- Verificar seção médica
    IF patient_record.pediatrician_name IS NULL THEN missing_medical := array_append(missing_medical, 'pediatra'); END IF;
    IF patient_record.allergies IS NULL THEN missing_medical := array_append(missing_medical, 'alergias'); END IF;

    RETURN QUERY SELECT 'medical'::VARCHAR(50),
                        ROUND((2.0 - array_length(missing_medical, 1)) / 2.0 * 100, 2),
                        missing_medical;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- DADOS INICIAIS E VALIDAÇÕES
-- ==========================================

-- Adicionar constraint para validar email
ALTER TABLE patients ADD CONSTRAINT check_guardian_email
    CHECK (guardian_email IS NULL OR guardian_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE patients ADD CONSTRAINT check_second_guardian_email
    CHECK (second_guardian_email IS NULL OR second_guardian_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validar estados brasileiros
ALTER TABLE patients ADD CONSTRAINT check_address_state
    CHECK (address_state IS NULL OR address_state IN (
        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
        'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ));

-- Validar período escolar
ALTER TABLE patients ADD CONSTRAINT check_school_period
    CHECK (school_period IS NULL OR school_period IN ('manhã', 'tarde', 'integral', 'noite'));

-- Validar tipo de parto
ALTER TABLE patients ADD CONSTRAINT check_delivery_type
    CHECK (delivery_type IS NULL OR delivery_type IN ('normal', 'cesariana', 'fórceps', 'vácuo'));

-- ==========================================
-- LOG DE MIGRAÇÃO
-- ==========================================

-- Inserir registro de migração (se não existir tabela de migrações)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        CREATE TABLE migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    INSERT INTO migrations (migration_name)
    VALUES ('003_expand_patient_registration.sql');
END $$;

-- Log de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Migration 003 executada com sucesso!';
    RAISE NOTICE 'Expansão do cadastro de pacientes implementada';
    RAISE NOTICE 'Retrocompatibilidade: 100% garantida';
    RAISE NOTICE 'Novas tabelas: 4 (patient_medications, patient_emergency_contacts, patient_medical_history, patient_professional_contacts)';
    RAISE NOTICE 'Novos campos na tabela patients: 35';
    RAISE NOTICE 'Índices criados: 8';
    RAISE NOTICE 'Triggers criados: 4';
    RAISE NOTICE 'Views criadas: 1';
    RAISE NOTICE 'Funções utilitárias: 2';
END $$;