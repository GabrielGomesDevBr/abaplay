const pool = require('./db');

/**
 * @description Cria um novo programa no banco de dados com base nos dados fornecidos.
 * A nova estrutura armazena materiais e procedimentos como JSONB, simplificando a inserção.
 * @param {object} programData - Os dados do programa a serem criados.
 * @returns {Promise<object>} O programa recém-criado.
 */
const create = async (programData) => {
    const {
        sub_area_id,
        name,
        objective,
        program_slug,
        skill,
        materials,
        procedure,
        criteria_for_advancement,
        trials
    } = programData;

    const query = `
        INSERT INTO programs (
            sub_area_id, name, objective, program_slug, skill, 
            materials, procedure, criteria_for_advancement, trials
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;

    // Os campos 'materials' e 'procedure' devem ser strings JSON válidas.
    const values = [
        sub_area_id,
        name,
        objective,
        program_slug,
        skill,
        JSON.stringify(materials),
        JSON.stringify(procedure),
        criteria_for_advancement,
        trials
    ];

    try {
        const { rows } = await pool.query(query, values);
        console.log(`[MODEL-LOG] Programa '${rows[0].name}' criado com sucesso.`);
        return rows[0];
    } catch (error) {
        console.error('[MODEL-ERROR] Erro ao criar programa:', error);
        throw error;
    }
};

/**
 * @description Busca todos os programas e os organiza em uma estrutura hierárquica.
 * Retorna todos os campos de cada programa, alinhado com o novo schema.
 * @returns {Promise<object>} Um objeto representando a hierarquia: Disciplina > Área > Subárea > [Programas].
 */
const getAllWithHierarchy = async () => {
    const query = `
        SELECT 
            d.name AS discipline_name,
            pa.name AS area_name,
            psa.name AS sub_area_name,
            p.id,
            p.name,
            p.objective,
            p.program_slug,
            p.skill,
            p.materials,
            p.procedure,
            p.criteria_for_advancement,
            p.trials,
            p.created_at
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        ORDER BY d.name, pa.name, psa.name, p.name;
    `;
    try {
        const { rows } = await pool.query(query);
        
        const hierarchy = {};
        rows.forEach(row => {
            const { discipline_name, area_name, sub_area_name, ...programData } = row;

            if (!hierarchy[discipline_name]) {
                hierarchy[discipline_name] = {};
            }
            if (!hierarchy[discipline_name][area_name]) {
                hierarchy[discipline_name][area_name] = {};
            }
            if (!hierarchy[discipline_name][area_name][sub_area_name]) {
                hierarchy[discipline_name][area_name][sub_area_name] = [];
            }
            
            // Adiciona o objeto completo do programa à hierarquia.
            hierarchy[discipline_name][area_name][sub_area_name].push(programData);
        });

        return hierarchy;
    } catch (error) {
        console.error('[MODEL-ERROR] Erro ao buscar programas com hierarquia:', error);
        throw error;
    }
};

/**
 * @description Busca um único programa por seu ID.
 * @param {number} id - O ID do programa.
 * @returns {Promise<object|null>} O objeto do programa ou null se não for encontrado.
 */
const findById = async (id) => {
    const query = 'SELECT * FROM programs WHERE id = $1;';
    try {
        const { rows } = await pool.query(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao buscar programa com ID ${id}:`, error);
        throw error;
    }
};

/**
 * @description Atualiza um programa existente no banco de dados.
 * @param {number} id - O ID do programa a ser atualizado.
 * @param {object} programData - Os novos dados para o programa.
 * @returns {Promise<object|null>} O programa atualizado ou null se não for encontrado.
 */
const update = async (id, programData) => {
    const {
        name,
        objective,
        sub_area_id,
        program_slug,
        skill,
        materials,
        procedure,
        criteria_for_advancement,
        trials
    } = programData;

    const query = `
        UPDATE programs SET
            name = $1,
            objective = $2,
            sub_area_id = $3,
            program_slug = $4,
            skill = $5,
            materials = $6,
            procedure = $7,
            criteria_for_advancement = $8,
            trials = $9,
            updated_at = NOW()
        WHERE id = $10
        RETURNING *;
    `;
    
    const values = [
        name,
        objective,
        sub_area_id,
        program_slug,
        skill,
        JSON.stringify(materials),
        JSON.stringify(procedure),
        criteria_for_advancement,
        trials,
        id
    ];

    try {
        const { rows } = await pool.query(query, values);
        if (rows.length > 0) {
            console.log(`[MODEL-LOG] Programa com ID ${id} atualizado com sucesso.`);
            return rows[0];
        }
        return null; // Retorna null se o programa não foi encontrado para atualizar
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao atualizar programa com ID ${id}:`, error);
        throw error;
    }
};

/**
 * @description Exclui um programa do banco de dados.
 * A deleção em cascata configurada no banco de dados cuidará dos registros dependentes.
 * @param {number} id - O ID do programa a ser excluído.
 * @returns {Promise<number>} O número de linhas excluídas (1 se sucesso, 0 se não encontrado).
 */
const deleteById = async (id) => {
    const query = 'DELETE FROM programs WHERE id = $1;';
    try {
        const result = await pool.query(query, [id]);
        console.log(`[MODEL-LOG] Tentativa de exclusão do programa com ID ${id}. Linhas afetadas: ${result.rowCount}`);
        return result.rowCount;
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao excluir programa com ID ${id}:`, error);
        throw error;
    }
};

// Exporta os métodos com os nomes que o controller espera
module.exports = {
    create,
    getAllWithHierarchy,
    findById,
    update,
    deleteById
};
