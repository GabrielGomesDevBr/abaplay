const express = require('express');
const router = express.Router();
const parentChatController = require('../controllers/parentChatController');

// --- PADRONIZAÇÃO DO MIDDLEWARE ---
// Usando 'verifyToken' para manter a consistência com o resto da aplicação.
const { verifyToken } = require('../middleware/authMiddleware');
const { requireProPlan } = require('../middleware/subscriptionMiddleware');


// --- Rotas Finais para o Chat Pais-Terapeutas ---
// ⚠️ PROTEGIDAS: Chat com pais é feature Pro

// Rota para buscar todas as mensagens de um paciente.
router.get('/:patientId', verifyToken, requireProPlan, parentChatController.getMessages);

// Rota para postar uma nova mensagem.
router.post('/:patientId', verifyToken, requireProPlan, parentChatController.postMessage);

module.exports = router;
