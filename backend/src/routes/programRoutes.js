// backend/src/routes/programRoutes.js

const express = require('express');
const router = express.Router();

// Importa o controller e o middleware
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/authMiddleware');

// Rota para buscar todos os programas (estrutura aninhada)
router.get('/', authMiddleware.verifyToken, programController.getAllPrograms);

// Rota para buscar os detalhes de um programa específico.
router.get('/:programId', authMiddleware.verifyToken, programController.getProgramDetails);

// --- NOVA ROTA ADICIONADA ---
// Rota para buscar os detalhes de uma designação específica
router.get('/assignment/:assignmentId', authMiddleware.verifyToken, programController.getAssignmentDetails);

// Rota para designar um programa a um paciente
router.post('/assign', authMiddleware.verifyToken, programController.assignProgramToPatient);

// Rota para remover um programa de um paciente
router.delete('/assign/:patientId/:programId', authMiddleware.verifyToken, programController.removeProgramFromPatient);

// Rota para buscar programas designados de um paciente
router.get('/assigned/:patientId', authMiddleware.verifyToken, programController.getAssignedProgramsForPatient);

// Rota para registrar evolução
router.post('/evolution', authMiddleware.verifyToken, programController.recordEvolution);

// Rota para buscar a evolução de um paciente
router.get('/evolution/:patientId/:programId', authMiddleware.verifyToken, programController.getEvolutionForPatient);

// Rota para buscar dados consolidados de evolução para relatórios
router.get('/consolidated-evolution/:patientId', authMiddleware.verifyToken, programController.getConsolidatedEvolutionData);

module.exports = router;
