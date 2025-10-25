// backend/src/routes/recurrenceManagementRoutes.js

const express = require('express');
const router = express.Router();
const recurrenceManagementController = require('../controllers/recurrenceManagementController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

/**
 * Rotas para gerenciamento de agendamentos recorrentes
 * Todas as rotas requerem autenticação e permissões de admin
 */

// Gerenciar sessões recorrentes (cancelar, pausar, modificar)
router.post('/manage', verifyToken, requireAdmin, recurrenceManagementController.manageRecurrence);

// Encerrar tratamento de um paciente
router.post('/terminate-patient', verifyToken, requireAdmin, recurrenceManagementController.terminatePatient);

// Obter sessões futuras de um paciente (para preview)
router.get('/patient/:patientId/future-sessions', verifyToken, recurrenceManagementController.getPatientFutureSessions);

// Obter resumo de todas as recorrências ativas
router.get('/summary', verifyToken, recurrenceManagementController.getRecurrenceSummary);

// Verificar conflitos de agendamento
router.post('/check-conflicts', verifyToken, recurrenceManagementController.checkPatientConflicts);

module.exports = router;