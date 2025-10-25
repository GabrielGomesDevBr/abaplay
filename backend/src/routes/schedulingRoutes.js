// backend/src/routes/schedulingRoutes.js

const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const schedulingController = require('../controllers/schedulingController');

const router = express.Router();

// Middleware para verificar se o usuário tem o papel de administrador
const verifyAdminRole = (req, res, next) => {
    if (req.user && req.user.is_admin) {
        next();
    } else {
        console.warn(`Tentativa de acesso à rota de scheduling por usuário não-admin (ID: ${req.user?.userId}).`);
        return res.status(403).json({
            errors: [{ msg: 'Acesso negado. Recurso disponível apenas para administradores.' }]
        });
    }
};

// Aplica a verificação de token para todas as rotas
router.use(verifyToken);

// Validações comuns - NOVA ESTRUTURA
const appointmentValidation = [
    body('patient_id', 'ID do paciente é obrigatório e deve ser um número.').isInt(),
    body('therapist_id', 'ID do terapeuta é obrigatório e deve ser um número.').isInt(),
    body('discipline_id', 'ID da disciplina deve ser um número.').optional({ nullable: true, checkFalsy: true }).isInt(),
    body('scheduled_date', 'Data do agendamento é obrigatória e deve ser válida (YYYY-MM-DD).').isISO8601().toDate(),
    body('scheduled_time', 'Horário do agendamento é obrigatório e deve ser válido (HH:MM).').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('duration_minutes', 'Duração deve ser um número entre 15 e 240 minutos.').optional().isInt({ min: 15, max: 240 }),
    body('notes', 'Observações devem ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
];

const justificationValidation = [
    body('missed_reason_type', 'Tipo de motivo da falta é obrigatório.').isIn([
        'patient_illness', 'patient_travel', 'patient_no_show', 'patient_family_emergency',
        'therapist_illness', 'therapist_emergency', 'therapist_training',
        'clinic_closure', 'equipment_failure', 'scheduling_error', 'other'
    ]),
    body('missed_reason_description', 'Descrição deve ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
];

// --- ROTAS ADMINISTRATIVAS ---

/**
 * Criar novo agendamento
 * POST /api/admin/scheduling/appointments
 */
router.post(
    '/appointments',
    verifyAdminRole,
    appointmentValidation,
    schedulingController.createAppointment
);

/**
 * Listar agendamentos com filtros
 * GET /api/admin/scheduling/appointments
 */
router.get(
    '/appointments',
    verifyAdminRole,
    [
        query('therapist_id', 'ID do terapeuta deve ser um número.').optional().isInt(),
        query('patient_id', 'ID do paciente deve ser um número.').optional().isInt(),
        query('status', 'Status deve ser válido.').optional().isIn(['scheduled', 'completed', 'missed', 'cancelled']),
        query('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('page', 'Página deve ser um número positivo.').optional().isInt({ min: 1 }),
        query('limit', 'Limite deve ser um número entre 1 e 100.').optional().isInt({ min: 1, max: 100 })
    ],
    schedulingController.getAppointments
);

/**
 * Buscar agendamento específico
 * GET /api/admin/scheduling/appointments/:id
 */
router.get(
    '/appointments/:id',
    verifyAdminRole,
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt()
    ],
    schedulingController.getAppointmentById
);

/**
 * Atualizar agendamento
 * PUT /api/admin/scheduling/appointments/:id
 */
router.put(
    '/appointments/:id',
    verifyAdminRole,
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt(),
        body('patient_id', 'ID do paciente deve ser um número.').optional().isInt(),
        body('therapist_id', 'ID do terapeuta deve ser um número.').optional().isInt(),
        body('discipline_id', 'ID da disciplina deve ser um número.').optional({ nullable: true, checkFalsy: true }).isInt(),
        body('scheduled_date', 'Data do agendamento deve ser válida (YYYY-MM-DD).').optional().isISO8601().toDate(),
        body('scheduled_time', 'Horário do agendamento deve ser válido (HH:MM).').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('duration_minutes', 'Duração deve ser um número entre 15 e 240 minutos.').optional().isInt({ min: 15, max: 240 }),
        body('status', 'Status deve ser válido.').optional().isIn(['scheduled', 'completed', 'missed', 'cancelled']),
        body('notes', 'Observações devem ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
    ],
    schedulingController.updateAppointment
);

/**
 * Cancelar agendamento
 * DELETE /api/admin/scheduling/appointments/:id
 */
router.delete(
    '/appointments/:id',
    verifyAdminRole,
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt(),
        body('reason_type', 'Tipo de motivo deve ser válido.').optional().isIn(['cancelado_paciente', 'cancelado_clinica', 'terapeuta_indisponivel', 'feriado', 'remarcacao', 'outro']),
        body('reason_description', 'Descrição do motivo deve ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
    ],
    schedulingController.cancelAppointment
);

/**
 * Remover agendamento permanentemente
 * DELETE /api/admin/scheduling/appointments/:id/permanent
 */
router.delete(
    '/appointments/:id/permanent',
    verifyAdminRole,
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt()
    ],
    schedulingController.deleteAppointment
);

/**
 * Marcar agendamentos vencidos como perdidos (job manual)
 * POST /api/admin/scheduling/mark-missed
 */
router.post(
    '/mark-missed',
    verifyAdminRole,
    [
        body('hours_after', 'Horas após o agendamento deve ser um número entre 0.5 e 24.').optional().isFloat({ min: 0.5, max: 24 })
    ],
    schedulingController.markMissedAppointments
);

/**
 * Buscar estatísticas de agendamento da clínica
 * GET /api/admin/scheduling/statistics
 */
router.get(
    '/statistics',
    verifyAdminRole,
    [
        query('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601()
    ],
    schedulingController.getClinicStatistics
);

// === NOVAS ROTAS PARA GESTÃO DE SESSÕES ÓRFÃS ===

/**
 * Buscar sessões órfãs (realizadas sem agendamento prévio)
 * GET /api/admin/scheduling/orphan-sessions
 */
router.get(
    '/orphan-sessions',
    verifyAdminRole,
    [
        query('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('limit', 'Limite deve ser um número entre 1 e 100.').optional().isInt({ min: 1, max: 100 }),
        query('offset', 'Offset deve ser um número não negativo.').optional().isInt({ min: 0 })
    ],
    schedulingController.getOrphanSessions
);

/**
 * Executar detecção inteligente de sessões
 * POST /api/admin/scheduling/intelligent-detection
 */
router.post(
    '/intelligent-detection',
    verifyAdminRole,
    [
        body('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        body('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        body('auto_create_retroactive', 'Flag deve ser um booleano.').optional().isBoolean()
    ],
    schedulingController.runIntelligentDetection
);

/**
 * Criar agendamento retroativo para sessão órfã
 * POST /api/admin/scheduling/create-retroactive/:sessionId
 */
router.post(
    '/create-retroactive/:sessionId',
    verifyAdminRole,
    [
        param('sessionId', 'ID da sessão deve ser um número válido.').isInt(),
        body('discipline_id', 'ID da disciplina deve ser um número.').optional({ nullable: true, checkFalsy: true }).isInt(),
        body('notes', 'Observações devem ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
    ],
    schedulingController.createRetroactiveAppointment
);

// --- ROTAS PARA TERAPEUTAS E ADMINS ---

/**
 * Adicionar justificativa a agendamento perdido
 * POST /api/scheduling/justify-absence/:id
 */
router.post(
    '/justify-absence/:id',
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt(),
        ...justificationValidation
    ],
    schedulingController.justifyAbsence
);

// === NOVAS ROTAS - REFATORAÇÃO FASE 1 ===

/**
 * Buscar ações pendentes (órfãs + perdidos + detectados hoje)
 * GET /api/scheduling/pending-actions
 */
router.get(
    '/pending-actions',
    verifyToken,
    schedulingController.getPendingActions
);

/**
 * Criar retroativos em lote
 * POST /api/scheduling/retroactive/batch
 */
router.post(
    '/retroactive/batch',
    verifyToken,
    schedulingController.createBatchRetroactive
);

/**
 * Executar manutenção manual (admin)
 * POST /api/scheduling/run-maintenance
 */
router.post(
    '/run-maintenance',
    verifyToken,
    schedulingController.runMaintenanceManually
);

/**
 * Notificar terapeuta sobre agendamento não realizado (admin)
 * POST /api/admin/scheduling/notify-therapist
 */
router.post(
    '/notify-therapist',
    verifyAdminRole,
    [
        body('therapist_id', 'ID do terapeuta é obrigatório.').isInt(),
        body('appointment_id', 'ID do agendamento é obrigatório.').isInt()
    ],
    schedulingController.notifyTherapist
);

// === NOVAS ROTAS - FASE 3: GESTÃO DE SÉRIES RECORRENTES ===

/**
 * Atualizar toda uma série de agendamentos recorrentes futuros
 * PUT /api/admin/scheduling/recurring-series/:templateId
 */
router.put(
    '/recurring-series/:templateId',
    verifyAdminRole,
    [
        param('templateId', 'ID do template recorrente deve ser um número válido.').isInt(),
        body('appointment_id', 'ID do agendamento de referência é obrigatório.').isInt(),
        body('scheduled_time', 'Horário do agendamento deve ser válido (HH:MM).').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('duration_minutes', 'Duração deve ser um número entre 15 e 240 minutos.').optional().isInt({ min: 15, max: 240 }),
        body('notes', 'Observações devem ter no máximo 500 caracteres.').optional().isLength({ max: 500 })
    ],
    schedulingController.updateRecurringSeries
);

/**
 * Excluir toda uma série de agendamentos recorrentes futuros
 * DELETE /api/admin/scheduling/recurring-series/:templateId
 */
router.delete(
    '/recurring-series/:templateId',
    verifyAdminRole,
    [
        param('templateId', 'ID do template recorrente deve ser um número válido.').isInt(),
        body('appointment_id', 'ID do agendamento de referência é obrigatório.').isInt()
    ],
    schedulingController.deleteRecurringSeries
);

/**
 * Buscar próximas ocorrências de uma série recorrente
 * GET /api/admin/scheduling/recurring-series/:templateId/next
 */
router.get(
    '/recurring-series/:templateId/next',
    verifyAdminRole,
    [
        param('templateId', 'ID do template recorrente deve ser um número válido.').isInt(),
        query('limit', 'Limite deve ser um número entre 1 e 50.').optional().isInt({ min: 1, max: 50 })
    ],
    schedulingController.getNextOccurrences
);

/**
 * Validar conflitos de horário
 * POST /api/admin/scheduling/validate-conflicts
 */
router.post(
    '/validate-conflicts',
    verifyAdminRole,
    [
        body('patient_id', 'ID do paciente é obrigatório.').isInt(),
        body('therapist_id', 'ID do terapeuta é obrigatório.').isInt(),
        body('scheduled_date', 'Data deve ser válida (YYYY-MM-DD).').isISO8601(),
        body('scheduled_time', 'Horário deve ser válido (HH:MM).').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('duration_minutes', 'Duração deve ser um número positivo.').optional().isInt({ min: 1 }),
        body('exclude_id', 'ID de exclusão deve ser um número.').optional().isInt()
    ],
    schedulingController.validateConflicts
);

/**
 * Validar assignment entre paciente e terapeuta
 * POST /api/admin/scheduling/validate-assignment
 */
router.post(
    '/validate-assignment',
    verifyAdminRole,
    [
        body('patient_id', 'ID do paciente é obrigatório.').isInt(),
        body('therapist_id', 'ID do terapeuta é obrigatório.').isInt()
    ],
    schedulingController.validateAssignment
);

/**
 * ✅ NOVO: Buscar agendamentos de hoje para um paciente (Pro plan)
 * GET /api/scheduling/patient/:patient_id/today
 */
router.get(
    '/patient/:patient_id/today',
    verifyToken,
    [
        param('patient_id', 'ID do paciente deve ser um número válido.').isInt()
    ],
    schedulingController.getTodayAppointmentsForPatient
);

module.exports = router;