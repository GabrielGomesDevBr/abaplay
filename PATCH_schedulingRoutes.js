// PATCH para backend/src/routes/schedulingRoutes.js
// Adicionar estas rotas ao arquivo existente

/**
 * NOVAS ROTAS - Adicionar antes de module.exports = router;
 */

// GET /api/scheduling/pending-actions - Buscar ações pendentes
router.get(
  '/pending-actions',
  verifyToken,
  schedulingController.getPendingActions
);

// POST /api/scheduling/retroactive/batch - Criar retroativos em lote
router.post(
  '/retroactive/batch',
  verifyToken,
  schedulingController.createBatchRetroactive
);

// POST /api/scheduling/run-maintenance - Executar manutenção manual (admin)
router.post(
  '/run-maintenance',
  verifyToken,
  schedulingController.runMaintenanceManually
);

// ====================
// INSTRUÇÕES DE USO:
// ====================
// 1. Abra o arquivo: backend/src/routes/schedulingRoutes.js
// 2. Adicione as 3 rotas acima ANTES de "module.exports = router;"
// 3. Certifique-se de que verifyToken está importado no topo do arquivo
// 4. Salve o arquivo