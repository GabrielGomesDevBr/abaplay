import axios from 'axios';
import { API_URL } from '../config';

const CASE_DISCUSSION_API_URL = `${API_URL}/api/discussions`;

export const getCaseDiscussionMessages = async (patientId) => {
  try {
    console.log(`[CASE-DISCUSSION-LOG] getCaseDiscussionMessages: Buscando mensagens para paciente ${patientId}`);
    const token = localStorage.getItem('token');
    const response = await axios.get(`${CASE_DISCUSSION_API_URL}/patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    console.log(`[CASE-DISCUSSION-LOG] getCaseDiscussionMessages: ${response.data.length} mensagens carregadas`);
    return response.data;
  } catch (error) {
    console.error('[CASE-DISCUSSION-LOG] getCaseDiscussionMessages: Erro -', error.response?.data || error.message);
    throw error;
  }
};

export const postCaseDiscussionMessage = async (patientId, content) => {
  try {
    console.log(`[CASE-DISCUSSION-LOG] postCaseDiscussionMessage: Enviando mensagem para paciente ${patientId}`);
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
    console.log('[CASE-DISCUSSION-LOG] postCaseDiscussionMessage: Mensagem enviada com sucesso');
    return response.data;
  } catch (error) {
    console.error('[CASE-DISCUSSION-LOG] postCaseDiscussionMessage: Erro -', error.response?.data || error.message);
    throw error;
  }
};

export const updateCaseDiscussionMessage = async (messageId, message) => {
  try {
    const response = await axios.put(`${CASE_DISCUSSION_API_URL}/${messageId}`, { message });
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar mensagem da discussão de caso:', error);
    throw error;
  }
};

export const deleteCaseDiscussionMessage = async (messageId) => {
  try {
    const response = await axios.delete(`${CASE_DISCUSSION_API_URL}/${messageId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar mensagem da discussão de caso:', error);
    throw error;
  }
};