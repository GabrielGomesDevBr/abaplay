// backend/src/models/availabilityModel.js

const db = require('./db');

/**
 * Model para gerenciamento de disponibilidade e busca de horários
 */

// ========================================
// BUSCA DE DISPONIBILIDADE
// ========================================

/**
 * Buscar horários disponíveis usando a função SQL
 */
exports.searchAvailableSlots = async (params) => {
    const {
        clinic_id,
        discipline_ids = null,  // ALTERADO: Agora é array
        day_of_week = null,
        time_period = 'all',
        start_date = null,
        end_date = null,
        duration_minutes = 60,
        require_specialty = false,
        preferred_therapist_id = null,
        patient_id = null
    } = params;

    // CONVERSÃO: Se discipline_ids for array vazio, tratar como NULL
    const finalDisciplineIds = (discipline_ids && discipline_ids.length > 0)
        ? discipline_ids
        : null;

    const query = `
        SELECT * FROM search_available_slots(
            p_clinic_id := $1,
            p_discipline_ids := $2,  -- ALTERADO: Agora recebe array
            p_day_of_week := $3,
            p_time_period := $4,
            p_start_date := $5,
            p_end_date := $6,
            p_duration_minutes := $7,
            p_require_specialty := $8,
            p_preferred_therapist_id := $9,
            p_patient_id := $10
        )
    `;

    const result = await db.query(query, [
        clinic_id,
        finalDisciplineIds,  // PostgreSQL aceita array JavaScript diretamente
        day_of_week,
        time_period,
        start_date || new Date().toISOString().split('T')[0],
        end_date,
        duration_minutes,
        require_specialty,
        preferred_therapist_id,
        patient_id
    ]);

    return result.rows;
};

// ========================================
// ESPECIALIDADES
// ========================================

/**
 * Obter especialidades de um terapeuta
 */
exports.getTherapistSpecialties = async (therapistId) => {
    const query = `
        SELECT
            ts.*,
            d.name as discipline_name
        FROM therapist_specialties ts
        JOIN disciplines d ON ts.discipline_id = d.id
        WHERE ts.therapist_id = $1
        AND ts.is_active = true
        ORDER BY ts.main_specialty DESC, d.name ASC
    `;

    const result = await db.query(query, [therapistId]);
    return result.rows;
};

/**
 * Adicionar/atualizar especialidades de um terapeuta
 */
