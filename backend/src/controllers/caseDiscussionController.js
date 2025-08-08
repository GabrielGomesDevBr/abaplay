const CaseDiscussion = require('../models/caseDiscussionModel');
const NotificationStatus = require('../models/notificationStatusModel');

const caseDiscussionController = {};

caseDiscussionController.getMessagesByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    
    const messages = await CaseDiscussion.findByPatientId(patientId);
    
    // Marca as mensagens como lidas quando o usuário busca as mensagens
    await NotificationStatus.markAsRead(userId, patientId, 'case_discussion');
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens da discussão:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

caseDiscussionController.createMessage = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ errors: [{ msg: 'O conteúdo da mensagem não pode ser vazio.' }] });
    }

    const newMessage = await CaseDiscussion.create(patientId, userId, content);

    const responseMessage = {
      ...newMessage,
      user_name: req.user.full_name
    };

    // --- LÓGICA DE NOTIFICAÇÕES ---
    // Busca todos os usuários que participam da discussão deste paciente (exceto o remetente)
    try {
      const participantsQuery = `
        SELECT DISTINCT cd.user_id 
        FROM case_discussions cd 
        WHERE cd.patient_id = $1 AND cd.user_id != $2
      `;
      const pool = require('../models/db');
      const participantsResult = await pool.query(participantsQuery, [patientId, userId]);
      
      // Incrementa o contador de não lidas para cada participante
      for (const participant of participantsResult.rows) {
        await NotificationStatus.incrementUnreadCount(participant.user_id, patientId, 'case_discussion');
      }
    } catch (notificationError) {
      console.error('Erro ao atualizar notificações:', notificationError);
      // Não interrompe o fluxo principal se houver erro nas notificações
    }
    // --- FIM DA LÓGICA DE NOTIFICAÇÕES ---

    // --- LÓGICA DE TEMPO REAL ADICIONADA ---
    // Define um nome de sala único para a discussão deste paciente
    const roomName = `discussion-${patientId}`;
    // Emite um evento para todos os clientes nesta sala
    req.io.to(roomName).emit('newDiscussionMessage', responseMessage);
    console.log(`[Socket.IO] Mensagem de discussão emitida para a sala: ${roomName}`);
    // --- FIM DA LÓGICA DE TEMPO REAL ---

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error('Erro ao criar mensagem de discussão:', error);
    res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
  }
};

module.exports = caseDiscussionController;
