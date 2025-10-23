// frontend/src/api/availabilityApi.js

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
 * API para Sistema de Disponibilidade Inteligente
 * Implementação de busca de horários, especialidades, e gestão de disponibilidade
 */

// ========================================
// BUSCA DE DISPONIBILIDADE
// ========================================

/**
 * Buscar horários disponíveis com filtros
 * POST /api/availability/search
 * @param {Object} filters - Filtros de busca
 * @param {number} [filters.discipline_id] - ID da disciplina
 * @param {number} [filters.day_of_week] - Dia da semana (0=domingo, 6=sábado)
 * @param {string} [filters.time_period] - Período: 'morning', 'afternoon', 'evening', 'all'
 * @param {string} [filters.start_date] - Data inicial (YYYY-MM-DD)
 * @param {string} [filters.end_date] - Data final (YYYY-MM-DD)
 * @param {number} [filters.duration_minutes] - Duração desejada (padrão: 60)
 * @param {boolean} [filters.require_specialty] - Requer especialidade (padrão: false)
 * @param {number} [filters.preferred_therapist_id] - ID do terapeuta preferido
 * @param {number} [filters.patient_id] - ID do paciente (para preferências)
 * @returns {Promise<Object>} Lista de horários disponíveis
 */
export const searchAvailableSlots = async (filters = {}) => {
  try {
    const response = await apiClient.post('/availability/search', filters);
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao buscar disponibilidade');
    throw new Error(error.response?.data?.message || 'Erro ao buscar horários disponíveis');
  }
};

/**
 * Assistente de agendamento - sugestões inteligentes
 * POST /api/availability/suggest
 * @param {Object} params - Parâmetros da sugestão
 * @param {number} params.patient_id - ID do paciente
 * @param {Array<number>} params.disciplines - IDs das disciplinas necessárias
 * @param {string} [params.time_period] - Período preferido
 * @param {boolean} [params.require_specialty] - Requer especialidade (padrão: true)
 * @param {number} [params.max_suggestions_per_discipline] - Máximo de sugestões por disciplina
 * @returns {Promise<Object>} Sugestões agrupadas por disciplina
 */
export const suggestAppointments = async (params) => {
  try {
    const response = await apiClient.post('/availability/suggest', params);
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao gerar sugestões');
    throw new Error(error.response?.data?.message || 'Erro ao gerar sugestões de agendamento');
  }
};

// ========================================
// ESPECIALIDADES
// ========================================

/**
 * Obter especialidades de um terapeuta
 * GET /api/availability/therapists/:therapistId/specialties
 * @param {number} therapistId - ID do terapeuta
 * @returns {Promise<Object>} Lista de especialidades do terapeuta
 */
