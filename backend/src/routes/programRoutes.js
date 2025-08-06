const express = require('express');
const router = express.Router();

// Importa o controller e o middleware
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/authMiddleware');

// CORREÇÃO: Usando 'authMiddleware.verifyToken' que é a função correta
// exportada pelo seu middleware original.

// Rota para buscar todos os programas
router.get('/', authMiddleware.verifyToken, programController.getAllPrograms);

// Rota para designar um programa a um paciente
// CORREÇÃO: Removido 'isAdmin' pois não existe no seu middleware original.
// A lógica de permissão, se necessária, deve estar dentro do controller ou ser
// um novo middleware. Por agora, apenas a verificação do token é aplicada.
router.post('/assign', authMiddleware.verifyToken, programController.assignProgramToPatient);

// Rota para buscar programas designados de um paciente
router.get('/assigned/:patientId', authMiddleware.verifyToken, programController.getAssignedProgramsForPatient);

// Rota para registrar evolução
router.post('/evolution', authMiddleware.verifyToken, programController.recordEvolution);

// Rota para buscar a evolução de um paciente
router.get('/evolution/:patientId/:programId', authMiddleware.verifyToken, programController.getEvolutionForPatient);

// Rota para buscar dados consolidados de evolução para relatórios
router.get('/consolidated-evolution/:patientId', authMiddleware.verifyToken, programController.getConsolidatedEvolutionData);

module.exports = router;
