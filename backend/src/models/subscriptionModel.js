const pool = require('./db');

/**
 * Model para gerenciamento de assinaturas e planos
 */

/**
 * Buscar informações de assinatura de uma clínica
 */
const getClinicSubscription = async (clinicId) => {
  const result = await pool.query(`
    SELECT * FROM v_clinic_subscription_details
    WHERE clinic_id = $1
  `, [clinicId]);

  return result.rows[0] || null;
};

/**
 * Buscar todas as clínicas com suas assinaturas (para SuperAdmin)
 */
const getAllClinicsSubscriptions = async () => {
  const result = await pool.query(`
    SELECT * FROM v_clinic_subscription_details
    ORDER BY clinic_name
  `);

  return result.rows;
};

/**
 * Atualizar plano de assinatura de uma clínica
 */
const updateSubscriptionPlan = async (clinicId, planName) => {
  const result = await pool.query(`
    UPDATE clinics
    SET subscription_plan = $2
    WHERE id = $1
    RETURNING id, subscription_plan
  `, [clinicId, planName]);

  // Registrar mudança para analytics
  if (result.rows.length > 0) {
    await pool.query(`
      INSERT INTO subscription_analytics (clinic_id, plan_name, event_type, event_data)
      VALUES ($1, $2, 'plan_changed', jsonb_build_object('changed_at', CURRENT_TIMESTAMP))
    `, [clinicId, planName]);
  }

  return result.rows[0] || null;
};

/**
 * Ativar trial Pro para uma clínica
 */
const activateTrialPro = async (clinicId, activatedBy, durationDays = 7) => {
  const result = await pool.query(
    'SELECT * FROM activate_trial_pro($1, $2, $3)',
    [clinicId, activatedBy, durationDays]
  );

  return result.rows[0] || null;
};

/**
 * Converter trial em plano Pro definitivo
 */
const convertTrialToPro = async (clinicId) => {
  const result = await pool.query(
    'SELECT * FROM convert_trial_to_pro($1)',
    [clinicId]
  );

  return result.rows[0] || null;
};

/**
 * Cancelar trial ativo
 */
const cancelTrial = async (clinicId) => {
  const result = await pool.query(`
    UPDATE clinics
    SET
      trial_pro_enabled = false,
      trial_pro_expires_at = NULL
    WHERE id = $1 AND trial_pro_enabled = true
    RETURNING id, subscription_plan
  `, [clinicId]);

  if (result.rows.length > 0) {
    // Atualizar histórico
    await pool.query(`
      UPDATE trial_history
      SET status = 'cancelled'
      WHERE clinic_id = $1 AND status = 'active'
    `, [clinicId]);

    // Registrar analytics
    await pool.query(`
      INSERT INTO subscription_analytics (clinic_id, plan_name, event_type, event_data)
      VALUES ($1, $2, 'trial_cancelled', jsonb_build_object('cancelled_at', CURRENT_TIMESTAMP))
    `, [clinicId, result.rows[0].subscription_plan]);
  }

  return result.rows[0] || null;
};

/**
 * Buscar histórico de trials de uma clínica
 */
const getTrialHistory = async (clinicId) => {
  const result = await pool.query(`
    SELECT
      th.*,
      u.full_name as activated_by_name
    FROM trial_history th
    LEFT JOIN users u ON u.id = th.activated_by
    WHERE th.clinic_id = $1
    ORDER BY th.activated_at DESC
  `, [clinicId]);

  return result.rows;
};

/**
 * Buscar analytics de assinatura de uma clínica
 */
const getClinicAnalytics = async (clinicId, limit = 100) => {
  const result = await pool.query(`
    SELECT *
    FROM subscription_analytics
    WHERE clinic_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [clinicId, limit]);

  return result.rows;
};

/**
 * Buscar estatísticas gerais de assinaturas (SuperAdmin)
 */
const getSubscriptionStats = async () => {
  const result = await pool.query(`
    SELECT
      subscription_plan as plan,
      COUNT(*) as total_clinics,
      SUM(total_patients) as total_patients,
      SUM(monthly_revenue) as total_revenue
    FROM v_clinic_subscription_details
    GROUP BY subscription_plan

    UNION ALL

    SELECT
      'trial' as plan,
      COUNT(*) as total_clinics,
      SUM(total_patients) as total_patients,
      0 as total_revenue
    FROM v_clinic_subscription_details
    WHERE trial_pro_enabled = true

    ORDER BY plan
  `);

  return result.rows;
};

/**
 * Buscar clínicas com trial ativo que expiram em breve
 */
const getExpiringTrials = async (daysAhead = 3) => {
  const result = await pool.query(`
    SELECT
      c.id as clinic_id,
      c.name as clinic_name,
      c.trial_pro_expires_at,
      c.subscription_plan,
      u.full_name as admin_name,
      u.username as admin_email
    FROM clinics c
    LEFT JOIN users u ON u.clinic_id = c.id AND u.is_admin = true
    WHERE c.trial_pro_enabled = true
      AND c.trial_pro_expires_at <= CURRENT_TIMESTAMP + ($1 || ' days')::INTERVAL
      AND c.trial_pro_expires_at > CURRENT_TIMESTAMP
    ORDER BY c.trial_pro_expires_at
  `, [daysAhead]);

  return result.rows;
};

/**
 * Expirar trials (chamado por cron job)
 */
const expireTrials = async () => {
  const result = await pool.query('SELECT * FROM expire_trials()');
  return result.rows[0]?.expired_count || 0;
};

/**
 * Buscar preços dos planos
 */
const getPlanPrices = async () => {
  const result = await pool.query(`
    SELECT *
    FROM subscription_plan_prices
    WHERE active = true
    ORDER BY price_per_patient DESC
  `);

  return result.rows;
};

/**
 * Buscar eventos de features bloqueadas (para identificar oportunidades de upgrade)
 */
const getBlockedFeatureEvents = async (clinicId = null, limit = 50) => {
  let query = `
    SELECT
      sa.*,
      c.name as clinic_name,
      c.subscription_plan
    FROM subscription_analytics sa
    JOIN clinics c ON c.id = sa.clinic_id
    WHERE sa.event_type = 'feature_blocked'
  `;

  const params = [];

  if (clinicId) {
    query += ` AND sa.clinic_id = $1`;
    params.push(clinicId);
  }

  query += ` ORDER BY sa.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  getClinicSubscription,
  getAllClinicsSubscriptions,
  updateSubscriptionPlan,
  activateTrialPro,
  convertTrialToPro,
  cancelTrial,
  getTrialHistory,
  getClinicAnalytics,
  getSubscriptionStats,
  getExpiringTrials,
  expireTrials,
  getPlanPrices,
  getBlockedFeatureEvents
};
