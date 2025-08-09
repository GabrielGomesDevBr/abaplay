const pool = require('../models/db');
const NotificationStatus = require('../models/notificationStatusModel');

/**
 * Utilitário para calcular alertas de programas com progresso alto (80%+)
 */
const ProgressAlerts = {
    /**
     * Calcula a média de progresso (score) das últimas sessões de um programa
     * @param {number} assignmentId - ID da atribuição do programa
     * @param {number} minSessions - Mínimo de sessões para considerar (padrão: 3)
     * @returns {Promise<{average: number, sessionsCount: number}>}
     */
    async calculateProgramProgress(assignmentId, minSessions = 3) {
        const query = `
            SELECT score, session_date
            FROM patient_program_progress 
            WHERE assignment_id = $1 
            ORDER BY session_date DESC, created_at DESC
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
                
                if (progress.average >= threshold && progress.sessionsCount >= 3) {
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
     * Cria notificações de alerta para programas com progresso alto
     * @param {number} therapistId - ID do terapeuta
     * @returns {Promise<number>} Número de alertas criados
     */
    async createProgressAlerts(therapistId) {
        try {
            const programs = await this.getProgramsNeedingAlert(therapistId);
            let alertsCreated = 0;
            
            for (const program of programs) {
                // Verifica se já existe um alerta similar recente (últimos 7 dias)
                const existingAlertQuery = `
                    SELECT id FROM notificationstatus 
                    WHERE "userId" = $1 
                        AND "patientId" = $2 
                        AND "chatType" = 'progress_alert'
                        AND "createdAt" > NOW() - INTERVAL '7 days'
                `;
                
                const existingAlert = await pool.query(existingAlertQuery, [
                    therapistId, 
                    program.patient_id
                ]);
                
                if (existingAlert.rows.length === 0) {
                    // Cria nova notificação de alerta
                    await NotificationStatus.createOrUpdate(
                        therapistId, 
                        program.patient_id, 
                        'progress_alert'
                    );
                    
                    // Incrementa contador para mostrar como não lida
                    await NotificationStatus.incrementUnreadCount(
                        therapistId, 
                        program.patient_id, 
                        'progress_alert'
                    );
                    
                    alertsCreated++;
                }
            }
            
            console.log(`[PROGRESS-ALERTS] ${alertsCreated} alertas criados para terapeuta ${therapistId}`);
            return alertsCreated;
        } catch (error) {
            console.error('Erro ao criar alertas de progresso:', error);
            throw error;
        }
    },

    /**
     * Executa verificação de alertas para todos os terapeutas ativos
     * @returns {Promise<number>} Total de alertas criados
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
            
            console.log(`[PROGRESS-ALERTS] Total: ${totalAlerts} alertas criados para ${therapists.length} terapeutas`);
            return totalAlerts;
        } catch (error) {
            console.error('Erro na verificação geral de alertas:', error);
            throw error;
        }
    }
};

module.exports = ProgressAlerts;