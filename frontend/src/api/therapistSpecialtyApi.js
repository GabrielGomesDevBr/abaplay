// frontend/src/api/therapistSpecialtyApi.js

import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
  baseURL: API_URL,
});

// Interceptor para adicionar o token JWT a cada requisição
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * API client para gerenciar especialidades dos terapeutas
 */
const therapistSpecialtyApi = {
  /**
   * Busca todas as especialidades de um terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @returns {Promise<Array>} Lista de especialidades
   */
  async getTherapistSpecialties(therapistId) {
    try {
      const response = await apiClient.get(`/therapists/${therapistId}/specialties`);
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar especialidades do terapeuta:', error);
      throw error;
    }
  },

  /**
   * Adiciona uma nova especialidade ao terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} specialtyData - Dados da especialidade
   * @param {number} specialtyData.discipline_id - ID da disciplina
   * @param {string} specialtyData.certification_date - Data de certificação (opcional)
   * @param {string} specialtyData.notes - Observações (opcional)
   * @returns {Promise<Object>} Especialidade criada
   */
  async addTherapistSpecialty(therapistId, specialtyData) {
    try {
      const response = await apiClient.post(
        `/therapists/${therapistId}/specialties`,
        specialtyData
      );
      return response.data.data;
    } catch (error) {
      console.error('Erro ao adicionar especialidade:', error);
      throw error;
    }
  },

  /**
   * Atualiza informações de uma especialidade
   * @param {number} therapistId - ID do terapeuta
   * @param {number} disciplineId - ID da disciplina
   * @param {Object} updateData - Dados para atualizar
   * @returns {Promise<Object>} Especialidade atualizada
   */
  async updateTherapistSpecialty(therapistId, disciplineId, updateData) {
    try {
      const response = await apiClient.put(
        `/therapists/${therapistId}/specialties/${disciplineId}`,
        updateData
      );
      return response.data.data;
    } catch (error) {
      console.error('Erro ao atualizar especialidade:', error);
      throw error;
    }
  },

  /**
   * Remove uma especialidade do terapeuta
   * @param {number} therapistId - ID do terapeuta
   * @param {number} disciplineId - ID da disciplina
   * @returns {Promise<boolean>} True se removeu com sucesso
   */
  async removeTherapistSpecialty(therapistId, disciplineId) {
    try {
      await apiClient.delete(`/therapists/${therapistId}/specialties/${disciplineId}`);
      return true;
    } catch (error) {
      console.error('Erro ao remover especialidade:', error);
      throw error;
    }
  }
};

export default therapistSpecialtyApi;
