// frontend/src/api/authApi.js

import axios from 'axios';

// A URL base da nossa API backend
const API_URL = 'http://localhost:3000/api';

/**
 * <<< NOVA FUNÇÃO >>>
 * Verifica o estado de um utilizador no backend para determinar o fluxo de login.
 * @param {string} username - O nome de utilizador a ser verificado.
 * @returns {Promise<object>} A resposta da API, contendo a ação a ser tomada.
 */
export const checkUser = async (username) => {
    try {
        const response = await axios.post(`${API_URL}/auth/check-user`, { username });
        return response.data; // ex: { action: 'SET_PASSWORD', user: {...} } ou { action: 'REQUIRE_PASSWORD' }
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao verificar utilizador.');
    }
};

/**
 * Tenta fazer login de um utilizador com username e senha.
 * @param {object} credentials - As credenciais { username, password }.
 * @returns {Promise<object>} A resposta da API.
 */
export const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data;
  } catch (error) {
    // Retorna a mensagem de erro específica do backend
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Erro ao tentar fazer login.');
  }
};

/**
 * Define a senha para um utilizador (usado no primeiro login do admin).
 * @param {number} userId - O ID do utilizador.
 * @param {string} password - A nova senha.
 * @returns {Promise<object>} A resposta da API.
 */
export const setPassword = async (userId, password) => {
    try {
        const response = await axios.post(`${API_URL}/auth/set-password`, { userId, password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível definir a senha.');
    }
};
