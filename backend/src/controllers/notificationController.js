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

    if (!['case_discussion', 'parent_chat', 'progress_alert'].includes(chatType)) {
      return res.status(400).json({ 
        errors: [{ msg: 'chatType deve ser "case_discussion", "parent_chat" ou "progress_alert".' }] 
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
 * Busca notificações específicas de um paciente e tipo de chat
 */
notificationController.getNotificationsByPatientAndType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId } = req.params;
    const { chatType } = req.query;

    if (!chatType || !['case_discussion', 'parent_chat', 'progress_alert'].includes(chatType)) {
      return res.status(400).json({ 
        errors: [{ msg: 'chatType deve ser "case_discussion", "parent_chat" ou "progress_alert".' }] 
      });
    }

    const notifications = await NotificationStatus.getByUser(userId, patientId, chatType);
    res.status(200).json(notifications);
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
    
    // Marca a notificação como lida
    await NotificationStatus.markAsRead(therapistId, patientId, 'progress_alert');
    
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

