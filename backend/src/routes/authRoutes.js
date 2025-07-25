// backend/src/routes/authRoutes.js

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// <<< NOVA ROTA >>>
// Rota para verificar o estado de um utilizador antes do login completo
// POST /api/auth/check-user
router.post(
    '/check-user',
    [
        body('username', 'O nome de utilizador é obrigatório.').not().isEmpty(),
    ],
    authController.checkUserStatus
);

// Rota de Login (POST /api/auth/login)
router.post(
    '/login', 
    [
        body('username', 'O nome de utilizador é obrigatório.').not().isEmpty(),
        body('password', 'A senha é obrigatória.').not().isEmpty(),
    ],
    authController.loginUser
);


// Rota para Definir a Senha (usada no primeiro login do admin)
// POST /api/auth/set-password
router.post(
    '/set-password',
    [
        body('userId', 'O ID do utilizador é obrigatório e deve ser um número.').isInt(),
        body('password', 'A nova senha deve ter pelo menos 6 caracteres.').isLength({ min: 6 }),
    ],
    authController.setPassword
);

module.exports = router;
