// backend/src/routes/recurringAppointmentRoutes.js

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const RecurringAppointmentController = require('../controllers/recurringAppointmentController');

/**
 * Rotas para sistema de agendamentos recorrentes
 * Todas as rotas requerem autenticação e permissões de admin
 */

// Middleware de autenticação para todas as rotas
router.use(verifyToken);

// Middleware para verificar se é admin (para rotas de criação/edição)
const requireAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({
            errors: [{ msg: 'Acesso restrito a administradores.' }]
        });
    }
    next();
};

// ==========================================
// VALIDAÇÕES
// ==========================================

const recurringTemplateValidation = [
    body('patient_id')
        .isInt({ min: 1 })
        .withMessage('ID do paciente deve ser um número inteiro positivo'),

    body('therapist_id')
        .isInt({ min: 1 })
        .withMessage('ID do terapeuta deve ser um número inteiro positivo'),

    body('discipline_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID da disciplina deve ser um número inteiro positivo'),

    body('recurrence_type')
        .isIn(['weekly', 'biweekly', 'monthly', 'custom'])
        .withMessage('Tipo de recorrência deve ser: weekly, biweekly, monthly ou custom'),

    body('day_of_week')
        .isInt({ min: 0, max: 6 })
        .withMessage('Dia da semana deve ser um número de 0 (domingo) a 6 (sábado)'),

    body('scheduled_time')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Horário deve estar no formato HH:MM'),

    body('duration_minutes')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Duração deve estar entre 15 e 480 minutos'),

    body('start_date')
        .isISO8601({ strict: true })
        .toDate()
        .withMessage('Data de início deve estar no formato YYYY-MM-DD'),

    body('end_date')
        .optional()
        .isISO8601({ strict: true })
        .toDate()
        .withMessage('Data de fim deve estar no formato YYYY-MM-DD'),

    body('generate_weeks_ahead')
        .optional()
        .isInt({ min: 1, max: 52 })
        .withMessage('Semanas à frente deve estar entre 1 e 52'),

    body('skip_holidays')
        .optional()
        .isBoolean()
        .withMessage('Pular feriados deve ser true ou false'),

    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Observações devem ter no máximo 1000 caracteres')
];

const updateTemplateValidation = [
    body('recurrence_type')
        .optional()
        .isIn(['weekly', 'biweekly', 'monthly', 'custom'])
        .withMessage('Tipo de recorrência deve ser: weekly, biweekly, monthly ou custom'),

    body('day_of_week')
        .optional()
        .isInt({ min: 0, max: 6 })
        .withMessage('Dia da semana deve ser um número de 0 (domingo) a 6 (sábado)'),

    body('scheduled_time')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Horário deve estar no formato HH:MM'),

    body('duration_minutes')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Duração deve estar entre 15 e 480 minutos'),

    body('start_date')
        .optional()
        .isISO8601({ strict: true })
        .toDate()
        .withMessage('Data de início deve estar no formato YYYY-MM-DD'),

    body('end_date')
        .optional()
        .isISO8601({ strict: true })
        .toDate()
        .withMessage('Data de fim deve estar no formato YYYY-MM-DD'),

    body('generate_weeks_ahead')
        .optional()
        .isInt({ min: 1, max: 52 })
        .withMessage('Semanas à frente deve estar entre 1 e 52'),

    body('skip_holidays')
        .optional()
        .isBoolean()
        .withMessage('Pular feriados deve ser true ou false'),

    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Observações devem ter no máximo 1000 caracteres')
];

const idValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('ID deve ser um número inteiro positivo')
];

// ==========================================
// ROTAS PRINCIPAIS
// ==========================================

/**
 * @route   GET /api/admin/recurring-appointments
 * @desc    Listar templates de recorrência da clínica
 * @access  Admin
 */
router.get('/',
    [
        query('patient_id').optional().isInt({ min: 1 }),
        query('therapist_id').optional().isInt({ min: 1 }),
        query('status').optional().isIn(['active', 'paused', 'expired', 'inactive'])
    ],
    RecurringAppointmentController.getTemplates
);

/**
 * @route   POST /api/admin/recurring-appointments
 * @desc    Criar novo template de recorrência
 * @access  Admin
 */
router.post('/',
    requireAdmin,
    recurringTemplateValidation,
    RecurringAppointmentController.createTemplate
);

