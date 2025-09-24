const pool = require('./db');
const { normalizeStatus } = require('../utils/statusNormalizer');

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
        trials,
        clinic_id = null,
        is_global = true,
        created_by = null
    } = programData;

    const query = `
        INSERT INTO programs (
            sub_area_id, name, objective, program_slug, skill,
            materials, procedure, criteria_for_advancement, trials,
            clinic_id, is_global, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        trials,
        clinic_id,
        is_global,
        created_by
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
 * @param {number|null} clinic_id - ID da clínica para filtrar programas customizados
 * @returns {Promise<object>} Um objeto representando a hierarquia: Disciplina > Área > Subárea > [Programas].
 */
const getAllWithHierarchy = async (clinic_id = null) => {
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
            p.created_at,
            p.clinic_id,
            p.is_global,
            p.created_by,
            CASE
                WHEN p.is_global THEN 'global'
                ELSE 'custom'
            END as program_type
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE (p.is_global = true OR p.clinic_id = $1)
        ORDER BY p.is_global DESC, d.name, pa.name, psa.name, p.name;
    `;
    try {
        const { rows } = await pool.query(query, [clinic_id]);
        
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

/**
 * @description Busca todos os programas atribuídos a um paciente organizados por disciplina/área para a grade de programas.
 * Esta função retorna os programas no formato adequado para geração do PDF da grade.
 * @param {number} patientId - O ID do paciente.
 * @returns {Promise<object>} Objeto organizado por áreas com os programas atribuídos e ativos.
 */
const getAssignedProgramsForGrade = async (patientId) => {
    // Debug: Primeira query para ver todos os programas e seus status
    const debugQuery = `
        SELECT 
            d.name AS discipline_name,
            pa.name AS area_name,
            p.id,
            p.name AS title,
            ppa.status,
            COUNT(*) OVER() as total_count
        FROM patient_program_assignments ppa
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE ppa.patient_id = $1
        ORDER BY d.name, pa.name, p.name;
    `;
    
    const query = `
        SELECT
            d.name AS discipline_name,
            pa.name AS area_name,
            p.id,
            p.name AS title,
            p.objective,
            p.program_slug AS tag,
            p.skill,
            p.materials,
            p.procedure,
            p.criteria_for_advancement,
            COALESCE(ppa.custom_trials, p.trials) AS trials,
            p.trials AS default_trials,
            ppa.custom_trials,
            ppa.status
        FROM patient_program_assignments ppa
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE ppa.patient_id = $1
        ORDER BY d.name, pa.name, p.name;
    `;
    
    try {
        // Debug: Executar query de debug primeiro
        const debugResult = await pool.query(debugQuery, [patientId]);
        console.log(`[DEBUG-GRADE] Paciente ${patientId} - Total de programas no banco:`, debugResult.rows.length);
        console.log('[DEBUG-GRADE] Status dos programas encontrados:', 
            debugResult.rows.map(r => ({ title: r.title, status: r.status, discipline: r.discipline_name }))
        );
        
        const { rows } = await pool.query(query, [patientId]);
        
        console.log(`[DEBUG-GRADE] Programas retornados após filtro:`, rows.length);
        console.log('[DEBUG-GRADE] Programas filtrados:', 
            rows.map(r => ({ title: r.title, status: r.status, discipline: r.discipline_name }))
        );
        
        // Organiza os programas por área, apenas os ativos após normalização
        const programsByArea = {};
        rows.forEach(row => {
            const { discipline_name, area_name, ...programData } = row;
            const normalizedStatus = normalizeStatus(programData.status);
            
            // Só inclui programas ativos
            if (normalizedStatus === 'active') {
                const areaKey = `${discipline_name} - ${area_name}`;
                
                if (!programsByArea[areaKey]) {
                    programsByArea[areaKey] = [];
                }
                
                programsByArea[areaKey].push({
                    id: programData.id,
                    title: programData.title,
                    tag: programData.tag,
                    objective: programData.objective,
                    criteria_for_advancement: programData.criteria_for_advancement,
                    trials: programData.trials,
                    default_trials: programData.default_trials,
                    custom_trials: programData.custom_trials,
                    skill: programData.skill,
                    materials: programData.materials,
                    procedure: programData.procedure,
                    status: normalizedStatus
                });
            }
        });

        console.log(`[DEBUG-GRADE] Estrutura final por área:`, Object.keys(programsByArea).map(area => ({
            area,
            count: programsByArea[area].length
        })));

        return programsByArea;
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao buscar programas atribuídos para grade do paciente ${patientId}:`, error);
        throw error;
    }
};

/**
 * @description Busca programas por termo de pesquisa, com filtro opcional por disciplina
 * @param {string} searchTerm - Termo de busca
 * @param {string} discipline - Nome da disciplina (opcional)
 * @param {number|null} clinic_id - ID da clínica para filtrar programas
 * @returns {Promise<Array>} Lista de programas encontrados
 */
const searchPrograms = async (searchTerm, discipline = null, clinic_id = null) => {
    let query = `
        SELECT
            p.id,
            p.name,
            p.objective,
            p.skill,
            p.program_slug,
            p.trials,
            p.is_global,
            p.clinic_id,
            d.name AS discipline_name,
            pa.name AS area_name,
            psa.name AS sub_area_name
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE (p.is_global = true OR p.clinic_id = $1)
        AND (
            LOWER(p.name) LIKE LOWER($2) OR
            LOWER(p.objective) LIKE LOWER($2) OR
            LOWER(p.skill) LIKE LOWER($2) OR
            LOWER(pa.name) LIKE LOWER($2) OR
            LOWER(psa.name) LIKE LOWER($2)
        )
    `;

    const values = [clinic_id, `%${searchTerm}%`];

    // Adiciona filtro por disciplina se fornecido
    if (discipline) {
        query += ` AND LOWER(d.name) = LOWER($3)`;
        values.push(discipline);
    }

    query += ` ORDER BY p.is_global DESC, d.name, pa.name, psa.name, p.name LIMIT 50`;

    try {
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error('[MODEL-ERROR] Erro na busca de programas:', error);
        throw error;
    }
};

/**
 * @description Busca programas customizados de uma clínica específica
 * @param {number} clinic_id - ID da clínica
 * @returns {Promise<object>} Programas organizados por hierarquia
 */
const getCustomProgramsByClinic = async (clinic_id) => {
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
            p.created_at,
            p.clinic_id,
            p.is_global,
            p.created_by,
            u.full_name AS created_by_name
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.clinic_id = $1 AND p.is_global = false
        ORDER BY d.name, pa.name, psa.name, p.name;
    `;

    try {
        const { rows } = await pool.query(query, [clinic_id]);

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

            hierarchy[discipline_name][area_name][sub_area_name].push({
                ...programData,
                program_type: 'custom'
            });
        });

        return hierarchy;
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao buscar programas customizados da clínica ${clinic_id}:`, error);
        throw error;
    }
};

/**
 * @description Busca hierarquia de disciplinas, áreas e sub-áreas para formulário
 * @returns {Promise<object>} Hierarquia de disciplinas
 */
const getDisciplineHierarchy = async () => {
    const query = `
        SELECT
            d.id AS discipline_id,
            d.name AS discipline_name,
            pa.id AS area_id,
            pa.name AS area_name,
            psa.id AS sub_area_id,
            psa.name AS sub_area_name
        FROM disciplines d
        LEFT JOIN program_areas pa ON d.id = pa.discipline_id
        LEFT JOIN program_sub_areas psa ON pa.id = psa.area_id
        ORDER BY d.name, pa.name, psa.name;
    `;

    try {
        const { rows } = await pool.query(query);

        const hierarchy = {};
        rows.forEach(row => {
            const { discipline_id, discipline_name, area_id, area_name, sub_area_id, sub_area_name } = row;

            if (!hierarchy[discipline_name]) {
                hierarchy[discipline_name] = {
                    id: discipline_id,
                    areas: {}
                };
            }

            if (area_name && !hierarchy[discipline_name].areas[area_name]) {
                hierarchy[discipline_name].areas[area_name] = {
                    id: area_id,
                    sub_areas: {}
                };
            }

            if (sub_area_name && area_name) {
                hierarchy[discipline_name].areas[area_name].sub_areas[sub_area_name] = {
                    id: sub_area_id
                };
            }
        });

        return hierarchy;
    } catch (error) {
        console.error('[MODEL-ERROR] Erro ao buscar hierarquia de disciplinas:', error);
        throw error;
    }
};

/**
 * @description Verifica se um usuário pode editar/deletar um programa
 * @param {number} program_id - ID do programa
 * @param {number} user_id - ID do usuário
 * @param {number} clinic_id - ID da clínica do usuário
 * @returns {Promise<boolean>} True se pode editar
 */
const canUserEditProgram = async (program_id, user_id, clinic_id) => {
    const query = `
        SELECT p.clinic_id, p.is_global, p.created_by, u.is_admin
        FROM programs p, users u
        WHERE p.id = $1 AND u.id = $2 AND u.clinic_id = $3;
    `;

    try {
        const { rows } = await pool.query(query, [program_id, user_id, clinic_id]);
        if (rows.length === 0) return false;

        const { clinic_id: program_clinic_id, is_global, created_by, is_admin } = rows[0];

        // Não pode editar programas globais
        if (is_global) return false;

        // Pode editar se é da mesma clínica e é admin ou criador
        return program_clinic_id === clinic_id && (is_admin || created_by === user_id);
    } catch (error) {
        console.error('[MODEL-ERROR] Erro ao verificar permissão de edição:', error);
        return false;
    }
};

/**
 * @description Busca programas globais criados por super admin
 * @returns {Promise<object>} Programas organizados por hierarquia
 */
const getGlobalProgramsByAdmin = async () => {
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
            p.created_at,
            p.clinic_id,
            p.is_global,
            p.created_by,
            u.full_name AS created_by_name
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.is_global = true
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

            hierarchy[discipline_name][area_name][sub_area_name].push({
                ...programData,
                program_type: programData.created_by ? 'global_admin' : 'global_original'
            });
        });

        return hierarchy;
    } catch (error) {
        console.error('[MODEL-ERROR] Erro ao buscar programas globais criados por super admin:', error);
        throw error;
    }
};

/**
 * @description Busca estatísticas de uso de um programa
 * @param {number} program_id - ID do programa
 * @returns {Promise<object>} Estatísticas de uso
 */
const getProgramUsageStats = async (program_id) => {
    const query = `
        SELECT
            COUNT(DISTINCT ppa.id) as assignment_count,
            COUNT(DISTINCT ppa.patient_id) as patient_count,
            COUNT(ppp.id) as progress_count,
            MIN(ppp.session_date) as first_session,
            MAX(ppp.session_date) as last_session
        FROM patient_program_assignments ppa
        LEFT JOIN patient_program_progress ppp ON ppa.id = ppp.assignment_id
        WHERE ppa.program_id = $1
    `;

    try {
        const { rows } = await pool.query(query, [program_id]);
        const stats = rows[0];

        return {
            assignment_count: parseInt(stats.assignment_count) || 0,
            patient_count: parseInt(stats.patient_count) || 0,
            progress_count: parseInt(stats.progress_count) || 0,
            first_session: stats.first_session,
            last_session: stats.last_session
        };
    } catch (error) {
        console.error(`[MODEL-ERROR] Erro ao buscar estatísticas de uso do programa ${program_id}:`, error);
        throw error;
    }
};

// Exporta os métodos com os nomes que o controller espera
module.exports = {
    create,
    getAllWithHierarchy,
    findById,
    update,
    deleteById,
    getAssignedProgramsForGrade,
    searchPrograms,
    getCustomProgramsByClinic,
    getDisciplineHierarchy,
    canUserEditProgram,
    getGlobalProgramsByAdmin,
    getProgramUsageStats
};
