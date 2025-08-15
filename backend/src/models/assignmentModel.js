const pool = require('./db');

const Assignment = {
    /**
     * Cria uma nova atribuição de programa para um paciente.
     * @param {object} assignmentData - Contém patient_id, program_id, therapist_id.
     * @returns {Promise<object>} A atribuição criada.
     */
    async create(assignmentData) {
        const { patient_id, program_id, therapist_id, status = 'active' } = assignmentData;
        const query = `
            INSERT INTO patient_program_assignments (patient_id, program_id, therapist_id, status) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [patient_id, program_id, therapist_id, status]);
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
                ppa.current_prompt_level,
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
     * Busca os detalhes completos de uma atribuição de programa por ID (apenas programas ativos).
     * Usado para registrar novas sessões - só permite programas ativos.
     * @param {number} id - O ID da atribuição.
     * @returns {Promise<object|null>} Os detalhes da atribuição ou null se não encontrada ou inativa.
     */
    async getAssignmentDetailsById(id) {
        const query = `
            SELECT
                ppa.id AS assignment_id,
                ppa.status,
                ppa.current_prompt_level,
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
                ppa.id = $1 AND ppa.status = 'active';
        `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Busca os detalhes completos de uma atribuição de programa por ID (incluindo arquivados).
     * Usado para dashboards e relatórios - mostra dados históricos completos.
     * @param {number} id - O ID da atribuição.
     * @returns {Promise<object|null>} Os detalhes da atribuição ou null se não encontrada.
     */
    async getAssignmentDetailsWithHistory(id) {
        const query = `
            SELECT
                ppa.id AS assignment_id,
                ppa.status,
                ppa.current_prompt_level,
                ppa.assigned_at,
                jsonb_build_object(
                    'id', pat.id,
                    'name', pat.name
                ) AS patient,
                jsonb_build_object(
                    'id', ther.id,
                    'name', ther.full_name
                ) AS therapist,
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
        try {
            const query = `
                SELECT 
                    ppp.*,
                    COALESCE(u.full_name, u.username, 'Terapeuta') as therapist_name
                FROM patient_program_progress ppp
                LEFT JOIN users u ON ppp.therapist_id = u.id
                WHERE ppp.assignment_id = $1 
                ORDER BY ppp.session_date ASC, ppp.created_at ASC;
            `;
            const { rows } = await pool.query(query, [assignmentId]);
            return rows;
        } catch (error) {
            console.error('Erro na query findProgressByAssignmentId:', error);
            // Fallback para query original sem join se houver erro
            const fallbackQuery = `
                SELECT * FROM patient_program_progress 
                WHERE assignment_id = $1 
                ORDER BY session_date ASC, created_at ASC;
            `;
            const { rows } = await pool.query(fallbackQuery, [assignmentId]);
            return rows;
        }
    },

    /**
     * Busca todos os terapeutas atribuídos a um paciente específico.
     * @param {number} patientId - O ID do paciente.
     * @returns {Promise<Array<object>>} Uma lista de terapeutas atribuídos.
     */
    async getAssignedTherapists(patientId) {
        const query = `
            SELECT DISTINCT
                u.id,
                u.full_name AS name,
                u.username,
                u.role,
                COUNT(ppa.id) as assignments_count
            FROM 
                patient_program_assignments ppa
            JOIN 
                users u ON ppa.therapist_id = u.id
            WHERE 
                ppa.patient_id = $1
            GROUP BY 
                u.id, u.full_name, u.username, u.role
            ORDER BY 
                u.full_name;
        `;
        const { rows } = await pool.query(query, [patientId]);
        return rows;
    },

    /**
     * Atualiza as atribuições de terapeutas para um paciente específico.
     * Mantém as atribuições de programa existentes mas atualiza o terapeuta responsável.
     * Como há constraint de unique (patient_id, program_id), cada programa pode ter apenas um terapeuta.
     * @param {number} patientId - O ID do paciente.
     * @param {Array<number>} therapistIds - Array de IDs dos terapeutas a serem atribuídos.
     * @returns {Promise<void>}
     */
    async updateAssignmentsForPatient(patientId, therapistIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            if (therapistIds.length === 0) {
                // Se nenhum terapeuta foi selecionado, remove todas as atribuições
                await client.query(
                    'DELETE FROM patient_program_assignments WHERE patient_id = $1',
                    [patientId]
                );
            } else {
                // Busca as atribuições de programa existentes para este paciente
                const existingAssignmentsQuery = `
                    SELECT program_id, status, therapist_id
                    FROM patient_program_assignments 
                    WHERE patient_id = $1
                `;
                const { rows: existingAssignments } = await client.query(existingAssignmentsQuery, [patientId]);
                
                if (existingAssignments.length > 0) {
                    // Distribui os programas existentes entre os terapeutas selecionados
                    // Isso garante que cada programa tenha apenas um terapeuta (respeitando constraint)
                    // mas permite que múltiplos terapeutas trabalhem com o mesmo paciente
                    
                    for (let i = 0; i < existingAssignments.length; i++) {
                        const assignment = existingAssignments[i];
                        // Distribui os programas de forma circular entre os terapeutas
                        const therapistIndex = i % therapistIds.length;
                        const selectedTherapistId = therapistIds[therapistIndex];
                        
                        await client.query(
                            'UPDATE patient_program_assignments SET therapist_id = $1, updated_at = NOW() WHERE patient_id = $2 AND program_id = $3',
                            [selectedTherapistId, patientId, assignment.program_id]
                        );
                    }
                    
                    console.log(`[INFO] ${existingAssignments.length} programa(s) distribuído(s) entre ${therapistIds.length} terapeuta(s) para o paciente ${patientId}.`);
                } else {
                    // Se não havia atribuições, não cria nenhuma nova
                    // O admin terá que atribuir programas separadamente
                    console.log(`[INFO] Nenhum programa estava atribuído ao paciente ${patientId}. Terapeutas selecionados mas sem programas para atribuir.`);
                }
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[MODEL-ERROR] Erro ao atualizar atribuições para o paciente ${patientId}:`, error);
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Atualiza o nível de prompting atual para uma atribuição específica.
     * @param {number} assignmentId - O ID da atribuição.
     * @param {number} promptLevel - O novo nível de prompting (0-5).
     * @returns {Promise<object>} A atribuição atualizada.
     */
    async updatePromptLevel(assignmentId, promptLevel) {
        const query = `
            UPDATE patient_program_assignments 
            SET current_prompt_level = $1, updated_at = now()
            WHERE id = $2 
            RETURNING id, patient_id, program_id, current_prompt_level, updated_at;
        `;
        const { rows } = await pool.query(query, [promptLevel, assignmentId]);
        return rows[0];
    },

    /**
     * Busca o nível de prompting atual para uma atribuição específica.
     * @param {number} assignmentId - O ID da atribuição.
     * @returns {Promise<number|null>} O nível de prompting atual ou null se não encontrado.
     */
    async getCurrentPromptLevel(assignmentId) {
        const query = `
            SELECT current_prompt_level 
            FROM patient_program_assignments 
            WHERE id = $1;
        `;
        const { rows } = await pool.query(query, [assignmentId]);
        return rows[0] ? rows[0].current_prompt_level : null;
    },

    /**
     * Busca o nível de prompting para um programa específico de um paciente.
     * @param {number} patientId - O ID do paciente.
     * @param {number} programId - O ID do programa.
     * @returns {Promise<number|null>} O nível de prompting atual ou null se não encontrado.
     */
    async getPromptLevelByPatientAndProgram(patientId, programId) {
        const query = `
            SELECT current_prompt_level 
            FROM patient_program_assignments 
            WHERE patient_id = $1 AND program_id = $2;
        `;
        const { rows } = await pool.query(query, [patientId, programId]);
        return rows[0] ? rows[0].current_prompt_level : null;
    }
};

module.exports = Assignment;
