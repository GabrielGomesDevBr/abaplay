const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
// O middleware de autenticação foi removido daqui, pois já é aplicado no server.js

// --- Rotas focadas apenas em Programas ---

// Rota para CRIAR um novo programa
router.post('/', programController.createProgram);

// Rota para buscar todos os programas
router.get('/', programController.getAllPrograms);

// Rota para buscar os programas atribuídos de um paciente para grade de programas
router.get('/patient/:patientId/grade', programController.getPatientProgramsGrade);

// Rota para buscar os detalhes de um programa específico.
router.get('/:id', programController.getProgramDetails);

// Rota para ATUALIZAR um programa
router.put('/:id', programController.updateProgram);

// Rota para DELETAR um programa
router.delete('/:id', programController.deleteProgram);

module.exports = router;
