// frontend/src/api/authApi.js
import { API_URL } from '../config';

/**
 * <<< NOVA FUNÇÃO >>>
 * Verifica o estado de um utilizador no backend para determinar o fluxo de login.
 * @param {string} username - O nome de utilizador a ser verificado.
 * @returns {Promise<object>} A resposta da API, contendo a ação a ser tomada.
 */
export const checkUser = async (username) => {
  const response = await fetch(`${API_URL}/api/auth/check-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); // Tenta parsear o erro, senão usa objeto vazio
    throw new Error(errorData?.errors?.[0]?.msg || 'Erro ao verificar utilizador.');
  }

  return response.json();
};

/**
 * Tenta fazer login de um utilizador com username e senha.
 * @param {object} credentials - As credenciais { username, password }.
 * @returns {Promise<object>} A resposta da API.
 */
export const loginUser = async (credentials) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.errors?.[0]?.msg || 'Erro ao tentar fazer login.');
  }

  return response.json();
};

/**
 * Define a senha para um utilizador (usado no primeiro login do admin).
 * @param {number} userId - O ID do utilizador.
 * @param {string} password - A nova senha.
 * @returns {Promise<object>} A resposta da API.
 */
export const setPassword = async (userId, password) => {
  const response = await fetch(`${API_URL}/api/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.errors?.[0]?.msg || 'Não foi possível definir a senha.');
  }

  return response.json();
};