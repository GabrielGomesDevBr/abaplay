const PatientModel = require('../models/patientModel.js');

// Versão final, seguindo o padrão correto da aplicação.
const parentController = {};

/**
 * Controlador para o dashboard dos pais.
 */
parentController.getDashboardData = async (req, res, next) => {
    // A propriedade 'id' do usuário logado é renomeada para 'userId' para clareza.
    const { role, associated_patient_id, id: userId, clinic_id } = req.user;

    if (role !== 'pai') {
        console.warn(`Tentativa de acesso à rota de pais por utilizador não autorizado (ID: ${userId}, Role: ${role}).`);
        return res.status(403).json({ errors: [{ msg: 'Acesso negado. Recurso disponível apenas para pais/responsáveis.' }] });
    }
    
    if (!associated_patient_id) {
        console.warn(`Tentativa de acesso à rota de pais por utilizador (ID: ${userId}, Role: ${role}) sem associated_patient_id.`);
        return res.status(403).json({ errors: [{ msg: 'Acesso negado. Nenhum paciente associado a este responsável.' }] });
    }

    try {
        const patientData = await PatientModel.findById(associated_patient_id);

        if (!patientData || patientData.clinic_id !== clinic_id) {
            console.warn(`Paciente associado (ID: ${associated_patient_id}) não encontrado ou não pertence à clínica do pai (ID: ${clinic_id}).`);
            return res.status(404).json({ errors: [{ msg: 'Paciente associado não encontrado ou inválido.' }] });
        }
        
        const responsePayload = {
            patient: patientData 
        };
        
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error(`[parentController] Erro ao obter dados do dashboard do pai para utilizador ID ${userId}:`, error);
        next(error);
    }
};

module.exports = parentController;
