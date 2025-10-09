const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { requireProPlan } = require('../middleware/subscriptionMiddleware');
// O middleware de autenticação foi removido daqui, pois já é aplicado no server.js
// ⚠️ PROTEGIDAS: Atribuição de programas e registro detalhado são features Pro

// Rota para buscar níveis de prompting disponíveis (deve vir antes de rotas com parâmetros)
router.get('/prompt-levels', requireProPlan, assignmentController.getPromptLevels);

// Rota para registrar progresso (evolução)
router.post('/progress', requireProPlan, assignmentController.recordProgress);

// Rota para atribuir um programa a um paciente
router.post('/', requireProPlan, assignmentController.assignProgramToPatient);

// Rota para remover uma atribuição de programa
router.delete('/:assignmentId', requireProPlan, assignmentController.removeProgramFromPatient);

// Rota para buscar programas designados de um paciente
router.get('/patient/:patientId', requireProPlan, assignmentController.getAssignedProgramsByPatientId);

// Rota para buscar os detalhes de uma designação específica (apenas ativos)
router.get('/:id', requireProPlan, assignmentController.getAssignmentDetails);

// Rota para buscar detalhes incluindo programas arquivados (dashboards/relatórios)
router.get('/:id/history', requireProPlan, assignmentController.getAssignmentDetailsWithHistory);

// Rota para ATUALIZAR O STATUS de uma designação
router.patch('/:id/status', requireProPlan, assignmentController.updateAssignmentStatus);

// Rota para buscar a evolução de uma designação específica
router.get('/:assignmentId/progress', requireProPlan, assignmentController.getEvolutionForAssignment);

// Rota para atualizar tentativas customizadas de uma atribuição
router.put('/:assignmentId/custom-trials', requireProPlan, assignmentController.updateCustomTrials);

module.exports = router;
