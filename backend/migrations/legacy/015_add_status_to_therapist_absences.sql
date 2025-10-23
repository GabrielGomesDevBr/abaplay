-- Migration 015: Adicionar colunas status e approved_at à tabela therapist_absences
-- Data: 2025-10-23
-- Descrição: Adiciona colunas para controle de aprovação de ausências

-- Adicionar coluna status
ALTER TABLE therapist_absences
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Adicionar coluna approved_at
ALTER TABLE therapist_absences
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Atualizar ausências existentes para approved (já que não havia controle antes)
UPDATE therapist_absences
SET status = 'approved',
    approved_at = created_at
WHERE status IS NULL OR status = 'pending';

-- Criar índice para melhorar performance de consultas por status
CREATE INDEX IF NOT EXISTS idx_therapist_absences_status ON therapist_absences(status);

-- Comentários para documentação
COMMENT ON COLUMN therapist_absences.status IS 'Status da ausência: pending (pendente), approved (aprovada), rejected (rejeitada)';
COMMENT ON COLUMN therapist_absences.approved_at IS 'Data e hora da aprovação ou rejeição da ausência';
