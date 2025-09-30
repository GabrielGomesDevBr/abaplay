// backend/src/jobs/recurringAppointmentJob.js

const cron = require('node-cron');
const RecurringAppointmentModel = require('../models/recurringAppointmentModel');

/**
 * Job para gerenciar agendamentos recorrentes automaticamente
 * Executa tarefas de manutenção e geração de novos agendamentos
 */
class RecurringAppointmentJob {

    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            templatesProcessed: 0,
            appointmentsGenerated: 0,
            errors: []
        };
    }

    /**
     * Executar job principal de geração de agendamentos
     */
    async runMaintenanceJob() {
        if (this.isRunning) {
            console.log('[RECURRING-JOB] Job já está em execução, pulando...');
            return;
        }

        console.log('[RECURRING-JOB] Iniciando job de manutenção de agendamentos recorrentes...');

        this.isRunning = true;
        this.stats.totalRuns++;
        const startTime = Date.now();

        try {
            // 1. Buscar templates que precisam gerar novos agendamentos
            const templates = await RecurringAppointmentModel.getTemplatesForGeneration();
            console.log(`[RECURRING-JOB] Encontrados ${templates.length} templates para processar`);

            let totalGenerated = 0;
            let templatesProcessed = 0;

            // 2. Processar cada template
            for (const template of templates) {
                try {
                    console.log(`[RECURRING-JOB] Processando template ${template.id} - ${template.patient_name} (${template.therapist_name})`);

                    // Gerar agendamentos para este template
                    const results = await RecurringAppointmentModel.generateAppointments(template.id);
                    const generated = results.filter(r => r.success).length;
                    const conflicts = results.filter(r => !r.success).length;

                    totalGenerated += generated;
                    templatesProcessed++;

                    console.log(`[RECURRING-JOB] Template ${template.id}: ${generated} gerados, ${conflicts} conflitos`);

                } catch (templateError) {
                    console.error(`[RECURRING-JOB] Erro ao processar template ${template.id}:`, templateError);
                    this.stats.errors.push({
                        templateId: template.id,
                        patientName: template.patient_name,
                        error: templateError.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // 3. Atualizar estatísticas
            this.stats.templatesProcessed += templatesProcessed;
            this.stats.appointmentsGenerated += totalGenerated;
            this.stats.successfulRuns++;

            const duration = Date.now() - startTime;
            console.log(`[RECURRING-JOB] Job concluído em ${duration}ms - ${templatesProcessed} templates, ${totalGenerated} agendamentos gerados`);

        } catch (error) {
            console.error('[RECURRING-JOB] Erro no job principal:', error);
            this.stats.failedRuns++;
            this.stats.errors.push({
                error: error.message,
                timestamp: new Date().toISOString(),
                type: 'main_job_error'
            });
        } finally {
            this.isRunning = false;
            this.lastRun = new Date();
        }
    }

    /**
     * Executar limpeza de templates expirados
     */
    async runCleanupJob() {
        console.log('[RECURRING-JOB] Iniciando limpeza de templates expirados...');

        try {
            // Buscar e desativar templates expirados que ainda estão ativos
            const expiredTemplates = await RecurringAppointmentModel.getExpiredTemplates();

            for (const template of expiredTemplates) {
                try {
                    await RecurringAppointmentModel.deactivateTemplate(
                        template.id,
                        'Expirado automaticamente pelo sistema',
                        1 // Sistema
                    );
                    console.log(`[RECURRING-JOB] Template ${template.id} (${template.patient_name}) desativado por expiração`);
                } catch (error) {
                    console.error(`[RECURRING-JOB] Erro ao desativar template expirado ${template.id}:`, error);
                }
            }

            console.log(`[RECURRING-JOB] Limpeza concluída - ${expiredTemplates.length} templates desativados`);

        } catch (error) {
            console.error('[RECURRING-JOB] Erro na limpeza:', error);
        }
    }

    /**
     * Reativar templates pausados que já passaram da data limite
     */
    async runResumeJob() {
        console.log('[RECURRING-JOB] Verificando templates pausados para reativar...');

        try {
            // Buscar templates pausados com data limite expirada
            const pausedTemplates = await RecurringAppointmentModel.getPausedTemplatesExpired();

            for (const template of pausedTemplates) {
                try {
                    const success = await RecurringAppointmentModel.resumeTemplate(template.id);
                    if (success) {
                        console.log(`[RECURRING-JOB] Template ${template.id} (${template.patient_name}) reativado automaticamente`);

                        // Gerar agendamentos perdidos durante a pausa
                        await RecurringAppointmentModel.generateAppointments(template.id);
                    }
                } catch (error) {
                    console.error(`[RECURRING-JOB] Erro ao reativar template pausado ${template.id}:`, error);
                }
            }

            console.log(`[RECURRING-JOB] Verificação de pausas concluída - ${pausedTemplates.length} templates reativados`);

        } catch (error) {
            console.error('[RECURRING-JOB] Erro na verificação de pausas:', error);
        }
    }

    /**
     * Obter estatísticas do job
     */
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.getNextRunTime(),
            uptime: process.uptime()
        };
    }

    /**
     * Obter horário da próxima execução
     */
    getNextRunTime() {
        // Como está configurado para rodar a cada 30 minutos
        if (this.lastRun) {
            const nextRun = new Date(this.lastRun.getTime() + 30 * 60 * 1000);
            return nextRun;
        }
        return null;
    }

    /**
     * Limpar estatísticas antigas
     */
    clearOldStats() {
        // Manter apenas os últimos 50 erros
        if (this.stats.errors.length > 50) {
            this.stats.errors = this.stats.errors.slice(-50);
        }
    }

    /**
     * Inicializar jobs com cron
     */
    initializeScheduledJobs() {
        console.log('[RECURRING-JOB] Inicializando jobs agendados...');

        // Job principal - a cada 30 minutos
        cron.schedule('*/30 * * * *', async () => {
            await this.runMaintenanceJob();
        }, {
            timezone: 'America/Sao_Paulo'
        });

        // Job de limpeza - todo dia às 02:00
        cron.schedule('0 2 * * *', async () => {
            await this.runCleanupJob();
            await this.runResumeJob();
            this.clearOldStats();
        }, {
            timezone: 'America/Sao_Paulo'
        });

        // Job de status - a cada 6 horas (para logs de saúde)
        cron.schedule('0 */6 * * *', () => {
            const stats = this.getStats();
            console.log('[RECURRING-JOB] Status:', {
                totalRuns: stats.totalRuns,
                successRate: stats.totalRuns > 0 ? Math.round((stats.successfulRuns / stats.totalRuns) * 100) : 0,
                appointmentsGenerated: stats.appointmentsGenerated,
                templatesProcessed: stats.templatesProcessed,
                lastRun: stats.lastRun,
                errors: stats.errors.length
            });
        }, {
            timezone: 'America/Sao_Paulo'
        });

        console.log('[RECURRING-JOB] Jobs agendados configurados:');
        console.log('  - Geração de agendamentos: a cada 30 minutos');
        console.log('  - Limpeza e manutenção: todo dia às 02:00');
        console.log('  - Status de saúde: a cada 6 horas');
    }

    /**
     * Executar job manualmente (para testes)
     */
    async runManually() {
        console.log('[RECURRING-JOB] Executando job manualmente...');
        await this.runMaintenanceJob();
        await this.runCleanupJob();
        await this.runResumeJob();
        return this.getStats();
    }
}

// Instância singleton do job
const recurringJobInstance = new RecurringAppointmentJob();

// Adicionar métodos de conveniência ao modelo para templates expirados e pausados
RecurringAppointmentModel.getExpiredTemplates = async function() {
    const query = `
        SELECT rat.id, rat.end_date, p.name as patient_name, u.full_name as therapist_name
        FROM recurring_appointment_templates rat
        JOIN patients p ON rat.patient_id = p.id
        JOIN users u ON rat.therapist_id = u.id
        WHERE rat.is_active = true
          AND rat.end_date IS NOT NULL
          AND rat.end_date < CURRENT_DATE
        ORDER BY rat.end_date ASC
    `;

    try {
        const { rows } = await require('./db').query(query);
        return rows;
    } catch (error) {
        console.error('[RECURRING-MODEL] Erro ao buscar templates expirados:', error);
        throw error;
    }
};

RecurringAppointmentModel.getPausedTemplatesExpired = async function() {
    const query = `
        SELECT rat.id, rat.paused_until, p.name as patient_name, u.full_name as therapist_name
        FROM recurring_appointment_templates rat
        JOIN patients p ON rat.patient_id = p.id
        JOIN users u ON rat.therapist_id = u.id
        WHERE rat.is_active = true
          AND rat.is_paused = true
          AND rat.paused_until IS NOT NULL
          AND rat.paused_until < CURRENT_DATE
        ORDER BY rat.paused_until ASC
    `;

    try {
        const { rows } = await require('./db').query(query);
        return rows;
    } catch (error) {
        console.error('[RECURRING-MODEL] Erro ao buscar templates pausados expirados:', error);
        throw error;
    }
};

module.exports = {
    recurringJobInstance,
    RecurringAppointmentJob
};