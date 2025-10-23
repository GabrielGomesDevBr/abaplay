// backend/src/models/therapistAvailabilityModel.js

const pool = require('./db');

/**
 * Model para gerenciar disponibilidade de horários dos terapeutas
 * Implementa abordagem híbrida: terapeuta e admin podem gerenciar
 */
const therapistAvailabilityModel = {

  // ================================================================
  // HORÁRIO PADRÃO (THERAPIST_AVAILABILITY_TEMPLATE)
  // ================================================================

  /**
   * Busca horários padrão de trabalho de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @returns {Promise<Array>} Lista de horários por dia da semana
   */
  async getTherapistScheduleTemplate(therapistId) {
    const query = `
      SELECT
        id,
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        is_active,
        notes,
        created_at,
        updated_at
      FROM therapist_availability_template
      WHERE therapist_id = $1
      ORDER BY day_of_week ASC, start_time ASC
    `;

    const result = await pool.query(query, [therapistId]);
    return result.rows;
  },

  /**
   * Adiciona um horário padrão de trabalho
   * @param {Object} scheduleData - Dados do horário
   * @returns {Promise<Object>} Horário criado
   */
  async addScheduleTemplate(scheduleData) {
    const {
      therapist_id,
      day_of_week,
      start_time,
      end_time,
      notes
    } = scheduleData;

    // Verificar se já existe horário conflitante neste dia
    const conflictCheck = `
      SELECT id FROM therapist_availability_template
      WHERE therapist_id = $1
        AND day_of_week = $2
        AND is_active = true
        AND (
          (start_time <= $3 AND end_time > $3)  -- Novo início dentro do existente
          OR (start_time < $4 AND end_time >= $4)  -- Novo fim dentro do existente
          OR (start_time >= $3 AND end_time <= $4)  -- Novo engloba existente
        )
    `;

    const conflict = await pool.query(conflictCheck, [
      therapist_id,
      day_of_week,
      start_time,
      end_time
    ]);

    if (conflict.rows.length > 0) {
      throw new Error('Já existe um horário cadastrado que conflita com este período');
    }

    const insertQuery = `
      INSERT INTO therapist_availability_template
        (therapist_id, day_of_week, start_time, end_time, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      therapist_id,
      day_of_week,
      start_time,
      end_time,
      notes || null
    ]);

    return result.rows[0];
  },

  /**
   * Atualiza um horário padrão existente
   * @param {number} id - ID do horário
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} Horário atualizado
   */
  async updateScheduleTemplate(id, updateData) {
    const { start_time, end_time, is_active, notes } = updateData;

    const query = `
      UPDATE therapist_availability_template
      SET
        start_time = COALESCE($2, start_time),
        end_time = COALESCE($3, end_time),
        is_active = COALESCE($4, is_active),
        notes = COALESCE($5, notes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [
      id,
      start_time || null,
      end_time || null,
      is_active !== undefined ? is_active : null,
      notes || null
    ]);

    if (result.rows.length === 0) {
      throw new Error('Horário não encontrado');
    }

    return result.rows[0];
  },

  /**
   * Remove um horário padrão
   * @param {number} id - ID do horário
   * @returns {Promise<boolean>} True se removeu
   */
  async deleteScheduleTemplate(id) {
    const query = `
      DELETE FROM therapist_availability_template
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0;
  },

  // ================================================================
  // AUSÊNCIAS E BLOQUEIOS (THERAPIST_ABSENCES)
  // ================================================================

  /**
   * Busca ausências de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<Array>} Lista de ausências
   */
  async getTherapistAbsences(therapistId, filters = {}) {
    const { include_past = false, pending_only = false } = filters;

    let query = `
      SELECT
        ta.id,
        ta.therapist_id,
        ta.absence_type,
        ta.start_date,
        ta.end_date,
        ta.start_time,
        ta.end_time,
        ta.reason,
        ta.status,
        ta.approved_by,
        ta.approved_at,
        ta.created_at,
        u.full_name as approved_by_name
      FROM therapist_absences ta
      LEFT JOIN users u ON u.id = ta.approved_by
      WHERE ta.therapist_id = $1
    `;

    const params = [therapistId];

    // Filtrar ausências futuras apenas
    if (!include_past) {
      query += ` AND ta.end_date >= CURRENT_DATE`;
    }

    // Filtrar apenas pendentes de aprovação
    if (pending_only) {
      query += ` AND ta.status = 'pending'`;
    }

    query += ` ORDER BY ta.start_date ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  /**
   * Busca todas as ausências pendentes de aprovação (para admin)
   * @returns {Promise<Array>} Lista de ausências pendentes
   */
  async getPendingAbsences() {
    const query = `
      SELECT
        ta.id,
        ta.therapist_id,
        ta.absence_type,
        ta.start_date,
        ta.end_date,
        ta.start_time,
        ta.end_time,
        ta.reason,
        ta.status,
        ta.created_at,
        u.full_name as therapist_name
      FROM therapist_absences ta
      INNER JOIN users u ON u.id = ta.therapist_id
      WHERE ta.status = 'pending'
        AND ta.end_date >= CURRENT_DATE
      ORDER BY ta.created_at ASC
    `;

    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Cria uma nova ausência/bloqueio
   * @param {Object} absenceData - Dados da ausência
   * @returns {Promise<Object>} Ausência criada
   */
  async createAbsence(absenceData) {
    const {
      therapist_id,
      absence_type,
      start_date,
      end_date,
      start_time,
      end_time,
      reason,
      auto_approve // Se true, aprova automaticamente (admin ou bloqueio curto)
    } = absenceData;

    // Calcular dias de ausência
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const diffDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

    // Definir status inicial
    let status = 'pending';
    let approved_by = null;
    let approved_at = null;

    // Auto-aprovar se:
    // 1. Admin está criando (auto_approve = true)
    // 2. Bloqueio curto (<= 5 dias)
    if (auto_approve || diffDays <= 5) {
      status = 'approved';
      approved_by = absenceData.approved_by || null;
      approved_at = new Date();
    }

    const insertQuery = `
      INSERT INTO therapist_absences
        (therapist_id, absence_type, start_date, end_date, start_time, end_time,
         reason, status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      therapist_id,
      absence_type,
      start_date,
      end_date,
      start_time || null,
      end_time || null,
      reason || null,
      status,
      approved_by,
      approved_at
    ]);

    return result.rows[0];
  },

  /**
   * Aprova ou rejeita uma ausência (admin apenas)
   * @param {number} absenceId - ID da ausência
   * @param {string} newStatus - 'approved' ou 'rejected'
   * @param {number} approvedBy - ID do admin que está aprovando
   * @returns {Promise<Object>} Ausência atualizada
   */
  async updateAbsenceStatus(absenceId, newStatus, approvedBy) {
    const query = `
      UPDATE therapist_absences
      SET
        status = $2,
        approved_by = $3,
        approved_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [absenceId, newStatus, approvedBy]);

    if (result.rows.length === 0) {
      throw new Error('Ausência não encontrada');
    }

    return result.rows[0];
  },

  /**
   * Remove uma ausência
   * @param {number} absenceId - ID da ausência
   * @returns {Promise<boolean>} True se removeu
   */
  async deleteAbsence(absenceId) {
    const query = `
      DELETE FROM therapist_absences
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [absenceId]);
    return result.rows.length > 0;
  },

  /**
   * Verifica conflitos de agendamentos com período de bloqueio
   * @param {number} therapistId - ID do terapeuta
   * @param {string} startDate - Data inicial
   * @param {string} endDate - Data final
   * @param {string} startTime - Horário inicial (opcional)
   * @param {string} endTime - Horário final (opcional)
   * @returns {Promise<Array>} Lista de agendamentos conflitantes
   */
  async checkAppointmentConflicts(therapistId, startDate, endDate, startTime = null, endTime = null) {
    let query = `
      SELECT
        s.id,
        s.scheduled_date,
        s.scheduled_time,
        s.duration_minutes,
        p.name as patient_name,
        d.name as discipline_name
      FROM sessions s
      INNER JOIN patients p ON p.id = s.patient_id
      LEFT JOIN disciplines d ON d.id = s.discipline_id
      WHERE s.therapist_id = $1
        AND s.status NOT IN ('cancelled', 'missed')
        AND s.scheduled_date BETWEEN $2 AND $3
    `;

    const params = [therapistId, startDate, endDate];

    // Se tem horário específico, verificar conflito de horário também
    if (startTime && endTime) {
      query += ` AND s.scheduled_time BETWEEN $4 AND $5`;
      params.push(startTime, endTime);
    }

    query += ` ORDER BY s.scheduled_date ASC, s.scheduled_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
};

module.exports = therapistAvailabilityModel;
