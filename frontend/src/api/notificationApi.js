import axios from 'axios';
import { API_URL } from '../config';

const NOTIFICATION_API_URL = `${API_URL}/api/notifications`;

export const getNotifications = async (userId) => {
  try {
    const response = await axios.get(`${NOTIFICATION_API_URL}/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    throw error;
  }
};

export const markAsRead = async (notificationId) => {
  try {
    const response = await axios.put(`${NOTIFICATION_API_URL}/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
};