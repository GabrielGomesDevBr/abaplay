// backend/src/jobs/sessionDetectionJob.js

const scheduledSessionModel = require('../models/scheduledSessionModel');
const NotificationStatus = require('../models/notificationStatusModel');

/**
 * Job de detecção automática de sessões realizadas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 *
 * Este job verifica periodicamente se há sessões realizadas que correspondem
 * a agendamentos programados e os vincula automaticamente
 */

/**
 * Executa a detecção automática de sessões realizadas
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.sendNotifications - Se deve enviar notificações
 * @param {number} options.lookbackHours - Quantas horas olhar para trás
 * @returns {Promise<Object>} Resultado da detecção
 */
const detectAndLinkSessions = async (options = {}) => {
  const {
    sendNotifications = true,
    lookbackHours = 24
  } = options;

  try {
    console.log('[SESSION-DETECTION] Iniciando detecção automática de sessões realizadas...');

    // Buscar agendamentos que podem ter sessões correspondentes
    const candidateAppointments = await scheduledSessionModel.findPendingDetection(lookbackHours);

    console.log(`[SESSION-DETECTION] Encontrados ${candidateAppointments.length} agendamentos candidatos para detecção`);

    const results = {
      processed: 0,
      linked: 0,
      notifications_sent: 0,
      errors: []
    };

    for (const appointment of candidateAppointments) {
      try {
        results.processed++;

        // Tentar detectar e vincular sessão automaticamente
        const linkResult = await scheduledSessionModel.detectAndLinkSession(appointment.id);

        if (linkResult.success) {
          results.linked++;
          console.log(`[SESSION-DETECTION] Agendamento ID ${appointment.id} vinculado à sessão ID ${linkResult.session_id}`);

          // Enviar notificação se solicitado
          if (sendNotifications && linkResult.session_id) {
            try {
              await sendSessionLinkedNotification(appointment, linkResult.session_id);
              results.notifications_sent++;
            } catch (notificationError) {
              console.error(`[SESSION-DETECTION] Erro ao enviar notificação para agendamento ID ${appointment.id}:`, notificationError.message);
              // Não falha o processo por erro de notificação
            }
          }
        } else {
          console.log(`[SESSION-DETECTION] Nenhuma sessão encontrada para agendamento ID ${appointment.id}: ${linkResult.reason}`);
        }

      } catch (appointmentError) {
        console.error(`[SESSION-DETECTION] Erro ao processar agendamento ID ${appointment.id}:`, appointmentError.message);
        results.errors.push({
          appointment_id: appointment.id,
          error: appointmentError.message
        });
      }
    }

    console.log(`[SESSION-DETECTION] Detecção concluída. Processados: ${results.processed}, Vinculados: ${results.linked}, Notificações: ${results.notifications_sent}, Erros: ${results.errors.length}`);

    return results;

  } catch (error) {
    console.error('[SESSION-DETECTION] Erro geral na detecção automática:', error);
    throw error;
  }
};

/**
 * Marca agendamentos vencidos como perdidos
 * @param {number} hoursAfter - Horas após o agendamento para considerar perdido
 * @returns {Promise<Object>} Resultado da marcação
 */
const markOverdueAppointments = async (hoursAfter = 2) => {
  try {
    console.log(`[SESSION-DETECTION] Iniciando marcação de agendamentos perdidos (${hoursAfter}h após agendamento)...`);

    const result = await scheduledSessionModel.markMissedAppointments(hoursAfter);

    console.log(`[SESSION-DETECTION] ${result.marked_count} agendamentos marcados como perdidos`);

    // Enviar notificações para agendamentos marcados como perdidos
    if (result.marked_appointments && result.marked_appointments.length > 0) {
      for (const appointment of result.marked_appointments) {
        try {
          await sendMissedAppointmentNotification(appointment);
        } catch (notificationError) {
          console.error(`[SESSION-DETECTION] Erro ao enviar notificação de agendamento perdido ID ${appointment.id}:`, notificationError.message);
        }
      }
    }

    return result;

  } catch (error) {
    console.error('[SESSION-DETECTION] Erro ao marcar agendamentos perdidos:', error);
    throw error;
  }
};

/**
 * Envia notificação quando uma sessão é vinculada automaticamente
 * @param {Object} appointment - Dados do agendamento
 * @param {number} sessionId - ID da sessão vinculada
 */
