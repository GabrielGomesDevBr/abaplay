import axios from 'axios';
import { API_URL } from '../config';

const PARENT_CHAT_API_URL = `${API_URL}/parent-chat`;

export const getChatMessages = async (patientId) => {
  try {
    console.log(`[PARENT-CHAT-LOG] getChatMessages: Buscando mensagens para paciente ${patientId}`);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${PARENT_CHAT_API_URL}/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log(`[PARENT-CHAT-LOG] getChatMessages: ${response.data.length} mensagens carregadas`);
    return response.data;
  } catch (error) {
    console.error('[PARENT-CHAT-LOG] getChatMessages: Erro -', error.response?.data || error.message);
    throw error;
  }
};

export const postChatMessage = async (messageData) => {
  try {
    console.log(`[PARENT-CHAT-LOG] postChatMessage: Enviando mensagem para paciente ${messageData.patient_id}`);
    const token = localStorage.getItem('token');
    const response = await axios.post(`${PARENT_CHAT_API_URL}/${messageData.patient_id}`, messageData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log('[PARENT-CHAT-LOG] postChatMessage: Mensagem enviada com sucesso');
    return response.data;
  } catch (error) {
    console.error('[PARENT-CHAT-LOG] postChatMessage: Erro -', error.response?.data || error.message);
    throw error;
  }
};