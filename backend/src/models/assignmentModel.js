const pool = require('./db');

const Assignment = {
    /**
     * Cria uma nova atribuição de programa para um paciente.
     * @param {object} assignmentData - Contém patient_id, program_id, therapist_id.
     * @returns {Promise<object>} A atribuição criada.
     */
    async create(assignmentData) {
        const { patient_id, program_id, therapist_id } = assignmentData;
        const query = `
            INSERT INTO patient_program_assignments (patient_id, program_id, therapist_id) 
            VALUES ($1, $2, $3) 
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [patient_id, program_id, therapist_id]);
        return rows[0];
    },

    /**
     * Remove uma atribuição pelo seu ID. Também remove o progresso associado.
     * @param {number} id - O ID da atribuição a ser removida.
     * @returns {Promise<number>} O número de registros removidos.
     */
    async remove(id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Primeiro, remove o progresso para evitar violação de chave estrangeira
            await client.query('DELETE FROM patient_program_progress WHERE assignment_id = $1', [id]);
            // Depois, remove a atribuição
            const result = await client.query('DELETE FROM patient_program_assignments WHERE id = $1', [id]);
            await client.query('COMMIT');
            return result.rowCount;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[MODEL-ERROR] Erro ao remover atribuição com ID ${id}:`, error);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Busca todas as atribuições de programas para um paciente específico.
     * @param {number} patientId - O ID do paciente.
     * @returns {Promise<Array<object>>} Uma lista de programas atribuídos.
     */
    async findByPatientId(patientId) {
        const query = `
            SELECT
                ppa.id AS assignment_id, 
                ppa.status, 
                p.id AS program_id,
                p.name AS program_name, 
                p.objective
            FROM patient_program_assignments ppa 
            JOIN programs p ON ppa.program_id = p.id
            WHERE ppa.patient_id = $1;
        `;
        const { rows } = await pool.query(query, [patientId]);
        return rows;
    },

    /**
     * Busca os detalhes completos de uma atribuição, incluindo os dados do programa.
     * @param {number} id - O ID da atribuição.
     * @returns {Promise<object|null>} Os detalhes da atribuição ou null se não for encontrada.
     */
    async getAssignmentDetailsById(id) {
        const query = `
            SELECT
                ppa.id as assignment_id,
                ppa.status,
                ppa.assigned_at,
                json_build_object(
                    'id', pat.id,
                    'name', pat.name
                ) as patient,
                json_build_object(
                    'id', ther.id,
                    'full_name', ther.full_name
                ) as therapist,
                (SELECT program_json FROM get_program_details(ppa.program_id)) as program
            FROM 
                patient_program_assignments ppa
            JOIN 
                patients pat ON ppa.patient_id = pat.id
            JOIN 
                users ther ON ppa.therapist_id = ther.id
            WHERE 
                ppa.id = $1;
        `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Atualiza o status de uma atribuição.
     * @param {number} id - O ID da atribuição.
     * @param {string} status - O novo status (ex: 'Ativo', 'Arquivado').
     * @returns {Promise<object>} A atribuição atualizada.
     */
    async updateStatus(id, status) {
        const query = `
            UPDATE patient_program_assignments 
            SET status = $1 
            WHERE id = $2 
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [status, id]);
        return rows[0];
    },

    /**
     * Cria um novo registro de progresso (evolução).
     * @param {object} progressData - Os dados do progresso.
     * @returns {Promise<object>} O registro de progresso criado.
     */
    async createProgress(progressData) {
        const { assignment_id, step_id, therapist_id, session_date, attempts, successes, score, details } = progressData;
        const query = `
            INSERT INTO patient_program_progress
                (assignment_id, step_id, therapist_id, session_date, attempts, successes, score, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;
        const values = [assignment_id, step_id, therapist_id, session_date, attempts, successes, score, details];
        const { rows } = await pool.query(query, values);
        return rows[0];
    }
};

module.exports = Assignment;
