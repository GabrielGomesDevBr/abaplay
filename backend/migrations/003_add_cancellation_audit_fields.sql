-- Migration: Adicionar campos de auditoria para cancelamentos
-- Data: 2025-10-01
-- Objetivo: Rastreabilidade completa de cancelamentos (quem, quando, por quê)

-- Adicionar campos de auditoria de cancelamento
ALTER TABLE scheduled_sessions
ADD COLUMN IF NOT EXISTS cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS cancellation_reason_description TEXT;

-- Criar índice para consultas de cancelamentos
CREATE INDEX IF NOT EXISTS idx_scheduled_sessions_cancelled
ON scheduled_sessions(cancelled_by, cancelled_at)
WHERE status = 'cancelled';

-- Adicionar comentários para documentação
COMMENT ON COLUMN scheduled_sessions.cancelled_by IS 'ID do usuário (admin/terapeuta) que cancelou o agendamento';
COMMENT ON COLUMN scheduled_sessions.cancelled_at IS 'Timestamp de quando o agendamento foi cancelado';
COMMENT ON COLUMN scheduled_sessions.cancellation_reason_type IS 'Tipo de motivo do cancelamento (cancelado_paciente, cancelado_clinica, terapeuta_indisponivel, feriado, remarcacao, outro)';
COMMENT ON COLUMN scheduled_sessions.cancellation_reason_description IS 'Descrição detalhada do motivo do cancelamento';

-- Verificar estrutura atualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'scheduled_sessions'
AND column_name IN ('cancelled_by', 'cancelled_at', 'cancellation_reason_type', 'cancellation_reason_description')
ORDER BY column_name;

-- Script de verificação: Ver agendamentos cancelados com auditoria
-- SELECT
--     ss.id,
--     ss.scheduled_date,
--     ss.scheduled_time,
--     ss.status,
--     ss.cancelled_at,
--     u.full_name as cancelled_by_name,
--     ss.cancellation_reason_type,
--     ss.cancellation_reason_description
-- FROM scheduled_sessions ss
-- LEFT JOIN users u ON ss.cancelled_by = u.id
-- WHERE ss.status = 'cancelled'
-- ORDER BY ss.cancelled_at DESC;
