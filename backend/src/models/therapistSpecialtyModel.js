// backend/src/models/therapistSpecialtyModel.js

const pool = require('./db');

/**
 * Model para gerenciar especialidades dos terapeutas
 */
const therapistSpecialtyModel = {
  /**
   * Busca todas as especialidades de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @returns {Promise<Array>} Lista de especialidades com informações da disciplina
   */
  async getTherapistSpecialties(therapistId) {
    const query = `
      SELECT
        ts.therapist_id,
        ts.discipline_id,
        d.name as discipline_name,
        ts.certification_date,
        ts.notes,
        ts.created_at
      FROM therapist_specialties ts
      INNER JOIN disciplines d ON d.id = ts.discipline_id
      WHERE ts.therapist_id = $1
      ORDER BY d.name ASC
    `;

    const result = await pool.query(query, [therapistId]);
    return result.rows;
  },

  /**
   * Adiciona uma especialidade ao terapeuta
   * @param {Object} specialtyData - Dados da especialidade
   * @param {number} specialtyData.therapist_id - ID do terapeuta
   * @param {number} specialtyData.discipline_id - ID da disciplina
   * @param {string} specialtyData.certification_date - Data de certificação (opcional)
   * @param {string} specialtyData.notes - Observações (opcional)
   * @returns {Promise<Object>} Especialidade criada
   */
  async addTherapistSpecialty(specialtyData) {
    const { therapist_id, discipline_id, certification_date, notes } = specialtyData;

    // Verificar se já existe
    const checkQuery = `
      SELECT 1 FROM therapist_specialties
      WHERE therapist_id = $1 AND discipline_id = $2
    `;
    const existing = await pool.query(checkQuery, [therapist_id, discipline_id]);

    if (existing.rows.length > 0) {
      throw new Error('Este terapeuta já possui esta especialidade');
    }

    const insertQuery = `
      INSERT INTO therapist_specialties
        (therapist_id, discipline_id, certification_date, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      therapist_id,
      discipline_id,
      certification_date || null,
      notes || null
    ]);

    return result.rows[0];
  },

  /**
   * Remove uma especialidade do terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @param {number} disciplineId - ID da disciplina
   * @returns {Promise<boolean>} True se removeu com sucesso
   */
  async removeTherapistSpecialty(therapistId, disciplineId) {
    const query = `
      DELETE FROM therapist_specialties
      WHERE therapist_id = $1 AND discipline_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [therapistId, disciplineId]);
    return result.rows.length > 0;
  },

  /**
   * Atualiza informações de uma especialidade existente
   * @param {number} therapistId - ID do terapeuta
   * @param {number} disciplineId - ID da disciplina
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} Especialidade atualizada
   */
  async updateTherapistSpecialty(therapistId, disciplineId, updateData) {
    const { certification_date, notes } = updateData;

    const query = `
      UPDATE therapist_specialties
      SET
        certification_date = COALESCE($3, certification_date),
        notes = COALESCE($4, notes)
      WHERE therapist_id = $1 AND discipline_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [
      therapistId,
      disciplineId,
      certification_date || null,
      notes || null
    ]);

    if (result.rows.length === 0) {
      throw new Error('Especialidade não encontrada');
    }

    return result.rows[0];
  },

  /**
   * Verifica se um terapeuta tem especialidade em uma disciplina
   * @param {number} therapistId - ID do terapeuta
   * @param {number} disciplineId - ID da disciplina
   * @returns {Promise<boolean>} True se tem especialidade
   */
  async hasSpecialty(therapistId, disciplineId) {
    const query = `
      SELECT 1 FROM therapist_specialties
      WHERE therapist_id = $1 AND discipline_id = $2
    `;

    const result = await pool.query(query, [therapistId, disciplineId]);
    return result.rows.length > 0;
  }
};

module.exports = therapistSpecialtyModel;
