const Assignment = require('../models/assignmentModel');

/**
 * @description Atribui um programa a um paciente.
 * @route POST /api/assignments/
 */
exports.assignProgramToPatient = async (req, res) => {
    const { patientId, programId } = req.body;
    const therapistId = req.user.id; // Pega o ID do terapeuta logado

    try {
        const assignmentData = { patient_id: patientId, program_id: programId, therapist_id: therapistId };
        const assignment = await Assignment.create(assignmentData);
        res.status(201).json(assignment);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] assignProgramToPatient:', error);
        if (error.code === '23505') { // Código de erro para violação de chave única
            return res.status(409).send('Este programa já foi designado a este paciente.');
        }
        res.status(500).send('Erro ao atribuir programa.');
    }
};

/**
 * @description Remove a atribuição de um programa de um paciente.
 * @route DELETE /api/assignments/:assignmentId
 */
exports.removeProgramFromPatient = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        const result = await Assignment.remove(assignmentId);
        if (result === 0) {
            return res.status(404).send('Atribuição não encontrada para remoção.');
        }
        res.status(200).json({ message: 'Atribuição removida com sucesso' });
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] removeProgramFromPatient (ID: ${assignmentId}):`, error);
        res.status(500).send('Erro interno ao remover atribuição.');
    }
};

/**
 * @description Busca todas as atribuições para um paciente específico.
 * @route GET /api/assignments/patient/:patientId
 */
exports.getAssignedProgramsByPatientId = async (req, res) => {
    const { patientId } = req.params;
    try {
        const assignments = await Assignment.findByPatientId(patientId);
        res.json(assignments);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getAssignedProgramsByPatientId (PatientID: ${patientId}):`, error);
        res.status(500).send('Erro ao buscar programas atribuídos.');
    }
};

/**
 * @description Busca os detalhes de uma atribuição específica.
 * @route GET /api/assignments/:id
 */
exports.getAssignmentDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const details = await Assignment.getAssignmentDetailsById(id);
        if (!details) {
            return res.status(404).send('Designação não encontrada.');
        }
        res.json(details);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getAssignmentDetails (ID: ${id}):`, error);
        res.status(500).send('Erro ao buscar detalhes da designação.');
    }
};

/**
 * @description Atualiza o status de uma atribuição.
 * @route PATCH /api/assignments/:id/status
 */
exports.updateAssignmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const updated = await Assignment.updateStatus(id, status);
        res.json(updated);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateAssignmentStatus (ID: ${id}):`, error);
        res.status(500).send('Erro ao atualizar status da atribuição.');
    }
};

/**
 * @description Registra o progresso (evolução) de uma sessão.
 * @route POST /api/assignments/progress
 */
exports.recordProgress = async (req, res) => {
    const progressData = { ...req.body, therapist_id: req.user.id };
    try {
        const progress = await Assignment.createProgress(progressData);
        res.status(201).json(progress);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] recordProgress:', error);
        res.status(500).send('Erro ao registrar progresso.');
    }
};

/**
 * @description Busca o histórico de progresso de uma atribuição.
 * @route GET /api/assignments/:assignmentId/progress
 */
exports.getEvolutionForAssignment = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        // Esta consulta foi simplificada. A lógica de associar o progresso
        // ao passo específico será feita no frontend usando os dados do progresso.
        const evolution = await Assignment.findProgressByAssignmentId(assignmentId);
        res.json(evolution);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getEvolutionForAssignment (AssignmentID: ${assignmentId}):`, error);
        res.status(500).send('Erro ao buscar evolução do paciente.');
    }
};
