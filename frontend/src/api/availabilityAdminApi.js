// frontend/src/api/availabilityAdminApi.js

import { API_URL } from '../config';

/**
 * API client para gerenciamento admin de disponibilidade de terapeutas
 */

/**
 * Obter visão geral de todos os terapeutas com informações de disponibilidade
 */
export const getTherapistsOverview = async () => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/availability/admin/therapists-overview`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro ao buscar visão geral de terapeutas');
  }

  return response.json();
};

/**
 * Atualizar permissões de disponibilidade de um terapeuta
 * @param {number} therapistId - ID do terapeuta
 * @param {Object} permissionsData - Dados das permissões
 * @param {string} permissionsData.contract_type - Tipo de contrato (freelancer/part_time/full_time)
 * @param {boolean} permissionsData.can_edit_own_schedule - Se pode editar a própria agenda
 * @param {number} permissionsData.default_weekly_hours - Horas semanais contratuais
 */
export const updateTherapistPermissions = async (therapistId, permissionsData) => {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}/availability/admin/therapists/${therapistId}/permissions`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(permissionsData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro ao atualizar permissões');
  }

  return response.json();
};

/**
 * Obter histórico de alterações de disponibilidade de um terapeuta
 * @param {number} therapistId - ID do terapeuta
 * @param {number} limit - Limite de registros (padrão: 50)
 */
export const getTherapistChangesLog = async (therapistId, limit = 50) => {
  const token = localStorage.getItem('token');

  const response = await fetch(
    `${API_URL}/availability/admin/therapists/${therapistId}/changes-log?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erro ao buscar histórico de alterações');
  }

  return response.json();
};
