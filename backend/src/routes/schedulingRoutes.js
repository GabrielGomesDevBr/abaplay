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
        body('reason', 'Motivo do cancelamento deve ter no máximo 255 caracteres.').optional().isLength({ max: 255 })
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

module.exports = router;