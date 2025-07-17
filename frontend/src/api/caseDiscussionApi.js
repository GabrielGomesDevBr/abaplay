// Define a URL base da nossa API. Em um ambiente de produção,
// isso viria de uma variável de ambiente.
const API_URL = 'http://localhost:3000/api/discussions';

/**
 * Busca as mensagens da discussão de um paciente específico.
 * @param {string} patientId - O ID do paciente.
 * @param {string} token - O token JWT para autenticação.
 * @returns {Promise<Array<object>>} - Uma promessa que resolve para a lista de mensagens.
 */
export const getMessages = async (patientId, token) => {
  try {
    const response = await fetch(`${API_URL}/patient/${patientId}`, {
      method: 'GET',
      headers: {
        // O cabeçalho 'Authorization' é essencial para o middleware de autenticação no backend.
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Se a resposta não for 'OK' (status 200-299), lança um erro.
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors[0]?.msg || 'Falha ao buscar mensagens.');
    }

    // Retorna os dados da resposta em formato JSON.
    return await response.json();
  } catch (error) {
    console.error('Erro na API ao buscar mensagens:', error);
    // Lança o erro para que o componente que chamou a função possa tratá-lo.
    throw error;
  }
};

/**
 * Posta uma nova mensagem na discussão de um caso.
 * @param {string} patientId - O ID do paciente.
 * @param {string} content - O conteúdo da mensagem.
 * @param {string} token - O token JWT para autenticação.
 * @returns {Promise<object>} - Uma promessa que resolve para o objeto da nova mensagem criada.
 */
export const createMessage = async (patientId, content, token) => {
  try {
    const response = await fetch(`${API_URL}/patient/${patientId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // O corpo da requisição contém os dados da nova mensagem.
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors[0]?.msg || 'Falha ao criar mensagem.');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na API ao criar mensagem:', error);
    throw error;
  }
};
