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

// GET /api/notifications/patient/:patientId - Busca notificações de um paciente específico
router.get('/patient/:patientId', notificationController.getNotificationsByPatientAndType);

module.exports = router;
