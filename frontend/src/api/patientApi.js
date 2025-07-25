// -----------------------------------------------------------------------------
// Arquivo da API de Pacientes (frontend/src/api/patientApi.js)
// -----------------------------------------------------------------------------
// - CORREÇÃO FINAL: A função 'fetchAllPatients' agora retorna 'response.data'
//   diretamente, pois o backend envia um array e não um objeto.
// -----------------------------------------------------------------------------
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = (token) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// --- Funções de Gestão de Pacientes ---

export const fetchAllPatients = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/patients`, getAuthHeaders(token));
    // --- CORREÇÃO ---
    // O backend envia um array direto. Acessar .patients resultava em 'undefined'.
    // Agora, retornamos os dados diretamente.
    return response.data || [];
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar os pacientes.');
  }
};

export const createPatient = async (patientData, token) => {
  try {
    const response = await axios.post(`${API_URL}/patients`, patientData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    console.error("Erro ao criar paciente:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível criar o paciente.');
  }
};

export const updatePatient = async (patientId, patientData, token) => {
  try {
    const response = await axios.put(`${API_URL}/patients/${patientId}`, patientData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    console.error(`Erro ao atualizar paciente ${patientId}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar o paciente.');
  }
};

export const deletePatient = async (patientId, token) => {
  try {
    await axios.delete(`${API_URL}/patients/${patientId}`, getAuthHeaders(token));
  } catch (error) {
    console.error(`Erro ao apagar paciente ${patientId}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível apagar o paciente.');
  }
};

// --- Funções de Gestão de Programas (sem alterações) ---

export const assignProgramToPatient = async (patientId, programId, token) => {
    try {
        const response = await axios.post(`${API_URL}/patients/${patientId}/programs`, { programId }, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        console.error(`Erro ao atribuir programa ${programId} ao paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atribuir o programa.');
    }
};

export const removeProgramFromPatient = async (patientId, programId, token) => {
    try {
        await axios.delete(`${API_URL}/patients/${patientId}/programs/${programId}`, getAuthHeaders(token));
    } catch (error) {
        console.error(`Erro ao remover programa ${programId} do paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível remover o programa.');
    }
};

export const updateProgramStatusForPatient = async (patientId, programId, status, token) => {
    try {
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

// --- Funções de Gestão de Sessões (sem alterações) ---

export const createSession = async (patientId, sessionData, token) => {
    try {
        const response = await axios.post(`${API_URL}/patients/${patientId}/sessions`, sessionData, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        console.error(`Erro ao criar sessão para paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível guardar a sessão.');
    }
};

// --- Função de Gestão de Anotações (sem alterações) ---

export const updatePatientNotes = async (patientId, notes, token) => {
    try {
        const response = await axios.patch(`${API_URL}/patients/${patientId}/notes`, { general_notes: notes }, getAuthHeaders(token));
        console.log(`[patientApi] Requisição PATCH para /patients/${patientId}/notes enviada.`, { general_notes: notes });
        return response.data;
    } catch (error) {
        console.error(`Erro ao atualizar anotações para paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível guardar as anotações.');
    }
};
