import { API_URL } from '../config';

const api = {
  put: async (url, data) => {
    const response = await fetch(`${API_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(error.message || 'Erro na requisição');
    }

    return response.json();
  }
};

/**
 * Atualiza as tentativas customizadas de uma atribuição específica
 * @param {number} assignmentId - ID da atribuição
 * @param {number|null} customTrials - Número de tentativas customizadas ou null para usar padrão
 * @returns {Promise<object>} Resposta da API
 */
export const updateCustomTrials = async (assignmentId, customTrials) => {
  try {
    const response = await api.put(`/assignments/${assignmentId}/custom-trials`, {
      customTrials: customTrials
    });
    return response;
  } catch (error) {
    console.error(`Erro ao atualizar tentativas customizadas (Assignment ${assignmentId}):`, error.message);
    throw error;
  }
};