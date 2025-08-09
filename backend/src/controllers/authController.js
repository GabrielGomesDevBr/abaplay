const User = require('../models/userModel');
const ClinicModel = require('../models/clinicModel');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db.config.js');

const authController = {};

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

        // --- CORREÇÃO APLICADA AQUI ---
        // O payload do token agora inclui o 'associated_patient_id',
        // que é essencial para o login dos pais.
        // E para admins, inclui também o 'max_patients' da clínica.
        const payload = {
            id: user.id,
            username: user.username,
            name: user.full_name,
            role: user.role,
            is_admin: user.is_admin,
            clinic_id: user.clinic_id,
            associated_patient_id: user.associated_patient_id || null // LINHA ADICIONADA
        };

        // Se for admin, busca informações da clínica incluindo o limite de pacientes
        if (user.is_admin && user.clinic_id) {
            try {
                const clinic = await ClinicModel.findById(user.clinic_id);
                if (clinic) {
                    payload.max_patients = clinic.max_patients || 0;
                    payload.clinic_name = clinic.name;
                }
            } catch (clinicError) {
                console.error('Erro ao buscar informações da clínica:', clinicError);
                // Continua sem as informações da clínica se houver erro
                payload.max_patients = 0;
            }
        }

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

        // NOTA: A função original chamava 'updatePassword', que pode não existir.
        // Usando 'setPassword' que já foi definido no UserModel.
        await User.setPassword(userId, await bcrypt.hash(password, 10));
        
        const loggedInUser = await User.findById(userId);
        
        // --- CORREÇÃO APLICADA AQUI TAMBÉM ---
        const payload = {
            id: loggedInUser.id,
            username: loggedInUser.username,
            name: loggedInUser.full_name,
            role: loggedInUser.role,
            is_admin: loggedInUser.is_admin,
            clinic_id: loggedInUser.clinic_id,
            associated_patient_id: loggedInUser.associated_patient_id || null // LINHA ADICIONADA
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
