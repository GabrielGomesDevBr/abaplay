// backend/src/routes/superAdminRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifySuperAdmin } = require('../middleware/superAdminMiddleware');
const superAdminController = require('../controllers/superAdminController');
const enterpriseController = require('../controllers/enterpriseController');

const router = express.Router();

// Aplica middleware de autenticação e verificação de super admin para todas as rotas
router.use(verifyToken, verifySuperAdmin);

// =====================================
// ROTAS DE MÉTRICAS E SISTEMA
// =====================================

/**
 * GET /api/super-admin/metrics
 * Busca métricas gerais do sistema.
 */
router.get('/metrics', superAdminController.getSystemMetrics);

/**
 * GET /api/super-admin/activity-log
 * Busca log de atividades do sistema.
 */
router.get('/activity-log', superAdminController.getActivityLog);

/**
 * GET /api/super-admin/growth-stats
 * Busca estatísticas de crescimento.
 */
router.get('/growth-stats', superAdminController.getGrowthStats);

// =====================================
// ROTAS DE GESTÃO DE CLÍNICAS
// =====================================

/**
 * GET /api/super-admin/clinics
 * Busca todas as clínicas com filtros opcionais.
 */
router.get('/clinics', superAdminController.getAllClinics);

/**
 * POST /api/super-admin/clinics
 * Cria nova clínica com administrador.
 */
router.post(
  '/clinics',
  [
    body('clinic_name', 'Nome da clínica é obrigatório.').not().isEmpty().trim(),
    body('max_patients', 'Limite de pacientes deve ser um número positivo.').isInt({ min: 1 }),
    body('admin_name', 'Nome do administrador é obrigatório.').not().isEmpty().trim(),
    body('admin_username', 'Username do administrador é obrigatório.').not().isEmpty().trim()
  ],
  superAdminController.createClinic
);

/**
 * PUT /api/super-admin/clinics/:clinicId/suspend
 * Suspende uma clínica.
 */
router.put(
  '/clinics/:clinicId/suspend',
  [
    param('clinicId', 'ID da clínica inválido.').isInt(),
    body('reason', 'Motivo da suspensão é obrigatório.').not().isEmpty().trim()
  ],
  superAdminController.suspendClinic
);

/**
 * PUT /api/super-admin/clinics/:clinicId/reactivate
 * Reativa uma clínica.
 */
router.put(
  '/clinics/:clinicId/reactivate',
  [
    param('clinicId', 'ID da clínica inválido.').isInt()
  ],
  superAdminController.reactivateClinic
);

/**
 * PUT /api/super-admin/clinics/:clinicId/patient-limit
 * Atualiza limite de pacientes de uma clínica.
 */
router.put(
  '/clinics/:clinicId/patient-limit',
  [
    param('clinicId', 'ID da clínica inválido.').isInt(),
    body('maxPatients', 'Limite de pacientes deve ser um número positivo.').isInt({ min: 1 })
  ],
  superAdminController.updatePatientLimit
);

/**
 * PUT /api/super-admin/clinics/:id/reset-admin-password
 * Resetar senha do administrador de uma clínica (seta como NULL).
 */
router.put(
  '/clinics/:id/reset-admin-password',
  [
    param('id', 'ID da clínica inválido.').isInt()
  ],
  superAdminController.resetClinicAdminPassword
);

// =====================================
// ROTAS FINANCEIRAS
// =====================================

/**
 * GET /api/super-admin/billing
 * Busca todas as cobranças com filtros.
 */
router.get('/billing', superAdminController.getAllBillings);

/**
 * POST /api/super-admin/billing
 * Cria nova cobrança.
 */
router.post(
  '/billing',
  [
    body('clinic_id', 'ID da clínica é obrigatório.').isInt(),
    body('due_date', 'Data de vencimento é obrigatória.').isISO8601(),
    body('notes', 'Observações devem ser uma string.').optional().isString()
  ],
  superAdminController.createBilling
);

/**
 * PUT /api/super-admin/billing/:billingId/payment
 * Registra pagamento para uma cobrança.
 */
