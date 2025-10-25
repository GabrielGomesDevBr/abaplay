// frontend/src/api/sessionLinkApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
});

// Interceptor para adicionar o token de autenticação
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * API para vinculação automática de sessões de programa aos agendamentos
 * Plano Pro: Integra patient_program_progress com scheduled_sessions
 */

const sessionLinkApi = {
  /**
   * Registra progresso de sessão com vinculação automática ao agendamento
   *
   * @param {Object} progressData - Dados da sessão
   * @param {number} progressData.assignment_id - ID da atribuição (programa designado)
   * @param {number} progressData.patient_id - ID do paciente
   * @param {number} progressData.step_id - ID do passo do programa
   * @param {string} progressData.session_date - Data da sessão (YYYY-MM-DD)
   * @param {number} progressData.attempts - Número de tentativas
   * @param {number} progressData.successes - Número de acertos
   * @param {Object} progressData.details - Detalhes adicionais (promptLevel, etc)
   * @param {string} progressData.notes - Observações
   * @param {boolean} progressData.create_retroactive - Se deve criar agendamento retroativo caso não encontre
   * @param {number} progressData.selected_appointment_id - ID do agendamento selecionado manualmente (opcional)
   *
   * @returns {Promise<Object>} Resposta com progresso e status de vinculação
   * - success: boolean
   * - progress: objeto do progresso criado
   * - linked: boolean (se foi vinculado)
   * - same_session: boolean (se foi vinculado a mesma sessão anterior - janela de 1h)
   * - ask_therapist: boolean (se deve perguntar ao terapeuta qual agendamento)
   * - available_appointments: array de agendamentos disponíveis (quando ask_therapist = true)
   * - appointment: objeto do agendamento (se vinculado)
   * - retroactive: boolean (se criou retroativo)
   * - suggest_retroactive: boolean (se sugere criar retroativo)
   * - delayed_registration: boolean (se registro foi feito > 4h após o agendamento)
   * - hours_since_appointment: number (horas desde o agendamento)
   * - message: string
   */
  recordProgressWithLink: async (progressData) => {
    try {
      const response = await apiClient.post('/assignments/progress-with-link', progressData);
      return response;
    } catch (error) {
      console.error('[API-ERROR] recordProgressWithLink:', error);
      throw error;
    }
  },

  /**
   * Registra progresso SEM vinculação (modo legado)
   * Útil para casos especiais onde não queremos vinculação automática
   */
  recordProgressOnly: async (progressData) => {
    try {
      const response = await apiClient.post('/assignments/progress', progressData);
      return response;
    } catch (error) {
      console.error('[API-ERROR] recordProgressOnly:', error);
      throw error;
    }
  },

  /**
   * ✅ NOVO: Busca agendamentos de hoje para um paciente
   * Usado para mostrar badge de agendamentos e pre-popular dados do modal
   *
   * @param {number} patient_id - ID do paciente
   * @returns {Promise<Object>} Resposta com agendamentos de hoje
   * - patient_id: number
   * - date: string (YYYY-MM-DD)
   * - count: number (quantidade de agendamentos ativos)
   * - appointments: array de agendamentos
   */
  getTodayAppointments: async (patient_id) => {
    try {
      const response = await apiClient.get(`/scheduling/patient/${patient_id}/today`);
      return response;
    } catch (error) {
      console.error('[API-ERROR] getTodayAppointments:', error);
      throw error;
    }
  }
};

export default sessionLinkApi;
