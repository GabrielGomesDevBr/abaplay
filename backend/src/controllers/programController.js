const Program = require('../models/programModel');

/**
 * @description Cria um novo programa. Os detalhes como materiais e procedimento são salvos em campos JSONB.
 * @route POST /api/programs
 * @access Private
 */
exports.createProgram = async (req, res) => {
    try {
        // A lógica de criação agora é mais simples e será tratada no model para inserir os dados no novo formato.
        const program = await Program.create(req.body);
        res.status(201).json(program);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] createProgram:', error);
        res.status(500).send('Erro ao criar o programa.');
    }
};

/**
 * @description Busca todos os programas de forma estruturada, alinhado com o novo schema.
 * @route GET /api/programs
 * @access Private
 */
exports.getAllPrograms = async (req, res) => {
    try {
        // A função no model buscará os dados do novo schema, que já contém tudo que precisamos.
        const programs = await Program.getAllWithHierarchy();
        res.json(programs);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] getAllPrograms:', error);
        res.status(500).send('Erro ao buscar programas.');
    }
};

/**
 * @description Busca os detalhes completos de um programa específico pelo seu ID.
 * @route GET /api/programs/:id
 * @access Private
 */
exports.getProgramDetails = async (req, res) => {
    try {
        const { id } = req.params;
        // A função no model buscará todos os detalhes diretamente da tabela 'programs'.
        const program = await Program.findById(id);
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
 * @description Atualiza um programa existente.
 * @route PUT /api/programs/:id
 * @access Private
 */
exports.updateProgram = async (req, res) => {
    try {
        const { id } = req.params;
        // A lógica de atualização no model será simplificada para o novo formato de dados.
        const program = await Program.update(id, req.body);
        res.json(program);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateProgram (ID: ${id}):`, error);
        res.status(500).send('Erro ao atualizar o programa.');
    }
};

/**
 * @description Exclui um programa. A deleção em cascata no DB cuidará dos dados relacionados.
 * @route DELETE /api/programs/:id
 * @access Private
 */
exports.deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Program.deleteById(id);
        if (result === 0) {
            return res.status(404).send('Programa não encontrado para exclusão.');
        }
        res.status(200).send('Programa excluído com sucesso.');
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] deleteProgram (ID: ${id}):`, error);
        res.status(500).send('Erro ao excluir o programa.');
    }
};

/**
 * @description Busca os programas atribuídos a um paciente organizados para a grade de programas.
 * @route GET /api/programs/patient/:patientId/grade
 * @access Private
 */
exports.getPatientProgramsGrade = async (req, res) => {
    try {
        const { patientId } = req.params;
        const programsForGrade = await Program.getAssignedProgramsForGrade(patientId);
        res.json(programsForGrade);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getPatientProgramsGrade (Patient ID: ${req.params.patientId}):`, error);
        res.status(500).send('Erro ao buscar programas da grade do paciente.');
    }
};
