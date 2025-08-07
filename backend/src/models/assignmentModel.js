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
            // A deleção em cascata no banco de dados deve cuidar do progresso associado.
            // Simplificamos para uma única deleção.
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
     * Esta função foi refatorada para buscar os detalhes do programa diretamente da tabela 'programs'.
     * @param {number} id - O ID da atribuição.
     * @returns {Promise<object|null>} Os detalhes da atribuição ou null se não for encontrada.
     */
    async getAssignmentDetailsById(id) {
        const query = `
            SELECT
                ppa.id AS assignment_id,
                ppa.status,
                ppa.assigned_at,
                jsonb_build_object(
                    'id', pat.id,
                    'name', pat.name
                ) AS patient,
                jsonb_build_object(
                    'id', ther.id,
                    'name', ther.full_name -- CORRIGIDO: de 'name' para 'full_name'
                ) AS therapist,
                -- Constrói o objeto do programa diretamente a partir da tabela 'programs'
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'objective', p.objective,
                    'program_slug', p.program_slug,
                    'skill', p.skill,
                    'materials', p.materials,
                    'procedure', p.procedure,
                    'criteria_for_advancement', p.criteria_for_advancement,
                    'trials', p.trials
                ) AS program
            FROM 
                patient_program_assignments ppa
            JOIN 
                patients pat ON ppa.patient_id = pat.id
            JOIN 
                users ther ON ppa.therapist_id = ther.id
            JOIN
                programs p ON ppa.program_id = p.id
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
            SET status = $1, updated_at = NOW()
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
    },
    
    /**
     * Busca todo o progresso associado a uma atribuição.
     * @param {number} assignmentId - O ID da atribuição.
     * @returns {Promise<Array<object>>} Uma lista de registros de progresso.
     */
    async findProgressByAssignmentId(assignmentId) {
        const query = `
            SELECT * FROM patient_program_progress 
            WHERE assignment_id = $1 
            ORDER BY session_date DESC, created_at DESC;
        `;
        const { rows } = await pool.query(query, [assignmentId]);
        return rows;
    }
};

module.exports = Assignment;
