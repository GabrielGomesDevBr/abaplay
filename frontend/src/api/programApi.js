import axios from 'axios';
import { API_URL } from '../config';

// --- LOG DE DIAGNÓSTICO ---
console.log(`[DEBUG programApi] Módulo carregado. API_URL importada: ${API_URL}`);

// --- CORREÇÃO DEFINITIVA ---
// A baseURL agora inclui o prefixo '/api' para corresponder à configuração do servidor.
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// --- LOG DE DIAGNÓSTICO ---
console.log(`[DEBUG programApi] Instância do apiClient criada com baseURL: ${apiClient.defaults.baseURL}`);


// Interceptor para adicionar o token JWT a cada requisição
apiClient.interceptors.request.use(
  (config) => {
    // --- LOG DE DIAGNÓSTICO ---
    console.log(`[DEBUG programApi Interceptor] Interceptando requisição para: ${config.url}`);
    const token = localStorage.getItem('token');
    
    if (token) {
      console.log('[DEBUG programApi Interceptor] Token encontrado no localStorage. Anexando ao header.');
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[DEBUG programApi Interceptor] NENHUM token encontrado no localStorage para esta requisição.');
    }
    return config;
  },
  (error) => {
    console.error('[DEBUG programApi Interceptor] Erro na configuração da requisição:', error);
    return Promise.reject(error);
  }
);

export const getProgramAreas = async () => {
  try {
    // Agora a chamada está correta, pois a baseURL já contém /api
    const response = await apiClient.get('/programs/areas');
    return response.data;
  } catch (error) {
    console.error('[DEBUG programApi] Erro detalhado em getProgramAreas:', {
        message: error.message,
        request_url: error.config?.url,
        request_baseURL: error.config?.baseURL,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};

export const getAllProgramsForPatient = async (patientId) => {
    if (!patientId) {
        throw new Error("ID do Paciente é necessário para buscar os programas.");
    }
  try {
    const response = await apiClient.get(`/programs?patientId=${patientId}`);
    return response.data;
  } catch (error) {
    console.error('[DEBUG programApi] Erro detalhado em getAllProgramsForPatient:', {
        message: error.message,
        request_url: error.config?.url,
        response_status: error.response?.status,
        response_data: error.response?.data,
    });
    throw error;
  }
};

export const assignProgram = async (programId, patientId) => {
    try {
        const response = await apiClient.post('/assignments', { programId, patientId });
        return response.data;
    } catch (error) {
        console.error('[DEBUG programApi] Erro detalhado em assignProgram:', {
            message: error.message,
            request_url: error.config?.url,
            response_status: error.response?.status,
            response_data: error.response?.data,
        });
        throw error;
    }
};
