const cron = require('node-cron');
const subscriptionModel = require('../models/subscriptionModel');

/**
 * Job para expirar trials automaticamente
 * Roda diariamente às 3 AM
 */

class TrialExpirationJob {
  static job = null;

  /**
   * Inicializar job agendado
   */
  static scheduleJob() {
    // Executar diariamente às 3 AM (horário de Brasília)
    // Cron expression: '0 3 * * *' = min hora dia mês dia_semana
    this.job = cron.schedule('0 3 * * *', async () => {
      console.log('[TRIAL-EXPIRATION] Iniciando verificação de trials expirados...');
      await this.expireTrials();
    });

    console.log('[TRIAL-EXPIRATION] Job agendado para executar diariamente às 3 AM');
  }

  /**
   * Executar manualmente (para testes)
   */
  static async expireTrials() {
    try {
      const expiredCount = await subscriptionModel.expireTrials();

      if (expiredCount > 0) {
        console.log(`[TRIAL-EXPIRATION] ✅ ${expiredCount} trial(s) expirado(s) com sucesso`);

        // Buscar clínicas que tiveram trial expirado para notificação
        const result = await require('../models/db').query(`
          SELECT
            c.id as clinic_id,
            c.name as clinic_name,
            c.subscription_plan,
            u.full_name as admin_name,
            u.username as admin_email
          FROM clinics c
          LEFT JOIN users u ON u.clinic_id = c.id AND u.is_admin = true
          WHERE c.trial_pro_enabled = false
            AND c.trial_pro_expires_at <= CURRENT_TIMESTAMP
            AND c.trial_pro_expires_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        `);

        if (result.rows.length > 0) {
          console.log('[TRIAL-EXPIRATION] Clínicas com trial expirado:');
          result.rows.forEach(clinic => {
            console.log(`  - ${clinic.clinic_name} (ID: ${clinic.clinic_id}) - Plano atual: ${clinic.subscription_plan}`);
            console.log(`    Admin: ${clinic.admin_name} (${clinic.admin_email})`);
          });

          // TODO: Implementar notificação por email para admins
          // Aqui você pode integrar com serviço de email (SendGrid, AWS SES, etc.)
        }
      } else {
        console.log('[TRIAL-EXPIRATION] ℹ️ Nenhum trial expirado encontrado');
      }

      return expiredCount;
    } catch (error) {
      console.error('[TRIAL-EXPIRATION] ❌ Erro ao expirar trials:', error);
      throw error;
    }
  }

  /**
   * Verificar trials que expiram em breve (para alertas)
   */
  static async checkExpiringTrials(daysAhead = 3) {
    try {
      const expiringTrials = await subscriptionModel.getExpiringTrials(daysAhead);

      if (expiringTrials.length > 0) {
        console.log(`[TRIAL-EXPIRATION] ⚠️ ${expiringTrials.length} trial(s) expira(m) nos próximos ${daysAhead} dias:`);

        expiringTrials.forEach(trial => {
          const daysLeft = Math.ceil(
            (new Date(trial.trial_pro_expires_at) - new Date()) / (1000 * 60 * 60 * 24)
          );
          console.log(`  - ${trial.clinic_name} expira em ${daysLeft} dia(s) (${trial.trial_pro_expires_at})`);
          console.log(`    Admin: ${trial.admin_name} (${trial.admin_email})`);
        });

        // TODO: Implementar notificação de alerta
        // Enviar email de lembrete para admins antes de expirar
      }

      return expiringTrials;
    } catch (error) {
      console.error('[TRIAL-EXPIRATION] Erro ao verificar trials expirando:', error);
      throw error;
    }
  }

  /**
   * Parar job agendado
   */
  static stopJob() {
    if (this.job) {
      this.job.stop();
      console.log('[TRIAL-EXPIRATION] Job parado');
    }
  }
}

module.exports = TrialExpirationJob;
