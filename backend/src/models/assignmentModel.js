// backend/src/models/assignmentModel.js

const pool = require('./db.js');

/**
 * Modelo para interagir com a tabela 'therapist_patient_assignments'.
 */
const AssignmentModel = {

  /**
   * Busca os IDs e nomes de todos os terapeutas atribuídos a um paciente específico.
   * @param {number} patientId - O ID do paciente.
   * @returns {Promise<Array<object>>} Uma lista de terapeutas ({ id, full_name }).
   */
  async getAssignedTherapists(patientId) {
    const query = `
      SELECT u.id, u.full_name
      FROM users u
      JOIN therapist_patient_assignments tpa ON u.id = tpa.therapist_id
      WHERE tpa.patient_id = $1 AND u.role = 'terapeuta'
      ORDER BY u.full_name;
    `;
    const { rows } = await pool.query(query, [patientId]);
    return rows;
  },

  /**
   * Atualiza todas as atribuições para um paciente específico numa única transação.
   * Primeiro, apaga todas as atribuições existentes para o paciente e depois insere as novas.
   * @param {number} patientId - O ID do paciente a ser atualizado.
   * @param {Array<number>} therapistIds - Um array com os IDs de todos os terapeutas que devem ser atribuídos.
   * @returns {Promise<void>}
   */
  async updateAssignmentsForPatient(patientId, therapistIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Passo 1: Apagar todas as atribuições existentes para este paciente.
      await client.query('DELETE FROM therapist_patient_assignments WHERE patient_id = $1', [patientId]);

      // Passo 2: Se a lista de novos terapeutas não estiver vazia, insere as novas atribuições.
      if (therapistIds && therapistIds.length > 0) {
        // Constrói uma query de inserção múltipla para eficiência
        const insertQuery = 'INSERT INTO therapist_patient_assignments (patient_id, therapist_id) VALUES ' +
          therapistIds.map((_, index) => `($1, $${index + 2})`).join(', ');
        
        const values = [patientId, ...therapistIds];
        await client.query(insertQuery, values);
      }
      
      // Se tudo correu bem, confirma as alterações.
      await client.query('COMMIT');
    } catch (e) {
      // Se ocorrer algum erro, desfaz todas as alterações.
      await client.query('ROLLBACK');
      throw e;
    } finally {
      // Liberta a ligação com o cliente.
      client.release();
    }
  },
};

module.exports = AssignmentModel;
