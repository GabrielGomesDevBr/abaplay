const NotificationStatus = require('../models/notificationStatusModel');
const ProgressAlerts = require('../utils/progressAlerts');

const notificationController = {};

/**
 * Busca todas as notificações de um usuário
 */
notificationController.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationStatus.getByUser(userId);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações do usuário:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Busca o total de mensagens não lidas de um usuário
 */
notificationController.getTotalUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const totalUnread = await NotificationStatus.getTotalUnreadCount(userId);
    res.status(200).json({ totalUnread });
  } catch (error) {
    console.error('Erro ao buscar total de não lidas:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Marca as mensagens de um chat específico como lidas
 */
notificationController.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId, chatType } = req.body;

    if (!patientId || !chatType) {
      return res.status(400).json({
        errors: [{ msg: 'patientId e chatType são obrigatórios.' }]
      });
    }

    const validChatTypes = ['case_discussion', 'parent_chat', 'progress_alert', 'scheduling_reminder', 'appointment_cancelled', 'appointment_created'];
    if (!validChatTypes.includes(chatType)) {
      return res.status(400).json({
        errors: [{ msg: 'chatType inválido.' }]
      });
    }

    const updatedStatus = await NotificationStatus.markAsRead(userId, patientId, chatType);
    res.status(200).json(updatedStatus);
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Marca todas as notificações de um usuário como lidas
 */
notificationController.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await NotificationStatus.markAllAsRead(userId);
    res.status(200).json({
      message: 'Todas as notificações foram marcadas como lidas.',
      rowsUpdated: result
    });
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Busca notificações específicas de um paciente e tipo de chat
 */
notificationController.getNotificationsByPatientAndType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId } = req.params;
    const { chatType } = req.query;

    // Se chatType for fornecido, usar comportamento original
    if (chatType) {
      const validChatTypes = ['case_discussion', 'parent_chat', 'progress_alert', 'scheduling_reminder', 'appointment_cancelled'];
      if (!validChatTypes.includes(chatType)) {
        return res.status(400).json({
          errors: [{ msg: 'chatType inválido.' }]
        });
      }
      const notifications = await NotificationStatus.getByUser(userId, patientId, chatType);
      return res.status(200).json(notifications);
    }

    // Caso contrário, retornar todas as notificações agrupadas por tipo
    const chatTypes = ['parent_chat', 'case_discussion', 'scheduling_reminder', 'appointment_cancelled'];
    const notificationsSummary = [];

    for (const type of chatTypes) {
      try {
        const notifications = await NotificationStatus.getByUser(userId, patientId, type);
        
        // O unreadCount já vem diretamente da coluna do banco
        const unreadCount = notifications.reduce((sum, n) => sum + (n.unreadCount || 0), 0);
        
        // Retorna todos os tipos, mesmo com unreadCount = 0
        notificationsSummary.push({
          chatType: type,
          unreadCount: unreadCount,
          totalCount: notifications.length
        });
      } catch (error) {
        console.error(`Erro ao buscar notificações ${type} para paciente ${patientId}:`, error);
        // Em caso de erro, adiciona com 0 notificações
        notificationsSummary.push({
          chatType: type,
          unreadCount: 0,
          totalCount: 0
        });
      }
    }
    res.status(200).json(notificationsSummary);
  } catch (error) {
    console.error('Erro ao buscar notificações específicas:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Busca programas que precisam de alerta de progresso para um terapeuta
 */
notificationController.getProgressAlerts = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const threshold = parseInt(req.query.threshold) || 80;
    
    const programs = await ProgressAlerts.getProgramsNeedingAlert(therapistId, threshold);
    res.status(200).json(programs);
  } catch (error) {
    console.error('Erro ao buscar alertas de progresso:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Marca um programa como dominado (arquiva o programa)
 */
notificationController.markProgramAsCompleted = async (req, res) => {
  try {
    const { assignmentId, patientId } = req.body;
    const therapistId = req.user.id;
    
    if (!assignmentId || !patientId) {
      return res.status(400).json({ 
        errors: [{ msg: 'assignmentId e patientId são obrigatórios.' }] 
      });
    }
    
    // Marca o programa como arquivado
    const Assignment = require('../models/assignmentModel');
    await Assignment.updateStatus(assignmentId, 'archived');
    
    // Progress alerts não são persistidos no banco, são calculados dinamicamente
    // Não é necessário marcar como lida pois não fica salva na tabela notificationstatus
    
    res.status(200).json({ message: 'Programa marcado como dominado com sucesso.' });
  } catch (error) {
    console.error('Erro ao marcar programa como dominado:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

/**
 * Executa verificação manual de alertas de progresso
 */
notificationController.runProgressCheck = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const alertsCreated = await ProgressAlerts.createProgressAlerts(therapistId);
    
    res.status(200).json({ 
      message: `Verificação concluída. ${alertsCreated} novos alertas criados.`,
      alertsCreated 
    });
  } catch (error) {
    console.error('Erro ao executar verificação de progresso:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

module.exports = notificationController;

