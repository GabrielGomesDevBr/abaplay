// backend/src/routes/availabilitySearchRoutes.js

const express = require('express');
const router = express.Router();
const availabilitySearchController = require('../controllers/availabilitySearchController');
const { verifyToken } = require('../middleware/authMiddleware');

// Verificar autenticação em todas as rotas
router.use(verifyToken);

// Helper para verificar se é admin
const checkAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas administradores.'
        });
    }
    next();
};

// ========================================
// BUSCA DE DISPONIBILIDADE
// ========================================

/**
 * POST /api/availability/search
 * Busca horários disponíveis com filtros
 */
router.post('/search', availabilitySearchController.searchAvailableSlots);

/**
 * POST /api/availability/suggest
 * Assistente de agendamento - sugere combinações ótimas
 */
router.post('/suggest', availabilitySearchController.suggestAppointments);

// ========================================
// ESPECIALIDADES
// ========================================

/**
 * GET /api/availability/therapists/:therapistId/specialties
 * Obter especialidades de um terapeuta
 */
router.get('/therapists/:therapistId/specialties', availabilitySearchController.getTherapistSpecialties);

/**
 * POST /api/availability/therapists/:therapistId/specialties
 * Adicionar/atualizar especialidades de um terapeuta (admin only)
 */
router.post('/therapists/:therapistId/specialties', checkAdmin, availabilitySearchController.updateTherapistSpecialties);

// ========================================
// DISPONIBILIDADE PADRÃO - DEPRECATED
// ========================================
// ⚠️ ATENÇÃO: Estes endpoints estão DEPRECATED
// Use /api/therapist-availability/* em vez disso
//
// Razão: therapistAvailabilityController tem funcionalidades mais completas:
//   - Permissões híbridas (terapeuta + admin)
//   - Workflow de aprovação de ausências
//   - Notificações integradas
//   - Reagendamento automático
//
// Migração: Ver ANALISE_DISPONIBILIDADE_AGENDAMENTO.md
// ========================================

/**
 * @deprecated Use GET /api/therapist-availability/schedule/:therapistId
 * GET /api/availability/therapists/:therapistId/availability
 * Obter horários padrão de trabalho
 */
router.get('/therapists/:therapistId/availability', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Este endpoint está deprecated. Use GET /api/therapist-availability/schedule/:therapistId',
        deprecated: true,
        alternative: `/api/therapist-availability/schedule/${req.params.therapistId}`
    });
});

/**
 * @deprecated Use POST /api/therapist-availability/schedule
 * POST /api/availability/therapists/:therapistId/availability
 * Definir horários padrão de trabalho (admin only)
 */
router.post('/therapists/:therapistId/availability', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Este endpoint está deprecated. Use POST /api/therapist-availability/schedule',
        deprecated: true,
        alternative: '/api/therapist-availability/schedule'
    });
});

// ========================================
// AUSÊNCIAS - DEPRECATED
// ========================================
// ⚠️ ATENÇÃO: Estes endpoints estão DEPRECATED
// Use /api/therapist-availability/absences/* em vez disso
// ========================================

/**
 * @deprecated Use GET /api/therapist-availability/absences/:therapistId
 * GET /api/availability/therapists/:therapistId/absences
 * Listar ausências futuras
 */
router.get('/therapists/:therapistId/absences', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Este endpoint está deprecated. Use GET /api/therapist-availability/absences/:therapistId',
        deprecated: true,
        alternative: `/api/therapist-availability/absences/${req.params.therapistId}`
    });
});

/**
 * @deprecated Use POST /api/therapist-availability/absences
 * POST /api/availability/therapists/:therapistId/absences
 * Registrar ausência/férias (admin only)
 */
router.post('/therapists/:therapistId/absences', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Este endpoint está deprecated. Use POST /api/therapist-availability/absences',
        deprecated: true,
        alternative: '/api/therapist-availability/absences'
    });
});

/**
 * @deprecated Use DELETE /api/therapist-availability/absences/:id
 * DELETE /api/availability/absences/:absenceId
 * Cancelar ausência (admin only)
 */
router.delete('/absences/:absenceId', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'Este endpoint está deprecated. Use DELETE /api/therapist-availability/absences/:id',
        deprecated: true,
        alternative: `/api/therapist-availability/absences/${req.params.absenceId}`
    });
});

// ========================================
// SALAS
// ========================================

/**
 * GET /api/availability/rooms
 * Listar salas da clínica
 */
router.get('/rooms', availabilitySearchController.getRooms);

/**
 * GET /api/availability/rooms/available
 * Verificar salas disponíveis em determinado horário
 * Query: ?date=YYYY-MM-DD&time=HH:MM&duration=60
 */
router.get('/rooms/available', availabilitySearchController.getAvailableRooms);

/**
 * POST /api/availability/rooms
 * Criar sala (admin only)
 */
router.post('/rooms', checkAdmin, availabilitySearchController.createRoom);

/**
 * PUT /api/availability/rooms/:roomId
 * Atualizar sala (admin only)
 */
router.put('/rooms/:roomId', checkAdmin, availabilitySearchController.updateRoom);

/**
 * DELETE /api/availability/rooms/:roomId
 * Desativar sala (admin only)
 */
router.delete('/rooms/:roomId', checkAdmin, availabilitySearchController.deleteRoom);

// ========================================
// PREFERÊNCIAS PACIENTE-TERAPEUTA
// ========================================

/**
 * GET /api/availability/patients/:patientId/preferences
 * Obter preferências do paciente
 */
router.get('/patients/:patientId/preferences', availabilitySearchController.getPatientPreferences);

/**
 * POST /api/availability/patients/:patientId/preferences
 * Definir preferência de terapeuta (admin only)
 */
router.post('/patients/:patientId/preferences', checkAdmin, availabilitySearchController.setPatientPreference);

// ========================================
// CONFIGURAÇÕES DE DISCIPLINA
// ========================================

/**
 * GET /api/availability/clinic/discipline-settings
 * Obter configurações de disciplinas
 */
router.get('/clinic/discipline-settings', availabilitySearchController.getDisciplineSettings);

/**
 * POST /api/availability/clinic/discipline-settings
 * Configurar duração padrão por disciplina (admin only)
 */
router.post('/clinic/discipline-settings', checkAdmin, availabilitySearchController.setDisciplineSettings);

// ========================================
// GERENCIAMENTO ADMIN DE DISPONIBILIDADE
// ========================================

/**
 * GET /api/availability/admin/therapists-overview
 * Obter visão geral de disponibilidade de todos os terapeutas (admin only)
 */
router.get('/admin/therapists-overview', checkAdmin, availabilitySearchController.getTherapistsOverview);

/**
 * PUT /api/availability/admin/therapists/:therapistId/permissions
 * Atualizar permissões de disponibilidade de um terapeuta (admin only)
 */
router.put('/admin/therapists/:therapistId/permissions', checkAdmin, availabilitySearchController.updateTherapistPermissions);

/**
 * GET /api/availability/admin/therapists/:therapistId/changes-log
 * Obter histórico de alterações de disponibilidade de um terapeuta (admin only)
 */
router.get('/admin/therapists/:therapistId/changes-log', checkAdmin, availabilitySearchController.getTherapistChangesLog);

module.exports = router;
