const subscriptionModel = require('../models/subscriptionModel');

/**
 * Controller para gerenciamento de assinaturas e planos
 */

/**
 * Buscar informações de assinatura da clínica do usuário logado
 */
const getMySubscription = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;

    if (!clinicId) {
      return res.status(400).json({ error: 'Usuário não associado a uma clínica' });
    }

    const subscription = await subscriptionModel.getClinicSubscription(clinicId);

    if (!subscription) {
      return res.status(404).json({ error: 'Informações de assinatura não encontradas' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro ao buscar informações de assinatura' });
  }
};

/**
 * Buscar todas assinaturas (SuperAdmin)
 */
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await subscriptionModel.getAllClinicsSubscriptions();
    res.json(subscriptions);
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error);
    res.status(500).json({ error: 'Erro ao buscar assinaturas' });
  }
};

/**
 * Atualizar plano de assinatura (SuperAdmin)
 */
const updatePlan = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { planName } = req.body;

    if (!planName || !['pro', 'scheduling'].includes(planName)) {
      return res.status(400).json({ error: 'Plano inválido. Use "pro" ou "scheduling"' });
    }

    const updated = await subscriptionModel.updateSubscriptionPlan(clinicId, planName);

    if (!updated) {
      return res.status(404).json({ error: 'Clínica não encontrada' });
    }

    res.json({
      message: 'Plano atualizado com sucesso',
      subscription: updated
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
};

/**
 * Ativar trial Pro (SuperAdmin)
 */
const activateTrial = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { durationDays = 7 } = req.body;
    const activatedBy = req.user.id;

    if (durationDays < 1 || durationDays > 30) {
      return res.status(400).json({ error: 'Duração deve estar entre 1 e 30 dias' });
    }

    const result = await subscriptionModel.activateTrialPro(clinicId, activatedBy, durationDays);

    if (!result || !result.success) {
      return res.status(400).json({ error: result?.message || 'Erro ao ativar trial' });
    }

    res.json({
      message: result.message,
      expiresAt: result.expires_at
    });
  } catch (error) {
    console.error('Erro ao ativar trial:', error);
    res.status(500).json({ error: 'Erro ao ativar trial' });
  }
};

/**
 * Converter trial em Pro (SuperAdmin ou Auto)
 */
const convertTrial = async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await subscriptionModel.convertTrialToPro(clinicId);

    if (!result || !result.success) {
      return res.status(400).json({ error: result?.message || 'Erro ao converter trial' });
    }

    res.json({
      message: result.message
    });
  } catch (error) {
    console.error('Erro ao converter trial:', error);
    res.status(500).json({ error: 'Erro ao converter trial' });
  }
};

/**
 * Cancelar trial (SuperAdmin)
 */
const cancelTrial = async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await subscriptionModel.cancelTrial(clinicId);

    if (!result) {
      return res.status(404).json({ error: 'Trial não encontrado ou já cancelado' });
    }

    res.json({
      message: 'Trial cancelado com sucesso',
      subscription: result
    });
  } catch (error) {
    console.error('Erro ao cancelar trial:', error);
    res.status(500).json({ error: 'Erro ao cancelar trial' });
  }
};

/**
 * Buscar histórico de trials de uma clínica (SuperAdmin)
 */
const getTrialHistory = async (req, res) => {
  try {
    const { clinicId } = req.params;

    const history = await subscriptionModel.getTrialHistory(clinicId);

    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico de trials:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

/**
 * Buscar analytics de assinatura (SuperAdmin)
 */
const getAnalytics = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { limit = 100 } = req.query;

    const analytics = await subscriptionModel.getClinicAnalytics(clinicId, parseInt(limit));

    res.json(analytics);
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    res.status(500).json({ error: 'Erro ao buscar analytics' });
  }
};

/**
 * Buscar estatísticas gerais (SuperAdmin Dashboard)
 */
const getStats = async (req, res) => {
  try {
    const stats = await subscriptionModel.getSubscriptionStats();

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

/**
 * Buscar trials que expiram em breve (SuperAdmin)
 */
const getExpiringTrials = async (req, res) => {
  try {
    const { daysAhead = 3 } = req.query;

    const trials = await subscriptionModel.getExpiringTrials(parseInt(daysAhead));

    res.json(trials);
  } catch (error) {
    console.error('Erro ao buscar trials expirando:', error);
    res.status(500).json({ error: 'Erro ao buscar trials' });
  }
};

/**
 * Buscar preços dos planos
 */
const getPlanPrices = async (req, res) => {
  try {
    const prices = await subscriptionModel.getPlanPrices();
    res.json(prices);
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    res.status(500).json({ error: 'Erro ao buscar preços' });
  }
};

/**
 * Buscar eventos de features bloqueadas (oportunidades de upgrade)
 */
const getBlockedFeatures = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { limit = 50 } = req.query;

    const events = await subscriptionModel.getBlockedFeatureEvents(
      clinicId || null,
      parseInt(limit)
    );

    res.json(events);
  } catch (error) {
    console.error('Erro ao buscar features bloqueadas:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
};

module.exports = {
  getMySubscription,
  getAllSubscriptions,
  updatePlan,
  activateTrial,
  convertTrial,
  cancelTrial,
  getTrialHistory,
  getAnalytics,
  getStats,
  getExpiringTrials,
  getPlanPrices,
  getBlockedFeatures
};
