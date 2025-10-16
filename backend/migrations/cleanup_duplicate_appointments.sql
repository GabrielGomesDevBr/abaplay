-- Migration: Limpeza de Agendamentos Duplicados
-- Data: 15/10/2025
-- Descrição: Remove agendamentos duplicados mantendo apenas o mais recente

-- ==========================================
-- REMOVER DUPLICATAS PARA MESMA DATA/HORÁRIO
-- ==========================================

-- Estratégia: Para cada combinação (patient_id, therapist_id, scheduled_date, scheduled_time, recurring_template_id),
-- manter apenas o agendamento com o ID mais alto (mais recente) e deletar os demais

WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY patient_id, therapist_id, scheduled_date, scheduled_time, recurring_template_id
            ORDER BY id DESC
        ) as rn
    FROM scheduled_sessions
    WHERE recurring_template_id IS NOT NULL
    AND scheduled_date >= CURRENT_DATE  -- Apenas agendamentos futuros
)
DELETE FROM scheduled_sessions
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- ==========================================
-- RELATÓRIO DE LIMPEZA
-- ==========================================

SELECT
    patient_id,
    therapist_id,
    scheduled_date,
    scheduled_time,
    recurring_template_id,
    COUNT(*) as total_appointments,
    STRING_AGG(id::TEXT || ' (' || status || ')', ', ' ORDER BY id) as appointments_detail
FROM scheduled_sessions
WHERE recurring_template_id IS NOT NULL
AND scheduled_date >= CURRENT_DATE
GROUP BY patient_id, therapist_id, scheduled_date, scheduled_time, recurring_template_id
HAVING COUNT(*) > 1
ORDER BY scheduled_date, scheduled_time;
