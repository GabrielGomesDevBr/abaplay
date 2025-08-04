import axios from 'axios';
import { API_URL } from '../config';

const CASE_DISCUSSION_API_URL = `${API_URL}/api/case-discussions`;

export const getCaseDiscussionMessages = async (patientId) => {
  try {
    const response = await axios.get(CASE_DISCUSSION_API_URL, { params: { patientId } });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar mensagens da discussão de caso:', error);
    throw error;
  }
};

export const postCaseDiscussionMessage = async (message, userId, patientId) => {
  try {
    const response = await axios.post(CASE_DISCUSSION_API_URL, { message, userId, patientId });
    return response.data;
  } catch (error) {
    console.error('Erro ao postar mensagem na discussão de caso:', error);
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