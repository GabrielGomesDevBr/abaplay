import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// Interceptor para adicionar o token JWT a cada requisição
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Funções Relacionadas a Programas (Biblioteca) ---

/**
 * Busca toda a biblioteca de programas de forma estruturada.
 * @returns {Promise<Array>}
 */
export const getAllPrograms = async () => {
  try {
    // Endpoint continua /programs, está correto.
    const response = await apiClient.get('/programs');
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em getAllPrograms:', {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Busca os detalhes completos de um único programa pelo seu ID.
 * @param {string|number} programId - O ID do programa a ser buscado.
 * @returns {Promise<Object>}
 */
export const getProgramById = async (programId) => {
  try {
    // Endpoint continua /programs/:id, está correto.
    const response = await apiClient.get(`/programs/${programId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getProgramById para o ID ${programId}:`, {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Busca os programas atribuídos a um paciente organizados para a grade de programas.
 * @param {string|number} patientId - O ID do paciente.
 * @returns {Promise<Object>} Objeto organizado por áreas com os programas atribuídos.
 */
export const getPatientProgramsGrade = async (patientId) => {
  try {
    const response = await apiClient.get(`/programs/patient/${patientId}/grade`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getPatientProgramsGrade para o paciente ${patientId}:`, {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};


// --- Funções Relacionadas a Atribuições (Assignments) ---

/**
 * Busca as atribuições de programas para um paciente específico.
 * @param {string|number} patientId - O ID do paciente.
 * @returns {Promise<Array>}
 */
export const getAssignmentsForPatient = async (patientId) => {
    if (!patientId) throw new Error("ID do Paciente é necessário.");
  try {
    // CORRIGIDO: Rota agora é /assignments/patient/:patientId
    const response = await apiClient.get(`/assignments/patient/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em getAssignmentsForPatient:', {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Atribui um programa da biblioteca para um paciente.
 * @param {string|number} patientId - O ID do paciente.
 * @param {string|number} programId - O ID do programa.
 * @returns {Promise<Object>}
 */
export const assignProgram = async (patientId, programId) => {
    try {
        // CORRIGIDO: Rota agora é /assignments
        const response = await apiClient.post('/assignments', { patientId, programId });
        return response.data;
    } catch (error) {
        console.error('Erro detalhado em assignProgram:', {
            message: error.message, request_url: error.config?.url,
        });
        throw error;
    }
};

/**
 * Busca os detalhes de uma atribuição específica pelo seu ID.
 * @param {string|number} assignmentId - O ID da designação do programa.
 * @returns {Promise<Object>}
 */
export const getAssignmentDetails = async (assignmentId) => {
  try {
    // CORRIGIDO: Rota agora é /assignments/:id
    const response = await apiClient.get(`/assignments/${assignmentId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getAssignmentDetails para o ID ${assignmentId}:`, {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Regista o progresso de uma sessão.
 * @param {Object} progressData - Os dados da sessão a serem registados.
 * @returns {Promise<Object>}
 */
export const recordProgress = async (progressData) => {
  try {
    // CORRIGIDO: Rota agora é /assignments/progress
    const response = await apiClient.post('/assignments/progress', progressData);
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em recordProgress:', {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Busca o histórico de progresso de uma atribuição específica.
 * @param {string|number} assignmentId - O ID da atribuição.
 * @returns {Promise<Array>}
 */
export const getAssignmentEvolution = async (assignmentId) => {
  try {
    // CORRIGIDO: Rota agora é /assignments/:assignmentId/progress
    const response = await apiClient.get(`/assignments/${assignmentId}/progress`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getAssignmentEvolution para a atribuição ${assignmentId}:`, {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};

/**
 * Atualiza o status de uma atribuição de programa.
 * @param {string|number} assignmentId - O ID da atribuição a ser atualizada.
 * @param {string} status - O novo status (ex: 'Arquivado', 'Ativo').
 * @returns {Promise<Object>}
 */
export const updateAssignmentStatus = async (assignmentId, status) => {
  try {
    // CORRIGIDO: Rota agora é /assignments/:id/status
    const response = await apiClient.patch(`/assignments/${assignmentId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em updateAssignmentStatus para a atribuição ${assignmentId}:`, {
        message: error.message, request_url: error.config?.url,
    });
    throw error;
  }
};
