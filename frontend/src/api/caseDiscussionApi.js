import axios from 'axios';

import config from '../config';

const API_URL = `${config.API_BASE_URL}/discussions`;
/**
 * Cria e retorna os cabeçalhos de autenticação com o token do usuário.
 * @returns {object} Objeto com os cabeçalhos de autorização.
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error("Token de autenticação não encontrado.");
    return {};
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

/**
 * Busca as mensagens da discussão de um paciente específico.
 * @param {string|number} patientId - O ID do paciente.
 * @returns {Promise<Array>} Uma promessa que resolve para a lista de mensagens.
 */
export const getDiscussionMessages = async (patientId) => {
  if (!patientId) throw new Error("O ID do Paciente é obrigatório.");
  
  try {
    const response = await axios.get(`${API_URL}/patient/${patientId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Erro na API ao buscar mensagens da discussão:', error.response?.data || error.message);
    throw error.response?.data || new Error('Erro no servidor ao buscar mensagens da discussão.');
  }
};

/**
 * Posta uma nova mensagem na discussão de um caso.
 * @param {string|number} patientId - O ID do paciente.
 * @param {string} content - O conteúdo da mensagem.
 * @returns {Promise<object>} Uma promessa que resolve para o objeto da nova mensagem criada.
 */
export const createDiscussionMessage = async (patientId, content) => {
  if (!patientId || !content) throw new Error("ID do Paciente e conteúdo são obrigatórios.");

  try {
    const response = await axios.post(`${API_URL}/patient/${patientId}`, { content }, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Erro na API ao postar mensagem na discussão:', error.response?.data || error.message);
    throw error.response?.data || new Error('Erro no servidor ao postar mensagem na discussão.');
  }
};
