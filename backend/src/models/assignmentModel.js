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
                    'trials', COALESCE(ppa.custom_trials, p.trials),
                    'default_trials', p.trials,
                    'custom_trials', ppa.custom_trials
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
                    'trials', COALESCE(ppa.custom_trials, p.trials),
                    'default_trials', p.trials,
                    'custom_trials', ppa.custom_trials
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
                u.role
            FROM
                therapist_patient_assignments tpa
            JOIN
                users u ON tpa.therapist_id = u.id
            WHERE
                tpa.patient_id = $1
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

            // Remove todas as atribuições existentes de terapeutas para este paciente
            await client.query(
                'DELETE FROM therapist_patient_assignments WHERE patient_id = $1',
                [patientId]
            );

            // Insere as novas atribuições para cada terapeuta selecionado
            if (therapistIds.length > 0) {
                for (const therapistId of therapistIds) {
                    await client.query(
                        'INSERT INTO therapist_patient_assignments (therapist_id, patient_id) VALUES ($1, $2)',
                        [therapistId, patientId]
                    );
                }
                console.log(`[INFO] ${therapistIds.length} terapeuta(s) atribuído(s) ao paciente ${patientId}.`);
            } else {
                console.log(`[INFO] Todas as atribuições de terapeutas removidas para o paciente ${patientId}.`);
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
    },

    /**
     * Busca o nível de prompting e timestamp para um programa específico de um paciente.
     * @param {number} patientId - O ID do paciente.
     * @param {number} programId - O ID do programa.
     * @returns {Promise<object|null>} Objeto com level e updated_at ou null se não encontrado.
     */
    async getPromptLevelByPatientAndProgramWithTimestamp(patientId, programId) {
        const query = `
            SELECT current_prompt_level as level, updated_at
            FROM patient_program_assignments
            WHERE patient_id = $1 AND program_id = $2;
        `;
        const { rows } = await pool.query(query, [patientId, programId]);
        return rows[0] || null;
    },

    /**
     * Verifica se um terapeuta tem acesso a um paciente específico
     * (ou seja, se tem alguma atribuição com esse paciente)
     * @param {number} therapistId - ID do terapeuta
     * @param {number} patientId - ID do paciente
     * @returns {Promise<boolean>} True se o terapeuta tem acesso ao paciente
     */
    async therapistHasAccessToPatient(therapistId, patientId) {
        const query = `
            SELECT COUNT(*) as count
            FROM patient_program_assignments
            WHERE therapist_id = $1 AND patient_id = $2
        `;
        const { rows } = await pool.query(query, [therapistId, patientId]);
        return parseInt(rows[0].count) > 0;
    },

    /**
     * Atualiza as tentativas customizadas de uma atribuição específica.
     * @param {number} assignmentId - O ID da atribuição.
     * @param {number|null} customTrials - O número de tentativas customizadas (null para usar o padrão).
     * @returns {Promise<object>} A atribuição atualizada.
     */
    async updateCustomTrials(assignmentId, customTrials) {
        const query = `
            UPDATE patient_program_assignments
            SET custom_trials = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, patient_id, program_id, custom_trials, updated_at;
        `;
        const { rows } = await pool.query(query, [customTrials, assignmentId]);
        return rows[0];
    },

    /**
     * Busca todas as atribuições de programas da clínica para administradores.
     * Inclui informações completas de paciente, programa, terapeuta e status.
     * @param {number} clinicId - O ID da clínica.
     * @returns {Promise<Array<object>>} Lista de todas as atribuições da clínica.
     */
    async getAllAssignments(clinicId) {
        const query = `
            SELECT
                ppa.id AS assignment_id,
                ppa.status,
                ppa.current_prompt_level,
                ppa.assigned_at AS created_at,
                ppa.updated_at,
                COALESCE(ppa.custom_trials, p.trials) as trials,
                p.trials as default_trials,
                ppa.custom_trials,
                pat.id AS patient_id,
                pat.name AS patient_name,
                pat.dob AS patient_dob,
                p.id AS program_id,
                p.name AS program_name,
                p.objective AS program_objective,
                ther.id AS therapist_id,
                ther.full_name AS therapist_name,
                ther.username AS therapist_username,
                -- Estatísticas de progresso
                COUNT(ppp.id) as total_sessions,
                COALESCE(AVG(ppp.score), 0) as average_score,
                MAX(ppp.session_date) as last_session_date
            FROM
                patient_program_assignments ppa
            JOIN
                patients pat ON ppa.patient_id = pat.id
            JOIN
                users ther ON ppa.therapist_id = ther.id
            JOIN
                programs p ON ppa.program_id = p.id
            LEFT JOIN
                patient_program_progress ppp ON ppa.id = ppp.assignment_id
            WHERE
                pat.clinic_id = $1
            GROUP BY
                ppa.id, ppa.status, ppa.current_prompt_level, ppa.assigned_at, ppa.updated_at,
                ppa.custom_trials, p.trials, pat.id, pat.name, pat.dob, p.id, p.name,
                p.objective, ther.id, ther.full_name, ther.username
            ORDER BY
                ppa.updated_at DESC, pat.name ASC, p.name ASC;
        `;
        const { rows } = await pool.query(query, [clinicId]);
        return rows;
    },

    /**
     * Busca programas atribuídos de um paciente específico para o sistema de agendamento
     * @param {number} patientId - O ID do paciente
     * @returns {Promise<Array<object>>} Lista de programas atribuídos ao paciente
     */
    async findProgramsByPatientId(patientId) {
        const query = `
            SELECT
                ppa.id AS assignment_id,
                ppa.status,
                p.id AS program_id,
                p.name AS program_name,
                ther.id AS therapist_id,
                ther.full_name AS therapist_name
            FROM
                patient_program_assignments ppa
            JOIN
                programs p ON ppa.program_id = p.id
            JOIN
                users ther ON ppa.therapist_id = ther.id
            WHERE
                ppa.patient_id = $1
            ORDER BY
                p.name ASC;
        `;
        const { rows } = await pool.query(query, [patientId]);
        return rows;
    },

    /**
     * Verifica se um terapeuta existe e pertence à clínica especificada
     * @param {number} therapistId - O ID do terapeuta
     * @param {number} clinicId - O ID da clínica
     * @returns {Promise<boolean>} True se o terapeuta tem acesso à clínica
     */
    async checkTherapistAccess(therapistId, clinicId) {
        const query = `
            SELECT COUNT(*) as count
            FROM users
            WHERE id = $1 AND clinic_id = $2 AND role IN ('therapist', 'admin', 'terapeuta', 'administrador')
        `;
        const { rows } = await pool.query(query, [therapistId, clinicId]);
        return parseInt(rows[0].count) > 0;
    }
};

module.exports = Assignment;
