-- Migration 017: Funções para Cancelamento em Lote de Agendamentos Recorrentes
-- Implementa funcionalidades para gerenciar e cancelar múltiplas sessões de uma vez

-- ========================================
-- FUNÇÃO: Cancelar Agendamentos Futuros
-- ========================================

CREATE OR REPLACE FUNCTION cancel_future_appointments(
  p_patient_id INTEGER,
  p_discipline_id INTEGER DEFAULT NULL,
  p_therapist_id INTEGER DEFAULT NULL,
  p_parent_appointment_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT NULL,
  p_reason VARCHAR DEFAULT NULL,
  p_user_id INTEGER DEFAULT NULL
) RETURNS TABLE (
  cancelled_count INTEGER,
  affected_dates DATE[]
) AS $$
DECLARE
  v_cancelled INTEGER;
  v_dates DATE[];
BEGIN
  -- Buscar datas que serão afetadas (para retornar ao usuário)
  SELECT array_agg(scheduled_date ORDER BY scheduled_date)
  INTO v_dates
  FROM appointments
  WHERE patient_id = p_patient_id
    AND status NOT IN ('completed', 'cancelled')
    AND scheduled_date >= p_start_date
    AND (p_discipline_id IS NULL OR discipline_id = p_discipline_id)
    AND (p_therapist_id IS NULL OR therapist_id = p_therapist_id)
    AND (p_parent_appointment_id IS NULL OR parent_appointment_id = p_parent_appointment_id)
    AND (p_end_date IS NULL OR scheduled_date <= p_end_date);

  -- Cancelar appointments
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') || '🚫 Cancelado em lote em ' || CURRENT_TIMESTAMP::VARCHAR ||
            COALESCE(E'\nMotivo: ' || p_reason, ''),
    updated_at = CURRENT_TIMESTAMP
  WHERE patient_id = p_patient_id
    AND status NOT IN ('completed', 'cancelled')
    AND scheduled_date >= p_start_date
    AND (p_discipline_id IS NULL OR discipline_id = p_discipline_id)
    AND (p_therapist_id IS NULL OR therapist_id = p_therapist_id)
    AND (p_parent_appointment_id IS NULL OR parent_appointment_id = p_parent_appointment_id)
    AND (p_end_date IS NULL OR scheduled_date <= p_end_date);

  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Registrar log de auditoria
  IF p_user_id IS NOT NULL AND v_cancelled > 0 THEN
    INSERT INTO audit_log (
      table_name,
      action,
      user_id,
      description,
      affected_rows
    ) VALUES (
      'appointments',
      'BATCH_CANCEL',
      p_user_id,
      format('Cancelamento em lote: %s sessões do paciente %s', v_cancelled, p_patient_id),
      v_cancelled
    );
  END IF;

  RETURN QUERY SELECT v_cancelled, v_dates;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_future_appointments IS
'Cancela agendamentos futuros em lote com filtros opcionais por disciplina, terapeuta ou série recorrente';

-- ========================================
-- FUNÇÃO: Encerrar Tratamento do Paciente
-- ========================================

CREATE OR REPLACE FUNCTION terminate_patient_treatment(
  p_patient_id INTEGER,
  p_reason VARCHAR DEFAULT NULL,
  p_user_id INTEGER DEFAULT NULL
) RETURNS TABLE (
  cancelled_count INTEGER,
  disciplines_affected INTEGER,
  therapists_affected INTEGER,
  summary JSONB
) AS $$
DECLARE
  v_cancelled INTEGER;
  v_disciplines INTEGER;
  v_therapists INTEGER;
  v_summary JSONB;
