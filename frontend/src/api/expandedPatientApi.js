// frontend/src/api/expandedPatientApi.js

import axios from 'axios';
import { API_URL } from '../config';

const apiClient = axios.create({
    baseURL: API_URL,
});

// Interceptor para adicionar token de autenticação
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('[EXPANDED-API] Token do localStorage:', token ? `${token.substring(0, 20)}...` : 'null');

        if (token && token !== 'test' && token.length > 10) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.error('[EXPANDED-API] Token inválido detectado:', token);
            // Redirecionar para login se token inválido
            localStorage.removeItem('token');
            window.location.href = '/login';
            return Promise.reject(new Error('Token inválido'));
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para tratar respostas
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error('[EXPANDED-API] Erro na requisição:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.response?.data?.message || error.message
        });

        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        throw error.response?.data || error;
    }
);

/**
 * API para gerenciar dados expandidos de pacientes
 * Apenas administradores têm acesso a estas funcionalidades
 */
export const expandedPatientApi = {

    // ==========================================
    // BUSCAR DADOS EXPANDIDOS
    // ==========================================

    /**
     * Buscar dados expandidos de um paciente
     * @param {number} patientId - ID do paciente
     * @returns {Promise<Object>} Dados completos expandidos
     */
    async getExpandedData(patientId) {
        try {
            console.log(`[EXPANDED-API] Buscando dados expandidos para paciente ${patientId}`);
            const response = await apiClient.get(`/patients/${patientId}/expanded`);
            console.log(`[EXPANDED-API] Dados expandidos carregados com sucesso`);
            return response;
        } catch (error) {
            console.error(`[EXPANDED-API] Erro ao buscar dados expandidos:`, error);
            throw error;
        }
    },

    // FUNÇÃO REMOVIDA: checkCompleteness
    // Motivo: Funcionalidade de completude removida - todos os campos são opcionais

    // ==========================================
    // ATUALIZAR DADOS EXPANDIDOS
    // ==========================================

    /**
     * Atualizar dados expandidos de um paciente
     * @param {number} patientId - ID do paciente
     * @param {Object} data - Dados expandidos
     * @returns {Promise<Object>} Resultado da operação
     */
    async updateExpandedData(patientId, data) {
        try {
            console.log(`[EXPANDED-API] Atualizando dados expandidos para paciente ${patientId}`);

            // Validar dados antes de enviar
            const validationErrors = this.validateExpandedData(data);
            if (validationErrors.length > 0) {
                throw {
                    errors: validationErrors.map(msg => ({ msg }))
                };
            }

            const response = await apiClient.put(`/patients/${patientId}/expanded`, data);
            console.log(`[EXPANDED-API] Dados expandidos atualizados com sucesso`);
            return response;

        } catch (error) {
            console.error(`[EXPANDED-API] Erro ao atualizar dados expandidos:`, error);
            throw error;
        }
    },

    // ==========================================
    // VALIDAÇÕES
    // ==========================================

    /**
     * Validar dados expandidos antes de enviar
     * @param {Object} data - Dados para validar
     * @returns {Array} Lista de erros encontrados
     */
    validateExpandedData(data) {
        const errors = [];

        // Validações de email - apenas valida se não estiver vazio
        if (data.main?.guardian_email && data.main.guardian_email.trim() !== '' && !this.isValidEmail(data.main.guardian_email)) {
            errors.push('Email do responsável inválido');
        }

        if (data.main?.second_guardian_email && data.main.second_guardian_email.trim() !== '' && !this.isValidEmail(data.main.second_guardian_email)) {
            errors.push('Email do segundo responsável inválido');
        }

        if (data.main?.pediatrician_email && data.main.pediatrician_email.trim() !== '' && !this.isValidEmail(data.main.pediatrician_email)) {
            errors.push('Email do pediatra inválido');
        }

        if (data.main?.school_email && data.main.school_email.trim() !== '' && !this.isValidEmail(data.main.school_email)) {
            errors.push('Email da escola inválido');
        }

        // Validações de estado - apenas valida se não estiver vazio
        if (data.main?.address_state && data.main.address_state.trim() !== '' && !this.isValidBrazilianState(data.main.address_state)) {
            errors.push('Estado inválido');
        }

        // Validações de período escolar - apenas valida se não estiver vazio
        if (data.main?.school_period && data.main.school_period.trim() !== '' && !['manhã', 'tarde', 'integral', 'noite'].includes(data.main.school_period)) {
            errors.push('Período escolar inválido');
        }

        // Validações de tipo de parto - apenas valida se não estiver vazio
        if (data.main?.delivery_type && data.main.delivery_type.trim() !== '' && !['normal', 'cesariana', 'fórceps', 'vácuo'].includes(data.main.delivery_type)) {
            errors.push('Tipo de parto inválido');
        }

        // Validações relaxadas - campos opcionais
        // Nota: Dados expandidos são opcionais para permitir diferentes fluxos de registro das clínicas
        // Apenas os dados BÁSICOS (nome) são obrigatórios

        return errors;
    },

    // ==========================================
    // UTILITÁRIOS
    // ==========================================

    /**
     * Validar formato de email
     * @param {string} email - Email para validar
     * @returns {boolean} Se o email é válido
     */
    isValidEmail(email) {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        return emailRegex.test(email);
    },

    /**
     * Validar estado brasileiro
     * @param {string} state - Sigla do estado
     * @returns {boolean} Se o estado é válido
     */
    isValidBrazilianState(state) {
        const validStates = [
            'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
            'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
        ];
        return validStates.includes(state);
    },

    // FUNÇÕES REMOVIDAS: formatCompleteness e getCompletenessStatus
    // Motivo: Funcionalidade de completude removida - todos os campos são opcionais

    /**
     * Criar estrutura inicial para novos dados
     * @returns {Object} Estrutura vazia para dados expandidos
     */
    createEmptyExpandedData() {
        return {
            main: {
                // Dados dos responsáveis
                guardian_phone: '',
                guardian_email: '',
                guardian_occupation: '',
                guardian_education: '',

                // Segundo responsável
                second_guardian_name: '',
                second_guardian_relationship: '',
                second_guardian_phone: '',
                second_guardian_email: '',
                second_guardian_occupation: '',

                // Endereço
                address_street: '',
                address_number: '',
                address_complement: '',
                address_neighborhood: '',
                address_city: '',
                address_state: '',
                address_zip: '',

                // Educação
                school_name: '',
                school_phone: '',
                school_email: '',
                school_teacher: '',
                school_teacher_phone: '',
                school_grade: '',
                school_period: '',
                school_special_needs: false,
                school_adaptations: '',

                // Desenvolvimento
                birth_weight: '',
                birth_height: '',
                birth_complications: '',
                gestational_age: '',
                delivery_type: '',
                development_concerns: '',
                early_intervention: false,

                // Médico
                pediatrician_name: '',
                pediatrician_phone: '',
                pediatrician_email: '',
                health_insurance: '',
                health_insurance_number: '',

                // Observações
                allergies: '',
                dietary_restrictions: '',
                behavioral_notes: '',
                communication_preferences: ''
            },
            medications: [],
            emergencyContacts: [],
            medicalHistory: [],
            professionalContacts: []
        };
    },

    /**
     * Formatar dados para exibição
     * @param {Object} data - Dados expandidos
     * @returns {Object} Dados formatados para UI
     */
    formatDataForDisplay(data) {
        return {
            ...data,
            // Formatar campos especiais se necessário
            birth_weight: data.birth_weight ? `${data.birth_weight} kg` : '',
            birth_height: data.birth_height ? `${data.birth_height} cm` : '',
            gestational_age: data.gestational_age ? `${data.gestational_age} semanas` : ''
        };
    },

    // ==========================================
    // GERAR PDF DE CADASTRO COMPLETO
    // ==========================================

    /**
     * Gerar PDF com todos os dados do paciente
     * Apenas administradores podem gerar este relatório
     * @param {number} patientId - ID do paciente
     * @param {object} patientBasicData - Dados básicos do paciente (name, dob, diagnosis)
     * @param {object} clinicData - Dados da clínica (opcional)
     * @returns {Promise<void>} PDF é gerado e baixado
     */
    async generateRegistrationPDF(patientId, patientBasicData, clinicData = null) {
        try {
            console.log(`[EXPANDED-API] Gerando PDF de cadastro completo para paciente ${patientId}`);

            // Busca dados expandidos completos
            const expandedData = await this.getExpandedData(patientId);

            console.log('[PDF-DEBUG] Dados recebidos da API:', expandedData);
            console.log('[PDF-DEBUG] expandedData.main:', expandedData.main);
            console.log('[PDF-DEBUG] expandedData.patient:', expandedData.patient);

            // Dados vêm em expandedData.patient, não em expandedData.main
            const patientFullData = expandedData.patient || {};

            // Mescla dados básicos com dados expandidos
            const completeData = {
                ...patientBasicData,
                ...patientFullData,
                medications: expandedData.medications || [],
                emergencyContacts: expandedData.emergencyContacts || [],
                medicalHistory: expandedData.medicalHistory || [],
                professionalContacts: expandedData.professionalContacts || []
            };

            console.log('[PDF-DEBUG] Dados completos para PDF:', completeData);

            // Importa e executa função de geração do PDF
            const { generatePatientRegistrationPDF } = await import('../utils/pdfGenerator');
            await generatePatientRegistrationPDF(completeData, clinicData);

            console.log(`[EXPANDED-API] PDF gerado com sucesso`);

        } catch (error) {
            console.error(`[EXPANDED-API] Erro ao gerar PDF de cadastro completo:`, error);
            throw error;
        }
    }
};

export default expandedPatientApi;