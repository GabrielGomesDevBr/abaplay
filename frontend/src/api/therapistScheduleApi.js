// frontend/src/api/therapistScheduleApi.js

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
 * API para agenda dos terapeutas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */

/**
 * Buscar agenda pessoal do terapeuta
 * @param {Object} params - Parâmetros de busca
 * @param {string} params.start_date - Data inicial (YYYY-MM-DD)
 * @param {string} params.end_date - Data final (YYYY-MM-DD)
 * @param {number} params.days_ahead - Dias à frente para buscar
 * @returns {Promise<Object>} Agenda do terapeuta
 */
export const getPersonalSchedule = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const response = await apiClient.get(`/therapist/schedule?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao buscar agenda pessoal');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar agenda');
  }
};

/**
 * Buscar próximos agendamentos do terapeuta
 * @param {number} days_ahead - Dias à frente (padrão: 3)
 * @returns {Promise<Object>} Próximos agendamentos
 */
export const getUpcomingAppointments = async (days_ahead = 3) => {
  try {
    const response = await apiClient.get(`/therapist/schedule/upcoming?days_ahead=${days_ahead}`);
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao buscar próximos agendamentos');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar próximos agendamentos');
  }
};

/**
 * Buscar agendamentos do dia atual
 * @returns {Promise<Object>} Agendamentos de hoje
 */
export const getTodaySchedule = async () => {
  try {
    const response = await apiClient.get('/therapist/schedule/today');
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao buscar agenda de hoje');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar agenda de hoje');
  }
};

/**
 * Buscar agendamentos perdidos que precisam de justificativa
 * @param {boolean} include_justified - Incluir já justificados
 * @returns {Promise<Object>} Agendamentos perdidos
 */
export const getMissedAppointments = async (include_justified = false) => {
  try {
    const response = await apiClient.get(`/therapist/schedule/missed?include_justified=${include_justified}`);
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao buscar agendamentos perdidos');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar agendamentos perdidos');
  }
};

/**
 * Buscar estatísticas pessoais do terapeuta
 * @param {Object} params - Parâmetros da consulta
 * @param {string} params.start_date - Data inicial
 * @param {string} params.end_date - Data final
 * @param {string} params.period - Período (week, month, quarter)
 * @returns {Promise<Object>} Estatísticas do terapeuta
 */
export const getPersonalStatistics = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });

    const response = await apiClient.get(`/therapist/schedule/statistics?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao buscar estatísticas pessoais');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar estatísticas');
  }
};

/**
 * Buscar detalhes de um agendamento específico
 * @param {number} appointmentId - ID do agendamento
 * @returns {Promise<Object>} Detalhes do agendamento
 */
export const getAppointmentDetails = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/therapist/schedule/appointments/${appointmentId}`);
    return response.data;
  } catch (error) {
    console.error(`[THERAPIST-SCHEDULE-API] Erro ao buscar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Agendamento não encontrado');
  }
};

/**
 * Justificar agendamento perdido
 * @param {number} appointmentId - ID do agendamento
 * @param {Object} justificationData - Dados da justificativa
 * @param {string} justificationData.missed_reason - Motivo da falta
 * @param {string} justificationData.missed_by - Quem faltou
 * @returns {Promise<Object>} Agendamento com justificativa
 */
export const justifyMissedAppointment = async (appointmentId, justificationData) => {
  try {
    const response = await apiClient.post(`/therapist/schedule/justify/${appointmentId}`, justificationData);
    return response.data;
  } catch (error) {
    console.error(`[THERAPIST-SCHEDULE-API] Erro ao justificar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao justificar agendamento');
  }
};

/**
 * Marcar sessão como completa com anotações (Plano Agendamento)
 * @param {number} sessionId - ID da sessão
 * @param {string} notes - Anotações da sessão
 * @returns {Promise<Object>} Sessão atualizada
 */
export const completeSessionWithNotes = async (sessionId, notes) => {
  try {
    const response = await apiClient.put(`/therapist/schedule/sessions/${sessionId}/complete`, { notes });
    return response.data;
  } catch (error) {
    console.error(`[THERAPIST-SCHEDULE-API] Erro ao marcar sessão ID ${sessionId} como completa`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao marcar sessão como completa');
  }
};

/**
 * Criar e completar sessão em uma única chamada (sem agendamento prévio)
 * @param {Object} sessionData - Dados da sessão
 * @param {number} sessionData.patient_id - ID do paciente
 * @param {string} sessionData.scheduled_date - Data da sessão (YYYY-MM-DD)
 * @param {string} sessionData.scheduled_time - Horário da sessão (HH:MM)
 * @param {string} sessionData.notes - Anotações da sessão
 * @param {number} [sessionData.duration_minutes] - Duração em minutos (padrão: 60)
 * @param {number} [sessionData.discipline_id] - ID da disciplina (opcional)
 * @returns {Promise<Object>} Sessão criada e completada
 */
export const createAndCompleteSession = async (sessionData) => {
  try {
    const response = await apiClient.post('/therapist/schedule/sessions/create-and-complete', sessionData);
    return response.data;
  } catch (error) {
    console.error('[THERAPIST-SCHEDULE-API] Erro ao criar e completar sessão');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao registrar sessão');
  }
};

/**
 * Cancelar agendamento pelo terapeuta
 * @param {number} appointmentId - ID do agendamento
 * @param {Object} cancellationData - Dados do cancelamento
 * @param {string} cancellationData.cancellation_reason - Motivo do cancelamento
 * @param {string} [cancellationData.cancellation_notes] - Justificativa adicional
 * @returns {Promise<Object>} Agendamento cancelado
 */
export const cancelTherapistAppointment = async (appointmentId, cancellationData) => {
  try {
    const response = await apiClient.post(`/therapist/schedule/cancel/${appointmentId}`, cancellationData);
    return response.data;
  } catch (error) {
    console.error(`[THERAPIST-SCHEDULE-API] Erro ao cancelar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao cancelar agendamento');
  }
};

// --- HELPERS E UTILITÁRIOS ---

/**
 * Agrupar agendamentos por data
 * @param {Array} appointments - Lista de agendamentos
 * @returns {Object} Agendamentos agrupados por data
 */
export const groupAppointmentsByDate = (appointments) => {
  const grouped = {};

  appointments.forEach(appointment => {
    const date = appointment.scheduled_date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(appointment);
  });

  // Ordenar agendamentos dentro de cada data por horário
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
  });

  return grouped;
};

