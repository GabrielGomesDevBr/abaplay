import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
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
    console.error('Erro ao carregar programas');
    throw error;
  }
};

/**
 * Busca programas por termo de pesquisa
 * @param {string} searchTerm - Termo de busca
 * @param {string} discipline - Nome da disciplina (opcional)
 * @returns {Promise<Array>}
 */
export const searchPrograms = async (searchTerm, discipline = null) => {
  try {
    const params = { search: searchTerm };
    if (discipline) {
      params.discipline = discipline;
    }
    
    const response = await apiClient.get('/programs', { params });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar programas:', error);
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
    console.error('Erro ao carregar programa');
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
    // Erro ao getPatientProgramsGrade
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
    // Erro ao getAssignmentsForPatient
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
        // Erro ao assignProgram
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
    // Erro ao getAssignmentDetails
    throw error;
  }
};

/**
 * Busca os detalhes de uma atribuição específica pelo seu ID (incluindo programas arquivados).
 * Usado para dashboards e relatórios - mostra dados históricos completos.
 * @param {string|number} assignmentId - O ID da designação do programa.
 * @returns {Promise<Object>}
 */
export const getAssignmentDetailsWithHistory = async (assignmentId) => {
  try {
    const response = await apiClient.get(`/assignments/${assignmentId}/history`);
    return response.data;
  } catch (error) {
    // Erro ao getAssignmentDetailsWithHistory
    throw error;
  }
};

/**
 * Busca os níveis de prompting disponíveis.
 * @returns {Promise<Array>}
 */
export const getPromptLevels = async () => {
  try {
    const response = await apiClient.get('/assignments/prompt-levels');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar níveis de prompting:', error);
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
    // Erro ao recordProgress
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
    // Erro ao getAssignmentEvolution
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
    // Erro ao updateAssignmentStatus
    throw error;
  }
};

// --- Funções para Programas Customizados ---

/**
 * Cria um programa customizado para a clínica
 * @param {Object} programData - Dados do programa customizado
 * @returns {Promise<Object>}
 */
export const createCustomProgram = async (programData) => {
  try {
    const response = await apiClient.post('/programs/custom', programData);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar programa customizado:', error);
    throw error;
  }
};

/**
 * Busca programas customizados da clínica
 * @returns {Promise<Object>}
 */
export const getCustomPrograms = async () => {
  try {
    const response = await apiClient.get('/programs/custom');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar programas customizados:', error);
    throw error;
  }
};

/**
 * Busca hierarquia de disciplinas para formulário
 * @returns {Promise<Object>}
 */
export const getDisciplineHierarchy = async () => {
  try {
    const response = await apiClient.get('/programs/hierarchy');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar hierarquia de disciplinas:', error);
    throw error;
  }
};

/**
 * Atualiza um programa customizado
 * @param {number} programId - ID do programa
 * @param {Object} programData - Dados atualizados
 * @returns {Promise<Object>}
 */
export const updateCustomProgram = async (programId, programData) => {
  try {
    const response = await apiClient.put(`/programs/${programId}`, programData);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar programa customizado:', error);
    throw error;
  }
};

/**
 * Remove um programa customizado
 * @param {number} programId - ID do programa
 * @returns {Promise<Object>}
 */
export const deleteCustomProgram = async (programId) => {
  try {
    const response = await apiClient.delete(`/programs/${programId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao remover programa customizado:', error);
    throw error;
  }
};

/**
 * Busca estatísticas de uso de um programa
 * @param {number} programId - ID do programa
 * @returns {Promise<Object>}
 */
export const getProgramUsageStats = async (programId) => {
  try {
    const response = await apiClient.get(`/programs/${programId}/usage`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar estatísticas de uso:', error);
    throw error;
  }
};
