// backend/src/routes/therapistScheduleRoutes.js

const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const therapistScheduleController = require('../controllers/therapistScheduleController');

const router = express.Router();

// Middleware para verificar se o usuário é terapeuta ou admin
const verifyTherapistOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'terapeuta' || req.user.is_admin)) {
        next();
    } else {
        console.warn(`Tentativa de acesso à rota de agenda por usuário inválido (ID: ${req.user?.userId}, Role: ${req.user?.role}).`);
        return res.status(403).json({
            errors: [{ msg: 'Acesso negado. Recurso disponível apenas para terapeutas e administradores.' }]
        });
    }
};

// Aplica a verificação de token e role para todas as rotas
router.use(verifyToken, verifyTherapistOrAdmin);

// Validações comuns
const justificationValidation = [
    body('missed_reason', 'Motivo da falta é obrigatório e deve ter entre 5 e 500 caracteres.').isLength({ min: 5, max: 500 }),
    body('missed_by', 'Responsável pela falta deve ser especificado.').isIn(['patient', 'therapist', 'both', 'other'])
];

// --- ROTAS DA AGENDA DO TERAPEUTA ---

/**
 * Buscar agenda pessoal do terapeuta
 * GET /api/therapist/schedule
 */
router.get(
    '/',
    [
        query('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('days_ahead', 'Dias à frente deve ser um número entre 1 e 30.').optional().isInt({ min: 1, max: 30 })
    ],
    therapistScheduleController.getPersonalSchedule
);

/**
 * Buscar próximos agendamentos do terapeuta
 * GET /api/therapist/schedule/upcoming
 */
router.get(
    '/upcoming',
    [
        query('days_ahead', 'Dias à frente deve ser um número entre 1 e 14.').optional().isInt({ min: 1, max: 14 })
    ],
    therapistScheduleController.getUpcomingAppointments
);

/**
 * Buscar agendamentos do dia atual
 * GET /api/therapist/schedule/today
 */
router.get(
    '/today',
    therapistScheduleController.getTodaySchedule
);

/**
 * Buscar agendamentos perdidos que precisam de justificativa
 * GET /api/therapist/schedule/missed
 */
router.get(
    '/missed',
    [
        query('include_justified', 'Incluir justificados deve ser boolean.').optional().isBoolean()
    ],
    therapistScheduleController.getMissedAppointments
);

/**
 * Buscar estatísticas pessoais do terapeuta
 * GET /api/therapist/schedule/statistics
 */
router.get(
    '/statistics',
    [
        query('start_date', 'Data inicial deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('end_date', 'Data final deve ser válida (YYYY-MM-DD).').optional().isISO8601(),
        query('period', 'Período deve ser válido.').optional().isIn(['week', 'month', 'quarter'])
    ],
    therapistScheduleController.getPersonalStatistics
);

/**
 * Buscar agendamento específico do terapeuta
 * GET /api/therapist/schedule/appointments/:id
 */
router.get(
    '/appointments/:id',
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt()
    ],
    therapistScheduleController.getAppointmentDetails
);

/**
 * Adicionar justificativa para agendamento perdido
 * POST /api/therapist/schedule/justify/:id
 */
router.post(
    '/justify/:id',
    [
        param('id', 'ID do agendamento deve ser um número válido.').isInt(),
        ...justificationValidation
    ],
    therapistScheduleController.justifyMissedAppointment
);

module.exports = router;