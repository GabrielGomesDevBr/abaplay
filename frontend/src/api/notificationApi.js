import axios from 'axios';
import { API_URL } from '../config';

const NOTIFICATION_API_URL = `${API_URL}/notifications`;

export const getNotifications = async (userId) => {
  try {
    console.log('[NOTIFICATION-LOG] getNotifications: Buscando para userId:', userId);
    const token = localStorage.getItem('token');
    const response = await axios.get(NOTIFICATION_API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('[NOTIFICATION-LOG] getNotifications: Sucesso');
    return response.data;
  } catch (error) {
    console.error('[NOTIFICATION-LOG] getNotifications: Erro -', error.response?.data || error.message);
    throw error;
  }
};

export const markAsRead = async (patientId, chatType) => {
  try {
    console.log('[NOTIFICATION-LOG] markAsRead: Marcando como lida - patientId:', patientId, 'chatType:', chatType);
    const token = localStorage.getItem('token');
    const response = await axios.post(`${NOTIFICATION_API_URL}/mark-read`, 
      { patientId, chatType },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    console.log('[NOTIFICATION-LOG] markAsRead: Sucesso');
    return response.data;
  } catch (error) {
    console.error('[NOTIFICATION-LOG] markAsRead: Erro -', error.response?.data || error.message);
    throw error;
  }
};