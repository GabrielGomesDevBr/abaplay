// frontend/src/api/schedulingApi.js

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
 * API para sistema de agendamento - Funcionalidades Administrativas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */

// --- APIS ADMINISTRATIVAS ---

/**
 * Criar novo agendamento - NOVA ESTRUTURA
 * @param {Object} appointmentData - Dados do agendamento
 * @param {number} appointmentData.patient_id - ID do paciente
 * @param {number} appointmentData.therapist_id - ID do terapeuta
 * @param {number} [appointmentData.discipline_id] - ID da disciplina (opcional)
 * @param {string} appointmentData.scheduled_date - Data (YYYY-MM-DD)
 * @param {string} appointmentData.scheduled_time - Horário (HH:MM)
 * @param {number} appointmentData.duration_minutes - Duração em minutos
 * @param {string} appointmentData.notes - Observações
 * @returns {Promise<Object>} Agendamento criado
 */
export const createAppointment = async (appointmentData) => {
  try {
    // Garantir que a data está no formato correto antes de enviar
    const normalizedData = {
      ...appointmentData,
      scheduled_date: normalizeDateYYYYMMDD(appointmentData.scheduled_date),
      patient_id: parseInt(appointmentData.patient_id),
      therapist_id: parseInt(appointmentData.therapist_id),
      discipline_id: appointmentData.discipline_id ? parseInt(appointmentData.discipline_id) : null
    };

    const response = await apiClient.post('/admin/scheduling/appointments', normalizedData);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao criar agendamento');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao criar agendamento');
  }
};

/**
 * Buscar agendamentos com filtros
 * @param {Object} filters - Filtros de busca
 * @param {number} filters.therapist_id - ID do terapeuta
 * @param {number} filters.patient_id - ID do paciente
 * @param {string} filters.status - Status do agendamento
 * @param {string} filters.start_date - Data inicial
 * @param {string} filters.end_date - Data final
 * @param {number} filters.page - Página
 * @param {number} filters.limit - Limite por página
 * @returns {Promise<Object>} Lista de agendamentos com paginação
 */
export const getAppointments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });

    const response = await apiClient.get(`/admin/scheduling/appointments?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao buscar agendamentos');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar agendamentos');
  }
};

/**
 * Buscar agendamento específico
 * @param {number} appointmentId - ID do agendamento
 * @returns {Promise<Object>} Dados do agendamento
 */
export const getAppointmentById = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/admin/scheduling/appointments/${appointmentId}`);
    return response.data;
  } catch (error) {
    console.error(`[SCHEDULING-API] Erro ao buscar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Agendamento não encontrado');
  }
};

/**
 * Atualizar agendamento
 * @param {number} appointmentId - ID do agendamento
 * @param {Object} updateData - Dados para atualizar
 * @returns {Promise<Object>} Agendamento atualizado
 */
export const updateAppointment = async (appointmentId, updateData) => {
  try {
    // Normalizar data se estiver sendo atualizada
    const normalizedData = { ...updateData };
    if (updateData.scheduled_date) {
      normalizedData.scheduled_date = normalizeDateYYYYMMDD(updateData.scheduled_date);
    }

    const response = await apiClient.put(`/admin/scheduling/appointments/${appointmentId}`, normalizedData);
    return response.data;
  } catch (error) {
    console.error(`[SCHEDULING-API] Erro ao atualizar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao atualizar agendamento');
  }
};

/**
 * Cancelar agendamento
 * @param {number} appointmentId - ID do agendamento
 * @param {string} reason - Motivo do cancelamento
 * @returns {Promise<Object>} Agendamento cancelado
 */
