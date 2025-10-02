-- Migração: Adicionar tipo de notificação para agendamentos
-- Data: Outubro 2025
-- Objetivo: Expandir enum chat_type para incluir notificações de agendamentos não realizados

-- Adicionar novo valor ao enum chat_type
ALTER TYPE chat_type ADD VALUE IF NOT EXISTS 'scheduling_reminder';

-- Comentário explicativo
COMMENT ON TYPE chat_type IS 'Tipos de notificações: case_discussion (discussão de caso), parent_chat (chat com pais), scheduling_reminder (lembrete de agendamentos não realizados)';

-- Verificar valores do enum
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'chat_type');
