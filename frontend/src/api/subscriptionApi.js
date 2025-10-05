import axios from 'axios';
import API_BASE_URL from '../config';

const API_URL = `${API_BASE_URL}/subscription`;

/**
 * API para gerenciamento de assinaturas e planos
 */

/**
 * Buscar informações de assinatura da clínica do usuário logado
 */
export const getMySubscription = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/my-subscription`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar preços dos planos
 */
export const getPlanPrices = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/plan-prices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// ========================================
// SUPER ADMIN APIS
// ========================================

/**
 * Buscar todas assinaturas (SuperAdmin)
 */
export const getAllSubscriptions = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar estatísticas gerais (SuperAdmin)
 */
export const getSubscriptionStats = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar trials que expiram em breve (SuperAdmin)
 */
export const getExpiringTrials = async (daysAhead = 3) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/expiring-trials`, {
    params: { daysAhead },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar eventos de features bloqueadas (SuperAdmin)
 */
export const getBlockedFeatures = async (clinicId = null, limit = 50) => {
  const token = localStorage.getItem('token');
  const url = clinicId
    ? `${API_URL}/blocked-features/${clinicId}`
    : `${API_URL}/blocked-features`;

  const response = await axios.get(url, {
    params: { limit },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Atualizar plano de assinatura (SuperAdmin)
 */
export const updateSubscriptionPlan = async (clinicId, planName) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/clinic/${clinicId}/plan`,
    { planName },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/**
 * Ativar trial Pro (SuperAdmin)
 */
export const activateTrial = async (clinicId, durationDays = 7) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/clinic/${clinicId}/trial/activate`,
    { durationDays },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/**
 * Converter trial em Pro (SuperAdmin)
 */
export const convertTrial = async (clinicId) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/clinic/${clinicId}/trial/convert`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/**
 * Cancelar trial (SuperAdmin)
 */
export const cancelTrial = async (clinicId) => {
  const token = localStorage.getItem('token');
  const response = await axios.delete(`${API_URL}/clinic/${clinicId}/trial`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar histórico de trials (SuperAdmin)
 */
export const getTrialHistory = async (clinicId) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/clinic/${clinicId}/trial/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Buscar analytics de assinatura (SuperAdmin)
 */
export const getClinicAnalytics = async (clinicId, limit = 100) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/clinic/${clinicId}/analytics`, {
    params: { limit },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
