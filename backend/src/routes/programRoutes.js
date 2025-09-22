const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
// O middleware de autenticação foi removido daqui, pois já é aplicado no server.js

// --- Rotas focadas apenas em Programas ---

// Rota para CRIAR um novo programa
router.post('/', programController.createProgram);

// Rota para buscar todos os programas
router.get('/', programController.getAllPrograms);

// --- Rotas para Programas Customizados ---

// Rota para buscar hierarquia de disciplinas (deve vir antes das rotas com parâmetros)
router.get('/hierarchy', programController.getDisciplineHierarchy);

// Rota para criar programa customizado
router.post('/custom', programController.createCustomProgram);

// Rota para buscar programas customizados da clínica
router.get('/custom', programController.getCustomPrograms);

// Rota para buscar os programas atribuídos de um paciente para grade de programas
router.get('/patient/:patientId/grade', programController.getPatientProgramsGrade);

// Rota para buscar estatísticas de uso de um programa (deve vir antes de /:id)
router.get('/:id/usage', programController.getProgramUsage);

// Rota para buscar os detalhes de um programa específico.
router.get('/:id', programController.getProgramDetails);

// Rota para ATUALIZAR um programa
router.put('/:id', programController.updateProgram);

// Rota para DELETAR um programa
router.delete('/:id', programController.deleteProgram);

module.exports = router;
