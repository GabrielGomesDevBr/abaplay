// backend/src/utils/availabilityNotifications.js

const NotificationStatus = require('../models/notificationStatusModel');

/**
 * Helper para criar notificações relacionadas à disponibilidade
 * Integra com o sistema de notificações existente
 */
const availabilityNotifications = {

  /**
   * Notifica admin quando terapeuta solicita ausência (férias, etc)
   * @param {number} therapistId - ID do terapeuta
   * @param {string} therapistName - Nome do terapeuta
   * @param {Object} absenceData - Dados da ausência
   * @param {Array} adminIds - IDs dos administradores para notificar
   */
  async notifyAdminAbsenceRequest(therapistId, therapistName, absenceData, adminIds) {
    try {
      console.log('[NOTIFICATIONS] Notificando admins sobre solicitação de ausência:', {
        therapistId,
        absenceType: absenceData.absence_type,
        period: `${absenceData.start_date} a ${absenceData.end_date}`
      });

      const notificationType = 'absence_request';

      // Criar notificação para cada admin
      for (const adminId of adminIds) {
        await NotificationStatus.createOrUpdate(adminId, therapistId, notificationType);
        await NotificationStatus.incrementUnreadCount(adminId, therapistId, notificationType);
      }

      console.log(`[NOTIFICATIONS] ${adminIds.length} admin(s) notificado(s)`);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao notificar admins:', error);
      return false;
    }
  },

  /**
   * Notifica terapeuta quando admin aprova/rejeita ausência
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} absenceData - Dados da ausência
   * @param {string} status - 'approved' ou 'rejected'
   * @param {string} approverName - Nome do admin que aprovou/rejeitou
   */
  async notifyTherapistAbsenceDecision(therapistId, absenceData, status, approverName) {
    try {
      console.log('[NOTIFICATIONS] Notificando terapeuta sobre decisão:', {
        therapistId,
        status,
        approverName
      });

      const notificationType = status === 'approved'
        ? 'absence_approved'
        : 'absence_rejected';

      // Criar notificação para o terapeuta
      // Usando therapistId como patientId (reutilizando estrutura existente)
      await NotificationStatus.createOrUpdate(therapistId, therapistId, notificationType);
      await NotificationStatus.incrementUnreadCount(therapistId, therapistId, notificationType);

      console.log('[NOTIFICATIONS] Terapeuta notificado');
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao notificar terapeuta:', error);
      return false;
    }
  },

  /**
   * Notifica pacientes afetados quando sessão for bloqueada por ausência
   * @param {Array} conflicts - Lista de sessões conflitantes
   * @param {number} therapistId - ID do terapeuta
   * @param {string} therapistName - Nome do terapeuta
   * @param {Object} absenceData - Dados da ausência
   */
  async notifyPatientsAboutConflicts(conflicts, therapistId, therapistName, absenceData) {
    try {
      console.log('[NOTIFICATIONS] Notificando pacientes sobre conflitos:', {
        totalConflicts: conflicts.length,
        therapistId
      });

      const notificationType = 'session_blocked_by_absence';

      // Agrupar conflitos por paciente para não duplicar notificações
      const patientIds = [...new Set(conflicts.map(c => c.patient_id))];

      for (const patientId of patientIds) {
        const patientConflicts = conflicts.filter(c => c.patient_id === patientId);

        // Criar notificação para o pai/responsável do paciente
        // Buscar IDs dos pais associados ao paciente (se houver)
        // Por enquanto, criar notificação genérica
        await NotificationStatus.createOrUpdate(patientId, patientId, notificationType);
        await NotificationStatus.incrementUnreadCount(patientId, patientId, notificationType);

        console.log(`[NOTIFICATIONS] Paciente ${patientId} notificado (${patientConflicts.length} sessões afetadas)`);
      }

      console.log(`[NOTIFICATIONS] ${patientIds.length} paciente(s) notificado(s)`);
      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao notificar pacientes:', error);
      return false;
    }
  },

  /**
   * Busca todos os admins da clínica para notificar
   * @param {number} clinicId - ID da clínica
   * @returns {Promise<Array>} Lista de IDs dos admins
   */
  async getClinicAdmins(clinicId) {
    try {
      const pool = require('../models/db');
      const query = `
        SELECT id, full_name, email
        FROM users
        WHERE clinic_id = $1
          AND is_admin = true
          AND role IN ('admin', 'terapeuta')
        ORDER BY id ASC
      `;

      const result = await pool.query(query, [clinicId]);
      return result.rows;
    } catch (error) {
      console.error('[NOTIFICATIONS] Erro ao buscar admins:', error);
      return [];
    }
  }
};

module.exports = availabilityNotifications;
