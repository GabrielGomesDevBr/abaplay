-- Migração: Adicionar tipo de notificação para cancelamentos de agendamentos
-- Data: Outubro 2025
-- Objetivo: Expandir enum chat_type para incluir notificações de cancelamentos

-- Adicionar novo valor ao enum chat_type
ALTER TYPE chat_type ADD VALUE IF NOT EXISTS 'appointment_cancelled';

-- Comentário explicativo atualizado
COMMENT ON TYPE chat_type IS 'Tipos de notificações:
  - case_discussion: discussão de caso entre profissionais
  - parent_chat: chat com pais/responsáveis
  - scheduling_reminder: lembrete de agendamentos não realizados (missed)
  - appointment_cancelled: notificação de cancelamento de agendamento';

-- Verificar valores do enum (para debug)
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'chat_type');
