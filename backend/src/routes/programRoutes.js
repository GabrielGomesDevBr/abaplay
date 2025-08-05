const express = require('express');
const router = express.Router();
const { getAllPrograms, getProgramAreas } = require('../controllers/programController');

// O middleware de autenticação (verifyToken) já é aplicado no arquivo server.js
// para todo o grupo de rotas '/api/programs'. Portanto, não é necessário
// adicioná-lo novamente em cada rota individualmente aqui.

// Rota para buscar todos os programas para um paciente específico
// A requisição será GET /api/programs?patientId=:patientId
router.get('/', getAllPrograms);

// Rota para buscar todas as áreas de programa
// A requisição será GET /api/programs/areas
router.get('/areas', getProgramAreas);

module.exports = router;
