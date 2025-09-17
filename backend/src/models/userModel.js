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
        terms_accepted_at, terms_version, terms_ip_address,
        professional_id, qualifications, professional_signature
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
        terms_accepted_at, terms_version, terms_ip_address,
        professional_id, qualifications, professional_signature
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
   * Transfere atribuições de um terapeuta para outro
   * @param {number} fromTherapistId - ID do terapeuta que está saindo
   * @param {Array} transferList - Array de objetos {assignmentId, toTherapistId}
   * @param {number} clinicId - ID da clínica
   * @returns {Promise<object>} Resultado da transferência
   */
  async transferAssignments(fromTherapistId, transferList) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let transferredCount = 0;
      const transferDetails = [];

      for (const transfer of transferList) {
        const { assignment_id, to_therapist_id } = transfer;

        console.log(`[TRANSFER-DEBUG] Transferindo assignment ${assignment_id} de terapeuta ${fromTherapistId} para ${to_therapist_id}`);

        // 1. Buscar dados da atribuição original
        const originalAssignment = await client.query(`
          SELECT patient_id, program_id, status, current_prompt_level, assigned_at
          FROM patient_program_assignments
          WHERE id = $1 AND therapist_id = $2
        `, [assignment_id, fromTherapistId]);

        if (originalAssignment.rows.length === 0) {
          console.log(`[TRANSFER-DEBUG] Atribuição ${assignment_id} não encontrada para terapeuta ${fromTherapistId}`);
          continue;
        }

        const assignmentData = originalAssignment.rows[0];

        // 2. Criar nova atribuição para o novo terapeuta preservando dados
        const newAssignmentResult = await client.query(`
          INSERT INTO patient_program_assignments
          (patient_id, program_id, therapist_id, status, current_prompt_level, assigned_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, patient_id, program_id
        `, [
          assignmentData.patient_id,
          assignmentData.program_id,
          to_therapist_id,
          assignmentData.status,
          assignmentData.current_prompt_level, // Preserva nível de prompting
          assignmentData.assigned_at // Preserva data original
        ]);

        const newAssignmentId = newAssignmentResult.rows[0].id;

        // 3. Transferir TODAS as sessões históricas para a nova atribuição
        const transferProgressResult = await client.query(`
          UPDATE patient_program_progress
          SET assignment_id = $1
          WHERE assignment_id = $2
        `, [newAssignmentId, assignment_id]);

        console.log(`[TRANSFER-DEBUG] ${transferProgressResult.rowCount} sessões transferidas para nova atribuição ${newAssignmentId}`);

        // 4. Remover atribuição antiga (agora sem sessões)
        const deleteOldResult = await client.query(`
          DELETE FROM patient_program_assignments
          WHERE id = $1
        `, [assignment_id]);

        console.log(`[TRANSFER-DEBUG] Atribuição antiga ${assignment_id} removida`);

        if (newAssignmentResult.rows.length > 0) {
          transferredCount++;
          transferDetails.push({
            old_assignment_id: assignment_id,
            new_assignment_id: newAssignmentId,
            patient_id: newAssignmentResult.rows[0].patient_id,
            program_id: newAssignmentResult.rows[0].program_id,
            to_therapist_id,
            sessions_transferred: transferProgressResult.rowCount
          });
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        transferred_count: transferredCount,
        details: transferDetails
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Erro ao transferir atribuições do terapeuta ${fromTherapistId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Apaga um utilizador do banco de dados, verificando a sua clínica.
   * Para terapeutas, requer transferência prévia de atribuições.
   * @param {number} userId - O ID do utilizador a ser apagado.
   * @param {number} clinicId - O ID da clínica do admin para verificação de permissão.
   * @returns {Promise<number>} O número de linhas afetadas (0 ou 1).
   */
  async delete(userId, clinicId) {
    const client = await pool.connect();
    try {
      // Primeiro, buscar informações do usuário e verificar se existe
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1 AND clinic_id = $2',
        [userId, clinicId]
      );

      if (userResult.rows.length === 0) {
        return 0; // Usuário não encontrado
      }

      const user = userResult.rows[0];

      // Se for terapeuta, verificar se ainda tem atribuições
      if (user.role === 'terapeuta') {
        const assignmentCheck = await client.query(
          'SELECT COUNT(*) as count FROM patient_program_assignments WHERE therapist_id = $1',
          [userId]
        );

        const assignmentCount = parseInt(assignmentCheck.rows[0].count);
        if (assignmentCount > 0) {
          throw new Error(`Terapeuta ainda possui ${assignmentCount} atribuições ativas. Transfira-as antes de remover.`);
        }
      }

      // Limpar dados pessoais opcionais FORA da transação para evitar abort
      // Tentar limpar dados de tabelas opcionais, ignorando erros se não existirem
      try {
        await client.query('DELETE FROM parent_chats WHERE sender_id = $1', [userId]);
      } catch (error) {
        // Tabela pode não existir, continuar sem problema
      }

      try {
        await client.query('DELETE FROM case_discussions WHERE user_id = $1', [userId]);
      } catch (error) {
        // Tabela pode não existir, continuar sem problema
      }

      // Agora iniciar transação apenas para o delete principal
      await client.query('BEGIN');

      // Apagar o usuário
      const deleteResult = await client.query(
        'DELETE FROM users WHERE id = $1 AND clinic_id = $2',
        [userId, clinicId]
      );

      await client.query('COMMIT');
      return deleteResult.rowCount;

    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // Ignorar erro de rollback se não há transação ativa
      }
      console.error(`Erro ao apagar utilizador com ID ${userId} da clínica ${clinicId}:`, error);
      throw error;
    } finally {
      client.release();
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
  },

  /**
   * Busca todas as atribuições de um terapeuta específico (pacientes e programas)
   * @param {number} therapistId - O ID do terapeuta
   * @param {number} clinicId - O ID da clínica
   * @returns {Promise<object>} Objeto com resumo das atribuições
   */
  async getTherapistAssignments(therapistId, clinicId) {
    const query = `
      SELECT
        pat.id as patient_id,
        pat.name as patient_name,
        p.id as program_id,
        p.name as program_name,
        ppa.id as assignment_id,
        ppa.status,
        ppa.assigned_at,
        COUNT(ppp.id) as session_count
      FROM patient_program_assignments ppa
      JOIN patients pat ON ppa.patient_id = pat.id
      JOIN programs p ON ppa.program_id = p.id
      LEFT JOIN patient_program_progress ppp ON ppa.id = ppp.assignment_id
      WHERE ppa.therapist_id = $1 AND pat.clinic_id = $2
      GROUP BY pat.id, pat.name, p.id, p.name, ppa.id, ppa.status, ppa.assigned_at
      ORDER BY pat.name, p.name
    `;

    const { rows } = await pool.query(query, [therapistId, clinicId]);

    // Agrupar por paciente
    const patientMap = {};
    rows.forEach(row => {
      if (!patientMap[row.patient_id]) {
        patientMap[row.patient_id] = {
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          programs: []
        };
      }
      patientMap[row.patient_id].programs.push({
        assignment_id: row.assignment_id,
        program_id: row.program_id,
        program_name: row.program_name,
        status: row.status,
        session_count: parseInt(row.session_count)
      });
    });

    const patients = Object.values(patientMap);
    const totalPatients = patients.length;
    const totalPrograms = rows.length;
    const totalSessions = rows.reduce((sum, row) => sum + parseInt(row.session_count), 0);

    return {
      therapist_id: therapistId,
      summary: {
        total_patients: totalPatients,
        total_programs: totalPrograms,
        total_sessions: totalSessions
      },
      patients
    };
  }
};

module.exports = UserModel;
