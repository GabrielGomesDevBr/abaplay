// backend/src/jobs/sessionMaintenanceJob.js

const scheduledSessionModel = require('../models/scheduledSessionModel');

/**
 * Job unificado de manutenção do sistema de agendamento
 * Combina: detecção de sessões + marcação de perdidos + detecção de órfãs
 */
const SessionMaintenanceJob = {

  /**
   * Executa rotina completa de manutenção
   */
  async runMaintenanceRoutine(options = {}) {
    const {
      lookbackHours = 24,
      missedAfterHours = 2,
      notifyUsers = false // Desabilitado por enquanto - implementar notificações depois
    } = options;

    console.log('[SESSION-MAINTENANCE] Iniciando rotina de manutenção...');

    const results = {
      started_at: new Date(),
      detected_sessions: [],
      missed_appointments: [],
      orphan_sessions: [],
      notifications_created: 0
    };

    try {
      // ETAPA 1: Detectar e vincular sessões realizadas
      console.log('[SESSION-MAINTENANCE] Etapa 1: Detectando sessões realizadas...');

      // Buscar todas as clínicas
      const clinicsQuery = 'SELECT DISTINCT id FROM clinics';
      const pool = require('../models/db');
      const { rows: clinics } = await pool.query(clinicsQuery);

      let totalDetected = [];
      for (const clinic of clinics) {
        try {
          const detectionResult = await scheduledSessionModel.intelligentSessionDetection({
            clinic_id: clinic.id,
            start_date: this.getDateFromHours(lookbackHours),
            end_date: new Date().toISOString().split('T')[0],
            auto_create_retroactive: false
          });

          if (detectionResult.completed_sessions) {
            totalDetected = [...totalDetected, ...detectionResult.completed_sessions];
          }
        } catch (error) {
          console.error(`[SESSION-MAINTENANCE] Erro ao detectar sessões da clínica ${clinic.id}:`, error.message);
        }
      }

      results.detected_sessions = totalDetected;
      console.log(`[SESSION-MAINTENANCE] ${results.detected_sessions.length} sessões detectadas e vinculadas`);

      // ETAPA 2: Marcar agendamentos vencidos como perdidos
      console.log('[SESSION-MAINTENANCE] Etapa 2: Marcando agendamentos perdidos...');
      const missedResult = await scheduledSessionModel.markMissedAppointments(missedAfterHours);
      results.missed_appointments = missedResult || [];
      console.log(`[SESSION-MAINTENANCE] ${results.missed_appointments.length} agendamentos marcados como perdidos`);

      // ETAPA 3: Detectar sessões órfãs (novas desde última execução)
      console.log('[SESSION-MAINTENANCE] Etapa 3: Detectando sessões órfãs...');
      let totalOrphans = [];
      for (const clinic of clinics) {
        try {
          const orphanResult = await scheduledSessionModel.findOrphanSessions({
            clinic_id: clinic.id,
            lookbackDays: Math.ceil(lookbackHours / 24)
          });
          if (orphanResult) {
            totalOrphans = [...totalOrphans, ...orphanResult];
          }
        } catch (error) {
          console.error(`[SESSION-MAINTENANCE] Erro ao detectar órfãs da clínica ${clinic.id}:`, error.message);
        }
      }
      results.orphan_sessions = totalOrphans;
      console.log(`[SESSION-MAINTENANCE] ${results.orphan_sessions.length} sessões órfãs detectadas`);

      // ETAPA 4: Notificações (placeholder - implementar depois)
      if (notifyUsers) {
        console.log('[SESSION-MAINTENANCE] Etapa 4: Sistema de notificações ainda não implementado');
        results.notifications_created = 0;
      }

      results.completed_at = new Date();
      results.duration_ms = results.completed_at - results.started_at;
      results.success = true;

      console.log(`[SESSION-MAINTENANCE] Manutenção concluída com sucesso em ${results.duration_ms}ms`);
      return results;

    } catch (error) {
      console.error('[SESSION-MAINTENANCE] Erro na rotina de manutenção:', error);
      results.completed_at = new Date();
      results.duration_ms = results.completed_at - results.started_at;
      results.success = false;
      results.error = error.message;
      throw error;
    }
  },

  /**
   * Calcular data a partir de horas atrás
   */
  getDateFromHours(hours) {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString().split('T')[0];
  },

  /**
   * Iniciar job agendado (para produção)
   */
  scheduleJob(intervalMinutes = 30) {
    console.log(`[SESSION-MAINTENANCE] Agendando job para rodar a cada ${intervalMinutes} minutos`);

    const intervalMs = intervalMinutes * 60 * 1000;

    // Executar imediatamente ao iniciar
    setTimeout(() => {
      this.runMaintenanceRoutine().catch(error => {
        console.error('[SESSION-MAINTENANCE] Erro na execução inicial:', error);
      });
    }, 5000);

    // Agendar execuções subsequentes
    setInterval(() => {
      this.runMaintenanceRoutine().catch(error => {
        console.error('[SESSION-MAINTENANCE] Erro na execução agendada:', error);
      });
    }, intervalMs);

    console.log('[SESSION-MAINTENANCE] Job agendado com sucesso');
  }
};

module.exports = SessionMaintenanceJob;