/**
 * Obter próximo agendamento
 * @param {Array} appointments - Lista de agendamentos
 * @returns {Object|null} Próximo agendamento ou null
 */
export const getNextAppointment = (appointments) => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const futureAppointments = appointments.filter(appointment => {
    if (appointment.status !== 'scheduled') return false;

    if (appointment.scheduled_date > currentDate) return true;
    if (appointment.scheduled_date === currentDate && appointment.scheduled_time > currentTime) return true;

    return false;
  });

  if (futureAppointments.length === 0) return null;

  // Ordenar por data e horário
  futureAppointments.sort((a, b) => {
    const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
    if (dateCompare !== 0) return dateCompare;
    return a.scheduled_time.localeCompare(b.scheduled_time);
  });

  return futureAppointments[0];
};

/**
 * Calcular estatísticas resumidas
 * @param {Array} appointments - Lista de agendamentos
 * @returns {Object} Estatísticas resumidas
 */
export const calculateSummaryStats = (appointments) => {
  const stats = {
    total: appointments.length,
    scheduled: 0,
    completed: 0,
    missed: 0,
    cancelled: 0,
    completion_rate: 0,
    attendance_rate: 0
  };

  appointments.forEach(appointment => {
    stats[appointment.status]++;
  });

  if (stats.total > 0) {
    stats.completion_rate = Math.round((stats.completed / stats.total) * 100);
  }

  const attendable = stats.total - stats.cancelled;
  if (attendable > 0) {
    stats.attendance_rate = Math.round((stats.completed / attendable) * 100);
  }

  return stats;
};

/**
 * Verificar se agendamento está atrasado
 * @param {Object} appointment - Agendamento
 * @returns {boolean} True se está atrasado
 */
export const isAppointmentOverdue = (appointment) => {
  if (appointment.status !== 'scheduled') return false;

  const now = new Date();
  const appointmentDateTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);

  return appointmentDateTime < now;
};

/**
 * Calcular tempo até o agendamento
 * @param {Object} appointment - Agendamento
 * @returns {string} Texto descritivo do tempo restante
 */
export const getTimeUntilAppointment = (appointment) => {
  const now = new Date();

  // Construir data/hora no fuso horário local (evitar problemas de UTC)
  const appointmentDateTime = (() => {
    try {
      const dateStr = appointment.scheduled_date;
      const timeStr = appointment.scheduled_time;

      if (!dateStr || !timeStr) return new Date();

      // Se a data for um objeto Date, converter para YYYY-MM-DD
      let normalizedDate = dateStr;
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
        // Se for ISO string, extrair apenas a data
        normalizedDate = dateStr.split('T')[0];
      }

      // Construir data no fuso horário local
      const [year, month, day] = normalizedDate.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0);
    } catch (error) {
      console.error('Erro ao processar data do agendamento:', error);
      return new Date();
    }
  })();

  const diffMs = appointmentDateTime - now;

  if (diffMs < 0) return 'Atrasado';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `Em ${diffDays} dia(s)`;
  } else if (diffHours > 0) {
    return `Em ${diffHours}h ${diffMinutes}min`;
  } else {
    return `Em ${diffMinutes} minutos`;
  }
};

/**
 * Formatar período para exibição
 * @param {string} start_date - Data inicial
 * @param {string} end_date - Data final
 * @returns {string} Período formatado
 */
export const formatPeriod = (start_date, end_date) => {
  if (!start_date || !end_date) return 'Período não definido';

  const startFormatted = new Date(start_date).toLocaleDateString('pt-BR');
  const endFormatted = new Date(end_date).toLocaleDateString('pt-BR');

  return `${startFormatted} a ${endFormatted}`;
};

/**
 * Obter cor para indicador de status da agenda
 * @param {number} completionRate - Taxa de conclusão (0-100)
 * @returns {string} Classe CSS da cor
 */
export const getPerformanceColor = (completionRate) => {
  if (completionRate >= 90) return 'text-green-600';
  if (completionRate >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const therapistScheduleApi = {
  getPersonalSchedule,
  getUpcomingAppointments,
  getTodaySchedule,
  getMissedAppointments,
  getPersonalStatistics,
  getAppointmentDetails,
  justifyMissedAppointment,
  cancelTherapistAppointment,
  groupAppointmentsByDate,
  getNextAppointment,
  calculateSummaryStats,
  isAppointmentOverdue,
  getTimeUntilAppointment,
  formatPeriod,
  getPerformanceColor
};

export default therapistScheduleApi;