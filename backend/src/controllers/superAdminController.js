// backend/src/controllers/superAdminController.js

const { validationResult } = require('express-validator');
const SuperAdminModel = require('../models/superAdminModel');
const BillingModel = require('../models/billingModel');

const superAdminController = {};

/**
 * Busca métricas gerais do sistema.
 */
superAdminController.getSystemMetrics = async (req, res) => {
  try {
    const [systemMetrics, financialMetrics] = await Promise.all([
      SuperAdminModel.getSystemMetrics(),
      BillingModel.getFinancialMetrics()
    ]);

    res.json({
      success: true,
      data: {
        ...systemMetrics,
        ...financialMetrics
      }
    });
  } catch (error) {
    console.error('Erro ao buscar métricas do sistema:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca todas as clínicas com informações detalhadas.
 */
superAdminController.getAllClinics = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filters = { status, search };

    const clinics = await SuperAdminModel.getAllClinicsDetailed(filters);

    res.json({
      success: true,
      data: clinics
    });
  } catch (error) {
    console.error('Erro ao buscar clínicas:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Cria nova clínica com administrador.
 */
superAdminController.createClinic = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await SuperAdminModel.createClinicWithAdmin(req.body);

    res.status(201).json({
      success: true,
      message: 'Clínica criada com sucesso.',
      data: result
    });
  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    
    if (error.code === '23505') { // Violação de unique constraint
      return res.status(400).json({
        errors: [{ msg: 'Nome de usuário já existe.' }]
      });
    }

    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Suspende uma clínica.
 */
superAdminController.suspendClinic = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { clinicId } = req.params;
    const { reason } = req.body;

    const clinic = await SuperAdminModel.suspendClinic(clinicId, reason);

    if (!clinic) {
      return res.status(404).json({
        errors: [{ msg: 'Clínica não encontrada.' }]
      });
    }

    res.json({
      success: true,
      message: 'Clínica suspensa com sucesso.',
      data: clinic
    });
  } catch (error) {
    console.error('Erro ao suspender clínica:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Reativa uma clínica.
 */
superAdminController.reactivateClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;

    const clinic = await SuperAdminModel.reactivateClinic(clinicId);

    if (!clinic) {
      return res.status(404).json({
        errors: [{ msg: 'Clínica não encontrada.' }]
      });
    }

    res.json({
      success: true,
      message: 'Clínica reativada com sucesso.',
      data: clinic
    });
  } catch (error) {
    console.error('Erro ao reativar clínica:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Atualiza limite de pacientes de uma clínica.
 */
superAdminController.updatePatientLimit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { clinicId } = req.params;
    const { maxPatients } = req.body;

    const clinic = await SuperAdminModel.updatePatientLimit(clinicId, maxPatients);

    if (!clinic) {
      return res.status(404).json({
        errors: [{ msg: 'Clínica não encontrada.' }]
      });
    }

    res.json({
      success: true,
      message: 'Limite de pacientes atualizado com sucesso.',
      data: clinic
    });
  } catch (error) {
    console.error('Erro ao atualizar limite de pacientes:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca log de atividades do sistema.
 */
superAdminController.getActivityLog = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const activities = await SuperAdminModel.getActivityLog(parseInt(limit));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Erro ao buscar log de atividades:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca estatísticas de crescimento.
 */
superAdminController.getGrowthStats = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const stats = await SuperAdminModel.getGrowthStats(parseInt(months));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de crescimento:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

// =====================================
// CONTROLLERS FINANCEIROS
// =====================================

/**
 * Busca todas as cobranças.
 */
superAdminController.getAllBillings = async (req, res) => {
  try {
    const { status, clinic_id, overdue_only, due_soon } = req.query;
    const filters = { 
      status, 
      clinic_id: clinic_id ? parseInt(clinic_id) : null,
      overdue_only: overdue_only === 'true',
      due_soon: due_soon === 'true'
    };

    const billings = await BillingModel.findAllWithClinicInfo(filters);

    res.json({
      success: true,
      data: billings
    });
  } catch (error) {
    console.error('Erro ao buscar cobranças:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Registra um pagamento.
 */
superAdminController.recordPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { billingId } = req.params;
    const paymentData = req.body;

    const billing = await BillingModel.recordPayment(billingId, paymentData);

    if (!billing) {
      return res.status(404).json({
        errors: [{ msg: 'Cobrança não encontrada.' }]
      });
    }

    res.json({
      success: true,
      message: 'Pagamento registrado com sucesso.',
      data: billing
    });
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Cria nova cobrança.
 */
superAdminController.createBilling = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { clinic_id, due_date, notes } = req.body;
    
    // Buscar o número de pacientes da clínica
    const clinic = await SuperAdminModel.getClinicById(clinic_id);
    if (!clinic) {
      return res.status(404).json({
        errors: [{ msg: 'Clínica não encontrada.' }]
      });
    }

    // Calcular valor baseado nos SLOTS CONTRATADOS: R$ 34,90 por slot
    const pricePerSlot = 34.90;
    const contractedSlots = clinic.max_patients || 0;
    
    if (contractedSlots === 0) {
      return res.status(400).json({
        errors: [{ msg: 'A clínica deve ter pelo menos 1 slot contratado para gerar cobrança.' }]
      });
    }
    
    const calculatedAmount = contractedSlots * pricePerSlot;

    const billingData = {
      clinic_id,
      due_date,
      amount: calculatedAmount,
      plan_type: 'premium',
      notes: notes || `Cobrança automática - ${contractedSlots} slots × R$ ${pricePerSlot.toFixed(2)} = R$ ${calculatedAmount.toFixed(2)}`
    };

    const billing = await BillingModel.create(billingData);

    res.status(201).json({
      success: true,
      message: 'Cobrança criada com sucesso.',
      data: {
        ...billing,
        contracted_slots: contractedSlots,
        current_patients: clinic.current_patients || 0,
        price_per_slot: pricePerSlot
      }
    });
  } catch (error) {
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca evolução da receita.
 */
superAdminController.getRevenueEvolution = async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const evolution = await BillingModel.getRevenueEvolution(parseInt(months));

    res.json({
      success: true,
      data: evolution
    });
  } catch (error) {
    console.error('Erro ao buscar evolução da receita:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Atualiza status de cobranças vencidas.
 */
superAdminController.updateOverdueStatus = async (req, res) => {
  try {
    const updatedCount = await BillingModel.updateOverdueStatus();

    res.json({
      success: true,
      message: `${updatedCount} cobranças atualizadas para vencidas.`,
      updatedCount
    });
  } catch (error) {
    console.error('Erro ao atualizar status de vencidas:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca histórico financeiro de uma clínica.
 */
superAdminController.getClinicFinancialHistory = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const history = await BillingModel.getClinicHistory(clinicId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Erro ao buscar histórico financeiro:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca alertas de vencimento e cobranças vencidas.
 */
superAdminController.getBillingAlerts = async (req, res) => {
  try {
    const { warningDays = 3 } = req.query;
    const alerts = await BillingModel.getUpcomingAndOverdueBills(parseInt(warningDays));

    // Separar por tipos de alerta
    const alertsByType = {
      suspend_now: alerts.filter(bill => bill.alert_status === 'suspend_now'),
      overdue: alerts.filter(bill => bill.alert_status === 'overdue'),
      due_soon: alerts.filter(bill => bill.alert_status === 'due_soon')
    };

    res.json({
      success: true,
      data: {
        alerts: alertsByType,
        summary: {
          total_alerts: alerts.length,
          suspend_now_count: alertsByType.suspend_now.length,
          overdue_count: alertsByType.overdue.length,
          due_soon_count: alertsByType.due_soon.length
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar alertas de cobrança:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Executa processo de atualização de status vencidas e sugere suspensões.
 */
superAdminController.processOverdueBills = async (req, res) => {
  try {
    // Atualizar status de cobranças vencidas
    const overdueResult = await BillingModel.updateOverdueStatus();
    
    // Buscar clínicas que devem ser suspensas
    const clinicsToSuspend = await BillingModel.getClinicsToSuspend();

    res.json({
      success: true,
      data: {
        updated_overdue_bills: overdueResult.updated_count,
        clinics_to_suspend: clinicsToSuspend
      }
    });
  } catch (error) {
    console.error('Erro ao processar cobranças vencidas:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Elimina uma clínica permanentemente (com efeito cascata).
 */
superAdminController.deleteClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    // Verificar se a clínica existe
    const clinic = await SuperAdminModel.getClinicById(clinicId);
    if (!clinic) {
      return res.status(404).json({
        errors: [{ msg: 'Clínica não encontrada.' }]
      });
    }

    // Eliminar com efeito cascata
    const result = await SuperAdminModel.deleteClinicCascade(clinicId);

    res.json({
      success: true,
      message: `Clínica "${clinic.name}" eliminada permanentemente.`,
      data: result
    });
  } catch (error) {
    console.error('Erro ao eliminar clínica:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Edita data de vencimento de uma cobrança.
 */
superAdminController.editBillingDueDate = async (req, res) => {
  try {
    const { billingId } = req.params;
    const { new_due_date, reason } = req.body;

    if (!new_due_date) {
      return res.status(400).json({
        errors: [{ msg: 'Nova data de vencimento é obrigatória.' }]
      });
    }

    const billing = await BillingModel.editDueDate(billingId, {
      new_due_date,
      reason: reason || 'Alteração solicitada pelo super admin'
    });

    if (!billing) {
      return res.status(404).json({
        errors: [{ msg: 'Cobrança não encontrada.' }]
      });
    }

    res.json({
      success: true,
      message: 'Data de vencimento alterada com sucesso.',
      data: billing
    });
  } catch (error) {
    console.error('Erro ao editar data de vencimento:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Migra cobranças pendentes para o modelo por slots contratados.
 */
superAdminController.migrateBillingsToSlotModel = async (req, res) => {
  try {
    const result = await BillingModel.migratePendingBillingsToSlotModel();
    
    res.json({
      success: true,
      message: `${result.updated_count} cobranças migradas com sucesso.`,
      data: {
        updated_count: result.updated_count,
        total_old_amount: result.total_old_amount,
        total_new_amount: result.total_new_amount,
        difference: result.difference,
        percentage_change: result.total_old_amount > 0 
          ? ((result.difference / result.total_old_amount) * 100).toFixed(2) 
          : 0,
        migrated_billings: result.migrated_billings
      }
    });
  } catch (error) {
    console.error('Erro ao migrar cobranças:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

module.exports = superAdminController;