/**
 * @route   GET /api/admin/recurring-appointments/:id
 * @desc    Buscar template específico com agendamentos
 * @access  Admin
 */
router.get('/:id',
    idValidation,
    RecurringAppointmentController.getTemplateById
);

/**
 * @route   PUT /api/admin/recurring-appointments/:id
 * @desc    Atualizar template de recorrência
 * @access  Admin
 */
router.put('/:id',
    requireAdmin,
    idValidation,
    updateTemplateValidation,
    RecurringAppointmentController.updateTemplate
);

/**
 * @route   DELETE /api/admin/recurring-appointments/:id
 * @desc    Desativar template permanentemente
 * @access  Admin
 */
router.delete('/:id',
    requireAdmin,
    idValidation,
    [
        body('reason')
            .optional()
            .isLength({ min: 3, max: 500 })
            .withMessage('Motivo deve ter entre 3 e 500 caracteres')
    ],
    RecurringAppointmentController.deactivateTemplate
);

// ==========================================
// ROTAS DE AÇÕES ESPECÍFICAS
// ==========================================

/**
 * @route   POST /api/admin/recurring-appointments/:id/generate
 * @desc    Gerar mais agendamentos de um template
 * @access  Admin
 */
router.post('/:id/generate',
    requireAdmin,
    idValidation,
    [
        body('weeks_ahead')
            .optional()
            .isInt({ min: 1, max: 24 })
            .withMessage('Semanas à frente deve estar entre 1 e 24')
    ],
    RecurringAppointmentController.generateMoreAppointments
);

/**
 * @route   POST /api/admin/recurring-appointments/:id/pause
 * @desc    Pausar template temporariamente
 * @access  Admin
 */
router.post('/:id/pause',
    requireAdmin,
    idValidation,
    [
        body('reason')
            .isLength({ min: 3, max: 500 })
            .withMessage('Motivo da pausa é obrigatório e deve ter entre 3 e 500 caracteres'),

        body('pause_until')
            .optional()
            .isISO8601({ strict: true })
            .toDate()
            .withMessage('Data limite da pausa deve estar no formato YYYY-MM-DD')
    ],
    RecurringAppointmentController.pauseTemplate
);

/**
 * @route   POST /api/admin/recurring-appointments/:id/resume
 * @desc    Reativar template pausado
 * @access  Admin
 */
router.post('/:id/resume',
    requireAdmin,
    idValidation,
    RecurringAppointmentController.resumeTemplate
);

/**
 * @route   GET /api/admin/recurring-appointments/:id/appointments
 * @desc    Buscar agendamentos de um template
 * @access  Admin
 */
router.get('/:id/appointments',
    idValidation,
    [
        query('start_date').optional().isISO8601({ strict: true }),
        query('end_date').optional().isISO8601({ strict: true }),
        query('status').optional().isIn(['scheduled', 'completed', 'missed', 'cancelled']),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    RecurringAppointmentController.getTemplateAppointments
);

// ==========================================
// ROTAS DE UTILITÁRIOS
// ==========================================

/**
 * @route   POST /api/admin/recurring-appointments/check-conflicts
 * @desc    Verificar conflitos potenciais
 * @access  Admin
 */
router.post('/check-conflicts',
    requireAdmin,
    [
        body('patient_id').isInt({ min: 1 }),
        body('therapist_id').isInt({ min: 1 }),
        body('day_of_week').isInt({ min: 0, max: 6 }),
        body('scheduled_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('start_date').isISO8601({ strict: true }).toDate(),
        body('end_date').optional().isISO8601({ strict: true }).toDate()
    ],
    RecurringAppointmentController.checkConflicts
);

/**
 * @route   POST /api/admin/recurring-appointments/generate-all
 * @desc    Executar job manual de geração para todos templates pendentes
 * @access  Admin
 */
router.post('/generate-all',
    requireAdmin,
    RecurringAppointmentController.generateAllPending
);

// ==========================================
// MIDDLEWARE DE TRATAMENTO DE ERRO
// ==========================================

// Middleware para capturar erros de validação não tratados
router.use((err, req, res, next) => {
    console.error('[RECURRING-ROUTES] Erro não tratado:', err);
    res.status(500).json({
        errors: [{ msg: 'Erro interno do servidor. Tente novamente mais tarde.' }]
    });
});

module.exports = router;