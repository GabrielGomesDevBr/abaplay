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
export const fetchAllPatients = async (token) => {
  try {
    console.log('[API-LOG] fetchAllPatients: Iniciando busca de pacientes para terapeuta');
    const response = await axios.get(`${API_URL}/patients`, getAuthHeaders(token));
    console.log('[API-LOG] fetchAllPatients: Sucesso -', response.data.length, 'pacientes encontrados');
    return response.data;
  } catch (error) {
    console.error('[API-LOG] fetchAllPatients: Erro -', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar os pacientes.');
  }
};
export const createPatient = async (patientData, token) => {
  try {
    console.log('[API-LOG] createPatient: Criando novo paciente -', patientData.name);
    const response = await axios.post(`${API_URL}/admin/patients`, patientData, getAuthHeaders(token));
    console.log('[API-LOG] createPatient: Sucesso - ID:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('[API-LOG] createPatient: Erro -', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível criar o paciente.');
  }
};
export const updatePatient = async (patientId, patientData, token) => {
  try {
    console.log(`[API-LOG] updatePatient: Atualizando paciente ${patientId}`);
    const response = await axios.put(`${API_URL}/admin/patients/${patientId}`, patientData, getAuthHeaders(token));
    console.log('[API-LOG] updatePatient: Sucesso');
    return response.data;
  } catch (error) {
    console.error(`[API-LOG] updatePatient: Erro para paciente ${patientId} -`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar o paciente.');
  }
};
export const deletePatient = async (patientId, token) => {
  try {
    console.log(`[API-LOG] deletePatient: Deletando paciente ${patientId}`);
    await axios.delete(`${API_URL}/admin/patients/${patientId}`, getAuthHeaders(token));
    console.log('[API-LOG] deletePatient: Sucesso');
  } catch (error) {
    console.error(`[API-LOG] deletePatient: Erro para paciente ${patientId} -`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível deletar o paciente.');
  }
};
export const updatePatientNotes = async (patientId, notes, token) => {
  try {
    console.log(`[API-LOG] updatePatientNotes: Atualizando notas do paciente ${patientId}`);
    const response = await axios.patch(
      `${API_URL}/patients/${patientId}/notes`,
      { general_notes: notes },
      getAuthHeaders(token)
    );
    console.log('[API-LOG] updatePatientNotes: Sucesso');
    return response.data;
  } catch (error) {
    console.error(`[API-LOG] updatePatientNotes: Erro para paciente ${patientId} -`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar as notas.');
  }
};
export const createSession = async (patientId, sessionData, token) => {
  try {
    console.log(`[API-LOG] createSession: Criando sessão para paciente ${patientId}`);
    const response = await axios.post(
      `${API_URL}/programs/evolution`,
      sessionData,
      getAuthHeaders(token)
    );
    console.log('[API-LOG] createSession: Sucesso');
    return response.data;
  } catch (error) {
    console.error(`[API-LOG] createSession: Erro para paciente ${patientId} -`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível criar a sessão.');
  }
};


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
