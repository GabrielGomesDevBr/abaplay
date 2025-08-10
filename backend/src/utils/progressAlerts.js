const pool = require('../models/db');
const NotificationStatus = require('../models/notificationStatusModel');

/**
 * Utilitário para calcular alertas de programas com progresso alto (80%+)
 */
const ProgressAlerts = {
    /**
     * Calcula a média de progresso (score) das últimas sessões de um programa
     * @param {number} assignmentId - ID da atribuição do programa
     * @param {number} minSessions - Mínimo de sessões para considerar (padrão: 5)
     * @returns {Promise<{average: number, sessionsCount: number}>}
     */
    async calculateProgramProgress(assignmentId, minSessions = 5) {
        const query = `
            SELECT score, session_date
            FROM patient_program_progress 
            WHERE assignment_id = $1 
            ORDER BY session_date ASC, created_at ASC
            LIMIT 10
        `;
        
        try {
            const result = await pool.query(query, [assignmentId]);
            const sessions = result.rows;
            
            if (sessions.length < minSessions) {
                return { average: 0, sessionsCount: sessions.length };
            }
            
            const totalScore = sessions.reduce((sum, session) => sum + parseFloat(session.score), 0);
            const average = totalScore / sessions.length;
            
            return { average: Math.round(average * 100) / 100, sessionsCount: sessions.length };
        } catch (error) {
            console.error('Erro ao calcular progresso do programa:', error);
            throw error;
        }
    },

    /**
     * Busca programas de um terapeuta que precisam de alerta de progresso alto
     * @param {number} therapistId - ID do terapeuta
     * @param {number} threshold - Limite de progresso para alerta (padrão: 80)
     * @returns {Promise<Array>} Lista de programas que precisam de alerta
     */
    async getProgramsNeedingAlert(therapistId, threshold = 80) {
        const query = `
            SELECT 
                ppa.id AS assignment_id,
                ppa.patient_id,
                ppa.program_id,
                ppa.status,
                p.name AS program_name,
                pat.name AS patient_name
            FROM patient_program_assignments ppa
            JOIN programs p ON ppa.program_id = p.id
            JOIN patients pat ON ppa.patient_id = pat.id
            WHERE ppa.therapist_id = $1 
                AND ppa.status = 'active'
            ORDER BY pat.name, p.name
        `;
        
        try {
            const result = await pool.query(query, [therapistId]);
            const assignments = result.rows;
            
            const alertPrograms = [];
            
            for (const assignment of assignments) {
                const progress = await this.calculateProgramProgress(assignment.assignment_id);
                
                if (progress.average >= threshold && progress.sessionsCount >= 5) {
                    alertPrograms.push({
                        ...assignment,
                        progress_average: progress.average,
                        sessions_count: progress.sessionsCount
                    });
                }
            }
            
            return alertPrograms;
        } catch (error) {
            console.error('Erro ao buscar programas precisando alerta:', error);
            throw error;
        }
    },

    /**
     * Busca programas que precisam de alerta (calculado dinamicamente)
     * @param {number} therapistId - ID do terapeuta
     * @returns {Promise<number>} Número de alertas encontrados
     */
    async createProgressAlerts(therapistId) {
        try {
            const programs = await this.getProgramsNeedingAlert(therapistId);
            const alertsCount = programs.length;
            
            console.log(`[PROGRESS-ALERTS] ${alertsCount} alertas encontrados para terapeuta ${therapistId}`);
            return alertsCount;
        } catch (error) {
            console.error('Erro ao verificar alertas de progresso:', error);
            throw error;
        }
    },

    /**
     * Executa verificação de alertas para todos os terapeutas ativos
     * @returns {Promise<number>} Total de alertas encontrados
     */
    async runProgressAlertCheck() {
        const query = `
            SELECT DISTINCT u.id as therapist_id
            FROM users u
            JOIN patient_program_assignments ppa ON u.id = ppa.therapist_id
            WHERE u.role = 'therapist' 
                AND ppa.status = 'active'
        `;
        
        try {
            const result = await pool.query(query);
            const therapists = result.rows;
            
            let totalAlerts = 0;
            
            for (const therapist of therapists) {
                const alerts = await this.createProgressAlerts(therapist.therapist_id);
                totalAlerts += alerts;
            }
            
            console.log(`[PROGRESS-ALERTS] Total: ${totalAlerts} alertas encontrados para ${therapists.length} terapeutas`);
            return totalAlerts;
        } catch (error) {
            console.error('Erro na verificação geral de alertas:', error);
            throw error;
        }
    }
};

module.exports = ProgressAlerts;