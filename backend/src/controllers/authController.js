// backend/src/controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const dbConfig = require('../config/db.config.js');
const UserModel = require('../models/userModel.js');
const ClinicModel = require('../models/clinicModel.js');

const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

// Função auxiliar centralizada para gerar a resposta de login
const generateTokenAndRespond = async (res, user) => {
    // Busca os detalhes da clínica para incluir no token
    const clinic = await ClinicModel.findById(user.clinic_id);

    // <<< CORREÇÃO CRÍTICA: Garante que TODOS os campos necessários estão no payload >>>
    const payload = {
        userId: user.id,
        clinic_id: user.clinic_id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        is_admin: user.is_admin,
        max_patients: clinic ? clinic.max_patients : 0,
        // Garante que o ID do paciente para o pai é incluído no token
        associated_patient_id: user.associated_patient_id || null 
    };
    
    const token = jwt.sign(payload, dbConfig.JWT_SECRET, { expiresIn: '8h' });

    delete user.password_hash;

    // O objeto user retornado para o frontend também deve conter todos os dados
    res.status(200).json({
        message: `Login bem-sucedido para ${user.username}!`,
        token: token,
        user: {
            id: user.id,
            clinic_id: user.clinic_id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            is_admin: user.is_admin,
            max_patients: payload.max_patients,
            associated_patient_id: payload.associated_patient_id
        }
    });
};

exports.checkUserStatus = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    
    try {
        const { username } = req.body;
        const user = await UserModel.findByUsername(username);

        if (!user) {
            return res.status(404).json({ errors: [{ msg: 'Utilizador não encontrado.' }] });
        }

        if (user.password_hash === null && user.is_admin) {
            return res.status(200).json({ 
                action: 'SET_PASSWORD',
                user: {
                    userId: user.id,
                    username: user.username,
                    fullName: user.full_name
                }
            });
        }
        
        if (user.password_hash === null && !user.is_admin) {
            return res.status(403).json({ errors: [{ msg: 'Conta de utilizador inválida ou não configurada.' }] });
        }
        
        return res.status(200).json({ action: 'REQUIRE_PASSWORD' });

    } catch (error) {
        next(error);
    }
};

exports.loginUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    try {
        const { username, password } = req.body;
        const user = await UserModel.findByUsername(username);

        if (!user || !user.password_hash) {
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas ou conta não configurada.' }] });
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ errors: [{ msg: 'Credenciais inválidas.' }] });
        }

        await generateTokenAndRespond(res, user);
    } catch (error) {
        next(error);
    }
};

exports.setPassword = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(formatValidationErrors(errors));
    }
    
    try {
        const { userId, password } = req.body;
        const user = await UserModel.findById(userId);

        if (!user || user.password_hash !== null) {
            return res.status(403).json({ errors: [{ msg: 'Ação não permitida ou senha já definida.' }] });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const success = await UserModel.setPassword(user.id, hashedPassword);

        if (!success) {
            throw new Error('Falha ao atualizar a senha no banco de dados.');
        }

        const fullUser = await UserModel.findById(userId);
        await generateTokenAndRespond(res, fullUser);
    } catch(error) {
        next(error);
    }
};
