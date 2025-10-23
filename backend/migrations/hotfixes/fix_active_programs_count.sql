-- Migration: Fix active_programs_count to show all patient programs for general sessions
-- Author: Claude Code
-- Date: 2025-10-04
--
-- Issue: When creating a "Sessão Geral" (discipline_id = NULL), the view was showing
-- only the programs assigned to the selected therapist, not all patient's active programs.
--
-- Fix: Modified the subquery to:
-- - For general sessions (discipline_id IS NULL): count ALL active programs of the patient
-- - For specific discipline sessions: count only programs from that therapist in that discipline

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
  p.name AS patient_name,
  p.dob AS patient_dob,
  p.clinic_id AS patient_clinic_id,
  u_therapist.full_name AS therapist_name,
  u_therapist.username AS therapist_username,
  u_therapist.clinic_id AS therapist_clinic_id,
  u_therapist.role AS therapist_role,
  d.name AS discipline_name,
  u_creator.full_name AS created_by_name,
  u_justified.full_name AS justified_by_name,
  ppp.session_date AS actual_session_date,
  ppp.created_at AS actual_session_time,

  -- ✅ FIXED: active_programs_count logic
  -- For general sessions (discipline_id IS NULL): count ALL patient's active programs
  -- For specific discipline: count only therapist's programs in that discipline
  (
    SELECT COUNT(*)
    FROM patient_program_assignments ppa
    JOIN programs prog ON ppa.program_id = prog.id
    JOIN program_sub_areas psa ON prog.sub_area_id = psa.id
    JOIN program_areas pa ON psa.area_id = pa.id
    WHERE ppa.patient_id = ss.patient_id
      AND ppa.status = 'active'
      AND (
        -- General session: all programs of the patient
        ss.discipline_id IS NULL
        OR
        -- Specific discipline: only therapist's programs in that discipline
        (ppa.therapist_id = ss.therapist_id AND pa.discipline_id = ss.discipline_id)
      )
  ) AS active_programs_count,

  -- ✅ FIXED: available_programs logic (same fix as above)
  (
    SELECT string_agg(prog.name, ', ')
    FROM patient_program_assignments ppa
    JOIN programs prog ON ppa.program_id = prog.id
    JOIN program_sub_areas psa ON prog.sub_area_id = psa.id
    JOIN program_areas pa ON psa.area_id = pa.id
    WHERE ppa.patient_id = ss.patient_id
      AND ppa.status = 'active'
      AND (
        -- General session: all programs of the patient
        ss.discipline_id IS NULL
        OR
        -- Specific discipline: only therapist's programs in that discipline
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

-- Grant necessary permissions
GRANT SELECT ON v_scheduled_sessions_complete TO PUBLIC;
