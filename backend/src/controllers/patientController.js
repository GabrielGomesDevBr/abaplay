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
        const { id: userId, is_admin, role } = req.user;
        console.log(`[BACKEND-LOG] getAllPatients: Iniciando busca - userId: ${userId}, role: ${role}, is_admin: ${is_admin}`);

        if (is_admin) {
             console.log('[BACKEND-LOG] getAllPatients: Admin detectado, retornando array vazio (deve usar rota admin)');
             return res.status(200).json([]);
        }

        console.log(`[BACKEND-LOG] getAllPatients: Buscando pacientes para terapeuta ${userId}`);
        const patients = await PatientModel.findAllByTherapistId(userId);
        console.log(`[BACKEND-LOG] getAllPatients: ${patients.length} pacientes encontrados`);
        res.status(200).json(patients);
    } catch (error) {
        console.error('[BACKEND-LOG] getAllPatients: ERRO -', error);
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

// ==========================================
// CONTROLADORES PARA DADOS EXPANDIDOS
// ==========================================

// Verificar se o usuário é admin para dados expandidos
const checkAdminAccess = (req, res) => {
    const { role, is_admin } = req.user;

    console.log('[PATIENT-CONTROLLER] checkAdminAccess - Dados do usuário:', {
        role,
        is_admin,
        fullUser: JSON.stringify(req.user, null, 2)
    });

    // CORREÇÃO: Aceitar qualquer usuário que tenha is_admin = true, independente do role
    if (!is_admin) {
        console.log('[PATIENT-CONTROLLER] checkAdminAccess - ACESSO NEGADO:', {
            is_admin_check: is_admin,
            role_check: role,
            motivo: 'is_admin deve ser true'
        });
        return res.status(403).json({
            errors: [{
                msg: 'Acesso negado. Apenas administradores podem acessar dados expandidos.'
            }]
        });
    }

    console.log('[PATIENT-CONTROLLER] checkAdminAccess - ACESSO PERMITIDO');
    return null; // null significa que tem acesso
};

// GET /api/patients/:id/expanded - Buscar dados expandidos (apenas admin)
exports.getPatientExpandedData = async (req, res, next) => {
    console.log('[PATIENT-CONTROLLER] getPatientExpandedData CHAMADO');
    try {
        // Verificar permissão de admin
        const adminCheck = checkAdminAccess(req, res);
        if (adminCheck) return adminCheck;

        const { id } = req.params;
        const { clinic_id } = req.user;

        console.log(`[PATIENT-CONTROLLER] Buscando dados expandidos para paciente ${id}`);

        // Buscar dados expandidos
        const expandedData = await PatientModel.getPatientExpandedData(id);

        if (!expandedData) {
            return res.status(404).json({
                errors: [{ msg: 'Paciente não encontrado.' }]
            });
        }

        // Verificar se o paciente pertence à clínica do admin
        if (expandedData.clinic_id !== clinic_id) {
            return res.status(403).json({
                errors: [{ msg: 'Acesso negado. Paciente não pertence à sua clínica.' }]
            });
        }

        console.log(`[PATIENT-CONTROLLER] Dados expandidos carregados com sucesso para paciente ${id}`);

        res.json({
            success: true,
            patient: expandedData
        });

    } catch (error) {
        console.error('[PATIENT-CONTROLLER] Erro ao buscar dados expandidos:', error);
        next(error);
    }
};

// PUT /api/patients/:id/expanded - Atualizar dados expandidos (apenas admin)
exports.updatePatientExpandedData = async (req, res, next) => {
    try {
        // Verificar permissão de admin
        const adminCheck = checkAdminAccess(req, res);
        if (adminCheck) return adminCheck;

        // Validar dados de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        const { id } = req.params;
        const { id: userId, clinic_id } = req.user;
        const expandedData = req.body;

        console.log(`[PATIENT-CONTROLLER] Atualizando dados expandidos para paciente ${id}`);

        // Verificar se o paciente existe e pertence à clínica
        const patient = await PatientModel.findById(id);
        if (!patient || patient.clinic_id !== clinic_id) {
            return res.status(404).json({
                errors: [{ msg: 'Paciente não encontrado.' }]
            });
        }

        // Validar dados expandidos
        const validationErrors = validateExpandedData(expandedData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                errors: validationErrors.map(msg => ({ msg }))
            });
        }

        // Atualizar dados
        await PatientModel.updatePatientExpandedData(id, expandedData, userId);

        console.log(`[PATIENT-CONTROLLER] Dados expandidos atualizados com sucesso para paciente ${id}`);

        res.json({
            success: true,
            message: 'Dados expandidos atualizados com sucesso',
            updated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('[PATIENT-CONTROLLER] Erro ao atualizar dados expandidos:', error);
        next(error);
    }
};

// FUNÇÃO REMOVIDA: checkPatientDataCompleteness
// Motivo: Todos os campos expandidos são opcionais, métrica de completude não é necessária

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

// Validar dados expandidos
function validateExpandedData(data) {
    const errors = [];

    // Validações de email
    if (data.main?.guardian_email && !isValidEmail(data.main.guardian_email)) {
        errors.push('Email do responsável inválido');
    }

    if (data.main?.second_guardian_email && !isValidEmail(data.main.second_guardian_email)) {
        errors.push('Email do segundo responsável inválido');
    }

    if (data.main?.pediatrician_email && !isValidEmail(data.main.pediatrician_email)) {
        errors.push('Email do pediatra inválido');
    }

    // Validações de estado
    if (data.main?.address_state && !isValidBrazilianState(data.main.address_state)) {
        errors.push('Estado inválido');
    }

    // Validações de período escolar
    if (data.main?.school_period && !['manhã', 'tarde', 'integral', 'noite'].includes(data.main.school_period)) {
        errors.push('Período escolar inválido');
    }

    // Validações relaxadas - campos opcionais, apenas verifica formato quando preenchidos
    // Nota: Dados expandidos são opcionais para permitir diferentes fluxos de registro das clínicas

    return errors;
}

// Validar email
function isValidEmail(email) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
}

// Validar estado brasileiro
function isValidBrazilianState(state) {
    const validStates = [
        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
        'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    ];
    return validStates.includes(state);
}
