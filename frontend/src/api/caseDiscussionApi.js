import axios from 'axios';
import { API_URL } from '../config';

const CASE_DISCUSSION_API_URL = `${API_URL}/discussions`;

export const getCaseDiscussionMessages = async (patientId) => {
  try {
    // Buscando mensagens da discussão de caso
    const token = localStorage.getItem('token');
    const response = await axios.get(`${CASE_DISCUSSION_API_URL}/patient/${patientId}`, {
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

export const postCaseDiscussionMessage = async (patientId, content) => {
  try {
    // Enviando mensagem da discussão de caso
    const token = localStorage.getItem('token');
    const response = await axios.post(`${CASE_DISCUSSION_API_URL}/patient/${patientId}`,
      { content },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCaseDiscussionMessage = async (messageId, message) => {
  try {
    const response = await axios.put(`${CASE_DISCUSSION_API_URL}/${messageId}`, { message });
    return response.data;
  } catch (error) {
    // Erro ao atualizar mensagem da discussão de caso
    throw error;
  }
};

export const deleteCaseDiscussionMessage = async (messageId) => {
  try {
    const response = await axios.delete(`${CASE_DISCUSSION_API_URL}/${messageId}`);
    return response.data;
  } catch (error) {
    // Erro ao deletar mensagem da discussão de caso
    throw error;
  }
};