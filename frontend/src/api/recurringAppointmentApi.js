// frontend/src/api/recurringAppointmentApi.js

import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar token de autenticação
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

// Interceptor para tratar respostas
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Log sanitizado para segurança
    console.error('[RECURRING-API] Erro na requisição:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    throw error.response?.data || error;
  }
);

/**
 * API para gerenciar templates de agendamentos recorrentes
 * Integrado com a estrutura atual do ABAplay
 */
export const recurringAppointmentApi = {

  // ==========================================
  // CRUD DE TEMPLATES
  // ==========================================

  /**
   * Criar novo template de recorrência
   * @param {Object} templateData - Dados do template
   * @returns {Promise<Object>} Template criado
   */
  async createTemplate(templateData) {
    return await apiClient.post('/admin/recurring-appointments', templateData);
  },

  /**
   * Listar templates da clínica
   * @param {Object} filters - Filtros opcionais
   * @returns {Promise<Array>} Lista de templates
   */
  async getTemplates(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/admin/recurring-appointments?${queryString}` : '/admin/recurring-appointments';

    return await apiClient.get(url);
  },

  /**
   * Buscar template por ID
   * @param {number} templateId - ID do template
   * @returns {Promise<Object>} Template completo
   */
  async getTemplateById(templateId) {
    return await apiClient.get(`/admin/recurring-appointments/${templateId}`);
  },

  /**
   * Atualizar template
   * @param {number} templateId - ID do template
   * @param {Object} updates - Dados para atualizar
   * @returns {Promise<Object>} Template atualizado
   */
  async updateTemplate(templateId, updates) {
    return await apiClient.put(`/admin/recurring-appointments/${templateId}`, updates);
  },

  /**
   * Desativar template permanentemente
   * @param {number} templateId - ID do template
   * @param {string} reason - Motivo da desativação
   * @returns {Promise<Object>} Resultado da operação
   */
  async deactivateTemplate(templateId, reason = 'Desativado pelo usuário') {
    return await apiClient.delete(`/admin/recurring-appointments/${templateId}`, {
      data: { reason }
    });
  },

  // ==========================================
  // AÇÕES ESPECÍFICAS
  // ==========================================

  /**
   * Gerar mais agendamentos de um template
   * @param {number} templateId - ID do template
   * @param {number} weeksAhead - Semanas à frente para gerar
   * @returns {Promise<Object>} Resultados da geração
   */
  async generateMoreAppointments(templateId, weeksAhead = 4) {
    return await apiClient.post(`/admin/recurring-appointments/${templateId}/generate`, {
      weeks_ahead: weeksAhead
    });
  },

  /**
   * Pausar template temporariamente
   * @param {number} templateId - ID do template
   * @param {string} reason - Motivo da pausa
   * @param {string} pauseUntil - Data até quando pausar (opcional)
   * @returns {Promise<Object>} Resultado da operação
   */
  async pauseTemplate(templateId, reason, pauseUntil = null) {
    return await apiClient.post(`/admin/recurring-appointments/${templateId}/pause`, {
      reason,
      pause_until: pauseUntil
    });
  },

  /**
   * Reativar template pausado
   * @param {number} templateId - ID do template
   * @returns {Promise<Object>} Resultado da operação
   */
  async resumeTemplate(templateId) {
    return await apiClient.post(`/admin/recurring-appointments/${templateId}/resume`);
  },

  /**
   * Buscar agendamentos de um template
   * @param {number} templateId - ID do template
   * @param {Object} options - Opções de busca
   * @returns {Promise<Object>} Agendamentos do template
   */
  async getTemplateAppointments(templateId, options = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ?
      `/admin/recurring-appointments/${templateId}/appointments?${queryString}` :
      `/admin/recurring-appointments/${templateId}/appointments`;

    return await apiClient.get(url);
  },

  // ==========================================
  // UTILITÁRIOS
  // ==========================================

  /**
   * Verificar conflitos potenciais
   * @param {Object} templateData - Dados do template para verificar
   * @returns {Promise<Object>} Informações sobre conflitos
   */
  async checkConflicts(templateData) {
    return await apiClient.post('/admin/recurring-appointments/check-conflicts', templateData);
  },

  /**
   * Executar job manual de geração para todos templates
   * @returns {Promise<Object>} Resultado do job
   */
  async generateAllPending() {
    return await apiClient.post('/admin/recurring-appointments/generate-all');
  },

  // ==========================================
  // FUNÇÕES DE PREVIEW E VALIDAÇÃO
  // ==========================================

  /**
   * Gerar preview de agendamentos recorrentes (sem criar)
   * @param {Object} templateData - Dados do template
   * @returns {Array} Lista de datas previstas
   */
  generatePreview(templateData) {
    const {
      start_date,
      end_date,
      recurrence_type,
      day_of_week,
      scheduled_time,
      generate_weeks_ahead = 4
    } = templateData;

    if (!start_date || !scheduled_time || day_of_week === undefined) {
      return [];
    }

    const preview = [];
    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : null;
    const maxWeeks = Math.min(generate_weeks_ahead, 12); // Limitar preview a 12 semanas

    let currentDate = new Date(startDate);

    // Encontrar a primeira ocorrência do dia da semana
    const targetDayOfWeek = parseInt(day_of_week);
    const currentDayOfWeek = currentDate.getDay();
    let dayDiff = targetDayOfWeek - currentDayOfWeek;

    if (dayDiff < 0) {
      dayDiff += 7;
    }

    currentDate.setDate(currentDate.getDate() + dayDiff);

    // Gerar datas baseadas no tipo de recorrência
    for (let i = 0; i < maxWeeks && preview.length < 20; i++) {
      if (endDate && currentDate > endDate) {
        break;
      }

      if (currentDate >= startDate) {
        preview.push({
          date: currentDate.toISOString().split('T')[0],
          formatted_date: currentDate.toLocaleDateString('pt-BR'),
          day_name: currentDate.toLocaleDateString('pt-BR', { weekday: 'long' }),
          time: scheduled_time,
          week_number: i + 1
        });
      }

      // Avançar para próxima ocorrência
      switch (recurrence_type) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setDate(currentDate.getDate() + 28); // Aproximação
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return preview;
  },

  /**
   * Validar dados do template antes de enviar
   * @param {Object} templateData - Dados para validar
   * @returns {Array} Lista de erros encontrados
   */
  validateTemplate(templateData) {
    const errors = [];

    if (!templateData.patient_id) {
      errors.push('Paciente é obrigatório');
    }

    if (!templateData.therapist_id) {
      errors.push('Terapeuta é obrigatório');
    }

    if (!templateData.recurrence_type) {
      errors.push('Tipo de recorrência é obrigatório');
    }

    if (templateData.day_of_week === undefined || templateData.day_of_week === '') {
      errors.push('Dia da semana é obrigatório');
    }

    if (!templateData.scheduled_time) {
      errors.push('Horário é obrigatório');
    }

    if (!templateData.start_date) {
      errors.push('Data de início é obrigatória');
    }

    // Validar data de início não pode ser no passado
    if (templateData.start_date) {
      const startDate = new Date(templateData.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.push('Data de início não pode ser no passado');
      }
    }

    // Validar data de fim deve ser posterior à data de início
    if (templateData.start_date && templateData.end_date) {
      const startDate = new Date(templateData.start_date);
      const endDate = new Date(templateData.end_date);

      if (endDate <= startDate) {
        errors.push('Data de fim deve ser posterior à data de início');
      }
    }

    // Validar horário
    if (templateData.scheduled_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(templateData.scheduled_time)) {
      errors.push('Horário deve estar no formato HH:MM');
    }

    return errors;
  },

  /**
   * Formatar descrição de recorrência para exibição
   * @param {Object} template - Dados do template
   * @returns {string} Descrição formatada
   */
  formatRecurrenceDescription(template) {
    const dayNames = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];

    const recurrenceTypes = {
      'weekly': 'Toda semana',
      'biweekly': 'A cada 2 semanas',
      'monthly': 'Todo mês'
    };

    const dayName = dayNames[template.day_of_week];
    const recurrenceType = recurrenceTypes[template.recurrence_type] || template.recurrence_type;

    let description = `${recurrenceType} às ${template.scheduled_time} (${dayName})`;

    if (template.discipline_name) {
      description += ` - ${template.discipline_name}`;
    } else {
      description += ' - Sessão geral';
    }

    if (template.duration_minutes && template.duration_minutes !== 60) {
      description += ` - ${template.duration_minutes} min`;
    }

    return description;
  }
};

export default recurringAppointmentApi;