export const cancelAppointment = async (appointmentId, reason) => {
  try {
    const response = await apiClient.delete(`/admin/scheduling/appointments/${appointmentId}`, {
      data: { reason }
    });
    return response.data;
  } catch (error) {
    console.error(`[SCHEDULING-API] Erro ao cancelar agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao cancelar agendamento');
  }
};

/**
 * Remover agendamento permanentemente
 * @param {number} appointmentId - ID do agendamento
 * @returns {Promise<Object>} Confirmação da remoção
 */
export const deleteAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.delete(`/admin/scheduling/appointments/${appointmentId}/permanent`);
    return response.data;
  } catch (error) {
    console.error(`[SCHEDULING-API] Erro ao remover agendamento ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao remover agendamento');
  }
};

/**
 * Marcar agendamentos vencidos como perdidos
 * @param {number} hours_after - Horas após o agendamento
 * @returns {Promise<Object>} Lista de agendamentos marcados
 */
export const markMissedAppointments = async (hours_after = 24) => {
  try {
    const response = await apiClient.post('/admin/scheduling/mark-missed', { hours_after });
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao marcar agendamentos perdidos');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao marcar agendamentos perdidos');
  }
};

/**
 * Buscar estatísticas de agendamento da clínica
 * @param {string} start_date - Data inicial (opcional)
 * @param {string} end_date - Data final (opcional)
 * @returns {Promise<Object>} Estatísticas da clínica
 */
