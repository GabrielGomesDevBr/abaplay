import axios from 'axios';

import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

// Cria uma instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para adicionar o token de autenticação automaticamente
api.interceptors.request.use(
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

const notificationApi = {
  // Busca todas as notificações do usuário
  getUserNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  },

  // Busca o total de mensagens não lidas
  getTotalUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/total-unread');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar total de não lidas:', error);
      throw error;
    }
  },

  // Marca mensagens como lidas
  markAsRead: async (patientId, chatType) => {
    try {
      const response = await api.post('/notifications/mark-read', {
        patientId,
        chatType
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
      throw error;
    }
  },

  // Busca notificações específicas de um paciente e tipo de chat
  getNotificationsByPatientAndType: async (patientId, chatType) => {
    try {
      const response = await api.get(`/notifications/patient/${patientId}?chatType=${chatType}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar notificações específicas:', error);
      throw error;
    }
  }
};

export default notificationApi;

