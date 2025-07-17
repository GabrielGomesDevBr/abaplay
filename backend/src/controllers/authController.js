const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');

const authController = {};

// A função checkUserStatus permanece a mesma.
authController.checkUserStatus = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username } = req.body;

    try {
        const user = await User.findByUsername(username);

        if (!user) {
            return res.status(404).json({ errors: [{ msg: 'Utilizador não encontrado.' }] });
        }

        const passwordIsSet = user.password_hash && user.password_hash.length > 0;

        if (passwordIsSet) {
            res.status(200).json({ action: 'REQUIRE_PASSWORD' });
        } else {
            res.status(200).json({
                action: 'SET_PASSWORD',
                user: {
                    userId: user.id,
                    username: user.username,
                    fullName: user.full_name
                }
            });
        }
    } catch (error) {
        console.error('[ERRO FATAL] Erro ao verificar o estado do utilizador:', error);
        res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
    }
};

// --- FUNÇÃO DE LOGIN CORRIGIDA ---
authController.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findByUsername(username);

        if (!user || !user.password_hash) {
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas.' }] });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas.' }] });
        }

        // --- CORREÇÃO CRÍTICA ---
        // O payload do token agora inclui o 'clinic_id', que é essencial
        // para as verificações de segurança em outras partes da aplicação.
        const payload = {
            id: user.id,
            username: user.username,
            name: user.full_name, // Usando a coluna correta 'full_name'
            role: user.role,
            is_admin: user.is_admin,
            clinic_id: user.clinic_id // Adicionando o clinic_id ao token
        };

        const token = jwt.sign(
            payload,
            dbConfig.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: payload
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
    }
};

// A função setPassword também é corrigida para incluir clinic_id no token.
authController.setPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, password } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ errors: [{ msg: 'Utilizador não encontrado.' }] });
        }

        if (user.password_hash) {
            return res.status(400).json({ errors: [{ msg: 'A senha para este utilizador já foi definida.' }] });
        }

        await User.updatePassword(userId, password);
        
        const loggedInUser = await User.findById(userId);
        
        // --- CORREÇÃO CRÍTICA ---
        const payload = {
            id: loggedInUser.id,
            username: loggedInUser.username,
            name: loggedInUser.full_name,
            role: loggedInUser.role,
            is_admin: loggedInUser.is_admin,
            clinic_id: loggedInUser.clinic_id // Adicionando o clinic_id ao token
        };

        const token = jwt.sign(
            payload,
            dbConfig.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            msg: 'Senha definida com sucesso. Login automático realizado.',
            token,
            user: payload
        });

    } catch (error) {
        console.error('Erro ao definir a senha:', error);
        res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
    }
};

module.exports = authController;
