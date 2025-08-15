import axios from 'axios';
import { API_URL } from '../config';

/**
 * Atualiza o nível de prompting para uma atribuição específica
 * @param {number} assignmentId - ID da atribuição
 * @param {number} promptLevel - Nível de prompting (0-5)
 * @returns {Promise<object>} Resposta da API
 */
export const updatePromptLevel = async (assignmentId, promptLevel) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/prompt-levels/assignment/${assignmentId}`,
    { promptLevel },
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.data;
};

/**
 * Busca o nível de prompting atual para uma atribuição
 * @param {number} assignmentId - ID da atribuição
 * @returns {Promise<object>} Dados do nível atual
 */
export const getCurrentPromptLevel = async (assignmentId) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${API_URL}/prompt-levels/assignment/${assignmentId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.data;
};

/**
 * Busca o nível de prompting para um programa específico de um paciente
 * @param {number} patientId - ID do paciente
 * @param {number} programId - ID do programa
 * @returns {Promise<object>} Dados do nível atual
 */
export const getPromptLevelByPatientAndProgram = async (patientId, programId) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${API_URL}/prompt-levels/patient/${patientId}/program/${programId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return response.data;
};