BEGIN
  -- Coletar estatísticas antes de cancelar
  SELECT
    COUNT(DISTINCT discipline_id),
    COUNT(DISTINCT therapist_id),
    jsonb_agg(DISTINCT jsonb_build_object(
      'discipline_id', discipline_id,
      'discipline_name', d.name,
      'therapist_id', therapist_id,
      'therapist_name', u.name,
      'session_count', COUNT(*)
    ))
  INTO v_disciplines, v_therapists, v_summary
  FROM appointments a
  LEFT JOIN disciplines d ON a.discipline_id = d.id
  LEFT JOIN users u ON a.therapist_id = u.id
  WHERE a.patient_id = p_patient_id
    AND a.status NOT IN ('completed', 'cancelled')
    AND a.scheduled_date >= CURRENT_DATE
  GROUP BY discipline_id, d.name, therapist_id, u.name;

  -- Cancelar todas as sessões futuras
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') || '⛔ Tratamento encerrado em ' || CURRENT_TIMESTAMP::VARCHAR ||
            COALESCE(E'\nMotivo: ' || p_reason, ''),
    updated_at = CURRENT_TIMESTAMP
  WHERE patient_id = p_patient_id
    AND status NOT IN ('completed', 'cancelled')
    AND scheduled_date >= CURRENT_DATE;

  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Registrar log de auditoria
  IF p_user_id IS NOT NULL AND v_cancelled > 0 THEN
    INSERT INTO audit_log (
      table_name,
      action,
      user_id,
      description,
      affected_rows,
      metadata
    ) VALUES (
      'appointments',
      'TERMINATE_TREATMENT',
      p_user_id,
      format('Encerramento de tratamento: paciente %s - %s sessões canceladas', p_patient_id, v_cancelled),
      v_cancelled,
      jsonb_build_object(
        'patient_id', p_patient_id,
        'reason', p_reason,
        'summary', v_summary
      )
    );
  END IF;

  RETURN QUERY SELECT v_cancelled, v_disciplines, v_therapists, v_summary;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION terminate_patient_treatment IS
'Encerra completamente o tratamento de um paciente, cancelando todas as sessões futuras em todas as disciplinas';

-- ========================================
-- FUNÇÃO: Atualizar Data Final de Recorrência
-- ========================================

CREATE OR REPLACE FUNCTION update_recurrence_end_date(
  p_parent_appointment_id INTEGER,
  p_new_end_date DATE,
  p_user_id INTEGER DEFAULT NULL
) RETURNS TABLE (
  removed_count INTEGER,
  remaining_count INTEGER
) AS $$
DECLARE
  v_removed INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Cancelar/remover sessões após a nova data final
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') || '📅 Série recorrente encerrada em ' || p_new_end_date::VARCHAR,
    updated_at = CURRENT_TIMESTAMP
  WHERE parent_appointment_id = p_parent_appointment_id
    AND scheduled_date > p_new_end_date
    AND status NOT IN ('completed', 'cancelled');

  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- Atualizar registro da série recorrente
  UPDATE appointments
  SET
    recurrence_end_date = p_new_end_date,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_parent_appointment_id;

  -- Contar sessões restantes
  SELECT COUNT(*)
  INTO v_remaining
  FROM appointments
  WHERE parent_appointment_id = p_parent_appointment_id
    AND scheduled_date <= p_new_end_date
    AND status NOT IN ('cancelled');

  -- Registrar log
  IF p_user_id IS NOT NULL AND v_removed > 0 THEN
    INSERT INTO audit_log (
      table_name,
      action,
      user_id,
      description,
      affected_rows
    ) VALUES (
      'appointments',
      'UPDATE_RECURRENCE_END',
      p_user_id,
      format('Recorrência %s: removidas %s sessões, %s restantes', p_parent_appointment_id, v_removed, v_remaining),
      v_removed
    );
  END IF;

  RETURN QUERY SELECT v_removed, v_remaining;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_recurrence_end_date IS
'Atualiza a data final de uma série recorrente, cancelando sessões além da nova data';

-- ========================================
-- FUNÇÃO: Pausar Recorrência Temporariamente
-- ========================================

