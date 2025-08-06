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

// --- CORREÇÃO PRINCIPAL ---
// A função 'getProgramAreas' foi removida e substituída por 'getAllPrograms'.
// Esta nova função busca toda a biblioteca de programas da rota principal '/programs'.
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

// Esta função pode ser mantida por enquanto, embora sua lógica possa ser
// integrada à página de detalhes do paciente no futuro.
export const getAllProgramsForPatient = async (patientId) => {
    if (!patientId) {
        throw new Error("ID do Paciente é necessário para buscar os programas.");
    }
  try {
    // A rota correta para buscar programas *designados* a um paciente.
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

// CORREÇÃO: A rota para designar um programa foi atualizada para '/programs/assign'
// para corresponder ao que definimos no backend.
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
