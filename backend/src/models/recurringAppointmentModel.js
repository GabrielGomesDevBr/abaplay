// backend/src/models/recurringAppointmentModel.js

const pool = require('./db');

/**
 * Modelo para gerenciar templates de agendamentos recorrentes
 * Adaptado para a estrutura atual (patient_id + therapist_id + discipline_id)
 */
const RecurringAppointmentModel = {

    /**
     * Criar template de recorrência
     * @param {Object} templateData - Dados do template
     * @returns {Promise<Object>} Template criado
     */
    async createTemplate(templateData) {
        const {
            patient_id,
            therapist_id,
            discipline_id = null,
            recurrence_type,
            day_of_week,
            scheduled_time,
            duration_minutes = 60,
            start_date,
            end_date = null,
            generate_weeks_ahead = 4,
            skip_holidays = false,
            created_by,
            notes = null
        } = templateData;

        // Validar relacionamentos
        await this.validateRelationships(patient_id, therapist_id, discipline_id);

        const query = `
            INSERT INTO recurring_appointment_templates (
                patient_id, therapist_id, discipline_id,
                recurrence_type, day_of_week, scheduled_time, duration_minutes,
                start_date, end_date, generate_weeks_ahead, skip_holidays,
                created_by, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            patient_id, therapist_id, discipline_id,
            recurrence_type, day_of_week, scheduled_time, duration_minutes,
            start_date, end_date, generate_weeks_ahead, skip_holidays,
            created_by, notes
        ];

        try {
            const { rows } = await pool.query(query, values);
            console.log(`[RECURRING] Template criado: ID ${rows[0].id}, Paciente ${patient_id}, Terapeuta ${therapist_id}`);
            return rows[0];
        } catch (error) {
            console.error('[RECURRING-ERROR] Erro ao criar template:', error);
            throw error;
        }
    },

    /**
     * Validar relacionamentos (paciente, terapeuta, disciplina)
     * @param {number} patient_id
     * @param {number} therapist_id
     * @param {number} discipline_id
     */
    async validateRelationships(patient_id, therapist_id, discipline_id) {
        // Validar paciente
        const patientQuery = 'SELECT id FROM patients WHERE id = $1';
        const patientResult = await pool.query(patientQuery, [patient_id]);
        if (patientResult.rows.length === 0) {
            throw new Error(`Paciente com ID ${patient_id} não encontrado`);
        }

        // Validar terapeuta
        const therapistQuery = 'SELECT id FROM users WHERE id = $1 AND role IN (\'therapist\', \'admin\')';
        const therapistResult = await pool.query(therapistQuery, [therapist_id]);
        if (therapistResult.rows.length === 0) {
            throw new Error(`Terapeuta com ID ${therapist_id} não encontrado`);
        }

        // Validar disciplina (se fornecida)
        if (discipline_id) {
            const disciplineQuery = 'SELECT id FROM disciplines WHERE id = $1';
            const disciplineResult = await pool.query(disciplineQuery, [discipline_id]);
            if (disciplineResult.rows.length === 0) {
                throw new Error(`Disciplina com ID ${discipline_id} não encontrada`);
            }
        }
    },

    /**
     * Buscar templates ativos por clínica
     * @param {number} clinicId - ID da clínica
     * @param {Object} filters - Filtros opcionais
     * @returns {Promise<Array>} Lista de templates
     */
    async getActiveTemplates(clinicId, filters = {}) {
        if (!clinicId) {
            throw new Error('clinic_id é obrigatório');
        }

        let query = `
            SELECT * FROM v_recurring_templates_complete
            WHERE clinic_id = $1 AND is_active = true
        `;

        const values = [clinicId];
        let paramCount = 1;

        // Filtros opcionais
        if (filters.patient_id) {
            paramCount++;
            query += ` AND patient_id = $${paramCount}`;
            values.push(filters.patient_id);
        }

        if (filters.therapist_id) {
            paramCount++;
            query += ` AND therapist_id = $${paramCount}`;
            values.push(filters.therapist_id);
        }

        if (filters.status) {
            paramCount++;
            query += ` AND status_calculated = $${paramCount}`;
            values.push(filters.status);
        }

        query += ` ORDER BY created_at DESC`;

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error('[RECURRING-ERROR] Erro ao buscar templates:', error);
            throw error;
        }
    },

    /**
     * Buscar template por ID
     * @param {number} templateId - ID do template
     * @param {number} clinicId - ID da clínica (para segurança)
     * @returns {Promise<Object|null>} Template encontrado
     */
    async findById(templateId, clinicId) {
        const query = `
            SELECT * FROM v_recurring_templates_complete
            WHERE id = $1 AND clinic_id = $2
        `;

        try {
            const { rows } = await pool.query(query, [templateId, clinicId]);
            return rows[0] || null;
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao buscar template ID ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Gerar agendamentos usando função SQL
     * @param {number} templateId - ID do template
     * @param {number} weeksAhead - Semanas a gerar (opcional)
     * @returns {Promise<Array>} Resultados da geração
     */
    async generateAppointments(templateId, weeksAhead = null) {
        const query = `SELECT * FROM generate_recurring_appointments($1, $2)`;

        try {
            const { rows } = await pool.query(query, [templateId, weeksAhead]);
            const successful = rows.filter(r => r.success);
            const conflicts = rows.filter(r => !r.success);

            console.log(`[RECURRING] Template ${templateId}: ${successful.length} agendamentos gerados, ${conflicts.length} conflitos`);
            return rows;
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao gerar agendamentos do template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Atualizar template
     * @param {number} templateId - ID do template
     * @param {Object} updates - Dados para atualizar
     * @param {number} clinicId - ID da clínica (para segurança)
     * @returns {Promise<Object>} Template atualizado
     */
    async updateTemplate(templateId, updates, clinicId) {
        const allowedFields = [
            'recurrence_type', 'day_of_week', 'scheduled_time', 'duration_minutes',
            'start_date', 'end_date', 'generate_weeks_ahead', 'skip_holidays', 'notes'
        ];

        const updateFields = [];
        const values = [];
        let paramCount = 0;

        // Verificar se template pertence à clínica
        const existing = await this.findById(templateId, clinicId);
        if (!existing) {
            throw new Error('Template não encontrado ou não pertence a esta clínica');
        }

        // Construir query dinamicamente
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }

        if (updateFields.length === 0) {
            throw new Error('Nenhum campo válido para atualizar');
        }

        paramCount++;
        const query = `
            UPDATE recurring_appointment_templates
            SET ${updateFields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(templateId);

        try {
            const { rows } = await pool.query(query, values);
            console.log(`[RECURRING] Template atualizado: ID ${templateId}`);
            return rows[0];
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao atualizar template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Pausar template temporariamente
     * @param {number} templateId - ID do template
     * @param {string} reason - Motivo da pausa
     * @param {string} pauseUntil - Data até quando pausar (opcional)
     * @param {number} clinicId - ID da clínica
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async pauseTemplate(templateId, reason, pauseUntil = null, clinicId) {
        // Verificar permissão
        const existing = await this.findById(templateId, clinicId);
        if (!existing) {
            throw new Error('Template não encontrado ou não pertence a esta clínica');
        }

        const query = `SELECT pause_recurring_template($1, $2, $3) as success`;

        try {
            const { rows } = await pool.query(query, [templateId, pauseUntil, reason]);
            console.log(`[RECURRING] Template pausado: ID ${templateId}, motivo: ${reason}`);
            return rows[0].success;
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao pausar template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Reativar template pausado
     * @param {number} templateId - ID do template
     * @param {number} clinicId - ID da clínica
     * @returns {Promise<boolean>} Sucesso da operação
     */
    async resumeTemplate(templateId, clinicId) {
        // Verificar permissão
        const existing = await this.findById(templateId, clinicId);
        if (!existing) {
            throw new Error('Template não encontrado ou não pertence a esta clínica');
        }

        const query = `SELECT resume_recurring_template($1) as success`;

        try {
            const { rows } = await pool.query(query, [templateId]);
            console.log(`[RECURRING] Template reativado: ID ${templateId}`);
            return rows[0].success;
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao reativar template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Desativar template permanentemente
     * @param {number} templateId - ID do template
     * @param {string} reason - Motivo da desativação
     * @param {number} userId - ID do usuário que desativou
     * @param {number} clinicId - ID da clínica
     * @returns {Promise<Object>} Template desativado
     */
    async deactivateTemplate(templateId, reason, userId, clinicId) {
        // Verificar permissão
        const existing = await this.findById(templateId, clinicId);
        if (!existing) {
            throw new Error('Template não encontrado ou não pertence a esta clínica');
        }

        const query = `
            UPDATE recurring_appointment_templates
            SET is_active = false,
                deactivated_by = $1,
                deactivated_at = NOW(),
                deactivation_reason = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;

        try {
            const { rows } = await pool.query(query, [userId, reason, templateId]);
            console.log(`[RECURRING] Template desativado: ID ${templateId}, motivo: ${reason}`);
            return rows[0];
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao desativar template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Buscar agendamentos de um template
     * @param {number} templateId - ID do template
     * @param {Object} options - Opções de busca
     * @returns {Promise<Array>} Agendamentos do template
     */
    async getTemplateAppointments(templateId, options = {}) {
        const { start_date, end_date, status, limit = 50 } = options;

        let query = `
            SELECT ss.*, p.name as patient_name, u.full_name as therapist_name
            FROM scheduled_sessions ss
            JOIN patients p ON ss.patient_id = p.id
            JOIN users u ON ss.therapist_id = u.id
            WHERE ss.recurring_template_id = $1
        `;

        const values = [templateId];
        let paramCount = 1;

        if (start_date) {
            paramCount++;
            query += ` AND ss.scheduled_date >= $${paramCount}`;
            values.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND ss.scheduled_date <= $${paramCount}`;
            values.push(end_date);
        }

        if (status) {
            paramCount++;
            query += ` AND ss.status = $${paramCount}`;
            values.push(status);
        }

        query += ` ORDER BY ss.scheduled_date ASC LIMIT $${paramCount + 1}`;
        values.push(limit);

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error(`[RECURRING-ERROR] Erro ao buscar agendamentos do template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Verificar conflitos de um template
     * @param {Object} templateData - Dados do template
     * @returns {Promise<Array>} Lista de conflitos encontrados
     */
    async checkConflicts(templateData) {
        const { patient_id, therapist_id, day_of_week, scheduled_time, start_date, end_date } = templateData;

        const query = `
            SELECT
                ss.id,
                ss.scheduled_date,
                ss.scheduled_time,
                ss.status,
                p.name as patient_name
            FROM scheduled_sessions ss
            JOIN patients p ON ss.patient_id = p.id
            WHERE ss.therapist_id = $1
              AND EXTRACT(dow FROM ss.scheduled_date) = $2
              AND ss.scheduled_time = $3
              AND ss.scheduled_date >= $4
              AND ss.scheduled_date <= COALESCE($5, $4 + INTERVAL '1 year')
              AND ss.status IN ('scheduled', 'completed')
            ORDER BY ss.scheduled_date
            LIMIT 10
        `;

        const values = [therapist_id, day_of_week, scheduled_time, start_date, end_date];

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error('[RECURRING-ERROR] Erro ao verificar conflitos:', error);
            throw error;
        }
    },

    /**
     * Buscar templates que precisam gerar novos agendamentos
     * @param {number} clinicId - ID da clínica (opcional)
     * @returns {Promise<Array>} Templates para processar
     */
    async getTemplatesForGeneration(clinicId = null) {
        let query = `
            SELECT rat.id, rat.generate_weeks_ahead, rat.last_generation_date,
                   p.clinic_id, p.name as patient_name, u.full_name as therapist_name
            FROM recurring_appointment_templates rat
            JOIN patients p ON rat.patient_id = p.id
            JOIN users u ON rat.therapist_id = u.id
            WHERE rat.is_active = true
              AND (rat.is_paused = false OR rat.paused_until < CURRENT_DATE)
              AND (rat.end_date IS NULL OR rat.end_date > CURRENT_DATE)
              AND (
                  rat.last_generation_date IS NULL OR
                  rat.last_generation_date < CURRENT_DATE - INTERVAL '1 day'
              )
        `;

        const values = [];
        let paramCount = 0;

        if (clinicId) {
            paramCount++;
            query += ` AND p.clinic_id = $${paramCount}`;
            values.push(clinicId);
        }

        query += ` ORDER BY rat.last_generation_date ASC NULLS FIRST`;

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error('[RECURRING-ERROR] Erro ao buscar templates para geração:', error);
            throw error;
        }
    }
};

module.exports = RecurringAppointmentModel;