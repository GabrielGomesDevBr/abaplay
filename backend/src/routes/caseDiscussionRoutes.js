// Importa o framework Express para criar o roteador.
const express = require('express');
// Cria uma nova instância do roteador do Express.
const router = express.Router();

// Importa o controller que contém a lógica de negócio para as discussões.
const caseDiscussionController = require('../controllers/caseDiscussionController');
// Importa o middleware de autenticação para proteger as rotas.
const { verifyToken } = require('../middleware/authMiddleware');
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

/**
 * @route   GET /api/discussions/patient/:patientId
 * @desc    Busca todas as mensagens da discussão de um paciente.
 * @access  Privado (requer token + plano Pro)
 */
router.get(
  '/patient/:patientId',
  verifyToken, // Middleware: Garante que o usuário está autenticado.
  requireProPlan, // ⚠️ PROTEÇÃO: Discussões de caso são feature Pro
  caseDiscussionController.getMessagesByPatient // Controller: Executa a lógica para buscar as mensagens.
);

/**
 * @route   POST /api/discussions/patient/:patientId
 * @desc    Cria uma nova mensagem na discussão de um paciente.
 * @access  Privado (requer token + plano Pro)
 */
router.post(
  '/patient/:patientId',
  verifyToken, // Middleware: Garante que o usuário está autenticado.
  requireProPlan, // ⚠️ PROTEÇÃO: Discussões de caso são feature Pro
  caseDiscussionController.createMessage // Controller: Executa a lógica para criar a mensagem.
);

// Exporta o roteador para que ele possa ser usado no arquivo principal do servidor (server.js).
module.exports = router;
