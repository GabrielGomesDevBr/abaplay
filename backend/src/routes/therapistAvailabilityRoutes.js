// backend/src/routes/therapistAvailabilityRoutes.js

const express = require('express');
const router = express.Router();
const therapistAvailabilityController = require('../controllers/therapistAvailabilityController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Rotas para gestão híbrida de disponibilidade
 * Terapeuta pode gerenciar sua própria agenda
 * Admin pode gerenciar agenda de qualquer terapeuta
 */

// ================================================================
// HORÁRIO PADRÃO (SCHEDULE TEMPLATE)
// ================================================================

// GET /api/therapist-availability/schedule/:therapistId - Buscar horários padrão
router.get(
  '/schedule/:therapistId',
  verifyToken,
  therapistAvailabilityController.getScheduleTemplate
);

// POST /api/therapist-availability/schedule - Adicionar horário padrão
router.post(
  '/schedule',
  verifyToken,
  therapistAvailabilityController.addScheduleTemplate
);

// PUT /api/therapist-availability/schedule/:id - Atualizar horário padrão
router.put(
  '/schedule/:id',
  verifyToken,
  therapistAvailabilityController.updateScheduleTemplate
);

// DELETE /api/therapist-availability/schedule/:id - Remover horário padrão
router.delete(
  '/schedule/:id',
  verifyToken,
  therapistAvailabilityController.deleteScheduleTemplate
);

// ================================================================
// AUSÊNCIAS E BLOQUEIOS
// ================================================================

// GET /api/therapist-availability/absences/:therapistId - Buscar ausências de um terapeuta
router.get(
  '/absences/:therapistId',
  verifyToken,
  therapistAvailabilityController.getAbsences
);

// GET /api/therapist-availability/absences/pending/all - Buscar todas as ausências pendentes (admin)
router.get(
  '/absences/pending/all',
  verifyToken,
  therapistAvailabilityController.getPendingAbsences
);

// POST /api/therapist-availability/absences - Criar nova ausência/bloqueio
router.post(
  '/absences',
  verifyToken,
  therapistAvailabilityController.createAbsence
);

// PUT /api/therapist-availability/absences/:id/status - Aprovar/rejeitar ausência (admin)
router.put(
  '/absences/:id/status',
  verifyToken,
  therapistAvailabilityController.updateAbsenceStatus
);

// DELETE /api/therapist-availability/absences/:id - Remover ausência
router.delete(
  '/absences/:id',
  verifyToken,
  therapistAvailabilityController.deleteAbsence
);

// ================================================================
// VERIFICAÇÃO DE CONFLITOS
// ================================================================

// GET /api/therapist-availability/conflicts/check - Verificar conflitos antes de criar bloqueio
router.get(
  '/conflicts/check',
  verifyToken,
  therapistAvailabilityController.checkConflicts
);

// ================================================================
// REAGENDAMENTO AUTOMÁTICO
// ================================================================

// POST /api/therapist-availability/rescheduling/suggest - Sugerir horários alternativos
router.post(
  '/rescheduling/suggest',
  verifyToken,
  therapistAvailabilityController.suggestRescheduling
);

// POST /api/therapist-availability/rescheduling/apply - Aplicar reagendamento (admin)
router.post(
  '/rescheduling/apply',
  verifyToken,
  therapistAvailabilityController.applyRescheduling
);

// ================================================================
// ESPECIALIDADES
// ================================================================

// GET /api/therapist-availability/specialties/:therapistId - Listar especialidades
router.get(
  '/specialties/:therapistId',
  verifyToken,
  therapistAvailabilityController.getSpecialties
);

// POST /api/therapist-availability/specialties - Adicionar especialidade
router.post(
  '/specialties',
  verifyToken,
  therapistAvailabilityController.addSpecialty
);

// DELETE /api/therapist-availability/specialties/:therapistId/:disciplineId - Remover especialidade
router.delete(
  '/specialties/:therapistId/:disciplineId',
  verifyToken,
  therapistAvailabilityController.removeSpecialty
);

module.exports = router;
