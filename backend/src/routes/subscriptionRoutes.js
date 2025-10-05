const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/subscriptionMiddleware');

/**
 * Rotas de Assinatura e Planos
 * Base: /api/subscription
 */

// ========================================
// ROTAS PÚBLICAS (COM AUTENTICAÇÃO)
// ========================================

/**
 * GET /api/subscription/my-subscription
 * Buscar informações de assinatura da clínica do usuário logado
 */
router.get('/my-subscription', verifyToken, subscriptionController.getMySubscription);

/**
 * GET /api/subscription/plan-prices
 * Buscar preços dos planos disponíveis
 */
router.get('/plan-prices', verifyToken, subscriptionController.getPlanPrices);

// ========================================
// ROTAS SUPER ADMIN
// ========================================

/**
 * GET /api/subscription/all
 * Buscar todas assinaturas (SuperAdmin)
 */
router.get('/all', verifyToken, requireSuperAdmin, subscriptionController.getAllSubscriptions);

/**
 * GET /api/subscription/stats
 * Buscar estatísticas gerais de assinaturas (SuperAdmin Dashboard)
 */
router.get('/stats', verifyToken, requireSuperAdmin, subscriptionController.getStats);

/**
 * GET /api/subscription/expiring-trials
 * Buscar trials que expiram em breve
 * Query params: ?daysAhead=3 (default: 3)
 */
router.get('/expiring-trials', verifyToken, requireSuperAdmin, subscriptionController.getExpiringTrials);

/**
 * GET /api/subscription/blocked-features/:clinicId?
 * Buscar eventos de features bloqueadas (oportunidades de upgrade)
 * Query params: ?limit=50
 */
router.get('/blocked-features/:clinicId?', verifyToken, requireSuperAdmin, subscriptionController.getBlockedFeatures);

/**
 * PUT /api/subscription/clinic/:clinicId/plan
 * Atualizar plano de assinatura de uma clínica
 * Body: { planName: 'pro' | 'scheduling' }
 */
router.put('/clinic/:clinicId/plan', verifyToken, requireSuperAdmin, subscriptionController.updatePlan);

/**
 * POST /api/subscription/clinic/:clinicId/trial/activate
 * Ativar trial Pro para uma clínica
 * Body: { durationDays: 7 } (opcional, padrão: 7, max: 30)
 */
router.post('/clinic/:clinicId/trial/activate', verifyToken, requireSuperAdmin, subscriptionController.activateTrial);

/**
 * POST /api/subscription/clinic/:clinicId/trial/convert
 * Converter trial em plano Pro definitivo
 */
router.post('/clinic/:clinicId/trial/convert', verifyToken, requireSuperAdmin, subscriptionController.convertTrial);

/**
 * DELETE /api/subscription/clinic/:clinicId/trial
 * Cancelar trial ativo
 */
router.delete('/clinic/:clinicId/trial', verifyToken, requireSuperAdmin, subscriptionController.cancelTrial);

/**
 * GET /api/subscription/clinic/:clinicId/trial/history
 * Buscar histórico de trials de uma clínica
 */
router.get('/clinic/:clinicId/trial/history', verifyToken, requireSuperAdmin, subscriptionController.getTrialHistory);

/**
 * GET /api/subscription/clinic/:clinicId/analytics
 * Buscar analytics de assinatura de uma clínica
 * Query params: ?limit=100
 */
router.get('/clinic/:clinicId/analytics', verifyToken, requireSuperAdmin, subscriptionController.getAnalytics);

module.exports = router;
