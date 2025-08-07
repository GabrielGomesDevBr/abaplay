const Program = require('../models/programModel');

/**
 * @description Cria um novo programa com etapas e instruções.
 * @route POST /api/programs
 */
exports.createProgram = async (req, res) => {
    try {
        const program = await Program.createProgram(req.body);
        res.status(201).json(program);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] createProgram:', error);
        res.status(500).send('Erro ao criar o programa.');
    }
};

/**
 * @description Busca todos os programas de forma estruturada por hierarquia.
 * @route GET /api/programs
 */
exports.getAllPrograms = async (req, res) => {
    try {
        // A função no model foi renomeada para maior clareza
        const programs = await Program.getAllProgramsWithHierarchy();
        res.json(programs);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] getAllPrograms:', error);
        res.status(500).send('Erro ao buscar programas.');
    }
};

/**
 * @description Busca os detalhes completos de um programa específico.
 * @route GET /api/programs/:id
 */
exports.getProgramDetails = async (req, res) => {
    try {
        // O parâmetro na rota agora é 'id'
        const { id } = req.params;
        const program = await Program.getProgramById(id);
        if (!program) {
            return res.status(404).send('Programa não encontrado.');
        }
        res.json(program);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getProgramDetails (ID: ${req.params.id}):`, error);
        res.status(500).send('Erro ao buscar detalhes do programa.');
    }
};

/**
 * @description Atualiza um programa existente, suas etapas e instruções.
 * @route PUT /api/programs/:id
 */
exports.updateProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const program = await Program.updateProgram(id, req.body);
        res.json(program);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateProgram (ID: ${id}):`, error);
        res.status(500).send('Erro ao atualizar o programa.');
    }
};

/**
 * @description Exclui um programa e todos os seus dados relacionados.
 * @route DELETE /api/programs/:id
 */
exports.deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Program.deleteProgram(id);
        if (result === 0) {
            return res.status(404).send('Programa não encontrado para exclusão.');
        }
        res.status(200).send('Programa excluído com sucesso.');
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] deleteProgram (ID: ${id}):`, error);
        res.status(500).send('Erro ao excluir o programa.');
    }
};
