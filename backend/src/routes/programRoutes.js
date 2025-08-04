// backend/src/routes/programRoutes.js

const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
// Importa o middleware de autenticação correto do seu projeto
const { verifyToken } = require('../middleware/authMiddleware'); 

// @route   GET /api/programs
// @desc    Busca todos os programas públicos
// @access  Público
router.get('/', programController.getAllPrograms);

// @route   POST /api/programs
// @desc    Cria um novo programa customizado para uma clínica
// @access  Protegido (a verificação de 'admin' é feita no controller)
router.post('/', verifyToken, programController.createProgram); // Usa o middleware 'verifyToken'

module.exports = router;
