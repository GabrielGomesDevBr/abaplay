// frontend/src/api/therapistAvailabilityApi.js

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

/**
 * API client para gestão de disponibilidade de terapeutas
 * Abordagem híbrida: terapeuta e admin podem gerenciar
 */
const therapistAvailabilityApi = {

  // ================================================================
  // HORÁRIO PADRÃO (SCHEDULE TEMPLATE)
  // ================================================================

  /**
   * Busca horários padrão de trabalho de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @returns {Promise<Array>} Lista de horários por dia da semana
   */
  async getScheduleTemplate(therapistId) {
    try {
      const response = await apiClient.get(`/therapist-availability/schedule/${therapistId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar horários padrão:', error);
      throw error;
    }
  },

  /**
   * Adiciona novo horário padrão de trabalho
   * @param {Object} scheduleData - Dados do horário
   * @param {number} scheduleData.therapist_id - ID do terapeuta
   * @param {number} scheduleData.day_of_week - Dia da semana (0=domingo, 6=sábado)
   * @param {string} scheduleData.start_time - Horário inicial (HH:MM)
   * @param {string} scheduleData.end_time - Horário final (HH:MM)
   * @param {string} scheduleData.notes - Observações (opcional)
   * @returns {Promise<Object>} Horário criado
   */
  async addScheduleTemplate(scheduleData) {
    try {
      const response = await apiClient.post('/therapist-availability/schedule', scheduleData);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao adicionar horário:', error);
      throw error;
    }
  },

  /**
   * Atualiza horário padrão existente
   * @param {number} id - ID do horário
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} Horário atualizado
   */
  async updateScheduleTemplate(id, updateData) {
    try {
      const response = await apiClient.put(`/therapist-availability/schedule/${id}`, updateData);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao atualizar horário:', error);
      throw error;
    }
  },

  /**
   * Remove horário padrão
   * @param {number} id - ID do horário
   * @returns {Promise<boolean>} True se removeu
   */
  async deleteScheduleTemplate(id) {
    try {
      await apiClient.delete(`/therapist-availability/schedule/${id}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover horário:', error);
      throw error;
    }
  },

  // ================================================================
  // AUSÊNCIAS E BLOQUEIOS
  // ================================================================

  /**
   * Busca ausências de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} options - Opções de filtro
   * @returns {Promise<Array>} Lista de ausências
   */
  async getAbsences(therapistId, options = {}) {
    try {
      const { include_past = false, pending_only = false } = options;
      const response = await apiClient.get(
        `/therapist-availability/absences/${therapistId}`,
        {
          params: { include_past, pending_only }
        }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar ausências:', error);
      throw error;
    }
  },

  /**
   * Busca todas as ausências pendentes de aprovação (admin apenas)
   * @returns {Promise<Array>} Lista de ausências pendentes
   */
  async getPendingAbsences() {
    try {
      const response = await apiClient.get('/therapist-availability/absences/pending/all');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar ausências pendentes:', error);
      throw error;
    }
  },

  /**
   * Cria nova ausência/bloqueio
   * @param {Object} absenceData - Dados da ausência
   * @param {number} absenceData.therapist_id - ID do terapeuta
   * @param {string} absenceData.absence_type - Tipo (vacation, sick_leave, training, etc)
   * @param {string} absenceData.start_date - Data inicial (YYYY-MM-DD)
   * @param {string} absenceData.end_date - Data final (YYYY-MM-DD)
   * @param {string} absenceData.start_time - Horário inicial (opcional, HH:MM)
   * @param {string} absenceData.end_time - Horário final (opcional, HH:MM)
   * @param {string} absenceData.reason - Motivo (opcional)
   * @returns {Promise<Object>} Ausência criada com informação de conflitos
   */
  async createAbsence(absenceData) {
    try {
      const response = await apiClient.post('/therapist-availability/absences', absenceData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar ausência:', error);
      throw error;
    }
  },

  /**
   * Aprova ou rejeita ausência (admin apenas)
   * @param {number} absenceId - ID da ausência
   * @param {string} status - 'approved' ou 'rejected'
   * @returns {Promise<Object>} Ausência atualizada
   */
  async updateAbsenceStatus(absenceId, status) {
    try {
      const response = await apiClient.put(
        `/therapist-availability/absences/${absenceId}/status`,
        { status }
      );
      return response.data.data;
    } catch (error) {
      console.error('Erro ao atualizar status da ausência:', error);
      throw error;
    }
  },

  /**
   * Remove ausência
   * @param {number} absenceId - ID da ausência
   * @returns {Promise<boolean>} True se removeu
   */
  async deleteAbsence(absenceId) {
    try {
      await apiClient.delete(`/therapist-availability/absences/${absenceId}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover ausência:', error);
      throw error;
    }
  },

  /**
   * Verifica conflitos de agendamentos antes de criar bloqueio
   * @param {Object} params - Parâmetros da verificação
   * @returns {Promise<Object>} Resultado com lista de conflitos
   */
  async checkConflicts(params) {
    try {
      const response = await apiClient.get('/therapist-availability/conflicts/check', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      throw error;
    }
  },

  // ================================================================
  // REAGENDAMENTO AUTOMÁTICO
  // ================================================================

  /**
   * Sugere horários alternativos para sessões conflitantes
   * @param {Object} data - Dados da solicitação
   * @param {Array} data.conflicts - Lista de sessões em conflito
   * @param {number} data.therapist_id - ID do terapeuta
   * @param {Object} data.search_params - Parâmetros de busca (opcional)
   * @returns {Promise<Object>} Sugestões de reagendamento
   */
  async suggestRescheduling(data) {
    try {
      const response = await apiClient.post('/therapist-availability/rescheduling/suggest', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar sugestões de reagendamento:', error);
      throw error;
    }
  },

  /**
   * Aplica reagendamento automático (admin apenas)
   * @param {Object} data - Plano de reagendamento
   * @param {Array} data.rescheduling_plan - Lista de reagendamentos
   * @returns {Promise<Object>} Resultado da operação
   */
  async applyRescheduling(data) {
    try {
      const response = await apiClient.post('/therapist-availability/rescheduling/apply', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao aplicar reagendamento:', error);
      throw error;
    }
  }
};

export default therapistAvailabilityApi;
