// frontend/src/api/enterpriseApi.js

import { API_URL } from '../config';
import axios from 'axios';

const API_BASE_URL = API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/super-admin/enterprise`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador para adicionar token automaticamente
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador para tratar respostas
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erro na API Enterprise:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Busca dashboard executivo completo com KPIs avançados
 */
export const getExecutiveDashboard = async () => {
  try {
    const response = await apiClient.get('/dashboard');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar dashboard executivo:', error);
    throw error;
  }
};

/**
 * Busca Customer Health Score detalhado com filtros
 */
export const getCustomerHealth = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.segment) params.append('segment', filters.segment);
    if (filters.risk_level) params.append('risk_level', filters.risk_level);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.order) params.append('order', filters.order);

    const response = await apiClient.get(`/customer-health?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar customer health:', error);
    throw error;
  }
};

/**
 * Busca análise de coortes (cohort analysis)
 */
export const getCohortAnalysis = async () => {
  try {
    const response = await apiClient.get('/cohort-analysis');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar análise de coortes:', error);
    throw error;
  }
};

/**
 * Busca análise preditiva de churn
 */
export const getChurnPrediction = async () => {
  try {
    const response = await apiClient.get('/churn-prediction');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar predição de churn:', error);
    throw error;
  }
};

/**
 * Busca oportunidades de expansão e crescimento
 */
export const getExpansionOpportunities = async () => {
  try {
    const response = await apiClient.get('/expansion-opportunities');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar oportunidades de expansão:', error);
    throw error;
  }
};

/**
 * Busca relatório executivo mensal
 */
export const getExecutiveReport = async (month = null) => {
  try {
    const params = month ? `?month=${month}` : '';
    const response = await apiClient.get(`/executive-report${params}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar relatório executivo:', error);
    throw error;
  }
};