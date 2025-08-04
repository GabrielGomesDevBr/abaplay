import axios from 'axios';
import { API_URL } from '../config';

const PARENT_CHAT_API_URL = `${API_URL}/api/parent-chat`;

export const getChatMessages = async (patientId) => {
  try {
    const response = await axios.get(PARENT_CHAT_API_URL, { params: { patientId } });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar mensagens do chat:', error);
    throw error;
  }
};

export const postChatMessage = async (messageData) => {
  try {
    const response = await axios.post(PARENT_CHAT_API_URL, messageData);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem no chat:', error);
    throw error;
  }
};