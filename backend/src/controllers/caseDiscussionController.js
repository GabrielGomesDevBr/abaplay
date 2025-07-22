const CaseDiscussion = require('../models/caseDiscussionModel');

const caseDiscussionController = {};

caseDiscussionController.getMessagesByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const messages = await CaseDiscussion.findByPatientId(patientId);
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
      user_name: req.user.name
    };

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
