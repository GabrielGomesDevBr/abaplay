import axios from 'axios';

// A URL base da API e a função de autenticação permanecem as mesmas.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = (token) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// --- Funções de Gestão de Pacientes (sem alterações) ---
export const fetchAllPatients = async (token) => { /* ...código existente... */ };
export const createPatient = async (patientData, token) => { /* ...código existente... */ };
export const updatePatient = async (patientId, patientData, token) => { /* ...código existente... */ };
export const deletePatient = async (patientId, token) => { /* ...código existente... */ };
export const updatePatientNotes = async (patientId, notes, token) => { /* ...código existente... */ };
export const createSession = async (patientId, sessionData, token) => { /* ...código existente... */ };


// --- Funções de Gestão de Programas (CORRIGIDAS) ---
// Estas funções agora usam as rotas centralizadas em '/programs'

export const assignProgramToPatient = async (patientId, programId, token) => {
    try {
        // CORREÇÃO: Usa a nova rota centralizada
        const response = await axios.post(`${API_URL}/programs/assign`, { patientId, programId }, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        console.error(`Erro ao atribuir programa ${programId} ao paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atribuir o programa.');
    }
};

export const removeProgramFromPatient = async (patientId, programId, token) => {
    try {
        // CORREÇÃO: Usa a nova rota DELETE centralizada
        await axios.delete(`${API_URL}/programs/assign/${patientId}/${programId}`, getAuthHeaders(token));
    } catch (error) {
        console.error(`Erro ao remover programa ${programId} do paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível remover o programa.');
    }
};

export const updateProgramStatusForPatient = async (patientId, programId, status, token) => {
    try {
        // AVISO: Esta rota ainda não foi criada no novo 'programController'.
        // Ela precisará ser movida e criada lá para funcionar. Por enquanto, a mantemos aqui.
        const response = await axios.patch(
            `${API_URL}/patients/${patientId}/programs/${programId}/status`,
            { status },
            getAuthHeaders(token)
        );
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar status do programa ${programId} para '${status}':`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar o status do programa.');
    }
};