export const getClinicStatistics = async (start_date, end_date) => {
  try {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);

    const response = await apiClient.get(`/admin/scheduling/statistics?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao buscar estatísticas da clínica');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar estatísticas');
  }
};

// --- APIS GERAIS (ADMIN + TERAPEUTA) ---

/**
 * Justificar ausência em agendamento - SISTEMA CATEGORIZADO
 * @param {number} appointmentId - ID do agendamento
 * @param {Object} justificationData - Dados da justificativa
 * @param {string} justificationData.missed_reason_type - Categoria do motivo
 * @param {string} [justificationData.missed_reason_description] - Descrição detalhada
 * @returns {Promise<Object>} Agendamento com justificativa
 */
export const justifyAbsence = async (appointmentId, justificationData) => {
  try {
    const response = await apiClient.post(`/scheduling/justify-absence/${appointmentId}`, justificationData);
    return response.data;
  } catch (error) {
    console.error(`[SCHEDULING-API] Erro ao justificar ausência ID ${appointmentId}`);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao justificar ausência');
  }
};

// --- HELPERS E UTILITÁRIOS ---

/**
 * Formatar data para exibição
 * @param {string} dateString - Data em formato ISO
 * @returns {string} Data formatada (DD/MM/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Formatar horário para exibição
 * @param {string} timeString - Horário em formato HH:MM
 * @returns {string} Horário formatado
 */
export const formatTime = (timeString) => {
  if (!timeString) return '-';
  return timeString.slice(0, 5); // Remove segundos se houver
};

/**
 * Obter cor do badge baseado no status
 * @param {string} status - Status do agendamento
 * @returns {Object} Classes CSS para o badge
 */
export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return statusClasses[status] || 'bg-gray-100 text-gray-600';
};

/**
 * Obter texto do status em português
 * @param {string} status - Status em inglês
 * @returns {string} Status em português
 */
export const getStatusText = (status) => {
  const statusTexts = {
    scheduled: 'Agendado',
    completed: 'Realizado',
    missed: 'Não realizado',
    cancelled: 'Cancelado'
  };

  return statusTexts[status] || 'Desconhecido';
};

/**
 * Valida se um agendamento pode ser criado (não está no passado)
 * @param {string} scheduledDate - Data no formato YYYY-MM-DD
 * @param {string} scheduledTime - Horário no formato HH:MM
 * @param {number} toleranceMinutes - Tolerância em minutos (padrão: 5)
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateAppointmentDateTime = (scheduledDate, scheduledTime, toleranceMinutes = 5) => {
  try {
    // Validar formato das entradas
    if (!scheduledDate || !scheduledTime) {
      return {
        isValid: false,
        message: 'Data e horário são obrigatórios'
      };
    }

    // Validar formato da data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(scheduledDate)) {
      return {
        isValid: false,
        message: 'Data deve estar no formato YYYY-MM-DD'
      };
    }

    // Validar formato do horário (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime)) {
      return {
        isValid: false,
        message: 'Horário deve estar no formato HH:MM'
      };
    }

    // Construir data/hora do agendamento no fuso horário local
    // Evitar problemas de UTC vs local timezone
    const [year, month, day] = scheduledDate.split('-').map(Number);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0);

    // Verificar se a data é válida
    if (isNaN(appointmentDateTime.getTime())) {
      return {
        isValid: false,
        message: 'Data ou horário inválidos'
      };
    }

    // Obter momento atual com tolerância
    const now = new Date();
    const minimumDateTime = new Date(now.getTime() - (toleranceMinutes * 60 * 1000));

    // Validar se não está no passado (considerando tolerância)
    if (appointmentDateTime < minimumDateTime) {
      return {
        isValid: false,
        message: 'Não é possível agendar para datas passadas'
      };
    }

    // Validar se não está muito no futuro (máximo 1 ano)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (appointmentDateTime > oneYearFromNow) {
      return {
        isValid: false,
        message: 'Não é possível agendar com mais de 1 ano de antecedência'
      };
    }

    return {
      isValid: true,
      message: 'Data e horário válidos'
    };

  } catch (error) {
    return {
      isValid: false,
      message: 'Erro ao validar data/horário: ' + error.message
    };
  }
};

/**
 * Normaliza uma data para o formato YYYY-MM-DD
 * @param {string} dateInput - Data em qualquer formato comum
 * @returns {string} Data normalizada ou string vazia se inválida
 */
const normalizeDateYYYYMMDD = (dateInput) => {
  if (!dateInput || dateInput === null || dateInput === undefined) {
    return '';
  }

  // Converter para string se não for
  const dateStr = String(dateInput).trim();

  try {
    // Se já está no formato correto
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Se está no formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Se está no formato DD-MM-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Tentar parseamento direto
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  } catch (error) {
    console.error('[NORMALIZE-DATE] Erro ao normalizar:', dateStr, error);
    return '';
  }
};

/**
 * Validar dados de agendamento - NOVA ESTRUTURA
 * @param {Object} appointmentData - Dados do agendamento
 * @returns {Array} Lista de erros (vazia se válido)
 */
export const validateAppointmentData = (appointmentData) => {
  const errors = [];

  if (!appointmentData.patient_id) {
    errors.push('Paciente é obrigatório');
  }

  if (!appointmentData.therapist_id) {
    errors.push('Terapeuta é obrigatório');
  }

  if (!appointmentData.scheduled_date) {
    errors.push('Data do agendamento é obrigatória');
  }

  if (!appointmentData.scheduled_time) {
    errors.push('Horário do agendamento é obrigatório');
  }

  // Normalizar e validar data/hora
  if (appointmentData.scheduled_date && appointmentData.scheduled_time) {
    const normalizedDate = normalizeDateYYYYMMDD(appointmentData.scheduled_date);

    if (!normalizedDate) {
      errors.push('Formato de data inválido');
    } else {
      const dateTimeValidation = validateAppointmentDateTime(
        normalizedDate,
        appointmentData.scheduled_time
      );

      if (!dateTimeValidation.isValid) {
        errors.push(dateTimeValidation.message);
      }
    }
  }

  if (appointmentData.duration_minutes && (appointmentData.duration_minutes < 15 || appointmentData.duration_minutes > 240)) {
    errors.push('Duração deve estar entre 15 e 240 minutos');
  }

  return errors;
};

/**
 * Verificar se há conflito de horário
 * @param {Array} existingAppointments - Agendamentos existentes
 * @param {Object} newAppointment - Novo agendamento
 * @param {number} excludeId - ID do agendamento a excluir da verificação
 * @returns {boolean} True se há conflito
 */
export const checkTimeConflict = (existingAppointments, newAppointment, excludeId = null) => {
  const newStart = new Date(`${newAppointment.scheduled_date}T${newAppointment.scheduled_time}`);
  const newEnd = new Date(newStart.getTime() + (newAppointment.duration_minutes || 60) * 60000);

  return existingAppointments.some(appointment => {
    if (excludeId && appointment.id === excludeId) return false;
    if (appointment.status === 'cancelled') return false;
    if (appointment.scheduled_date !== newAppointment.scheduled_date) return false;

    const existingStart = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
    const existingEnd = new Date(existingStart.getTime() + (appointment.duration_minutes || 60) * 60000);

    return (newStart < existingEnd) && (newEnd > existingStart);
  });
};

// === NOVAS FUNCIONALIDADES PARA SESSÕES ÓRFÃS ===

/**
 * Buscar sessões órfãs (realizadas sem agendamento prévio)
 * @param {Object} filters - Filtros de busca
 * @returns {Promise<Object>} Lista de sessões órfãs
 */
export const getOrphanSessions = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await apiClient.get(`/admin/scheduling/orphan-sessions?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao buscar sessões órfãs');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao buscar sessões órfãs');
  }
};

