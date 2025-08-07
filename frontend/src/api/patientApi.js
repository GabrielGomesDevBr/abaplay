import axios from 'axios';

// A URL base da API e a função de autenticação permanecem as mesmas.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = (token) => {
  // Garantir que o token não seja 'undefined' antes de criar o cabeçalho.
  if (!token) {
    console.error("[API-LOG] Tentativa de criar cabeçalho de autenticação sem token.");
    // Lançar um erro ou retornar cabeçalhos vazios pode ser uma opção,
    // mas a validação deve ocorrer antes da chamada.
  }
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

// --- Funções de Gestão de Programas ---

export const assignProgramToPatient = async (patientId, programId, token) => {
    try {
        const response = await axios.post(`${API_URL}/assignments`, { patientId, programId }, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        console.error(`Erro ao atribuir programa ${programId} ao paciente ${patientId}:`, error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atribuir o programa.');
    }
};

// CORREÇÃO 1: A função agora se chama `removeProgramAssignment` para maior clareza.
// CORREÇÃO 2: A assinatura mudou. Agora ela recebe `assignmentId` e `token`.
export const removeProgramAssignment = async (assignmentId, token) => {
    try {
        // CORREÇÃO 3: A URL agora aponta para a rota correta no backend: /api/assignments/:assignmentId
        await axios.delete(`${API_URL}/assignments/${assignmentId}`, getAuthHeaders(token));
    } catch (error) {
        console.error(`Erro ao remover a atribuição ${assignmentId}:`, error.response?.data || error.message);
        // CORREÇÃO 4: Mensagem de erro genérica atualizada.
        const apiError = error.response?.data?.errors?.[0]?.msg || 'Não foi possível remover o programa.';
        // Lança o erro para ser tratado na página.
        throw new Error(apiError);
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
