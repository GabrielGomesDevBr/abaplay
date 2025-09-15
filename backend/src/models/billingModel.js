// backend/src/models/billingModel.js

const pool = require('./db.js');

/**
 * Modelo para interagir com a tabela 'clinic_billing' no banco de dados.
 */
const BillingModel = {
  
  /**
   * Cria uma nova cobrança para uma clínica.
   * @param {object} billingData - Os dados da cobrança.
   * @returns {Promise<object>} O novo objeto da cobrança criada.
   */
  async create(billingData) {
    const {
      clinic_id,
      due_date,
      amount,
      plan_type = 'per_patient',
      notes = null
    } = billingData;

    const query = `
      INSERT INTO clinic_billing (
        clinic_id, due_date, amount, plan_type, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [clinic_id, due_date, amount, plan_type, notes];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /**
   * Busca todas as cobranças com informações das clínicas.
   * @param {object} filters - Filtros opcionais (status, clinic_id, etc.).
   * @returns {Promise<Array<object>>} Lista de cobranças.
   */
  async findAllWithClinicInfo(filters = {}) {
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    if (filters.status) {
      whereConditions.push(`cb.status = $${valueIndex++}`);
      values.push(filters.status);
    }

    if (filters.clinic_id) {
      whereConditions.push(`cb.clinic_id = $${valueIndex++}`);
      values.push(filters.clinic_id);
    }

    if (filters.overdue_only) {
      whereConditions.push(`cb.due_date < CURRENT_DATE AND cb.status = 'pending'`);
    }

    if (filters.due_soon) {
      whereConditions.push(`cb.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 days' AND cb.status = 'pending'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        cb.*,
        c.name as clinic_name,
        c.status as clinic_status,
        c.max_patients,
        (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id) as current_patients
      FROM clinic_billing cb
      JOIN clinics c ON cb.clinic_id = c.id
      ${whereClause}
      ORDER BY cb.due_date ASC, cb.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /**
   * Registra um pagamento para uma cobrança.
   * @param {number} billingId - ID da cobrança.
   * @param {object} paymentData - Dados do pagamento.
   * @returns {Promise<object>} Cobrança atualizada.
   */
  async recordPayment(billingId, paymentData) {
    const {
      payment_date = new Date().toISOString().split('T')[0],
      payment_method,
      notes
    } = paymentData;

    const query = `
      UPDATE clinic_billing 
      SET 
        status = 'paid',
        payment_date = $1,
        payment_method = $2,
        notes = COALESCE($3, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const values = [payment_date, payment_method, notes, billingId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /**
   * Atualiza status das cobranças vencidas.
   * @returns {Promise<number>} Número de cobranças atualizadas.
   */
  async updateOverdueStatus() {
    const query = `
      UPDATE clinic_billing 
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'pending' AND due_date < CURRENT_DATE
    `;

    const { rowCount } = await pool.query(query);
    return rowCount;
  },

  /**
   * Busca métricas financeiras gerais.
   * @returns {Promise<object>} Métricas financeiras.
   */
  async getFinancialMetrics() {
    const query = `
      WITH contracted_revenue AS (
        -- Calcular MRR baseado nos SLOTS CONTRATADOS (max_patients), não pacientes ativos
        SELECT 
          c.id as clinic_id,
          c.name as clinic_name,
          c.status as clinic_status,
          c.max_patients as contracted_slots,
          COALESCE((SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id), 0) as current_patients,
          c.max_patients * 34.90 as monthly_contracted_revenue
        FROM clinics c 
        WHERE c.status = 'active'
      ),
      billing_summary AS (
        SELECT 
          -- Total pendente (cobranças não pagas)
          ROUND(CAST(SUM(CASE WHEN cb.status = 'pending' THEN cb.amount ELSE 0 END) AS NUMERIC), 2) as pending_amount,
          
          -- Total vencido
          ROUND(CAST(SUM(CASE WHEN cb.status = 'overdue' THEN cb.amount ELSE 0 END) AS NUMERIC), 2) as overdue_amount,
          
          -- Total pago no último mês (para comparação)
          ROUND(CAST(SUM(CASE WHEN cb.status = 'paid' AND cb.payment_date >= CURRENT_DATE - INTERVAL '30 days' THEN cb.amount ELSE 0 END) AS NUMERIC), 2) as last_month_revenue,
          
          -- Contadores
          COUNT(CASE WHEN cb.status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN cb.status = 'overdue' THEN 1 END) as overdue_count,
          COUNT(CASE WHEN cb.status = 'paid' THEN 1 END) as paid_count,
          
          -- Taxa de inadimplência
          ROUND(
            CAST((COUNT(CASE WHEN cb.status = 'overdue' THEN 1 END)::FLOAT / 
             NULLIF(COUNT(CASE WHEN cb.status IN ('pending', 'overdue', 'paid') THEN 1 END), 0)) * 100 AS NUMERIC), 
            2
          ) as default_rate,
          
          -- Vencimentos próximos (5 dias)
          COUNT(CASE WHEN cb.status = 'pending' AND cb.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 days' THEN 1 END) as due_soon_count
          
        FROM clinic_billing cb
        WHERE cb.created_at >= CURRENT_DATE - INTERVAL '12 months'
      )
      SELECT 
        -- MRR real baseado nos SLOTS CONTRATADOS (R$ 34,90 por slot contratado)
        ROUND(CAST(COALESCE((SELECT SUM(monthly_contracted_revenue) FROM contracted_revenue), 0) AS NUMERIC), 2) as monthly_revenue,
        
        -- Métricas de cobrança
        COALESCE(bs.pending_amount, 0) as pending_amount,
        COALESCE(bs.overdue_amount, 0) as overdue_amount,
        COALESCE(bs.last_month_revenue, 0) as last_month_revenue,
        
        -- Contadores
        COALESCE(bs.pending_count, 0) as pending_count,
        COALESCE(bs.overdue_count, 0) as overdue_count,
        COALESCE(bs.paid_count, 0) as paid_count,
        COALESCE(bs.default_rate, 0) as default_rate,
        COALESCE(bs.due_soon_count, 0) as due_soon_count,
        
        -- Métricas adicionais do modelo de negócio de assinatura
        COALESCE((SELECT COUNT(*) FROM contracted_revenue WHERE clinic_status = 'active'), 0) as active_clinics_with_contracts,
        COALESCE((SELECT SUM(contracted_slots) FROM contracted_revenue), 0) as total_contracted_slots,
        COALESCE((SELECT SUM(current_patients) FROM contracted_revenue), 0) as total_active_patients,
        
        -- Métricas de utilização
        ROUND(CAST(
          COALESCE((SELECT SUM(current_patients) FROM contracted_revenue), 0)::FLOAT / 
          NULLIF(COALESCE((SELECT SUM(contracted_slots) FROM contracted_revenue), 0), 0) * 100
        AS NUMERIC), 2) as utilization_rate
        
      FROM billing_summary bs
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  },

  /**
   * Migra cobranças pendentes para o modelo por slots contratados.
   * @returns {Promise<object>} Resultado da migração.
   */
  async migratePendingBillingsToSlotModel() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Buscar cobranças pendentes com valores do modelo antigo
      const pendingBillingsQuery = `
        SELECT 
          cb.id,
          cb.clinic_id,
          cb.amount as old_amount,
          c.max_patients,
          c.name as clinic_name,
          c.max_patients * 34.90 as new_amount
        FROM clinic_billing cb
        JOIN clinics c ON cb.clinic_id = c.id
        WHERE cb.status IN ('pending', 'overdue')
        AND cb.notes NOT LIKE '%Migrado para modelo por slots%'
        ORDER BY cb.created_at DESC
      `;
      
      const pendingResult = await client.query(pendingBillingsQuery);
      const pendingBillings = pendingResult.rows;
      
      let updatedCount = 0;
      let totalOldAmount = 0;
      let totalNewAmount = 0;
      
      for (const billing of pendingBillings) {
        const updateQuery = `
          UPDATE clinic_billing 
          SET 
            amount = $1,
            plan_type = 'per_patient',
            notes = COALESCE(notes, '') || ' | Migrado para modelo por slots: ' || $2 || ' slots × R$ 34,90',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `;
        
        await client.query(updateQuery, [
          billing.new_amount,
          billing.max_patients,
          billing.id
        ]);
        
        updatedCount++;
        totalOldAmount += parseFloat(billing.old_amount);
        totalNewAmount += parseFloat(billing.new_amount);
      }
      
      await client.query('COMMIT');
      
      return {
        updated_count: updatedCount,
        total_old_amount: totalOldAmount,
        total_new_amount: totalNewAmount,
        difference: totalNewAmount - totalOldAmount,
        migrated_billings: pendingBillings
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Busca evolução da receita por mês.
   * @param {number} months - Número de meses para buscar (padrão: 12).
   * @returns {Promise<Array<object>>} Evolução mensal.
   */
  async getRevenueEvolution(months = 12) {
    const query = `
      WITH months_series AS (
        SELECT 
          TO_CHAR(generate_series(
            CURRENT_DATE - INTERVAL '${months} months',
            CURRENT_DATE,
            '1 month'::interval
          ), 'YYYY-MM') as month,
          TO_CHAR(generate_series(
            CURRENT_DATE - INTERVAL '${months} months',
            CURRENT_DATE,
            '1 month'::interval
          ), 'Mon/YY') as month_label
      )
      SELECT 
        ms.month,
        ms.month_label,
        COALESCE(ROUND(CAST(SUM(cb.amount) AS NUMERIC), 2), 0) as revenue,
        COALESCE(COUNT(cb.id), 0) as payments_count
      FROM months_series ms
      LEFT JOIN clinic_billing cb ON TO_CHAR(cb.payment_date, 'YYYY-MM') = ms.month
        AND cb.status = 'paid'
      GROUP BY ms.month, ms.month_label
      ORDER BY ms.month ASC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Busca histórico financeiro de uma clínica específica.
   * @param {number} clinicId - ID da clínica.
   * @returns {Promise<Array<object>>} Histórico da clínica.
   */
  async getClinicHistory(clinicId) {
    const query = `
      SELECT *
      FROM clinic_billing
      WHERE clinic_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [clinicId]);
    return rows;
  },

  /**
   * Deleta uma cobrança.
   * @param {number} billingId - ID da cobrança.
   * @returns {Promise<number>} Número de linhas afetadas.
   */
  async delete(billingId) {
    const query = `DELETE FROM clinic_billing WHERE id = $1`;
    const { rowCount } = await pool.query(query, [billingId]);
    return rowCount;
  },

  /**
   * Busca cobranças próximas do vencimento ou vencidas.
   * @param {number} warningDays - Dias antes do vencimento para alertar (padrão: 3).
   * @returns {Promise<Array<object>>} Lista de cobranças com alertas.
   */
  async getUpcomingAndOverdueBills(warningDays = 3) {
    const query = `
      SELECT 
        cb.*,
        c.name as clinic_name,
        c.status as clinic_status,
        CASE
          WHEN cb.due_date < CURRENT_DATE THEN 
            CURRENT_DATE - cb.due_date
          ELSE 0
        END as days_overdue,
        CASE
          WHEN cb.due_date >= CURRENT_DATE THEN 
            cb.due_date - CURRENT_DATE
          ELSE 0
        END as days_until_due,
        CASE
          WHEN cb.due_date < CURRENT_DATE - INTERVAL '10 days' THEN 'suspend_now'
          WHEN cb.due_date < CURRENT_DATE THEN 'overdue'
          WHEN cb.due_date <= CURRENT_DATE + INTERVAL '${warningDays} days' THEN 'due_soon'
          ELSE 'normal'
        END as alert_status
      FROM clinic_billing cb
      JOIN clinics c ON cb.clinic_id = c.id
      WHERE cb.status IN ('pending', 'overdue')
        AND (
          cb.due_date <= CURRENT_DATE + INTERVAL '${warningDays} days'
          OR cb.due_date < CURRENT_DATE
        )
      ORDER BY 
        CASE 
          WHEN cb.due_date < CURRENT_DATE - INTERVAL '10 days' THEN 1
          WHEN cb.due_date < CURRENT_DATE THEN 2
          WHEN cb.due_date <= CURRENT_DATE + INTERVAL '${warningDays} days' THEN 3
          ELSE 4
        END,
        cb.due_date ASC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Atualiza status de cobranças vencidas.
   * @returns {Promise<object>} Resultado da atualização.
   */
  async updateOverdueStatus() {
    const query = `
      UPDATE clinic_billing 
      SET status = 'overdue'
      WHERE status = 'pending' 
        AND due_date < CURRENT_DATE
      RETURNING id, clinic_id, due_date
    `;

    const { rows } = await pool.query(query);
    return {
      updated_count: rows.length,
      updated_bills: rows
    };
  },

  /**
   * Busca clínicas que devem ser suspensas (>10 dias de atraso).
   * @returns {Promise<Array<object>>} Lista de clínicas para suspender.
   */
  async getClinicsToSuspend() {
    const query = `
      SELECT 
        c.id as clinic_id,
        c.name as clinic_name,
        c.status as clinic_status,
        cb.id as billing_id,
        cb.due_date,
        cb.amount,
        CURRENT_DATE - cb.due_date as days_overdue
      FROM clinic_billing cb
      JOIN clinics c ON cb.clinic_id = c.id
      WHERE cb.status = 'overdue' 
        AND cb.due_date < CURRENT_DATE - INTERVAL '10 days'
        AND c.status = 'active'
      ORDER BY cb.due_date ASC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Edita a data de vencimento de uma cobrança.
   * @param {number} billingId - ID da cobrança.
   * @param {object} dueDateData - Dados da nova data.
   * @returns {Promise<object>} Cobrança atualizada.
   */
  async editDueDate(billingId, dueDateData) {
    const { new_due_date, reason } = dueDateData;
    
    const query = `
      UPDATE clinic_billing 
      SET 
        due_date = $1,
        notes = COALESCE(notes || E'\n\n', '') || 'DATA ALTERADA: ' || CURRENT_TIMESTAMP || ' - ' || $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const values = [new_due_date, reason, billingId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
};

module.exports = BillingModel;