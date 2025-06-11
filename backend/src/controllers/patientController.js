// backend/src/controllers/patientController.js

const { validationResult } = require('express-validator');
const PatientModel = require('../models/patientModel.js');

// Função auxiliar para formatar erros de validação
const formatValidationErrors = (errors) => ({
    errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path }))
});

/**
 * <<< FUNÇÃO DE SEGURANÇA CENTRALIZADA >>>
 * Verifica se o utilizador logado (admin ou terapeuta) tem permissão para aceder a um paciente.
 */
const checkAccess = async (req) => {
    const patientId = req.params.patientId || req.params.id;
    const { userId, clinic_id, is_admin } = req.user;

    const patient = await PatientModel.findById(patientId);

    // 1. O paciente existe e pertence à clínica do utilizador?
    if (!patient || patient.clinic_id !== clinic_id) {
        return { hasAccess: false, error: { status: 404, msg: 'Paciente não encontrado ou não pertence a esta clínica.' } };
    }

    // 2. Se o utilizador NÃO for admin, ele está atribuído a este paciente?
    if (!is_admin) {
        const isAssigned = await PatientModel.isTherapistAssigned(patientId, userId);
        if (!isAssigned) {
            return { hasAccess: false, error: { status: 403, msg: 'Acesso negado. Terapeuta não atribuído a este paciente.' } };
        }
    }
    
    // Se for admin, o acesso é concedido (desde que pertença à clínica).
    return { hasAccess: true, error: null };
};


// --- Funções do Controlador (Auditadas e Corrigidas) ---

/**
 * <<< CORREÇÃO CRÍTICA >>>
 * Esta função agora serve apenas para TERAPEUTAS, buscando os pacientes que lhes estão atribuídos.
 * A lógica para o admin ver todos os pacientes já está no adminController.
 */
exports.getAllPatients = async (req, res, next) => {
    try {
        const { userId, is_admin } = req.user;

        // Medida de segurança: esta rota não deve ser usada por administradores.
        if (is_admin) {
             console.warn(`Admin (ID: ${userId}) acedeu à rota de terapeuta. Um admin deve usar a rota /api/admin/patients.`);
             // Devolve uma lista vazia para evitar expor dados e indicar um fluxo incorreto no frontend.
             return res.status(200).json({ patients: [] });
        }

        const patients = await PatientModel.findAllByTherapistId(userId);
        res.status(200).json({ patients });
    } catch (error) {
        next(error);
    }
};

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

exports.assignProgramToPatient = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(formatValidationErrors(errors));

    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        
        const assignedProgram = await PatientModel.assignProgram(req.params.patientId, req.body.programId);
        res.status(201).json({ message: 'Programa atribuído com sucesso.', program: assignedProgram });
    } catch (error) {
        next(error);
    }
};

exports.removeProgramFromPatient = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        await PatientModel.removeProgram(req.params.patientId, req.params.programId);
        res.status(204).send();
    } catch(error) {
        next(error);
    }
};

exports.updateProgramStatus = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        const updatedLink = await PatientModel.updateProgramStatus(req.params.patientId, req.params.programId, req.body.status);
        res.status(200).json({ message: 'Status do programa atualizado com sucesso.', program: updatedLink });
    } catch(error) {
        next(error);
    }
};

exports.createSession = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        
        const newSession = await PatientModel.createSession(req.params.patientId, req.body);
        res.status(201).json(newSession);
    } catch (error) {
        next(error);
    }
};

exports.updatePatientNotes = async (req, res, next) => {
    try {
        const { hasAccess, error } = await checkAccess(req);
        if (!hasAccess) {
            console.error(`Erro de acesso ao atualizar anotações para o paciente ${req.params.patientId}: ${error.msg}`); // Log de erro de acesso
            return res.status(error.status).json({ errors: [{ msg: error.msg }] });
        }

        const updatedData = await PatientModel.updateNotes(req.params.patientId, req.body.general_notes);
        res.status(200).json({ message: 'Anotações atualizadas com sucesso!', ...updatedData });
    } catch (error) {
        console.error(`Erro ao atualizar anotações para o paciente ${req.params.patientId}:`, error); // Log de erro detalhado
        next(error); // Passa o erro para o middleware de tratamento de erros
    }
};
