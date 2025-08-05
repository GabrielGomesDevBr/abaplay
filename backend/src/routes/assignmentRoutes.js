const express = require('express');
const router = express.Router();
const { assignProgramToPatient } = require('../controllers/assignmentController');

// O middleware de autenticação (verifyToken) já é aplicado no arquivo server.js
// para todo o grupo de rotas '/api/assignments'. Portanto, não é necessário
// adicioná-lo novamente aqui.

// Rota para criar uma nova atribuição de programa para um paciente.
// A requisição será POST /api/assignments
router.post('/', assignProgramToPatient);

module.exports = router;
