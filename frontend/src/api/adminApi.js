// frontend/src/api/adminApi.js

import axios from 'axios';

// A URL base da nossa API backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Cria os cabeçalhos de autorização para as requisições de admin.
 * @param {string} token - O token JWT do utilizador administrador.
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

// --- Funções de Gestão de Utilizadores ---

export const fetchAllUsers = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/admin/users`, getAuthHeaders(token));
    return response.data.users || [];
  } catch (error) {
    // Erro ao buscar utilizadores
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar a lista de utilizadores.');
  }
};

export const createUser = async (userData, token) => {
  try {
    const response = await axios.post(`${API_URL}/admin/users`, userData, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    // Erro ao criar utilizador
    throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível criar o utilizador.');
  }
};

export const updateUser = async (userId, userData, token) => {
    try {
        const response = await axios.put(`${API_URL}/admin/users/${userId}`, userData, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        // Erro ao atualizar utilizador
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar o utilizador.');
    }
};

export const deleteUser = async (userId, token) => {
    try {
        const response = await axios.delete(`${API_URL}/admin/users/${userId}`, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        // Se o erro inclui requiresTransfer, lança erro especial
        if (error.response?.data?.requiresTransfer) {
            const err = new Error(error.response.data.errors?.[0]?.msg || 'Transferência necessária.');
            err.requiresTransfer = true;
            throw err;
        }
        // Erro genérico ao apagar utilizador
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível apagar o utilizador.');
    }
};

/**
 * <<< NOVA FUNÇÃO >>>
 * Busca todas as atribuições de um terapeuta específico.
 * @param {number} therapistId - O ID do terapeuta.
 * @param {string} token - O token JWT do utilizador admin.
 * @returns {Promise<object>} - Uma promessa que resolve para as atribuições do terapeuta.
 */
export const getTherapistAssignments = async (therapistId, token) => {
    try {
        const response = await axios.get(`${API_URL}/admin/users/${therapistId}/assignments`, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar as atribuições.');
    }
};

/**
 * <<< NOVA FUNÇÃO >>>
 * Transfere atribuições de um terapeuta para outros terapeutas.
 * @param {number} therapistId - O ID do terapeuta que está saindo.
 * @param {Array} transferList - Lista de transferências [{assignment_id, to_therapist_id}].
 * @param {string} token - O token JWT do utilizador admin.
 * @returns {Promise<object>} - Uma promessa que resolve para o resultado da transferência.
 */
export const transferTherapistAssignments = async (therapistId, transferList, token) => {
    try {
        const response = await axios.post(
            `${API_URL}/admin/users/${therapistId}/transfer`,
            { transferList },
            getAuthHeaders(token)
        );
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível transferir as atribuições.');
    }
};


// --- Funções de Gestão de Pacientes ---

export const fetchAllAdminPatients = async (token) => {
    try {
        const response = await axios.get(`${API_URL}/admin/patients`, getAuthHeaders(token));
        return response.data.patients || [];
    } catch (error) {
        // Erro ao buscar pacientes
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar a lista de pacientes.');
    }
};

export const createPatient = async (patientData, token) => {
    try {
        const response = await axios.post(`${API_URL}/admin/patients`, patientData, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        // Erro ao criar paciente
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível criar o paciente.');
    }
};

/**
 * <<< NOVA FUNÇÃO >>>
 * Apaga um paciente existente.
 * @param {number} patientId - O ID do paciente a ser apagado.
 * @param {string} token - O token JWT do utilizador admin.
 * @returns {Promise<object>} - Uma promessa que resolve para a resposta da API.
 */
export const deletePatient = async (patientId, token) => {
    try {
        const response = await axios.delete(`${API_URL}/admin/patients/${patientId}`, getAuthHeaders(token));
        return response.data; // Retorna { message }
    } catch (error) {
        // Erro ao apagar paciente
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível apagar o paciente.');
    }
};


// --- Funções de Gestão de Atribuições ---

export const getPatientAssignments = async (patientId, token) => {
    try {
        const response = await axios.get(`${API_URL}/admin/assignments/${patientId}`, getAuthHeaders(token));
        return response.data.therapists || [];
    } catch (error) {
        // Erro ao buscar atribuições
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar as atribuições.');
    }
};

export const updatePatientAssignments = async (patientId, therapistIds, token) => {
    try {
        const response = await axios.put(`${API_URL}/admin/assignments/${patientId}`, { therapistIds }, getAuthHeaders(token));
        return response.data;
    } catch (error) {
        // Erro ao atualizar atribuições
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível atualizar as atribuições.');
    }
};

/**
 * Busca todas as atribuições de programas da clínica para administradores.
 * @param {string} token - O token JWT do utilizador admin.
 * @returns {Promise<Array>} - Lista de todas as atribuições da clínica.
 */
export const fetchAllAssignments = async (token) => {
    try {
        const response = await axios.get(`${API_URL}/admin/assignments`, getAuthHeaders(token));
        return response.data.assignments || [];
    } catch (error) {
        // Erro ao buscar atribuições
        throw new Error(error.response?.data?.errors?.[0]?.msg || 'Não foi possível carregar a lista de atribuições.');
    }
};