router.put(
  '/billing/:billingId/payment',
  [
    param('billingId', 'ID da cobrança inválido.').isInt(),
    body('payment_method', 'Método de pagamento é obrigatório.').not().isEmpty().trim(),
    body('payment_date', 'Data de pagamento deve ser válida.').optional().isISO8601()
  ],
  superAdminController.recordPayment
);

/**
 * GET /api/super-admin/billing/revenue-evolution
 * Busca evolução da receita por mês.
 */
router.get('/billing/revenue-evolution', superAdminController.getRevenueEvolution);

/**
 * PUT /api/super-admin/billing/update-overdue
 * Atualiza status de cobranças vencidas.
 */
router.put('/billing/update-overdue', superAdminController.updateOverdueStatus);

/**
 * GET /api/super-admin/billing/clinic/:clinicId/history
 * Busca histórico financeiro de uma clínica.
 */
router.get(
  '/billing/clinic/:clinicId/history',
  [
    param('clinicId', 'ID da clínica inválido.').isInt()
  ],
  superAdminController.getClinicFinancialHistory
);

/**
 * GET /api/super-admin/billing/alerts
 * Busca alertas de vencimento e cobranças vencidas.
 */
router.get('/billing/alerts', superAdminController.getBillingAlerts);

/**
 * POST /api/super-admin/billing/process-overdue
 * Executa processo de atualização de status vencidas e sugere suspensões.
 */
router.post('/billing/process-overdue', superAdminController.processOverdueBills);

// =====================================
// ROTAS ENTERPRISE (BUSINESS INTELLIGENCE)
// =====================================

/**
 * GET /api/super-admin/enterprise/dashboard
 * Busca dashboard executivo completo.
 */
router.get('/enterprise/dashboard', enterpriseController.getExecutiveDashboard);

/**
 * GET /api/super-admin/enterprise/customer-health
 * Busca Customer Health Score detalhado.
 */
router.get('/enterprise/customer-health', enterpriseController.getCustomerHealth);

/**
 * GET /api/super-admin/enterprise/cohort-analysis
 * Busca análise de coortes.
 */
router.get('/enterprise/cohort-analysis', enterpriseController.getCohortAnalysis);

/**
 * GET /api/super-admin/enterprise/churn-prediction
 * Busca análise preditiva de churn.
 */
router.get('/enterprise/churn-prediction', enterpriseController.getChurnPrediction);

/**
 * GET /api/super-admin/enterprise/expansion-opportunities
 * Busca oportunidades de expansão.
 */
router.get('/enterprise/expansion-opportunities', enterpriseController.getExpansionOpportunities);

/**
 * GET /api/super-admin/enterprise/executive-report
 * Busca relatório executivo mensal.
 */
router.get('/enterprise/executive-report', enterpriseController.getExecutiveReport);

// =====================================
// ROTAS ADICIONAIS
// =====================================

/**
 * DELETE /api/super-admin/clinics/:clinicId
 * Elimina uma clínica permanentemente (com efeito cascata).
 */
router.delete('/clinics/:clinicId', 
  param('clinicId').isInt({ min: 1 }).withMessage('ID da clínica deve ser um número positivo'),
  superAdminController.deleteClinic
);

/**
 * PUT /api/super-admin/billing/:billingId/due-date
 * Edita data de vencimento de uma cobrança.
 */
router.put('/billing/:billingId/due-date',
  param('billingId').isInt({ min: 1 }).withMessage('ID da cobrança deve ser um número positivo'),
  body('new_due_date').isISO8601().withMessage('Nova data de vencimento deve estar no formato YYYY-MM-DD'),
  body('reason').optional().isString().withMessage('Motivo deve ser uma string'),
  superAdminController.editBillingDueDate
);

/**
 * POST /api/super-admin/billing/migrate-to-slot-model
 * Migra cobranças pendentes para o modelo por slots contratados.
 */
router.post('/billing/migrate-to-slot-model', superAdminController.migrateBillingsToSlotModel);

module.exports = router;