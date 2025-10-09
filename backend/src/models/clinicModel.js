// backend/src/models/clinicModel.js

const pool = require('./db.js');

/**
 * Modelo para interagir com a tabela 'clinics' no banco de dados.
 */
const ClinicModel = {
  /**
   * Cria uma nova clínica no banco de dados.
   * @param {object} clinicData - Os dados da clínica (atualmente, apenas o nome).
   * @returns {Promise<object>} O novo objeto da clínica criada.
   */
  async create(clinicData) {
    const { name } = clinicData;
    const query = `
      INSERT INTO clinics (name)
      VALUES ($1)
      RETURNING id, name, created_at
    `;
    const { rows } = await pool.query(query, [name]);
    return rows[0];
  },

  /**
   * <<< NOVA FUNÇÃO >>>
   * Busca uma clínica pelo seu ID.
   * @param {number} clinicId - O ID da clínica a ser procurada.
   * @returns {Promise<object|undefined>} O objeto da clínica ou undefined se não for encontrada.
   */
  async findById(clinicId) {
    const query = `
      SELECT
        id,
        name,
        max_patients,
        subscription_plan,
        trial_pro_enabled,
        trial_pro_expires_at,
        created_at
      FROM clinics
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [clinicId]);
    return rows[0];
  },
};

module.exports = ClinicModel;
