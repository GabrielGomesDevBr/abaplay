const pool = require('./db');

/**
 * Cria um novo programa, incluindo suas etapas e instruções.
 * @param {object} programData - Os dados completos do programa.
 * @returns {Promise<object>} O programa criado.
 */
const createProgram = async (programData) => {
    const { name, objective, sub_area_id, steps } = programData;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const programQuery = `
            INSERT INTO programs (name, objective, sub_area_id)
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
        const programResult = await client.query(programQuery, [name, objective, sub_area_id]);
        const programId = programResult.rows[0].id;

        if (steps && steps.length > 0) {
            for (const step of steps) {
                const stepQuery = `
                    INSERT INTO program_steps (program_id, step_number, name, description)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id;
                `;
                const stepResult = await client.query(stepQuery, [programId, step.step_number, step.name, step.description]);
                const stepId = stepResult.rows[0].id;

                if (step.instructions && step.instructions.length > 0) {
                    for (const instruction of step.instructions) {
                        // CORRIGIDO: Removido media_url e garantido que instruction_number é inserido.
                        const instructionQuery = `
                            INSERT INTO program_step_instructions (step_id, instruction_number, description)
                            VALUES ($1, $2, $3);
                        `;
                        await client.query(instructionQuery, [stepId, instruction.instruction_number, instruction.description]);
                    }
                }
            }
        }

        await client.query('COMMIT');
        return { id: programId, ...programData };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[MODEL-LOG] Erro ao criar programa:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Busca os detalhes de um programa usando a função SQL get_program_details.
 * @param {number} id - O ID do programa.
 * @returns {Promise<object|null>} O objeto JSON do programa ou null.
 */
const getProgramById = async (id) => {
    try {
        // SIMPLIFICADO: Usa a função SQL que criamos.
        const query = `SELECT get_program_details($1) as program_details;`;
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0 || !rows[0].program_details) {
            return null;
        }
        
        // A função do DB já retorna o JSON completo.
        return rows[0].program_details;
    } catch (error) {
        console.error(`[MODEL-LOG] ERRO ao buscar programa com ID ${id}:`, error);
        throw error;
    }
};

/**
 * Busca todos os programas para exibição na biblioteca, de forma hierárquica.
 * @returns {Promise<object>} Um objeto representando a hierarquia dos programas.
 */
const getAllProgramsWithHierarchy = async () => {
    try {
        const query = `
            SELECT 
                d.name as discipline_name,
                pa.name as area_name,
                psa.name as sub_area_name,
                p.id as program_id,
                p.name as program_name,
                p.objective as program_objective,
                (SELECT COUNT(*) FROM program_steps ps WHERE ps.program_id = p.id) as total_steps
            FROM programs p
            JOIN program_sub_areas psa ON p.sub_area_id = psa.id
            JOIN program_areas pa ON psa.area_id = pa.id
            JOIN disciplines d ON pa.discipline_id = d.id
            ORDER BY d.name, pa.name, psa.name, p.name;
        `;
        const { rows } = await pool.query(query);
        
        const hierarchy = {};
        rows.forEach(row => {
            const { discipline_name, area_name, sub_area_name, ...programData } = row;
            if (!hierarchy[discipline_name]) hierarchy[discipline_name] = {};
            if (!hierarchy[discipline_name][area_name]) hierarchy[discipline_name][area_name] = {};
            if (!hierarchy[discipline_name][area_name][sub_area_name]) hierarchy[discipline_name][area_name][sub_area_name] = [];
            
            hierarchy[discipline_name][area_name][sub_area_name].push({
                id: programData.program_id,
                name: programData.program_name,
                objective: programData.program_objective,
                total_steps: parseInt(programData.total_steps, 10)
            });
        });

        return hierarchy;
    } catch (error) {
        console.error('[MODEL-LOG] Erro ao buscar programas com hierarquia:', error);
        throw error;
    }
};

/**
 * Atualiza um programa existente, suas etapas e instruções.
 * @param {number} id - O ID do programa a ser atualizado.
 * @param {object} programData - Os novos dados do programa.
 * @returns {Promise<object>} O programa atualizado.
 */
const updateProgram = async (id, programData) => {
    const { name, objective, sub_area_id, steps } = programData;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('UPDATE programs SET name = $1, objective = $2, sub_area_id = $3 WHERE id = $4;', [name, objective, sub_area_id, id]);

        const existingStepsResult = await client.query('SELECT id FROM program_steps WHERE program_id = $1', [id]);
        const existingStepIds = new Set(existingStepsResult.rows.map(r => r.id));
        const incomingStepIds = new Set(steps.filter(s => s.id).map(s => s.id));

        for (const stepId of existingStepIds) {
            if (!incomingStepIds.has(stepId)) {
                await client.query('DELETE FROM program_step_instructions WHERE step_id = $1', [stepId]);
                await client.query('DELETE FROM program_steps WHERE id = $1', [stepId]);
            }
        }

        for (const step of steps) {
            let stepId = step.id;
            if (stepId) {
                await client.query('UPDATE program_steps SET step_number = $1, name = $2, description = $3 WHERE id = $4;', [step.step_number, step.name, step.description, stepId]);
            } else {
                const stepResult = await client.query('INSERT INTO program_steps (program_id, step_number, name, description) VALUES ($1, $2, $3, $4) RETURNING id;', [id, step.step_number, step.name, step.description]);
                stepId = stepResult.rows[0].id;
            }

            const existingInstructionsResult = await client.query('SELECT id FROM program_step_instructions WHERE step_id = $1', [stepId]);
            const existingInstructionIds = new Set(existingInstructionsResult.rows.map(r => r.id));
            const incomingInstructionIds = new Set(step.instructions.filter(i => i.id).map(i => i.id));

            for (const instructionId of existingInstructionIds) {
                if (!incomingInstructionIds.has(instructionId)) {
                    await client.query('DELETE FROM program_step_instructions WHERE id = $1', [instructionId]);
                }
            }

            for (const instruction of step.instructions) {
                // CORRIGIDO: Removido media_url.
                if (instruction.id) {
                    await client.query('UPDATE program_step_instructions SET instruction_number = $1, description = $2 WHERE id = $3;', [instruction.instruction_number, instruction.description, instruction.id]);
                } else {
                    await client.query('INSERT INTO program_step_instructions (step_id, instruction_number, description) VALUES ($1, $2, $3);', [stepId, instruction.instruction_number, instruction.description]);
                }
            }
        }

        await client.query('COMMIT');
        return await getProgramById(id);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[MODEL-LOG] Erro ao atualizar programa com ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Exclui um programa e todos os seus dados associados (atribuições, progresso, etc.).
 * @param {number} id - O ID do programa a ser excluído.
 * @returns {Promise<number>} O número de programas excluídos (1 ou 0).
 */
const deleteProgram = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const stepsResult = await client.query('SELECT id FROM program_steps WHERE program_id = $1', [id]);
        const stepIds = stepsResult.rows.map(row => row.id);

        if (stepIds.length > 0) {
            const assignmentsResult = await client.query('SELECT id FROM patient_program_assignments WHERE program_id = $1', [id]);
            const assignmentIds = assignmentsResult.rows.map(row => row.id);

            if (assignmentIds.length > 0) {
                await client.query('DELETE FROM patient_program_progress WHERE assignment_id = ANY($1::int[])', [assignmentIds]);
            }
            await client.query('DELETE FROM program_step_instructions WHERE step_id = ANY($1::int[])', [stepIds]);
            await client.query('DELETE FROM program_steps WHERE program_id = $1', [id]);
        }
        
        await client.query('DELETE FROM patient_program_assignments WHERE program_id = $1', [id]);
        const deleteResult = await client.query('DELETE FROM programs WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        return deleteResult.rowCount;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[MODEL-LOG] Erro ao excluir o programa com ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    createProgram,
    getProgramById,
    getAllProgramsWithHierarchy,
    updateProgram,
    deleteProgram
};
