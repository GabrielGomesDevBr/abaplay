const { validationResult } = require('express-validator');
const PatientModel = require('../models/patientModel.js');

// Função auxiliar para formatar erros de validação
const formatValidationErrors = (errors) => ({
    errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path }))
});

// Função de segurança para verificar se o usuário tem acesso ao paciente
const checkAccess = async (req) => {
    const patientId = req.params.patientId || req.params.id;
    const { id: userId, clinic_id, is_admin } = req.user;

    const patient = await PatientModel.findById(patientId);

    if (!patient || patient.clinic_id !== clinic_id) {
        return { hasAccess: false, error: { status: 404, msg: 'Paciente não encontrado.' } };
    }

    if (!is_admin) {
        const isAssigned = await PatientModel.isTherapistAssigned(patientId, userId);
        if (!isAssigned) {
            return { hasAccess: false, error: { status: 403, msg: 'Acesso negado.' } };
        }
    }
    
    return { hasAccess: true, error: null };
};

// --- Funções do Controlador (Refatoradas) ---

// Busca todos os pacientes para o terapeuta logado
exports.getAllPatients = async (req, res, next) => {
    try {
        const { id: userId, is_admin } = req.user;

        if (is_admin) {
             // Admins devem usar a rota de admin
             return res.status(200).json([]);
        }

        const patients = await PatientModel.findAllByTherapistId(userId);
        res.status(200).json(patients);
    } catch (error) {
        console.error('[ERRO] patientController: Erro em getAllPatients:', error);
        next(error);
    }
};

// Busca um paciente específico por ID
exports.getPatientById = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        
        const patient = await PatientModel.findById(req.params.id);
        res.status(200).json({ patient });
    } catch (error) {
        next(error);
    }
};

// Atualiza as anotações de um paciente
exports.updatePatientNotes = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) {
            return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        }

        const updatedData = await PatientModel.updateNotes(req.params.patientId, req.body.general_notes);
        res.status(200).json({ message: 'Anotações atualizadas com sucesso!', ...updatedData });
    } catch (error) {
        console.error(`Erro ao atualizar anotações para o paciente ${req.params.patientId}:`, error);
        next(error);
    }
};

// --- LÓGICA REMOVIDA ---
// As funções assignProgramToPatient, removeProgramFromPatient, updateProgramStatus e createSession
// foram removidas deste arquivo. A lógica agora está centralizada no 'programController.js'
// para evitar duplicidade e bugs.
