// frontend/src/api/superAdminApi.js

import axios from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL || 'http://localhost:3000';

// Configurar interceptador para incluir token
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/super-admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador para adicionar token automaticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar respostas
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erro na API Super Admin:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =====================================
// APIs DE MÉTRICAS E SISTEMA
// =====================================

/**
 * Busca métricas gerais do sistema.
 * @returns {Promise} Métricas do sistema.
 */
export const getSystemMetrics = async () => {
  try {
    const response = await apiClient.get('/metrics');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca log de atividades do sistema.
 * @param {number} limit - Limite de registros (padrão: 50).
 * @returns {Promise} Log de atividades.
 */
export const getActivityLog = async (limit = 50) => {
  try {
    const response = await apiClient.get(`/activity-log?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca estatísticas de crescimento.
 * @param {number} months - Número de meses (padrão: 6).
 * @returns {Promise} Estatísticas de crescimento.
 */
export const getGrowthStats = async (months = 6) => {
  try {
    const response = await apiClient.get(`/growth-stats?months=${months}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// =====================================
// APIs DE GESTÃO DE CLÍNICAS
// =====================================

/**
 * Busca todas as clínicas com filtros.
 * @param {object} filters - Filtros opcionais (status, search).
 * @returns {Promise} Lista de clínicas.
 */
export const getAllClinics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/clinics?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cria nova clínica com administrador.
 * @param {object} clinicData - Dados da clínica.
 * @returns {Promise} Clínica criada.
 */
export const createClinic = async (clinicData) => {
  try {
    const response = await apiClient.post('/clinics', clinicData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Suspende uma clínica.
 * @param {number} clinicId - ID da clínica.
 * @param {string} reason - Motivo da suspensão.
 * @returns {Promise} Clínica atualizada.
 */
export const suspendClinic = async (clinicId, reason) => {
  try {
    const response = await apiClient.put(`/clinics/${clinicId}/suspend`, { reason });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Reativa uma clínica.
 * @param {number} clinicId - ID da clínica.
 * @returns {Promise} Clínica atualizada.
 */
export const reactivateClinic = async (clinicId) => {
  try {
    const response = await apiClient.put(`/clinics/${clinicId}/reactivate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Atualiza limite de pacientes de uma clínica.
 * @param {number} clinicId - ID da clínica.
 * @param {number} maxPatients - Novo limite.
 * @returns {Promise} Clínica atualizada.
 */
export const updatePatientLimit = async (clinicId, maxPatients) => {
  try {
    const response = await apiClient.put(`/clinics/${clinicId}/patient-limit`, { maxPatients });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Resetar senha do administrador da clínica (seta como NULL).
 * @param {number} clinicId - ID da clínica.
 * @returns {Promise} Resultado da operação.
 */
export const resetClinicAdminPassword = async (clinicId) => {
  try {
    const response = await apiClient.put(`/clinics/${clinicId}/reset-admin-password`);
    return response.data;
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    throw error;
  }
};

// =====================================
// APIs FINANCEIRAS
// =====================================

/**
 * Busca todas as cobranças com filtros.
 * @param {object} filters - Filtros opcionais.
 * @returns {Promise} Lista de cobranças.
 */
export const getAllBillings = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.clinic_id) params.append('clinic_id', filters.clinic_id);
    if (filters.overdue_only) params.append('overdue_only', 'true');
    if (filters.due_soon) params.append('due_soon', 'true');
    
    const response = await apiClient.get(`/billing?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cria nova cobrança.
 * @param {object} billingData - Dados da cobrança.
 * @returns {Promise} Cobrança criada.
 */
export const createBilling = async (billingData) => {
  try {
    const response = await apiClient.post('/billing', billingData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Registra pagamento para uma cobrança.
 * @param {number} billingId - ID da cobrança.
 * @param {object} paymentData - Dados do pagamento.
 * @returns {Promise} Cobrança atualizada.
 */
export const recordPayment = async (billingId, paymentData) => {
  try {
    const response = await apiClient.put(`/billing/${billingId}/payment`, paymentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca evolução da receita por mês.
 * @param {number} months - Número de meses (padrão: 12).
 * @returns {Promise} Evolução da receita.
 */
export const getRevenueEvolution = async (months = 12) => {
  try {
    const response = await apiClient.get(`/billing/revenue-evolution?months=${months}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Atualiza status de cobranças vencidas.
 * @returns {Promise} Resultado da atualização.
 */
export const updateOverdueStatus = async () => {
  try {
    const response = await apiClient.put('/billing/update-overdue');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca histórico financeiro de uma clínica.
 * @param {number} clinicId - ID da clínica.
 * @returns {Promise} Histórico financeiro.
 */
export const getClinicFinancialHistory = async (clinicId) => {
  try {
    const response = await apiClient.get(`/billing/clinic/${clinicId}/history`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca alertas de vencimento e cobranças vencidas.
 * @param {number} warningDays - Dias antes do vencimento para alertar (padrão: 3).
 * @returns {Promise} Alertas de cobrança.
 */
export const getBillingAlerts = async (warningDays = 3) => {
  try {
    const response = await apiClient.get(`/billing/alerts?warningDays=${warningDays}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Executa processo de atualização de status vencidas e sugere suspensões.
 * @returns {Promise} Resultado do processamento.
 */
export const processOverdueBills = async () => {
  try {
    const response = await apiClient.post('/billing/process-overdue');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina uma clínica permanentemente.
 * @param {number} clinicId - ID da clínica.
 * @returns {Promise} Resultado da eliminação.
 */
export const deleteClinic = async (clinicId) => {
  try {
    const response = await apiClient.delete(`/clinics/${clinicId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Edita data de vencimento de uma cobrança.
 * @param {number} billingId - ID da cobrança.
 * @param {object} dueDateData - Dados da nova data.
 * @returns {Promise} Cobrança atualizada.
 */
export const editBillingDueDate = async (billingId, dueDateData) => {
  try {
    const response = await apiClient.put(`/billing/${billingId}/due-date`, dueDateData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// =====================================
// APIs DE PROGRAMAS GLOBAIS
// =====================================

/**
 * Configurar cliente específico para programas (usa rota diferente)
 */
const programsApiClient = axios.create({
  baseURL: `${API_BASE_URL}/programs`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador para adicionar token automaticamente
programsApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar respostas
programsApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erro na API Programas Globais:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Busca hierarquia de disciplinas para formulário.
 * @returns {Promise} Hierarquia de disciplinas.
 */
export const getDisciplineHierarchy = async () => {
  try {
    const response = await programsApiClient.get('/hierarchy');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Cria um programa global (apenas super admin).
 * @param {object} programData - Dados do programa.
 * @returns {Promise} Programa criado.
 */
export const createGlobalProgram = async (programData) => {
  try {
    const response = await programsApiClient.post('/global', programData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca programas globais criados por super admin.
 * @returns {Promise} Programas globais organizados por hierarquia.
 */
export const getGlobalPrograms = async () => {
  try {
    const response = await programsApiClient.get('/global');
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Atualiza um programa global (apenas super admin).
 * @param {number} programId - ID do programa.
 * @param {object} programData - Dados atualizados do programa.
 * @returns {Promise} Programa atualizado.
 */
export const updateGlobalProgram = async (programId, programData) => {
  try {
    const response = await programsApiClient.put(`/global/${programId}`, programData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Exclui um programa global (apenas super admin).
 * @param {number} programId - ID do programa.
 * @returns {Promise} Resultado da exclusão.
 */
export const deleteGlobalProgram = async (programId) => {
  try {
    const response = await programsApiClient.delete(`/global/${programId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca estatísticas de uso de um programa.
 * @param {number} programId - ID do programa.
 * @returns {Promise} Estatísticas de uso.
 */
export const getProgramUsage = async (programId) => {
  try {
    const response = await programsApiClient.get(`/${programId}/usage`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Exportações nomeadas adicionais para compatibilidade
const superAdminApi = {
  getSystemMetrics,
  getActivityLog,
  getGrowthStats,
  getAllClinics,
  createClinic,
  suspendClinic,
  reactivateClinic,
  updatePatientLimit,
  resetClinicAdminPassword,
  getAllBillings,
  createBilling,
  recordPayment,
  getRevenueEvolution,
  updateOverdueStatus,
  getClinicFinancialHistory,
  getBillingAlerts,
  processOverdueBills,
  deleteClinic,
  editBillingDueDate,
  // APIs de programas globais
  getDisciplineHierarchy,
  createGlobalProgram,
  getGlobalPrograms,
  updateGlobalProgram,
  deleteGlobalProgram,
  getProgramUsage
};

export default superAdminApi;