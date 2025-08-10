const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
// O middleware de autenticação foi removido daqui, pois já é aplicado no server.js

// Rota para atribuir um programa a um paciente
router.post('/', assignmentController.assignProgramToPatient);

// Rota para remover uma atribuição de programa
router.delete('/:assignmentId', assignmentController.removeProgramFromPatient);

// Rota para buscar programas designados de um paciente
router.get('/patient/:patientId', assignmentController.getAssignedProgramsByPatientId);

// Rota para buscar os detalhes de uma designação específica (apenas ativos)
router.get('/:id', assignmentController.getAssignmentDetails);

// Rota para buscar detalhes incluindo programas arquivados (dashboards/relatórios)
router.get('/:id/history', assignmentController.getAssignmentDetailsWithHistory);

// Rota para ATUALIZAR O STATUS de uma designação
router.patch('/:id/status', assignmentController.updateAssignmentStatus);

// Rota para registrar progresso (evolução)
router.post('/progress', assignmentController.recordProgress);

// Rota para buscar a evolução de uma designação específica
router.get('/:assignmentId/progress', assignmentController.getEvolutionForAssignment);

module.exports = router;
