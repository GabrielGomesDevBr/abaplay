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
        full_name, role, is_admin, associated_patient_id,
        terms_accepted_at, terms_version, terms_ip_address
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
        full_name, role, is_admin, associated_patient_id,
        terms_accepted_at, terms_version, terms_ip_address
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
  },

  /**
   * Atualiza os dados de um utilizador existente.
   * @param {number} userId - O ID do utilizador a ser atualizado.
   * @param {object} updateData - Um objeto com os campos a serem atualizados.
   * @param {number} clinicId - O ID da clínica do admin para verificação de permissão.
   * @returns {Promise<object|undefined>} O objeto do utilizador atualizado.
   */
  async update(userId, updateData, clinicId) {
    const { full_name, username, role, associated_patient_id, password_hash } = updateData;
    const fields = [];
    const values = [];
    let queryIndex = 1;

    if (full_name !== undefined) { fields.push(`full_name = $${queryIndex++}`); values.push(full_name); }
    if (username !== undefined) { fields.push(`username = $${queryIndex++}`); values.push(username); }
    if (role !== undefined) { fields.push(`role = $${queryIndex++}`); values.push(role); }
    
    // <<< CORREÇÃO APLICADA AQUI >>>
    // Agora, verificamos se associated_patient_id foi passado. Se for um valor "falsy"
    // (como uma string vazia ""), ele será convertido para null, o que é válido para a base de dados.
    if (associated_patient_id !== undefined) { 
      fields.push(`associated_patient_id = $${queryIndex++}`); 
      values.push(associated_patient_id || null);
    }
    
    if (password_hash !== undefined) { fields.push(`password_hash = $${queryIndex++}`); values.push(password_hash); }

    if (fields.length === 0) {
      return this.findById(userId); // Retorna o utilizador sem alterações se nada for passado
    }

    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${queryIndex++} AND clinic_id = $${queryIndex++}
      RETURNING id, clinic_id, username, full_name, role, is_admin, created_at
    `;
    
    values.push(userId, clinicId);

    const { rows } = await pool.query(query, values);
    return rows[0];
  },
  
  /**
   * Apaga um utilizador do banco de dados, verificando a sua clínica.
   * @param {number} userId - O ID do utilizador a ser apagado.
   * @param {number} clinicId - O ID da clínica do admin para verificação de permissão.
   * @returns {Promise<number>} O número de linhas afetadas (0 ou 1).
   */
  async delete(userId, clinicId) {
    const query = `
      DELETE FROM users 
      WHERE id = $1 AND clinic_id = $2
    `;
    try {
      const { rowCount } = await pool.query(query, [userId, clinicId]);
      return rowCount;
    } catch (error) {
      console.error(`Erro ao apagar utilizador com ID ${userId} da clínica ${clinicId}:`, error);
      throw error;
    }
  },

  /**
   * Marca os termos como aceitos para um utilizador.
   * @param {number} userId - O ID do utilizador.
   * @param {string} termsVersion - A versão dos termos aceitos.
   * @param {string} clientIp - O endereço IP do cliente.
   * @returns {Promise<boolean>} True se a atualização foi bem-sucedida.
   */
  async acceptTerms(userId, termsVersion, clientIp) {
    const query = `
      UPDATE users 
      SET 
        terms_accepted_at = CURRENT_TIMESTAMP,
        terms_version = $1,
        terms_ip_address = $2::inet,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    try {
      const { rowCount } = await pool.query(query, [termsVersion, clientIp, userId]);
      return rowCount > 0;
    } catch (error) {
      console.error(`Erro ao aceitar termos para utilizador ${userId}:`, error);
      throw error;
    }
  }
};

module.exports = UserModel;
