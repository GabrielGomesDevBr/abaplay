-- Migration: Add cancellation fields to v_scheduled_sessions_complete
-- Description: Recreates view with cancellation data (cancelled_by, cancellation_reason, cancellation_notes, cancelled_at)
-- Date: 2025-10-14
-- Based on: fix_active_programs_count.sql (última versão funcional)

CREATE OR REPLACE VIEW v_scheduled_sessions_complete AS
SELECT
  ss.id,
  ss.patient_id,
  ss.therapist_id,
  ss.discipline_id,
  ss.scheduled_date,
  ss.scheduled_time,
  ss.duration_minutes,
  ss.status,
  ss.missed_reason_type,
  ss.missed_reason_description,
  ss.created_by,
  ss.progress_session_id,
  ss.justified_by,
  ss.justified_at,
  ss.notes,
  ss.created_at,
  ss.updated_at,
  ss.is_retroactive,
  ss.detection_source,

  -- ✅ NEW: Cancellation fields (padrão estabelecido pelo admin)
  ss.cancelled_by,
  ss.cancellation_reason_type,
  ss.cancellation_reason_description,
  ss.cancelled_at,

  -- Patient info
  p.name AS patient_name,
  p.dob AS patient_dob,
  p.clinic_id AS patient_clinic_id,

  -- Therapist info
  u_therapist.full_name AS therapist_name,
  u_therapist.username AS therapist_username,
  u_therapist.clinic_id AS therapist_clinic_id,
  u_therapist.role AS therapist_role,

  -- Discipline info
  d.name AS discipline_name,

  -- Creator info
  u_creator.full_name AS created_by_name,

  -- Justified by info
  u_justified.full_name AS justified_by_name,

  -- Session progress info
  ppp.session_date AS actual_session_date,
  ppp.created_at AS actual_session_time,

  -- Active programs count (for general vs specific discipline sessions)
  (
    SELECT COUNT(*)
    FROM patient_program_assignments ppa
    JOIN programs prog ON ppa.program_id = prog.id
    JOIN program_sub_areas psa ON prog.sub_area_id = psa.id
    JOIN program_areas pa ON psa.area_id = pa.id
    WHERE ppa.patient_id = ss.patient_id
      AND ppa.status = 'active'
      AND (
        ss.discipline_id IS NULL
        OR
        (ppa.therapist_id = ss.therapist_id AND pa.discipline_id = ss.discipline_id)
      )
  ) AS active_programs_count,

  -- Available programs list
  (
    SELECT string_agg(prog.name, ', ')
    FROM patient_program_assignments ppa
    JOIN programs prog ON ppa.program_id = prog.id
    JOIN program_sub_areas psa ON prog.sub_area_id = psa.id
    JOIN program_areas pa ON psa.area_id = pa.id
    WHERE ppa.patient_id = ss.patient_id
      AND ppa.status = 'active'
      AND (
        ss.discipline_id IS NULL
        OR
        (ppa.therapist_id = ss.therapist_id AND pa.discipline_id = ss.discipline_id)
      )
  ) AS available_programs

FROM scheduled_sessions ss
JOIN patients p ON ss.patient_id = p.id
JOIN users u_therapist ON ss.therapist_id = u_therapist.id
LEFT JOIN disciplines d ON ss.discipline_id = d.id
JOIN users u_creator ON ss.created_by = u_creator.id
LEFT JOIN users u_justified ON ss.justified_by = u_justified.id
LEFT JOIN patient_program_progress ppp ON ss.progress_session_id = ppp.id;

-- Grant permissions
GRANT SELECT ON v_scheduled_sessions_complete TO PUBLIC;

-- ✅ Verification: Show new cancellation columns
SELECT
    'Verification: Cancellation fields added successfully' AS status,
    COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_name = 'v_scheduled_sessions_complete'
    AND column_name IN ('cancelled_by', 'cancellation_reason_type', 'cancellation_reason_description', 'cancelled_at');
