const ParentChatMessage = require('../models/parentChatModel');

// Versão completa e funcional do controller do chat.
const parentChatController = {};

/**
 * Busca o histórico de mensagens para um paciente específico.
 */
parentChatController.getMessages = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: 'O ID do paciente é obrigatório.' });
    }

    const messages = await ParentChatMessage.findByPatientId(patientId);
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