exports.updateTherapistSpecialties = async (therapistId, specialties, addedBy) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Desativar todas as especialidades atuais
        await client.query(
            'UPDATE therapist_specialties SET is_active = false WHERE therapist_id = $1',
            [therapistId]
        );

        // Inserir/reativar novas especialidades
        for (const spec of specialties) {
            await client.query(`
                INSERT INTO therapist_specialties (
                    therapist_id,
                    discipline_id,
                    main_specialty,
                    years_of_experience,
                    added_by
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (therapist_id, discipline_id)
                DO UPDATE SET
                    is_active = true,
                    main_specialty = EXCLUDED.main_specialty,
                    years_of_experience = EXCLUDED.years_of_experience,
                    updated_at = NOW()
            `, [
                therapistId,
                spec.discipline_id,
                spec.main_specialty || false,
                spec.years_of_experience || null,
                addedBy
            ]);
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ========================================
// DISPONIBILIDADE PADRÃO
// ========================================

/**
 * Obter horários de trabalho padrão de um terapeuta
 */
exports.getTherapistAvailability = async (therapistId) => {
    const query = `
        SELECT *
        FROM therapist_availability_template
        WHERE therapist_id = $1
        AND is_active = true
        ORDER BY day_of_week, start_time
    `;

    const result = await db.query(query, [therapistId]);
    return result.rows;
};

/**
 * Definir horários de trabalho padrão
 */
exports.setTherapistAvailability = async (therapistId, schedules) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Desativar horários atuais
        await client.query(
            'UPDATE therapist_availability_template SET is_active = false WHERE therapist_id = $1',
            [therapistId]
        );

        // Inserir novos horários
        for (const schedule of schedules) {
            await client.query(`
                INSERT INTO therapist_availability_template (
                    therapist_id,
                    day_of_week,
                    start_time,
                    end_time,
                    notes
                )
                VALUES ($1, $2, $3, $4, $5)
            `, [
                therapistId,
                schedule.day_of_week,
                schedule.start_time,
                schedule.end_time,
                schedule.notes || null
            ]);
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ========================================
// AUSÊNCIAS
// ========================================

/**
 * Criar ausência
 */
exports.createAbsence = async (absenceData) => {
    const {
        therapist_id,
        absence_type,
        start_date,
        end_date,
        start_time = null,
        end_time = null,
        reason = null,
        approved_by
    } = absenceData;

    const query = `
        INSERT INTO therapist_absences (
            therapist_id,
            absence_type,
            start_date,
            end_date,
            start_time,
            end_time,
            reason,
            approved_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `;

    const result = await db.query(query, [
        therapist_id,
        absence_type,
        start_date,
        end_date,
        start_time,
        end_time,
        reason,
        approved_by
    ]);

    return result.rows[0];
};

/**
 * Obter ausências de um terapeuta
 */
exports.getTherapistAbsences = async (therapistId, futureOnly = true) => {
    const query = `
        SELECT *
        FROM therapist_absences
        WHERE therapist_id = $1
        ${futureOnly ? 'AND end_date >= CURRENT_DATE' : ''}
        ORDER BY start_date DESC
    `;

    const result = await db.query(query, [therapistId]);
    return result.rows;
};

/**
 * Deletar ausência
 */
exports.deleteAbsence = async (absenceId) => {
    const query = 'DELETE FROM therapist_absences WHERE id = $1 RETURNING *';
    const result = await db.query(query, [absenceId]);
    return result.rows[0];
};

// ========================================
// SALAS
// ========================================

/**
 * Criar sala
 */
exports.createRoom = async (roomData) => {
    const {
        clinic_id,
        name,
        room_type = null,
        capacity = 1,
        has_mirror = false,
        has_sensory_equipment = false,
        equipment_notes = null
    } = roomData;

    const query = `
        INSERT INTO clinic_rooms (
            clinic_id,
            name,
            room_type,
            capacity,
            has_mirror,
            has_sensory_equipment,
            equipment_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const result = await db.query(query, [
        clinic_id,
        name,
        room_type,
        capacity,
        has_mirror,
        has_sensory_equipment,
        equipment_notes
    ]);

    return result.rows[0];
};

/**
 * Obter salas da clínica
 */
exports.getRooms = async (clinicId, activeOnly = true) => {
    const query = `
        SELECT *
        FROM clinic_rooms
        WHERE clinic_id = $1
        ${activeOnly ? 'AND is_active = true' : ''}
        ORDER BY display_order, name
    `;

    const result = await db.query(query, [clinicId]);
    return result.rows;
};

/**
 * Obter salas disponíveis em determinado horário
 */
exports.getAvailableRooms = async (clinicId, date, time, duration = 60) => {
    const query = `
        SELECT cr.*
        FROM clinic_rooms cr
        WHERE cr.clinic_id = $1
        AND cr.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM scheduled_sessions ss
            WHERE ss.room_id = cr.id
            AND ss.scheduled_date = $2
            AND ss.status IN ('scheduled', 'completed')
            AND (
                (ss.scheduled_time < $3::TIME + ($4 || ' minutes')::INTERVAL)
                AND
                ((ss.scheduled_time + (ss.duration_minutes || ' minutes')::INTERVAL) > $3::TIME)
            )
        )
        ORDER BY cr.display_order, cr.name
    `;

    const result = await db.query(query, [clinicId, date, time, duration]);
    return result.rows;
};

/**
 * Atualizar sala
 */
exports.updateRoom = async (roomId, roomData) => {
    const {
        name,
        room_type,
        capacity,
        has_mirror,
        has_sensory_equipment,
        equipment_notes,
        is_active,
        display_order
    } = roomData;

    const query = `
        UPDATE clinic_rooms
        SET
            name = COALESCE($1, name),
            room_type = COALESCE($2, room_type),
            capacity = COALESCE($3, capacity),
            has_mirror = COALESCE($4, has_mirror),
            has_sensory_equipment = COALESCE($5, has_sensory_equipment),
            equipment_notes = COALESCE($6, equipment_notes),
            is_active = COALESCE($7, is_active),
            display_order = COALESCE($8, display_order),
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
    `;

    const result = await db.query(query, [
        name,
        room_type,
        capacity,
        has_mirror,
        has_sensory_equipment,
        equipment_notes,
        is_active,
        display_order,
        roomId
    ]);

    return result.rows[0];
};

/**
 * Desativar sala
 */
exports.deleteRoom = async (roomId) => {
    const query = `
        UPDATE clinic_rooms
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;

    const result = await db.query(query, [roomId]);
    return result.rows[0];
};

// ========================================
// PREFERÊNCIAS PACIENTE-TERAPEUTA
// ========================================

/**
 * Definir preferência
 */
exports.setPatientPreference = async (preferenceData) => {
    const {
        patient_id,
        therapist_id,
        preference_type,
        notes = null,
        set_by
    } = preferenceData;

    const query = `
        INSERT INTO patient_therapist_preferences (
            patient_id,
            therapist_id,
            preference_type,
            notes,
            set_by
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (patient_id, therapist_id)
        DO UPDATE SET
            preference_type = EXCLUDED.preference_type,
            notes = EXCLUDED.notes,
            set_by = EXCLUDED.set_by,
            updated_at = NOW()
        RETURNING *
    `;

    const result = await db.query(query, [
        patient_id,
        therapist_id,
        preference_type,
        notes,
        set_by
    ]);

    return result.rows[0];
};

/**
 * Obter preferências de um paciente
 */
exports.getPatientPreferences = async (patientId) => {
    const query = `
        SELECT
            ptp.*,
            u.full_name as therapist_name
        FROM patient_therapist_preferences ptp
        JOIN users u ON ptp.therapist_id = u.id
        WHERE ptp.patient_id = $1
        ORDER BY ptp.preference_type, u.full_name
    `;

    const result = await db.query(query, [patientId]);
    return result.rows;
};

// ========================================
// CONFIGURAÇÕES DE DISCIPLINA
// ========================================

/**
 * Definir configurações de disciplina
 */
exports.setDisciplineSettings = async (clinicId, settings) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        for (const setting of settings) {
            await client.query(`
                INSERT INTO clinic_discipline_settings (
                    clinic_id,
                    discipline_id,
                    default_session_duration,
                    allowed_durations
                )
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (clinic_id, discipline_id)
                DO UPDATE SET
                    default_session_duration = EXCLUDED.default_session_duration,
                    allowed_durations = EXCLUDED.allowed_durations,
                    updated_at = NOW()
            `, [
                clinicId,
                setting.discipline_id,
                setting.default_session_duration,
                setting.allowed_durations
            ]);
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Obter configurações de disciplinas
 */
exports.getDisciplineSettings = async (clinicId) => {
    const query = `
        SELECT
            cds.*,
            d.name as discipline_name
        FROM clinic_discipline_settings cds
        JOIN disciplines d ON cds.discipline_id = d.id
        WHERE cds.clinic_id = $1
        ORDER BY d.name
    `;

    const result = await db.query(query, [clinicId]);
    return result.rows;
};

// ========================================
// GERENCIAMENTO ADMIN DE DISPONIBILIDADE
// ========================================

/**
 * Obter lista de terapeutas com informações de disponibilidade e permissões
 */
exports.getTherapistsAvailabilityOverview = async (clinicId) => {
    const query = `
        SELECT
            u.id,
            u.full_name,
            u.username,
            u.contract_type,
            u.can_edit_own_schedule,
            u.default_weekly_hours,
            COUNT(DISTINCT tat.id) as total_schedules,
            COUNT(DISTINCT ts.id) as total_specialties,
            COUNT(DISTINCT ta.id) FILTER (WHERE ta.end_date >= CURRENT_DATE) as active_absences
        FROM users u
        LEFT JOIN therapist_availability_template tat ON u.id = tat.therapist_id AND tat.is_active = true
        LEFT JOIN therapist_specialties ts ON u.id = ts.therapist_id AND ts.is_active = true
        LEFT JOIN therapist_absences ta ON u.id = ta.therapist_id
        WHERE u.clinic_id = $1
        AND u.role = 'terapeuta'
        GROUP BY u.id, u.full_name, u.username, u.contract_type, u.can_edit_own_schedule, u.default_weekly_hours
        ORDER BY u.full_name
    `;

    const result = await db.query(query, [clinicId]);
    return result.rows;
};

/**
 * Atualizar permissões de um terapeuta
 */
exports.updateTherapistPermissions = async (therapistId, permissionsData, changedBy) => {
    const {
        contract_type,
        can_edit_own_schedule,
        default_weekly_hours
    } = permissionsData;

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Buscar valores antigos para log
        const oldDataResult = await client.query(
            'SELECT contract_type, can_edit_own_schedule, default_weekly_hours FROM users WHERE id = $1',
            [therapistId]
        );
        const oldData = oldDataResult.rows[0];

        // Atualizar permissões
        const updateQuery = `
            UPDATE users
            SET
                contract_type = COALESCE($1, contract_type),
                can_edit_own_schedule = COALESCE($2, can_edit_own_schedule),
                default_weekly_hours = COALESCE($3, default_weekly_hours),
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            contract_type,
            can_edit_own_schedule,
            default_weekly_hours,
            therapistId
        ]);

        // Registrar log de alteração
        await client.query(`
            INSERT INTO availability_changes_log (
                therapist_id,
                changed_by,
                change_type,
                description,
                old_value,
                new_value
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            therapistId,
            changedBy,
            'config_changed',
            'Permissões de disponibilidade atualizadas pelo administrador',
            JSON.stringify(oldData),
            JSON.stringify(result.rows[0])
        ]);

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Obter log de alterações de um terapeuta
 */
exports.getTherapistChangesLog = async (therapistId, limit = 50) => {
    const query = `
        SELECT
            acl.*,
            u.full_name as changed_by_name
        FROM availability_changes_log acl
        JOIN users u ON acl.changed_by = u.id
        WHERE acl.therapist_id = $1
        ORDER BY acl.created_at DESC
        LIMIT $2
    `;

    const result = await db.query(query, [therapistId, limit]);
    return result.rows;
};

module.exports = exports;
