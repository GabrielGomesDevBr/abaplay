// backend/src/controllers/parentController.js

const PatientModel = require('../models/patientModel.js');

/**
 * Controlador para o dashboard dos pais.
 */
exports.getDashboardData = async (req, res, next) => {
    // --- LÓGICA DE SEGURANÇA REFORÇADA ---
    const { role, associated_patient_id, userId, clinic_id } = req.user;

    // 1. Garante que o utilizador tem a função 'pai'.
    if (role !== 'pai') {
        console.warn(`Tentativa de acesso à rota de pais por utilizador não autorizado (ID: ${userId}, Role: ${role}).`);
        return res.status(403).json({ errors: [{ msg: 'Acesso negado. Recurso disponível apenas para pais/responsáveis.' }] });
    }
    
    // 2. Garante que o utilizador 'pai' tem um paciente associado no seu token.
    if (!associated_patient_id) {
        console.warn(`Tentativa de acesso à rota de pais por utilizador (ID: ${userId}, Role: ${role}) sem associated_patient_id.`);
        return res.status(403).json({ errors: [{ msg: 'Acesso negado. Nenhum paciente associado a este responsável.' }] });
    }

    try {
        // 3. Busca os dados completos do paciente associado.
        // O PatientModel.findById já deve retornar o paciente com assigned_programs e sessionData.
        const patientData = await PatientModel.findById(associated_patient_id);

        // 4. Validação extra: O paciente encontrado realmente pertence à mesma clínica do pai?
        if (!patientData || patientData.clinic_id !== clinic_id) {
            console.warn(`Paciente associado (ID: ${associated_patient_id}) não encontrado ou não pertence à clínica do pai (ID: ${clinic_id}).`);
            return res.status(404).json({ errors: [{ msg: 'Paciente associado não encontrado ou inválido.' }] });
        }
        
        // CORREÇÃO CRÍTICA: Envia o objeto patientData COMPLETO para o frontend.
        // Isso garante que assigned_programs e sessionData estejam aninhados corretamente.
        const responsePayload = {
            patient: patientData 
        };
        
        console.log(`[parentController] Dados do dashboard do pai para paciente ID ${patientData.id} enviados. Inclui programas e sessões.`, responsePayload);
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error(`[parentController] Erro ao obter dados do dashboard do pai para utilizador ID ${userId}:`, error);
        // Passa qualquer outro erro para o middleware de tratamento de erros.
        next(error);
    }
};
