const Program = require('../models/programModel');

/**
 * @description Cria um novo programa. Os detalhes como materiais e procedimento são salvos em campos JSONB.
 * @route POST /api/programs
 * @access Private
 */
exports.createProgram = async (req, res) => {
    try {
        // Apenas super admins podem criar programas globais
        const program = await Program.create(req.body);
        res.status(201).json(program);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] createProgram:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Já existe um programa com este nome.' });
        }
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
        const { search, discipline } = req.query;
        const clinic_id = req.user.clinic_id;

        if (search) {
            // Se há termo de busca, usar função específica de busca
            const programs = await Program.searchPrograms(search, discipline, clinic_id);
            res.json(programs);
        } else {
            // Busca normal hierárquica incluindo programas da clínica
            const programs = await Program.getAllWithHierarchy(clinic_id);
            res.json(programs);
        }
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
        const { id: user_id, clinic_id } = req.user;

        // Verifica se o usuário pode editar este programa
        const canEdit = await Program.canUserEditProgram(id, user_id, clinic_id);
        if (!canEdit) {
            return res.status(403).json({ message: 'Sem permissão para editar este programa.' });
        }

        const program = await Program.update(id, req.body);
        if (!program) {
            return res.status(404).json({ message: 'Programa não encontrado.' });
        }
        res.json(program);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateProgram (ID: ${req.params.id}):`, error);
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
        const { id: user_id, clinic_id, is_admin } = req.user;

        // Apenas administradores podem deletar programas customizados
        if (!is_admin) {
            return res.status(403).json({ message: 'Apenas administradores podem excluir programas.' });
        }

        // Verifica se o programa pertence à clínica do admin
        const canEdit = await Program.canUserEditProgram(id, user_id, clinic_id);
        if (!canEdit) {
            return res.status(403).json({ message: 'Sem permissão para excluir este programa.' });
        }

        const result = await Program.deleteById(id);
        if (result === 0) {
            return res.status(404).send('Programa não encontrado para exclusão.');
        }
        res.status(200).send('Programa excluído com sucesso.');
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] deleteProgram (ID: ${req.params.id}):`, error);
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

/**
 * @description Cria um programa customizado para a clínica
 * @route POST /api/programs/custom
 * @access Private (Apenas admins)
 */
exports.createCustomProgram = async (req, res) => {
    try {
        const { clinic_id, is_admin, id: user_id } = req.user;

        if (!is_admin) {
            return res.status(403).json({ message: 'Apenas administradores podem criar programas customizados.' });
        }

        const programData = {
            ...req.body,
            clinic_id,
            is_global: false,
            created_by: user_id
        };

        const program = await Program.create(programData);
        res.status(201).json(program);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] createCustomProgram:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Já existe um programa com este nome nesta clínica.' });
        }
        res.status(500).json({ message: 'Erro ao criar programa customizado.' });
    }
};

/**
 * @description Busca programas customizados da clínica
 * @route GET /api/programs/custom
 * @access Private
 */
exports.getCustomPrograms = async (req, res) => {
    try {
        const { clinic_id } = req.user;
        const customPrograms = await Program.getCustomProgramsByClinic(clinic_id);
        res.json(customPrograms);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] getCustomPrograms:', error);
        res.status(500).send('Erro ao buscar programas customizados.');
    }
};

/**
 * @description Busca hierarquia de disciplinas para formulário
 * @route GET /api/programs/hierarchy
 * @access Private
 */
exports.getDisciplineHierarchy = async (req, res) => {
    try {
        const hierarchy = await Program.getDisciplineHierarchy();
        res.json(hierarchy);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] getDisciplineHierarchy:', error);
        res.status(500).send('Erro ao buscar hierarquia de disciplinas.');
    }
};

/**
 * @description Busca estatísticas de uso de um programa
 * @route GET /api/programs/:id/usage
 * @access Private
 */
exports.getProgramUsage = async (req, res) => {
    try {
        const { id } = req.params;
        const { clinic_id } = req.user;

        // Verificar se o programa pertence à clínica ou é global
        const program = await Program.findById(id);
        if (!program) {
            return res.status(404).json({ message: 'Programa não encontrado.' });
        }

        if (!program.is_global && program.clinic_id !== clinic_id) {
            return res.status(403).json({ message: 'Sem permissão para acessar este programa.' });
        }

        // Buscar estatísticas de uso
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

        const pool = require('../models/db');
        const { rows } = await pool.query(query, [id]);
        const stats = rows[0];

        res.json({
            program_id: parseInt(id),
            program_name: program.name,
            is_global: program.is_global,
            clinic_id: program.clinic_id,
            assignment_count: parseInt(stats.assignment_count) || 0,
            patient_count: parseInt(stats.patient_count) || 0,
            progress_count: parseInt(stats.progress_count) || 0,
            first_session: stats.first_session,
            last_session: stats.last_session,
            has_data: parseInt(stats.assignment_count) > 0 || parseInt(stats.progress_count) > 0
        });

    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getProgramUsage (ID: ${req.params.id}):`, error);
        res.status(500).send('Erro ao buscar estatísticas de uso do programa.');
    }
};
