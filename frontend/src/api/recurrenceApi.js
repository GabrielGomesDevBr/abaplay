// frontend/src/api/recurrenceApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

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
 * API para Gerenciamento de Agendamentos Recorrentes
 */

// ========================================
// GERENCIAMENTO DE RECORRÊNCIAS
// ========================================

/**
 * Gerenciar sessões recorrentes (cancelar, pausar, modificar)
 * POST /api/recurrence/manage
 * @param {Object} params - Parâmetros da ação
 * @param {string} params.action - Ação: 'cancel_single', 'cancel_future', 'cancel_range', 'end_recurrence', 'pause'
 * @param {number} params.appointmentId - ID do agendamento
 * @param {number} params.parentAppointmentId - ID da série recorrente
 * @param {string} params.startDate - Data inicial (YYYY-MM-DD)
 * @param {string} [params.endDate] - Data final (YYYY-MM-DD) - opcional conforme ação
 * @param {string} [params.reason] - Motivo do cancelamento/pausa
 * @returns {Promise<Object>} Resultado da operação
 */
export const manageRecurrence = async (params) => {
  try {
    const response = await apiClient.post('/recurrence/manage', params);
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao gerenciar recorrência:', error);
    throw new Error(error.response?.data?.message || 'Erro ao gerenciar sessões recorrentes');
  }
};

/**
 * Encerrar tratamento de um paciente (cancelar todas as sessões futuras)
 * POST /api/recurrence/terminate-patient
 * @param {Object} params - Parâmetros do encerramento
 * @param {number} params.patientId - ID do paciente
 * @param {string} params.reason - Motivo do encerramento
 * @param {string} [params.observations] - Observações adicionais
 * @returns {Promise<Object>} Resultado da operação
 */
export const terminatePatientTreatment = async (params) => {
  try {
    const response = await apiClient.post('/recurrence/terminate-patient', params);
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao encerrar tratamento:', error);
    throw new Error(error.response?.data?.message || 'Erro ao encerrar tratamento do paciente');
  }
};

/**
 * Obter sessões futuras de um paciente (para preview antes de encerrar)
 * GET /api/recurrence/patient/:patientId/future-sessions
 * @param {number} patientId - ID do paciente
 * @returns {Promise<Object>} Lista de sessões futuras agrupadas por disciplina
 */
export const getPatientFutureSessions = async (patientId) => {
  try {
    const response = await apiClient.get(`/recurrence/patient/${patientId}/future-sessions`);
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao buscar sessões futuras:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar sessões futuras');
  }
};

/**
 * Obter resumo de todas as recorrências ativas
 * GET /api/recurrence/summary
 * @returns {Promise<Object>} Lista de recorrências com estatísticas
 */
export const getRecurrenceSummary = async () => {
  try {
    const response = await apiClient.get('/recurrence/summary');
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao buscar resumo de recorrências:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar resumo de recorrências');
  }
};

/**
 * Obter agendamentos de um paciente (futuros, passados, recorrentes)
 * GET /api/admin/scheduling/patient/:patientId
 * @param {number} patientId - ID do paciente
 * @param {Object} [filters] - Filtros opcionais
 * @param {string} [filters.status] - Filtrar por status
 * @param {boolean} [filters.futureOnly] - Apenas agendamentos futuros
 * @returns {Promise<Object>} Lista de agendamentos
 */
export const getPatientAppointments = async (patientId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.futureOnly !== undefined) params.append('future_only', filters.futureOnly);

    const response = await apiClient.get(
      `/admin/scheduling/patient/${patientId}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao buscar agendamentos do paciente:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar agendamentos');
  }
};

/**
 * Obter agendamentos com conflito para um paciente
 * POST /api/recurrence/check-conflicts
 * @param {number} patientId - ID do paciente
 * @param {Array<Object>} slots - Lista de slots para verificar conflito
 * @returns {Promise<Object>} Lista de conflitos
 */
export const checkPatientConflicts = async (patientId, slots) => {
  try {
    const response = await apiClient.post('/recurrence/check-conflicts', {
      patientId,
      slots
    });
    return response.data;
  } catch (error) {
    console.error('[RECURRENCE-API] Erro ao verificar conflitos:', error);
    // Retornar array vazio em caso de erro (não bloquear a busca)
    return { conflicts: [] };
  }
};

// ========================================
// UTILIDADES
// ========================================

/**
 * Formatar mensagem de resultado de cancelamento
 * @param {Object} result - Resultado da operação
 * @returns {string} Mensagem formatada
 */
export const formatCancellationMessage = (result) => {
  const count = result.cancelled_count || result.paused_count || result.removed_count || 0;

  if (count === 0) {
    return 'Nenhuma sessão foi afetada.';
  }

  if (count === 1) {
    return '1 sessão foi cancelada com sucesso.';
  }

  return `${count} sessões foram canceladas com sucesso.`;
};

/**
 * Formatar data para exibição
 * @param {string} dateString - Data em formato YYYY-MM-DD
 * @returns {string} Data formatada em DD/MM/YYYY
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

const recurrenceApi = {
  manageRecurrence,
  terminatePatientTreatment,
  getPatientFutureSessions,
  getRecurrenceSummary,
  getPatientAppointments,
  checkPatientConflicts,
  formatCancellationMessage,
  formatDate
};

export default recurrenceApi;
