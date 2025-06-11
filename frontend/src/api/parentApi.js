// frontend/src/api/parentApi.js

import axios from 'axios';

// A URL base da nossa API backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Cria os cabeçalhos de autorização para as requisições.
 * @param {string} token - O token JWT do utilizador.
 * @returns {object} - Objeto de cabeçalhos.
 */
const getAuthHeaders = (token) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

/**
 * Busca os dados necessários para o dashboard dos pais.
 * @param {string} token - O token JWT do utilizador pai.
 * @returns {Promise<object>} - Uma promessa que resolve para os dados do dashboard.
 */
export const fetchParentDashboardData = async (token) => {
  try {
    // <<< CORREÇÃO: O endpoint correto é '/dashboard', não '/dashboard-data' >>>
    const response = await axios.get(`${API_URL}/parent/dashboard`, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard parental:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar os dados de acompanhamento.');
  }
};
