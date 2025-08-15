const express = require('express');
const router = express.Router();
const promptLevelController = require('../controllers/promptLevelController');
const { verifyToken } = require('../middleware/authMiddleware');

// Aplica verificação de token a todas as rotas
router.use(verifyToken);

/**
 * PUT /api/prompt-levels/assignment/:assignmentId
 * Atualiza o nível de prompting para uma atribuição específica
 */
router.put('/assignment/:assignmentId', promptLevelController.updatePromptLevel);

/**
 * GET /api/prompt-levels/assignment/:assignmentId
 * Busca o nível de prompting atual para uma atribuição
 */
router.get('/assignment/:assignmentId', promptLevelController.getCurrentPromptLevel);

/**
 * GET /api/prompt-levels/patient/:patientId/program/:programId
 * Busca o nível de prompting para um programa específico de um paciente
 */
router.get('/patient/:patientId/program/:programId', promptLevelController.getPromptLevelByPatientAndProgram);

module.exports = router;