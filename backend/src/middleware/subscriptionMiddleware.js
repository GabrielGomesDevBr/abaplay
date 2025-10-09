const pool = require('../models/db');

/**
 * Middleware para verificar se a clínica tem acesso ao plano Pro
 * Considera trial ativo como acesso Pro temporário
 */
const requireProPlan = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        requiresAuth: true
      });
    }

    // Buscar dados de assinatura da clínica do usuário
    const result = await pool.query(`
      SELECT
        c.subscription_plan,
        c.trial_pro_enabled,
        c.trial_pro_expires_at,
        CASE
          WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN 'pro'
          ELSE c.subscription_plan
        END as effective_plan
      FROM users u
      JOIN clinics c ON c.id = u.clinic_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'Clínica não encontrada',
        requiresPro: true
      });
    }

    const { effective_plan, trial_pro_enabled, trial_pro_expires_at } = result.rows[0];

    // Verificar se tem acesso Pro (plano pro OU trial ativo)
    if (effective_plan !== 'pro') {
      return res.status(403).json({
        error: 'Este recurso está disponível apenas no plano Pro',
        currentPlan: 'scheduling',
        requiresPro: true,
        upgradeUrl: '/upgrade-to-pro'
      });
    }

    // Adicionar informações de trial ao request para uso posterior
    req.subscription = {
      plan: effective_plan,
      isTrialActive: trial_pro_enabled,
      trialExpiresAt: trial_pro_expires_at
    };

    next();
  } catch (error) {
    console.error('Erro ao verificar plano:', error);
    return res.status(500).json({
      error: 'Erro ao verificar permissões de acesso'
    });
  }
};

/**
 * Middleware para verificar se usuário é super admin
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado',
      requiresAuth: true
    });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Acesso restrito a Super Administradores',
      requiresSuperAdmin: true
    });
  }

  next();
};

/**
 * Middleware opcional - não bloqueia, apenas adiciona info de plano
 */
const addSubscriptionInfo = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next();
    }

    const result = await pool.query(`
      SELECT
        c.subscription_plan,
        c.trial_pro_enabled,
        c.trial_pro_expires_at,
        CASE
          WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN 'pro'
          ELSE c.subscription_plan
        END as effective_plan
      FROM users u
      JOIN clinics c ON c.id = u.clinic_id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length > 0) {
      req.subscription = {
        plan: result.rows[0].effective_plan,
        isTrialActive: result.rows[0].trial_pro_enabled,
        trialExpiresAt: result.rows[0].trial_pro_expires_at
      };
    }

    next();
  } catch (error) {
    // Em caso de erro, apenas log e continua
    console.error('Erro ao adicionar info de assinatura:', error);
    next();
  }
};

module.exports = {
  requireProPlan,
  requireSuperAdmin,
  addSubscriptionInfo
};
