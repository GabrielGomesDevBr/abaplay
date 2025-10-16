import axios from 'axios';
import { API_URL } from '../config';

const PARENT_CHAT_API_URL = `${API_URL}/parent-chat`;

export const getChatMessages = async (patientId) => {
  try {
    // Buscando mensagens do chat
    const token = localStorage.getItem('token');
    const response = await axios.get(`${PARENT_CHAT_API_URL}/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const postChatMessage = async (messageData) => {
  try {
    // Enviando mensagem do chat
    const token = localStorage.getItem('token');
    const response = await axios.post(`${PARENT_CHAT_API_URL}/${messageData.patient_id}`, messageData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUnreadMessagesCount = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${PARENT_CHAT_API_URL}/unread-count`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return response.data.count || 0;
  } catch (error) {
    console.error('Erro ao buscar mensagens não lidas:', error);
    return 0;
  }
};

// ✅ NOVO: Buscar lista de conversas com mensagens não lidas (para prioridades)
export const getUnreadChats = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${PARENT_CHAT_API_URL}/unread-chats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    return response.data.chats || [];
  } catch (error) {
    console.error('Erro ao buscar conversas não lidas:', error);
    return [];
  }
};