const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

// --- CORREÇÃO DEFINITIVA ---
// Importando 'verifyToken' em vez de 'protect' para seguir o padrão
// que já funciona no resto da sua aplicação (ex: caseDiscussionRoutes).
const { verifyToken } = require('../middleware/authMiddleware');
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// --- ROTA FINAL ---
// Usando 'verifyToken' como o middleware de proteção.
// ⚠️ PROTEGIDA: Dashboard de pais mostra evolução de programas (feature Pro)
router.get('/dashboard', verifyToken, requireProPlan, parentController.getDashboardData);

module.exports = router;
