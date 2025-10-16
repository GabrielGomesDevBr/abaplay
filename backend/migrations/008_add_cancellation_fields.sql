-- Migration: Add cancellation fields to scheduled_sessions
-- Description: Adds fields to track appointment cancellations by therapists
-- Date: 2025-10-14

-- Add cancellation tracking fields
ALTER TABLE scheduled_sessions
ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(200),
ADD COLUMN IF NOT EXISTS cancellation_notes TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add comment to explain the fields
COMMENT ON COLUMN scheduled_sessions.cancelled_by IS 'Who cancelled: therapist, patient, admin';
COMMENT ON COLUMN scheduled_sessions.cancellation_reason IS 'Pre-defined cancellation reason';
COMMENT ON COLUMN scheduled_sessions.cancellation_notes IS 'Additional justification notes';
COMMENT ON COLUMN scheduled_sessions.cancelled_at IS 'Timestamp when cancellation occurred';

-- Update view to include cancellation data
CREATE OR REPLACE VIEW v_scheduled_sessions_complete AS
SELECT
    ss.id,
    ss.recurring_template_id,
    ss.scheduled_date,
    ss.scheduled_time,
    ss.duration_minutes,
    ss.status,
    ss.notes,
    ss.missed_reason,
    ss.missed_by,
    ss.cancelled_by,
    ss.cancellation_reason,
    ss.cancellation_notes,
    ss.cancelled_at,
    ss.created_at,
    ss.updated_at,

    -- Patient info
    ss.patient_id,
    p.name as patient_name,
    p.birth_date as patient_birth_date,

    -- Therapist info
    ss.therapist_id,
    u.name as therapist_name,
    u.email as therapist_email,

    -- Discipline info (null for general sessions)
    ss.discipline_id,
    d.name as discipline_name,

    -- Clinic info
    ss.clinic_id,
    c.name as clinic_name,

    -- Recurring template info
    rt.recurrence_pattern,
    rt.recurrence_interval,
    rt.is_paused as template_is_paused,
    rt.pause_reason as template_pause_reason,

    -- Count active programs for this patient/therapist combination
    CASE
        WHEN ss.discipline_id IS NULL THEN (
            -- General sessions: count ALL patient programs
            SELECT COUNT(DISTINCT ppa.id)
            FROM patient_program_assignments ppa
            WHERE ppa.patient_id = ss.patient_id
              AND ppa.status = 'active'
        )
        ELSE (
            -- Discipline-specific: count only therapist programs in that discipline
            SELECT COUNT(DISTINCT ppa.id)
            FROM patient_program_assignments ppa
            INNER JOIN programs pr ON ppa.program_id = pr.id
            WHERE ppa.patient_id = ss.patient_id
              AND ppa.therapist_id = ss.therapist_id
              AND pr.discipline_id = ss.discipline_id
              AND ppa.status = 'active'
        )
    END as active_programs_count

FROM scheduled_sessions ss
INNER JOIN patients p ON ss.patient_id = p.id
INNER JOIN users u ON ss.therapist_id = u.id
INNER JOIN clinics c ON ss.clinic_id = c.id
LEFT JOIN disciplines d ON ss.discipline_id = d.id
LEFT JOIN recurring_appointment_templates rt ON ss.recurring_template_id = rt.id;

-- Grant permissions
GRANT SELECT ON v_scheduled_sessions_complete TO PUBLIC;
