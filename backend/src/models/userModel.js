// backend/src/models/userModel.js

const pool = require('./db.js');

/**
 * Modelo para interagir com a nova tabela 'users'.
 */
const UserModel = {

  /**
   * Encontra um utilizador pelo seu nome de utilizador.
   * @param {string} username - O nome de utilizador a ser procurado.
   * @returns {Promise<object|undefined>} O objeto do utilizador ou undefined se não for encontrado.
   */
  async findByUsername(username) {
    const query = `
      SELECT 
        id, clinic_id, username, password_hash, 
        full_name, role, is_admin, associated_patient_id
      FROM users 
      WHERE username = $1
    `;
    const { rows } = await pool.query(query, [username]);
    return rows[0];
  },

  /**
   * Encontra um utilizador pelo seu ID.
   * @param {number} id - O ID do utilizador.
   * @returns {Promise<object|undefined>} O objeto do utilizador ou undefined.
   */
  async findById(id) {
    const query = `
      SELECT 
        id, clinic_id, username, password_hash, 
        full_name, role, is_admin, associated_patient_id
      FROM users 
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  /**
   * Cria um novo utilizador no banco de dados.
   * @param {object} userData - Os dados do utilizador a serem criados.
   * @returns {Promise<object>} O novo objeto do utilizador criado.
   */
  async create(userData) {
    const {
      clinic_id,
      username,
      password_hash, // Pode ser nulo
      full_name,
      role,
      is_admin = false,
      associated_patient_id = null
    } = userData;
    
    const query = `
      INSERT INTO users (
        clinic_id, username, password_hash, full_name, 
        role, is_admin, associated_patient_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, clinic_id, username, full_name, role, is_admin, created_at
    `;
    
    const values = [
      clinic_id, username, password_hash, full_name, 
      role, is_admin, associated_patient_id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /**
   * Define ou atualiza a senha de um utilizador.
   * Essencial para o fluxo de "primeiro login".
   * @param {number} userId - O ID do utilizador a ter a senha atualizada.
   * @param {string} hashedPassword - O novo hash da senha.
   * @returns {Promise<boolean>} True se a atualização for bem-sucedida, false caso contrário.
   */
  async setPassword(userId, hashedPassword) {
    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    const { rowCount } = await pool.query(query, [hashedPassword, userId]);
    return rowCount > 0;
  },

  /**
   * Busca todos os utilizadores (terapeutas e pais) de uma clínica específica.
   * @param {number} clinicId - O ID da clínica.
   * @returns {Promise<Array<object>>} Uma lista de objetos de utilizador.
   */
  async findAllByClinicId(clinicId) {
    const query = `
      SELECT 
        id, username, full_name, role, is_admin, associated_patient_id, created_at
      FROM users 
      WHERE clinic_id = $1
      ORDER BY is_admin DESC, role, full_name ASC
    `;
    const { rows } = await pool.query(query, [clinicId]);
    return rows;
  }

  // Outras funções de atualização e remoção serão adicionadas conforme necessário.
};

module.exports = UserModel;
