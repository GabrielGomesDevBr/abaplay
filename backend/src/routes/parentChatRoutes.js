const express = require('express');
const router = express.Router();
const parentChatController = require('../controllers/parentChatController');

// --- PADRONIZAÇÃO DO MIDDLEWARE ---
// Usando 'verifyToken' para manter a consistência com o resto da aplicação.
const { verifyToken } = require('../middleware/authMiddleware');


// --- Rotas Finais para o Chat Pais-Terapeutas ---

// Rota para buscar todas as mensagens de um paciente.
router.get('/:patientId', verifyToken, parentChatController.getMessages);

// Rota para postar uma nova mensagem.
router.post('/:patientId', verifyToken, parentChatController.postMessage);

module.exports = router;