CREATE OR REPLACE FUNCTION pause_recurrence(
  p_parent_appointment_id INTEGER,
  p_pause_start_date DATE,
  p_pause_end_date DATE,
  p_reason VARCHAR DEFAULT NULL,
  p_user_id INTEGER DEFAULT NULL
) RETURNS TABLE (
  paused_count INTEGER,
  affected_dates DATE[]
) AS $$
DECLARE
  v_paused INTEGER;
  v_dates DATE[];
BEGIN
  -- Buscar datas afetadas
  SELECT array_agg(scheduled_date ORDER BY scheduled_date)
  INTO v_dates
  FROM appointments
  WHERE parent_appointment_id = p_parent_appointment_id
    AND scheduled_date >= p_pause_start_date
    AND scheduled_date <= p_pause_end_date
    AND status NOT IN ('completed', 'cancelled');

  -- Cancelar sessões no período de pausa
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = COALESCE(notes || E'\n\n', '') ||
            format('⏸️ Pausado temporariamente de %s até %s', p_pause_start_date, p_pause_end_date) ||
            COALESCE(E'\nMotivo: ' || p_reason, ''),
    updated_at = CURRENT_TIMESTAMP
  WHERE parent_appointment_id = p_parent_appointment_id
    AND scheduled_date >= p_pause_start_date
    AND scheduled_date <= p_pause_end_date
    AND status NOT IN ('completed', 'cancelled');

  GET DIAGNOSTICS v_paused = ROW_COUNT;

  -- Registrar log
  IF p_user_id IS NOT NULL AND v_paused > 0 THEN
    INSERT INTO audit_log (
      table_name,
      action,
      user_id,
      description,
      affected_rows
    ) VALUES (
      'appointments',
      'PAUSE_RECURRENCE',
      p_user_id,
      format('Pausa temporária: recorrência %s - %s sessões pausadas', p_parent_appointment_id, v_paused),
      v_paused
    );
  END IF;

  RETURN QUERY SELECT v_paused, v_dates;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION pause_recurrence IS
'Pausa temporariamente uma série recorrente, cancelando sessões em um período específico';

-- ========================================
-- VIEW: Resumo de Recorrências
-- ========================================

CREATE OR REPLACE VIEW v_recurrence_summary AS
SELECT
  a.id as parent_id,
  a.patient_id,
  p.name as patient_name,
  a.discipline_id,
  d.name as discipline_name,
  a.therapist_id,
  u.name as therapist_name,
  a.scheduled_date as first_session_date,
  a.scheduled_time,
  a.recurrence_pattern,
  a.recurrence_end_date,
  COUNT(child.id) FILTER (WHERE child.status = 'scheduled') as scheduled_count,
  COUNT(child.id) FILTER (WHERE child.status = 'completed') as completed_count,
  COUNT(child.id) FILTER (WHERE child.status = 'cancelled') as cancelled_count,
  COUNT(child.id) as total_sessions,
  MIN(child.scheduled_date) FILTER (WHERE child.status = 'scheduled' AND child.scheduled_date >= CURRENT_DATE) as next_session_date,
  MAX(child.scheduled_date) FILTER (WHERE child.status != 'cancelled') as last_session_date
FROM appointments a
LEFT JOIN appointments child ON child.parent_appointment_id = a.id
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN disciplines d ON a.discipline_id = d.id
LEFT JOIN users u ON a.therapist_id = u.id
WHERE a.is_recurring = true
  AND a.parent_appointment_id IS NULL
GROUP BY a.id, p.name, d.name, u.name;

COMMENT ON VIEW v_recurrence_summary IS
'Resumo de todas as séries recorrentes com estatísticas de sessões';

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Conceder permissões para admin
GRANT EXECUTE ON FUNCTION cancel_future_appointments TO admin;
GRANT EXECUTE ON FUNCTION terminate_patient_treatment TO admin;
GRANT EXECUTE ON FUNCTION update_recurrence_end_date TO admin;
GRANT EXECUTE ON FUNCTION pause_recurrence TO admin;
GRANT SELECT ON v_recurrence_summary TO admin, therapist;
