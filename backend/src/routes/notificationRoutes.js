const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de notificação requerem autenticação
router.use(authMiddleware.verifyToken);

// GET /api/notifications - Busca todas as notificações do usuário
router.get('/', notificationController.getUserNotifications);

// GET /api/notifications/total-unread - Busca o total de mensagens não lidas
router.get('/total-unread', notificationController.getTotalUnreadCount);

// POST /api/notifications/mark-read - Marca mensagens como lidas
router.post('/mark-read', notificationController.markAsRead);

// POST /api/notifications/mark-all-read - Marca todas as mensagens como lidas
router.post('/mark-all-read', notificationController.markAllAsRead);

// GET /api/notifications/patient/:patientId - Busca notificações de um paciente específico
router.get('/patient/:patientId', notificationController.getNotificationsByPatientAndType);

// GET /api/notifications/progress-alerts - Busca programas que precisam de alerta de progresso
router.get('/progress-alerts', notificationController.getProgressAlerts);

// POST /api/notifications/mark-completed - Marca um programa como dominado
router.post('/mark-completed', notificationController.markProgramAsCompleted);

// POST /api/notifications/run-progress-check - Executa verificação manual de alertas
router.post('/run-progress-check', notificationController.runProgressCheck);

module.exports = router;
