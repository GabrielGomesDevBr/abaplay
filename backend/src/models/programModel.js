// backend/src/models/programModel.js

const pool = require('./db');

/**
 * Busca todos os programas do banco de dados e os retorna em uma estrutura aninhada.
 * A estrutura é: Discipline -> Area -> SubArea -> Programa.
 * Esta função usa funções de agregação JSON do PostgreSQL para construir o objeto
 * diretamente no banco de dados, o que é muito eficiente.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de disciplinas, cada uma contendo suas áreas, sub-áreas e programas.
 */
const getAllProgramsStructured = async () => {
    const query = `
        SELECT
            d.id as discipline_id,
            d.name as discipline_name,
            COALESCE(
                (
                    SELECT json_agg(areas_agg ORDER BY areas_agg.area_name)
                    FROM (
                        SELECT
                            pa.id AS area_id,
                            pa.name AS area_name,
                            COALESCE(
                                (
                                    SELECT json_agg(sub_areas_agg ORDER BY sub_areas_agg.sub_area_name)
                                    FROM (
                                        SELECT
                                            psa.id AS sub_area_id,
                                            psa.name AS sub_area_name,
                                            COALESCE(
                                                (
                                                    SELECT json_agg(programs_agg ORDER BY programs_agg.name)
                                                    FROM (
                                                        SELECT
                                                            p.id,
                                                            p.name,
                                                            p.objective
                                                        FROM programs p
                                                        WHERE p.sub_area_id = psa.id
                                                    ) AS programs_agg
                                                ), '[]'::json
                                            ) AS programs
                                        FROM program_sub_areas psa
                                        WHERE psa.area_id = pa.id
                                    ) AS sub_areas_agg
                                ), '[]'::json
                            ) AS areas
                        FROM program_areas pa
                        WHERE pa.discipline_id = d.id
                    ) AS areas_agg
                ), '[]'::json
            ) AS areas
        FROM disciplines d
        ORDER BY d.name;
    `;
    try {
        const { rows } = await pool.query(query);
        // O resultado já vem estruturado do banco, similar ao antigo JSON
        return rows;
    } catch (error) {
        console.error('Erro ao buscar programas estruturados:', error);
        throw error;
    }
};

/**
 * Busca um programa específico pelo seu ID, incluindo todos os seus passos e instruções.
 * @param {number} programId O ID do programa a ser buscado.
 * @returns {Promise<Object|null>} Uma promessa que resolve para o objeto do programa ou null se não for encontrado.
 */
const getProgramById = async (programId) => {
    const query = `
        SELECT
            p.id,
            p.name,
            p.objective,
            psa.name as sub_area_name,
            pa.name as area_name,
            d.name as discipline_name,
            COALESCE(
                (
                    SELECT json_agg(steps_agg ORDER BY steps_agg.step_number)
                    FROM (
                        SELECT
                            ps.id as step_id,
                            ps.step_number,
                            ps.name as step_name,
                            ps.description as step_description,
                            COALESCE(
                                (
                                    SELECT json_agg(instructions_agg ORDER BY instructions_agg.instruction_number)
                                    FROM (
                                        SELECT
                                            psi.id as instruction_id,
                                            psi.instruction_number,
                                            psi.description as instruction_description
                                        FROM program_step_instructions psi
                                        WHERE psi.step_id = ps.id
                                    ) AS instructions_agg
                                ), '[]'::json
                            ) AS instructions
                        FROM program_steps ps
                        WHERE ps.program_id = p.id
                    ) AS steps_agg
                ), '[]'::json
            ) AS steps
        FROM programs p
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE p.id = $1;
    `;
    try {
        const { rows } = await pool.query(query, [programId]);
        return rows[0] || null;
    } catch (error) {
        console.error(`Erro ao buscar programa com ID ${programId}:`, error);
        throw error;
    }
};

/**
 * --- NOVA FUNÇÃO ---
 * Busca os detalhes de uma designação específica pelo seu ID.
 * @param {number} assignmentId O ID da designação (da tabela patient_program_assignments).
 * @returns {Promise<Object|null>} Uma promessa que resolve para o objeto da designação ou null se não for encontrado.
 */
const getAssignmentById = async (assignmentId) => {
    const query = `
        SELECT
            ppa.id AS assignment_id,
            ppa.patient_id,
            ppa.program_id,
            ppa.status,
            p.name AS program_name,
            pat.name AS patient_name
        FROM patient_program_assignments ppa
        JOIN programs p ON ppa.program_id = p.id
        JOIN patients pat ON ppa.patient_id = pat.id
        WHERE ppa.id = $1;
    `;
    try {
        const { rows } = await pool.query(query, [assignmentId]);
        return rows[0] || null;
    } catch (error) {
        console.error(`Erro ao buscar designação com ID ${assignmentId}:`, error);
        throw error;
    }
};


module.exports = {
    getAllProgramsStructured,
    getProgramById,
    getAssignmentById, // Nova função adicionada à exportação
};
