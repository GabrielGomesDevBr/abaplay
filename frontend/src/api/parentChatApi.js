import axios from 'axios';

// URL base para os nossos novos endpoints do chat.
const API_URL = 'http://localhost:3000/api/parent-chat';

/**
 * Cria e retorna os cabeçalhos de autenticação com o token do usuário.
 * @returns {object} Objeto com os cabeçalhos de autorização.
 */
const getAuthHeaders = () => {
  // Pega o token armazenado no localStorage após o login.
  const token = localStorage.getItem('token');
  if (!token) {
    console.error("Token de autenticação não encontrado no localStorage.");
    // Retorna um objeto vazio se o token não for encontrado para evitar erros.
    return {};
  }
  return { headers: { Authorization: `Bearer ${token}` } };
};

/**
 * Busca o histórico de mensagens do chat para um paciente específico.
 * @param {string|number} patientId - O ID do paciente.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de mensagens.
 */
export const getMessages = async (patientId) => {
  if (!patientId) throw new Error("O ID do Paciente é obrigatório para buscar as mensagens.");
  
  try {
    const response = await axios.get(`${API_URL}/${patientId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Erro na API ao buscar mensagens do chat:', error.response?.data || error.message);
    // Lança o erro para que o componente que chamou a função possa tratá-lo.
    throw error.response?.data || new Error('Erro no servidor ao buscar mensagens.');
  }
};

/**
 * Envia uma nova mensagem para o chat de um paciente.
 * @param {string|number} patientId - O ID do paciente.
 * @param {string} message - O conteúdo da mensagem a ser enviada.
 * @returns {Promise<object>} Uma promessa que resolve para o objeto da nova mensagem criada.
 */
export const postMessage = async (patientId, message) => {
  if (!patientId || !message) throw new Error("ID do Paciente e conteúdo da mensagem são obrigatórios.");

  try {
    const response = await axios.post(`${API_URL}/${patientId}`, { message }, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Erro na API ao postar mensagem no chat:', error.response?.data || error.message);
    // Lança o erro para que o componente que chamou a função possa tratá-lo.
    throw error.response?.data || new Error('Erro no servidor ao postar mensagem.');
  }
};
