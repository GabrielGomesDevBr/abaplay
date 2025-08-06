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

/**
 * Busca toda a biblioteca de programas de forma estruturada (Discipline -> Area -> etc.).
 * @returns {Promise<Array>}
 */
export const getAllPrograms = async () => {
  try {
    const response = await apiClient.get('/programs');
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em getAllPrograms:', {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
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
    const response = await apiClient.get(`/programs/${programId}`);
    return response.data;
  } catch (error)
  {
    console.error(`Erro detalhado em getProgramById para o ID ${programId}:`, {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};


/**
 * Busca os programas que já foram designados a um paciente específico.
 * @param {string|number} patientId - O ID do paciente.
 * @returns {Promise<Array>}
 */
export const getAllProgramsForPatient = async (patientId) => {
    if (!patientId) {
        throw new Error("ID do Paciente é necessário para buscar os programas.");
    }
  try {
    const response = await apiClient.get(`/programs/assigned/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em getAllProgramsForPatient:', {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Designa um programa da biblioteca para um paciente.
 * @param {string|number} patientId - O ID do paciente.
 * @param {string|number} programId - O ID do programa.
 * @returns {Promise<Object>}
 */
export const assignProgram = async (patientId, programId) => {
    try {
        const response = await apiClient.post('/programs/assign', { patientId, programId });
        return response.data;
    } catch (error) {
        console.error('Erro detalhado em assignProgram:', {
            message: error.message,
            request_url: error.config?.url,
            response_status: error.response?.status,
            response_data: error.response?.data,
        });
        throw error;
    }
};

/**
 * Busca os detalhes de uma designação específica pelo seu ID.
 * @param {string|number} assignmentId - O ID da designação do programa.
 * @returns {Promise<Object>}
 */
export const getAssignmentDetails = async (assignmentId) => {
  try {
    const response = await apiClient.get(`/programs/assignment/${assignmentId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getAssignmentDetails para o ID ${assignmentId}:`, {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};

/**
 * --- NOVA FUNÇÃO ---
 * Regista a evolução de uma sessão de um programa para um paciente.
 * @param {Object} evolutionData - Os dados da sessão a serem registados.
 * @returns {Promise<Object>}
 */
export const recordProgramEvolution = async (evolutionData) => {
  try {
    const response = await apiClient.post('/programs/evolution', evolutionData);
    return response.data;
  } catch (error) {
    console.error('Erro detalhado em recordProgramEvolution:', {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};

/**
 * --- NOVA FUNÇÃO ---
 * Busca o histórico de evolução de um paciente para um programa específico.
 * @param {string|number} patientId - O ID do paciente.
 * @param {string|number} programId - O ID do programa.
 * @returns {Promise<Array>}
 */
export const getProgramEvolution = async (patientId, programId) => {
  try {
    const response = await apiClient.get(`/programs/evolution/${patientId}/${programId}`);
    return response.data;
  } catch (error) {
    console.error(`Erro detalhado em getProgramEvolution para paciente ${patientId} e programa ${programId}:`, {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};
