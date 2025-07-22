const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

// --- CORREÇÃO DEFINITIVA ---
// Importando 'verifyToken' em vez de 'protect' para seguir o padrão
// que já funciona no resto da sua aplicação (ex: caseDiscussionRoutes).
const { verifyToken } = require('../middleware/authMiddleware');

// --- ROTA FINAL ---
// Usando 'verifyToken' como o middleware de proteção.
router.get('/dashboard', verifyToken, parentController.getDashboardData);

module.exports = router;