/**
 * Executar detecção inteligente de sessões
 * @param {Object} detectionData - Parâmetros da detecção
 * @returns {Promise<Object>} Resultados da detecção
 */
export const runIntelligentDetection = async (detectionData) => {
  try {
    const response = await apiClient.post('/admin/scheduling/intelligent-detection', detectionData);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro na detecção inteligente');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro na detecção inteligente');
  }
};

/**
 * Criar agendamento retroativo para sessão órfã
 * @param {number} sessionId - ID da sessão
 * @param {Object} retroactiveData - Dados do agendamento retroativo
 * @returns {Promise<Object>} Agendamento criado
 */
export const createRetroactiveAppointment = async (sessionId, retroactiveData) => {
  try {
    const response = await apiClient.post(`/admin/scheduling/create-retroactive/${sessionId}`, retroactiveData);
    return response.data;
  } catch (error) {
    console.error('[SCHEDULING-API] Erro ao criar agendamento retroativo');
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao criar agendamento retroativo');
  }
};

// === UTILIDADES PARA SISTEMA DE JUSTIFICATIVAS ===

/**
 * Obter categorias disponíveis para justificativas
 * @returns {Array} Lista de categorias com valor e rótulo
 */
export const getMissedReasonCategories = () => {
  return [
    { value: 'patient_illness', label: 'Doença do Paciente' },
    { value: 'patient_travel', label: 'Viagem do Paciente' },
    { value: 'patient_no_show', label: 'Paciente Não Compareceu' },
    { value: 'patient_family_emergency', label: 'Emergência Familiar (Paciente)' },
    { value: 'therapist_illness', label: 'Doença do Terapeuta' },
    { value: 'therapist_emergency', label: 'Emergência do Terapeuta' },
    { value: 'therapist_training', label: 'Treinamento/Capacitação' },
    { value: 'clinic_closure', label: 'Fechamento da Clínica' },
    { value: 'equipment_failure', label: 'Falha de Equipamento' },
    { value: 'scheduling_error', label: 'Erro de Agendamento' },
    { value: 'other', label: 'Outros' }
  ];
};

/**
 * Obter rótulo de categoria de justificativa
 * @param {string} category - Categoria da justificativa
 * @returns {string} Rótulo em português
 */
export const getMissedReasonLabel = (category) => {
  const categories = getMissedReasonCategories();
  const found = categories.find(cat => cat.value === category);
  return found ? found.label : category;
};

const schedulingApi = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  markMissedAppointments,
  getClinicStatistics,
  justifyAbsence,
  // Novas funcionalidades
  getOrphanSessions,
  runIntelligentDetection,
  createRetroactiveAppointment,
  getMissedReasonCategories,
  getMissedReasonLabel,
  // Utilitários
  formatDate,
  formatTime,
  getStatusBadgeClass,
  getStatusText,
  validateAppointmentDateTime,
  validateAppointmentData,
  checkTimeConflict
};

export default schedulingApi;