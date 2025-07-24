const NotificationStatus = require('../models/notificationStatusModel');

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

    if (!['case_discussion', 'parent_chat'].includes(chatType)) {
      return res.status(400).json({ 
        errors: [{ msg: 'chatType deve ser "case_discussion" ou "parent_chat".' }] 
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

    if (!chatType || !['case_discussion', 'parent_chat'].includes(chatType)) {
      return res.status(400).json({ 
        errors: [{ msg: 'chatType deve ser "case_discussion" ou "parent_chat".' }] 
      });
    }

    const notifications = await NotificationStatus.getByUser(userId, patientId, chatType);
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Erro ao buscar notificações específicas:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

module.exports = notificationController;