export const getTherapistSpecialties = async (therapistId) => {
  try {
    const response = await apiClient.get(`/availability/therapists/${therapistId}/specialties`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao buscar especialidades do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao buscar especialidades');
  }
};

/**
 * Atualizar especialidades de um terapeuta (admin only)
 * POST /api/availability/therapists/:therapistId/specialties
 * @param {number} therapistId - ID do terapeuta
 * @param {Array<Object>} specialties - Lista de especialidades
 * @param {number} specialties[].discipline_id - ID da disciplina
 * @param {boolean} [specialties[].main_specialty] - Se é especialidade principal
 * @param {number} [specialties[].years_of_experience] - Anos de experiência
 * @returns {Promise<Object>} Confirmação da atualização
 */
export const updateTherapistSpecialties = async (therapistId, specialties) => {
  try {
    const response = await apiClient.post(`/availability/therapists/${therapistId}/specialties`, {
      specialties
    });
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao atualizar especialidades do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao atualizar especialidades');
  }
};

// ========================================
// DISPONIBILIDADE PADRÃO
// ========================================

/**
 * Obter horários de trabalho padrão de um terapeuta
 * GET /api/availability/therapists/:therapistId/availability
 * @param {number} therapistId - ID do terapeuta
 * @returns {Promise<Object>} Horários padrão de trabalho
 */
export const getTherapistAvailability = async (therapistId) => {
  try {
    const response = await apiClient.get(`/availability/therapists/${therapistId}/availability`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao buscar disponibilidade do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao buscar horários de trabalho');
  }
};

/**
 * Definir horários de trabalho padrão (admin only)
 * POST /api/availability/therapists/:therapistId/availability
 * @param {number} therapistId - ID do terapeuta
 * @param {Array<Object>} schedules - Lista de horários
 * @param {number} schedules[].day_of_week - Dia da semana (0-6)
 * @param {string} schedules[].start_time - Horário inicial (HH:MM)
 * @param {string} schedules[].end_time - Horário final (HH:MM)
 * @param {string} [schedules[].notes] - Observações
 * @returns {Promise<Object>} Confirmação da atualização
 */
export const setTherapistAvailability = async (therapistId, schedules) => {
  try {
    const response = await apiClient.post(`/availability/therapists/${therapistId}/availability`, {
      schedules
    });
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao definir disponibilidade do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao definir horários de trabalho');
  }
};

// ========================================
// AUSÊNCIAS
// ========================================

/**
 * Criar ausência/férias (admin only)
 * POST /api/availability/therapists/:therapistId/absences
 * @param {number} therapistId - ID do terapeuta
 * @param {Object} absenceData - Dados da ausência
 * @param {string} absenceData.absence_type - Tipo: 'vacation', 'sick_leave', 'training', 'other'
 * @param {string} absenceData.start_date - Data inicial (YYYY-MM-DD)
 * @param {string} absenceData.end_date - Data final (YYYY-MM-DD)
 * @param {string} [absenceData.start_time] - Horário inicial (HH:MM) - para ausência parcial
 * @param {string} [absenceData.end_time] - Horário final (HH:MM) - para ausência parcial
 * @param {string} [absenceData.reason] - Motivo da ausência
 * @returns {Promise<Object>} Ausência criada
 */
export const createAbsence = async (therapistId, absenceData) => {
  try {
    const response = await apiClient.post(`/availability/therapists/${therapistId}/absences`, absenceData);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao criar ausência do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao registrar ausência');
  }
};

/**
 * Listar ausências de um terapeuta
 * GET /api/availability/therapists/:therapistId/absences
 * @param {number} therapistId - ID do terapeuta
 * @param {boolean} [futureOnly=true] - Mostrar apenas ausências futuras
 * @returns {Promise<Object>} Lista de ausências
 */
export const getAbsences = async (therapistId, futureOnly = true) => {
  try {
    const params = new URLSearchParams();
    params.append('future_only', futureOnly);

    const response = await apiClient.get(`/availability/therapists/${therapistId}/absences?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao buscar ausências do terapeuta ${therapistId}`);
    throw new Error(error.response?.data?.message || 'Erro ao buscar ausências');
  }
};

/**
 * Cancelar ausência (admin only)
 * DELETE /api/availability/absences/:absenceId
 * @param {number} absenceId - ID da ausência
 * @returns {Promise<Object>} Confirmação do cancelamento
 */
export const deleteAbsence = async (absenceId) => {
  try {
    const response = await apiClient.delete(`/availability/absences/${absenceId}`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao cancelar ausência ${absenceId}`);
    throw new Error(error.response?.data?.message || 'Erro ao cancelar ausência');
  }
};

// ========================================
// SALAS
// ========================================

/**
 * Listar salas da clínica
 * GET /api/availability/rooms
 * @param {boolean} [activeOnly=true] - Mostrar apenas salas ativas
 * @returns {Promise<Object>} Lista de salas
 */
export const getRooms = async (activeOnly = true) => {
  try {
    const params = new URLSearchParams();
    params.append('active_only', activeOnly);

    const response = await apiClient.get(`/availability/rooms?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao buscar salas');
    throw new Error(error.response?.data?.message || 'Erro ao buscar salas');
  }
};

/**
 * Verificar salas disponíveis em determinado horário
 * GET /api/availability/rooms/available
 * @param {string} date - Data (YYYY-MM-DD)
 * @param {string} time - Horário (HH:MM)
 * @param {number} [duration=60] - Duração em minutos
 * @returns {Promise<Object>} Salas disponíveis
 */
export const getAvailableRooms = async (date, time, duration = 60) => {
  try {
    const params = new URLSearchParams();
    params.append('date', date);
    params.append('time', time);
    params.append('duration', duration);

    const response = await apiClient.get(`/availability/rooms/available?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao buscar salas disponíveis');
    throw new Error(error.response?.data?.message || 'Erro ao buscar salas disponíveis');
  }
};

/**
 * Criar sala (admin only)
 * POST /api/availability/rooms
 * @param {Object} roomData - Dados da sala
 * @param {string} roomData.name - Nome da sala
 * @param {string} [roomData.room_type] - Tipo: 'therapy', 'observation', 'sensory', 'meeting', 'other'
 * @param {number} [roomData.capacity] - Capacidade (padrão: 1)
 * @param {boolean} [roomData.has_mirror] - Possui espelho (padrão: false)
 * @param {boolean} [roomData.has_sensory_equipment] - Possui equipamentos sensoriais (padrão: false)
 * @param {string} [roomData.equipment_notes] - Observações sobre equipamentos
 * @returns {Promise<Object>} Sala criada
 */
export const createRoom = async (roomData) => {
  try {
    const response = await apiClient.post('/availability/rooms', roomData);
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao criar sala');
    throw new Error(error.response?.data?.message || 'Erro ao criar sala');
  }
};

/**
 * Atualizar sala (admin only)
 * PUT /api/availability/rooms/:roomId
 * @param {number} roomId - ID da sala
 * @param {Object} roomData - Dados para atualizar
 * @returns {Promise<Object>} Sala atualizada
 */
export const updateRoom = async (roomId, roomData) => {
  try {
    const response = await apiClient.put(`/availability/rooms/${roomId}`, roomData);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao atualizar sala ${roomId}`);
    throw new Error(error.response?.data?.message || 'Erro ao atualizar sala');
  }
};

/**
 * Desativar sala (admin only)
 * DELETE /api/availability/rooms/:roomId
 * @param {number} roomId - ID da sala
 * @returns {Promise<Object>} Confirmação da desativação
 */
export const deleteRoom = async (roomId) => {
  try {
    const response = await apiClient.delete(`/availability/rooms/${roomId}`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao desativar sala ${roomId}`);
    throw new Error(error.response?.data?.message || 'Erro ao desativar sala');
  }
};

// ========================================
// PREFERÊNCIAS PACIENTE-TERAPEUTA
// ========================================

/**
 * Obter preferências de um paciente
 * GET /api/availability/patients/:patientId/preferences
 * @param {number} patientId - ID do paciente
 * @returns {Promise<Object>} Preferências do paciente
 */
export const getPatientPreferences = async (patientId) => {
  try {
    const response = await apiClient.get(`/availability/patients/${patientId}/preferences`);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao buscar preferências do paciente ${patientId}`);
    throw new Error(error.response?.data?.message || 'Erro ao buscar preferências');
  }
};

/**
 * Definir preferência paciente-terapeuta (admin only)
 * POST /api/availability/patients/:patientId/preferences
 * @param {number} patientId - ID do paciente
 * @param {Object} preferenceData - Dados da preferência
 * @param {number} preferenceData.therapist_id - ID do terapeuta
 * @param {string} preferenceData.preference_type - Tipo: 'preferred', 'neutral', 'avoid'
 * @param {string} [preferenceData.notes] - Observações
 * @returns {Promise<Object>} Preferência definida
 */
export const setPatientPreference = async (patientId, preferenceData) => {
  try {
    const response = await apiClient.post(`/availability/patients/${patientId}/preferences`, preferenceData);
    return response.data;
  } catch (error) {
    console.error(`[AVAILABILITY-API] Erro ao definir preferência do paciente ${patientId}`);
    throw new Error(error.response?.data?.message || 'Erro ao definir preferência');
  }
};

// ========================================
// CONFIGURAÇÕES DE DISCIPLINA
// ========================================

/**
 * Obter configurações de disciplinas da clínica
 * GET /api/availability/clinic/discipline-settings
 * @returns {Promise<Object>} Configurações de disciplinas
 */
export const getDisciplineSettings = async () => {
  try {
    const response = await apiClient.get('/availability/clinic/discipline-settings');
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao buscar configurações de disciplinas');
    throw new Error(error.response?.data?.message || 'Erro ao buscar configurações');
  }
};

/**
 * Configurar duração padrão por disciplina (admin only)
 * POST /api/availability/clinic/discipline-settings
 * @param {Array<Object>} settings - Lista de configurações
 * @param {number} settings[].discipline_id - ID da disciplina
 * @param {number} settings[].default_session_duration - Duração padrão em minutos
 * @param {Array<number>} [settings[].allowed_durations] - Durações permitidas
 * @returns {Promise<Object>} Confirmação da atualização
 */
export const setDisciplineSettings = async (settings) => {
  try {
    const response = await apiClient.post('/availability/clinic/discipline-settings', { settings });
    return response.data;
  } catch (error) {
    console.error('[AVAILABILITY-API] Erro ao atualizar configurações de disciplinas');
    throw new Error(error.response?.data?.message || 'Erro ao atualizar configurações');
  }
};

// ========================================
// UTILIDADES E HELPERS
// ========================================

/**
 * Obter rótulo do período do dia
 * @param {string} period - Período: 'morning', 'afternoon', 'evening', 'all'
 * @returns {string} Rótulo em português
 */
export const getTimePeriodLabel = (period) => {
  const labels = {
    morning: 'Manhã (6h-12h)',
    afternoon: 'Tarde (12h-18h)',
    evening: 'Noite (18h-21h)',
    all: 'Todos os períodos'
  };
  return labels[period] || period;
};

/**
 * Obter rótulo do dia da semana
 * @param {number} dayOfWeek - Dia da semana (0=domingo, 6=sábado)
 * @returns {string} Nome do dia em português
 */
export const getDayOfWeekLabel = (dayOfWeek) => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayOfWeek] || '';
};

/**
 * Obter rótulo do tipo de ausência
 * @param {string} absenceType - Tipo de ausência
 * @returns {string} Rótulo em português
 */
export const getAbsenceTypeLabel = (absenceType) => {
  const types = {
    vacation: 'Férias',
    sick_leave: 'Atestado Médico',
    training: 'Treinamento',
    personal: 'Pessoal',
    other: 'Outros'
  };
  return types[absenceType] || absenceType;
};

/**
 * Obter rótulo do tipo de preferência
 * @param {string} preferenceType - Tipo de preferência
 * @returns {string} Rótulo em português
 */
export const getPreferenceTypeLabel = (preferenceType) => {
  const types = {
    preferred: 'Preferido',
    neutral: 'Neutro',
    avoid: 'Evitar'
  };
  return types[preferenceType] || preferenceType;
};

/**
 * Obter cor da badge de preferência
 * @param {string} preferenceType - Tipo de preferência
 * @returns {string} Classes CSS do Tailwind
 */
export const getPreferenceBadgeClass = (preferenceType) => {
  const classes = {
    preferred: 'bg-green-100 text-green-800',
    neutral: 'bg-gray-100 text-gray-600',
    avoid: 'bg-red-100 text-red-800'
  };
  return classes[preferenceType] || 'bg-gray-100 text-gray-600';
};

/**
 * Formatar horário para exibição
 * @param {string} timeString - Horário em formato HH:MM ou HH:MM:SS
 * @returns {string} Horário formatado (HH:MM)
 */
export const formatTime = (timeString) => {
  if (!timeString) return '-';
  return timeString.slice(0, 5);
};

/**
 * Validar dados de ausência
 * @param {Object} absenceData - Dados da ausência
 * @returns {Array<string>} Lista de erros (vazia se válido)
 */
export const validateAbsenceData = (absenceData) => {
  const errors = [];

  if (!absenceData.absence_type) {
    errors.push('Tipo de ausência é obrigatório');
  }

  if (!absenceData.start_date) {
    errors.push('Data inicial é obrigatória');
  }

  if (!absenceData.end_date) {
    errors.push('Data final é obrigatória');
  }

  if (absenceData.start_date && absenceData.end_date) {
    const startDate = new Date(absenceData.start_date);
    const endDate = new Date(absenceData.end_date);

    if (endDate < startDate) {
      errors.push('Data final deve ser posterior à data inicial');
    }
  }

  // Se tem horário inicial, deve ter horário final também
  if ((absenceData.start_time && !absenceData.end_time) ||
      (!absenceData.start_time && absenceData.end_time)) {
    errors.push('Horário inicial e final devem ser preenchidos juntos');
  }

  return errors;
};

/**
 * Validar dados de sala
 * @param {Object} roomData - Dados da sala
 * @returns {Array<string>} Lista de erros (vazia se válido)
 */
export const validateRoomData = (roomData) => {
  const errors = [];

  if (!roomData.name || roomData.name.trim() === '') {
    errors.push('Nome da sala é obrigatório');
  }

  if (roomData.capacity && (roomData.capacity < 1 || roomData.capacity > 10)) {
    errors.push('Capacidade deve estar entre 1 e 10');
  }

  return errors;
};

const availabilityApi = {
  // Busca de disponibilidade
  searchAvailableSlots,
  suggestAppointments,

  // Especialidades
  getTherapistSpecialties,
  updateTherapistSpecialties,

  // Disponibilidade padrão
  getTherapistAvailability,
  setTherapistAvailability,

  // Ausências
  createAbsence,
  getAbsences,
  deleteAbsence,

  // Salas
  getRooms,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,

  // Preferências
  getPatientPreferences,
  setPatientPreference,

  // Configurações
  getDisciplineSettings,
  setDisciplineSettings,

  // Utilidades
  getTimePeriodLabel,
  getDayOfWeekLabel,
  getAbsenceTypeLabel,
  getPreferenceTypeLabel,
  getPreferenceBadgeClass,
  formatTime,
  validateAbsenceData,
  validateRoomData
};

export default availabilityApi;
