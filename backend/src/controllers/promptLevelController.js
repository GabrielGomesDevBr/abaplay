const Assignment = require('../models/assignmentModel');
const { isValidPromptLevel } = require('../utils/promptLevels');

const promptLevelController = {};

/**
 * Atualiza o nível de prompting para uma atribuição específica
 */
promptLevelController.updatePromptLevel = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { promptLevel } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!assignmentId || !promptLevel === undefined) {
      return res.status(400).json({ 
        errors: [{ msg: 'assignmentId e promptLevel são obrigatórios.' }] 
      });
    }

    // Valida se o nível de prompting é válido (0-5)
    if (!isValidPromptLevel(promptLevel)) {
      return res.status(400).json({ 
        errors: [{ msg: 'Nível de prompting deve ser um número entre 0 e 5.' }] 
      });
    }

    // Busca os detalhes da atribuição para verificar permissões
    const assignmentDetails = await Assignment.getAssignmentDetailsById(assignmentId);
    if (!assignmentDetails) {
      return res.status(404).json({ 
        errors: [{ msg: 'Atribuição não encontrada ou inativa.' }] 
      });
    }

    // Verifica se o usuário tem permissão (terapeuta da atribuição ou admin)
    const userRole = req.user.role;
    const isTherapistOfAssignment = assignmentDetails.therapist.id === userId;
    const isAdmin = userRole === 'admin' || userRole === 'administrador';

    if (!isTherapistOfAssignment && !isAdmin) {
      return res.status(403).json({ 
        errors: [{ msg: 'Sem permissão para atualizar este programa.' }] 
      });
    }

    // Atualiza o nível de prompting
    const updatedAssignment = await Assignment.updatePromptLevel(assignmentId, promptLevel);

    console.log(`[PROMPT-LEVEL] Nível atualizado para ${promptLevel} - Assignment ${assignmentId} por usuário ${userId}`);

    res.status(200).json({
      message: 'Nível de prompting atualizado com sucesso.',
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Erro ao atualizar nível de prompting:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Busca o nível de prompting atual para uma atribuição
 */
promptLevelController.getCurrentPromptLevel = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;

    if (!assignmentId) {
      return res.status(400).json({ 
        errors: [{ msg: 'assignmentId é obrigatório.' }] 
      });
    }

    // Busca os detalhes da atribuição para verificar permissões
    const assignmentDetails = await Assignment.getAssignmentDetailsById(assignmentId);
    if (!assignmentDetails) {
      return res.status(404).json({ 
        errors: [{ msg: 'Atribuição não encontrada ou inativa.' }] 
      });
    }

    // Verifica permissões (terapeuta, admin ou pai do paciente)
    const userRole = req.user.role;
    const isTherapistOfAssignment = assignmentDetails.therapist.id === userId;
    const isAdmin = userRole === 'admin' || userRole === 'administrador';
    const isParent = userRole === 'parent' || userRole === 'pai';

    if (!isTherapistOfAssignment && !isAdmin && !isParent) {
      return res.status(403).json({ 
        errors: [{ msg: 'Sem permissão para visualizar este programa.' }] 
      });
    }

    // Busca o nível atual
    const currentLevel = await Assignment.getCurrentPromptLevel(assignmentId);

    res.status(200).json({
      assignmentId: parseInt(assignmentId),
      currentPromptLevel: currentLevel || 5, // Default para 5 se não encontrado
      assignment: {
        id: assignmentDetails.assignment_id,
        patient: assignmentDetails.patient,
        program: assignmentDetails.program
      }
    });

  } catch (error) {
    console.error('Erro ao buscar nível de prompting:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Busca o nível de prompting para um programa específico de um paciente
 */
promptLevelController.getPromptLevelByPatientAndProgram = async (req, res) => {
  try {
    const { patientId, programId } = req.params;
    const userId = req.user.id;

    if (!patientId || !programId) {
      return res.status(400).json({ 
        errors: [{ msg: 'patientId e programId são obrigatórios.' }] 
      });
    }

    // Para esta função, implementamos verificação de permissão mais flexível
    // Admins podem ver qualquer coisa, terapeutas podem ver seus pacientes, pais podem ver seus filhos
    
    const currentLevel = await Assignment.getPromptLevelByPatientAndProgram(patientId, programId);

    res.status(200).json({
      patientId: parseInt(patientId),
      programId: parseInt(programId),
      currentPromptLevel: currentLevel || 5 // Default para 5 se não encontrado
    });

  } catch (error) {
    console.error('Erro ao buscar nível de prompting por paciente/programa:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

module.exports = promptLevelController;