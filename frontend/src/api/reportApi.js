import { API_URL } from '../config';

/**
 * Buscar dados completos para relatório de evolução CFP
 */
export const getEvolutionReportData = async (patientId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/reports/evolution-data/${patientId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao buscar dados do relatório');
  }

  return response.json();
};

/**
 * Atualizar dados profissionais do usuário
 */
export const updateProfessionalData = async (professionalData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/reports/professional-data`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(professionalData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao atualizar dados profissionais');
  }

  return response.json();
};

/**
 * Atualizar dados complementares do paciente
 */
export const updatePatientData = async (patientId, patientData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/reports/patient-data/${patientId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patientData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao atualizar dados do paciente');
  }

  return response.json();
};

/**
 * Buscar análise automática baseada nos dados das sessões
 */
export const getAutomaticAnalysis = async (patientId, options = {}) => {
  const token = localStorage.getItem('token');
  
  const queryParams = new URLSearchParams();
  if (options.startDate) {
    queryParams.append('startDate', options.startDate);
  }
  if (options.endDate) {
    queryParams.append('endDate', options.endDate);
  }
  if (options.programIds && options.programIds.length > 0) {
    queryParams.append('programIds', options.programIds.join(','));
  }

  const response = await fetch(
    `${API_URL}/reports/automatic-analysis/${patientId}?${queryParams}`,
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
    throw new Error(errorData.error || 'Erro ao gerar análise automática');
  }

  return response.json();
};