const sendSessionLinkedNotification = async (appointment, sessionId) => {
  try {
    console.log(`[SESSION-DETECTION] 📧 Notificação: Sessão ${sessionId} vinculada ao agendamento ${appointment.id} do paciente ${appointment.patient_name}`);

    // Implementação simplificada - apenas log por enquanto
    // Futura implementação pode usar WebSocket ou sistema de notificações

  } catch (error) {
    console.error('[SESSION-DETECTION] Erro ao enviar notificação de sessão vinculada:', error);
    throw error;
  }
};

/**
 * Envia notificação quando um agendamento é marcado como perdido
 * @param {Object} appointment - Dados do agendamento perdido
 */
const sendMissedAppointmentNotification = async (appointment) => {
  try {
    console.log(`[SESSION-DETECTION] 📧 Notificação: Agendamento ${appointment.id} do paciente ${appointment.patient_name} marcado como perdido`);

    // Implementação simplificada - apenas log por enquanto
    // Futura implementação pode usar WebSocket ou sistema de notificações

  } catch (error) {
    console.error('[SESSION-DETECTION] Erro ao enviar notificação de agendamento perdido:', error);
    throw error;
  }
};

/**
 * Executa rotina completa de manutenção do sistema de agendamento
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} Resultado completo da rotina
 */
const runMaintenanceRoutine = async (options = {}) => {
  const {
    detectSessions = true,
    markMissed = true,
    sendNotifications = true,
    lookbackHours = 24,
    missedAfterHours = 2
  } = options;

  console.log('[SESSION-DETECTION] Iniciando rotina de manutenção do sistema de agendamento...');

  const results = {
    detection: null,
    missed_marking: null,
    started_at: new Date(),
    completed_at: null,
    total_duration_ms: 0
  };

  try {
    // 1. Detecção automática de sessões
    if (detectSessions) {
      console.log('[SESSION-DETECTION] Executando detecção automática de sessões...');
      results.detection = await detectAndLinkSessions({
        sendNotifications,
        lookbackHours
      });
    }

    // 2. Marcação de agendamentos perdidos
    if (markMissed) {
      console.log('[SESSION-DETECTION] Executando marcação de agendamentos perdidos...');
      results.missed_marking = await markOverdueAppointments(missedAfterHours);
    }

    results.completed_at = new Date();
    results.total_duration_ms = results.completed_at - results.started_at;

    console.log(`[SESSION-DETECTION] Rotina de manutenção concluída em ${results.total_duration_ms}ms`);

    return results;

  } catch (error) {
    results.completed_at = new Date();
    results.total_duration_ms = results.completed_at - results.started_at;
    results.error = error.message;

    console.error('[SESSION-DETECTION] Erro na rotina de manutenção:', error);
    throw error;
  }
};

/**
 * Inicia o agendamento automático do job (para uso em produção)
 * @param {Object} config - Configuração do agendamento
 */
const scheduleMaintenanceJob = (config = {}) => {
  const {
    intervalMinutes = 30, // A cada 30 minutos por padrão
    detectSessions = true,
    markMissed = true,
    sendNotifications = true,
    lookbackHours = 24,
    missedAfterHours = 2
  } = config;

  console.log(`[SESSION-DETECTION] Agendando job de manutenção para execução a cada ${intervalMinutes} minutos`);

  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(async () => {
    try {
      await runMaintenanceRoutine({
        detectSessions,
        markMissed,
        sendNotifications,
        lookbackHours,
        missedAfterHours
      });
    } catch (error) {
      console.error('[SESSION-DETECTION] Erro na execução agendada do job:', error);
    }
  }, intervalMs);

  // Executar uma vez imediatamente
  setTimeout(async () => {
    try {
      console.log('[SESSION-DETECTION] Executando rotina inicial...');
      await runMaintenanceRoutine({
        detectSessions,
        markMissed,
        sendNotifications,
        lookbackHours,
        missedAfterHours
      });
    } catch (error) {
      console.error('[SESSION-DETECTION] Erro na execução inicial do job:', error);
    }
  }, 5000); // 5 segundos após o início
};

module.exports = {
  detectAndLinkSessions,
  markOverdueAppointments,
  runMaintenanceRoutine,
  scheduleMaintenanceJob
};