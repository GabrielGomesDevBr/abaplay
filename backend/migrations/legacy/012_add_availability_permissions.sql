-- Migration 012: Adicionar controle de permissões de disponibilidade
-- Adiciona colunas para gerenciar tipos de contrato e permissões de edição de agenda

-- Adicionar coluna de tipo de contrato
ALTER TABLE users
ADD COLUMN IF NOT EXISTS contract_type VARCHAR(20) DEFAULT 'freelancer'
CHECK (contract_type IN ('freelancer', 'part_time', 'full_time'));

-- Adicionar coluna de permissão de edição
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_edit_own_schedule BOOLEAN DEFAULT true;

-- Adicionar coluna de horas semanais padrão (opcional, para contratos)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_weekly_hours INTEGER;

-- Comentários
COMMENT ON COLUMN users.contract_type IS 'Tipo de contrato: freelancer (horários flexíveis), part_time (parcial fixo), full_time (integral fixo)';
COMMENT ON COLUMN users.can_edit_own_schedule IS 'Se false, apenas admin pode editar horários de trabalho do terapeuta';
COMMENT ON COLUMN users.default_weekly_hours IS 'Horas semanais contratuais (usado para relatórios)';

-- Criar tabela de log de alterações de disponibilidade
CREATE TABLE IF NOT EXISTS availability_changes_log (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('schedule_update', 'absence_added', 'absence_removed', 'config_changed', 'schedule_bulk_update')),
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_availability_log_therapist ON availability_changes_log(therapist_id);
CREATE INDEX IF NOT EXISTS idx_availability_log_created ON availability_changes_log(created_at DESC);

-- Comentários
COMMENT ON TABLE availability_changes_log IS 'Registro de auditoria de alterações em disponibilidade de terapeutas';
COMMENT ON COLUMN availability_changes_log.change_type IS 'Tipo de alteração realizada';
COMMENT ON COLUMN availability_changes_log.old_value IS 'Valor anterior (JSON) para auditoria';
COMMENT ON COLUMN availability_changes_log.new_value IS 'Novo valor (JSON) para auditoria';

-- Configurar terapeutas fulltime existentes como freelancers por padrão
-- Admin pode ajustar manualmente depois
UPDATE users
SET
    contract_type = 'freelancer',
    can_edit_own_schedule = true
WHERE role = 'therapist'
  AND contract_type IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 012 concluída: Colunas de permissões de disponibilidade adicionadas';
END $$;
