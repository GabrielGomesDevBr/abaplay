const ParentChatMessage = require('../models/parentChatModel');
const NotificationStatus = require('../models/notificationStatusModel');

// Versão completa e funcional do controller do chat.
const parentChatController = {};

/**
 * Busca o histórico de mensagens para um paciente específico.
 */
parentChatController.getMessages = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    
    if (!patientId) {
      return res.status(400).json({ message: 'O ID do paciente é obrigatório.' });
    }

    const messages = await ParentChatMessage.findByPatientId(patientId);
    
    // Marca as mensagens como lidas quando o usuário busca as mensagens
    await NotificationStatus.markAsRead(userId, patientId, 'parent_chat');
    
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor ao buscar mensagens.', error: error.message });
  }
};

/**
 * Cria e salva uma nova mensagem no chat.
 */
parentChatController.postMessage = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { message } = req.body;
    const sender_id = req.user.id; // O ID do usuário logado é injetado pelo middleware.

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'O conteúdo da mensagem não pode estar vazio.' });
    }

    const newMessageData = {
      patient_id: parseInt(patientId, 10),
      sender_id,
      message,
    };

    const createdMessage = await ParentChatMessage.create(newMessageData);

    // --- LÓGICA DE NOTIFICAÇÕES ---
    // Busca todos os usuários que participam do chat deste paciente (exceto o remetente)
    try {
      const participantsQuery = `
        SELECT DISTINCT ptc.sender_id 
        FROM parent_therapist_chat ptc 
        WHERE ptc.patient_id = $1 AND ptc.sender_id != $2
      `;
      const pool = require('../models/db');
      const participantsResult = await pool.query(participantsQuery, [patientId, sender_id]);
      
      // Incrementa o contador de não lidas para cada participante
      for (const participant of participantsResult.rows) {
        await NotificationStatus.incrementUnreadCount(participant.sender_id, patientId, 'parent_chat');
      }
    } catch (notificationError) {
      console.error('Erro ao atualizar notificações:', notificationError);
      // Não interrompe o fluxo principal se houver erro nas notificações
    }
    // --- FIM DA LÓGICA DE NOTIFICAÇÕES ---

    // --- LÓGICA DE TEMPO REAL ---
    // 1. Define o nome da sala específica para este paciente.
    const roomName = `patient-${patientId}`;
    // 2. Emite um evento 'newMessage' para todos os clientes nessa sala.
    // O payload do evento é a mensagem que acabamos de criar.
    req.io.to(roomName).emit('newMessage', createdMessage);
    console.log(`[Socket.IO] Mensagem emitida para a sala: ${roomName}`);
    // --- FIM DA LÓGICA DE TEMPO REAL ---

    res.status(201).json(createdMessage);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor ao postar mensagem.', error: error.message });
  }
};

module.exports = parentChatController;
