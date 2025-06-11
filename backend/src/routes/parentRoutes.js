// backend/src/routes/parentRoutes.js

const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { verifyToken } = require('../middleware/authMiddleware');

// <<< MELHORIA: A verificação de papel agora é feita dentro do próprio controlador >>>
// O middleware aqui apenas precisa de garantir que o utilizador está logado.
router.use(verifyToken);

/**
 * @route   GET /api/parent/dashboard
 * @desc    Obtém os dados necessários para o dashboard dos pais.
 * A rota é única e o controlador lida com a lógica de permissão.
 * @access  Private (Pais)
 */
router.get(
    '/dashboard',
    parentController.getDashboardData
);

// <<< REMOVIDO: As rotas antigas para /children e /children/:childId/progress foram removidas >>>
// pois a nova rota /dashboard já fornece toda a informação necessária de forma mais eficiente.

module.exports = router;
