const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const patientController = require('../controllers/patientController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

// --- ROTAS CORRIGIDAS ---
// Mantemos apenas as rotas que gerenciam PACIENTES.
// A lógica de atribuir/remover programas foi movida para programRoutes.js.

// Rota para buscar todos os pacientes do terapeuta logado
router.get('/', verifyToken, patientController.getAllPatients);

// Rota para buscar um paciente específico por ID
router.get('/:id', verifyToken, patientController.getPatientById);

// Rota para atualizar as anotações de um paciente
// A rota original era PATCH, vamos mantê-la consistente.
router.patch(
    '/:patientId/notes',
    verifyToken,
    patientController.updatePatientNotes
);


// As rotas de POST, PUT, DELETE para criar/atualizar/deletar pacientes
// provavelmente estão nas rotas de admin, então este arquivo fica limpo
// e focado no que o terapeuta pode fazer.

module.exports = router;
