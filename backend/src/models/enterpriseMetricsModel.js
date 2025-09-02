// backend/src/models/enterpriseMetricsModel.js

const pool = require('./db.js');

/**
 * Modelo para métricas empresariais avançadas e Business Intelligence.
 */
const EnterpriseMetricsModel = {

  /**
   * Busca KPIs financeiros avançados (MRR, LTV, ARR, etc.).
   */
  async getAdvancedFinancialKPIs() {
    const query = `
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', billing_date) as month,
          COUNT(DISTINCT clinic_id) as active_clinics,
          SUM(amount) as monthly_revenue,
          COUNT(*) as total_billings,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_billings,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_billings
        FROM clinic_billing 
        WHERE billing_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', billing_date)
      ),
      clinic_lifetime AS (
        SELECT 
          cb.clinic_id,
          MIN(cb.created_at) as first_billing,
          MAX(cb.created_at) as last_billing,
          COUNT(*) as total_bills,
          SUM(CASE WHEN cb.status = 'paid' THEN cb.amount ELSE 0 END) as lifetime_value,
          AVG(cb.amount) as avg_monthly_bill
        FROM clinic_billing cb
        GROUP BY cb.clinic_id
      )
      SELECT 
        -- MRR (Monthly Recurring Revenue) - Último mês
        (SELECT COALESCE(SUM(amount), 0) 
         FROM clinic_billing 
         WHERE status = 'paid' 
         AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
         AND billing_date < DATE_TRUNC('month', CURRENT_DATE)
        ) as current_mrr,
        
        -- MRR do mês anterior
        (SELECT COALESCE(SUM(amount), 0) 
         FROM clinic_billing 
         WHERE status = 'paid' 
         AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
         AND billing_date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        ) as previous_mrr,
        
        -- ARR (Annual Recurring Revenue)
        (SELECT COALESCE(SUM(amount), 0) * 12 
         FROM clinic_billing 
         WHERE status = 'paid' 
         AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
         AND billing_date < DATE_TRUNC('month', CURRENT_DATE)
        ) as arr,
        
        -- LTV médio (Customer Lifetime Value)
        (SELECT COALESCE(AVG(lifetime_value), 0) FROM clinic_lifetime) as avg_ltv,
        
        -- Tempo médio de vida do cliente (meses)
        (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (last_billing - first_billing)) / (30.44 * 24 * 3600)), 0) 
         FROM clinic_lifetime WHERE last_billing IS NOT NULL AND first_billing IS NOT NULL) as avg_customer_lifespan_months,
        
        -- Taxa de crescimento MRR
        CASE 
          WHEN (SELECT SUM(amount) FROM clinic_billing WHERE status = 'paid' 
                AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
                AND billing_date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) > 0
          THEN (
            (SELECT SUM(amount) FROM clinic_billing WHERE status = 'paid' 
             AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
             AND billing_date < DATE_TRUNC('month', CURRENT_DATE)) - 
            (SELECT SUM(amount) FROM clinic_billing WHERE status = 'paid' 
             AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
             AND billing_date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'))
          ) * 100.0 / (SELECT SUM(amount) FROM clinic_billing WHERE status = 'paid' 
                       AND billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
                       AND billing_date < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'))
          ELSE 0
        END as mrr_growth_rate,
        
        -- Revenue per customer atual
        CASE 
          WHEN (SELECT COUNT(DISTINCT clinic_id) FROM clinic_billing 
                WHERE billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) > 0
          THEN (SELECT SUM(amount) FROM clinic_billing 
                WHERE billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) / 
               (SELECT COUNT(DISTINCT clinic_id) FROM clinic_billing 
                WHERE billing_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'))
          ELSE 0
        END as revenue_per_customer,
        
        -- Taxa de pagamento (Payment Rate)
        CASE 
          WHEN (SELECT COUNT(*) FROM clinic_billing 
                WHERE due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) > 0
          THEN (SELECT COUNT(*) FROM clinic_billing 
                WHERE status = 'paid' 
                AND due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) * 100.0 /
               (SELECT COUNT(*) FROM clinic_billing 
                WHERE due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'))
          ELSE 100
        END as payment_rate
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  },

  /**
   * Busca métricas de Customer Health Score e segmentação.
   */
  async getCustomerHealthMetrics() {
    const query = `
      WITH clinic_metrics AS (
        SELECT 
          c.id,
          c.name,
          c.status,
          c.created_at,
          c.max_patients,
          
          -- Contadores atuais
          COUNT(DISTINCT p.id) as current_patients,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'terapeuta' THEN u.id END) as therapists,
          COUNT(DISTINCT CASE WHEN u.role = 'pai' THEN u.id END) as parents,
          
          -- Métricas financeiras
          COUNT(DISTINCT cb.id) as total_billings,
          COUNT(DISTINCT CASE WHEN cb.status = 'paid' THEN cb.id END) as paid_billings,
          COUNT(DISTINCT CASE WHEN cb.status = 'overdue' THEN cb.id END) as overdue_billings,
          SUM(CASE WHEN cb.status = 'paid' THEN cb.amount ELSE 0 END) as total_revenue,
          
          -- Última atividade financeira
          MAX(cb.payment_date) as last_payment_date,
          MAX(cb.due_date) as next_due_date,
          
          -- Tempo como cliente (meses)
          EXTRACT(EPOCH FROM (CURRENT_DATE - c.created_at)) / (30.44 * 24 * 3600) as customer_age_months,
          
          -- Taxa de ocupação
          CASE WHEN c.max_patients > 0 
               THEN (COUNT(DISTINCT p.id) * 100.0 / c.max_patients)
               ELSE 0 
          END as occupancy_rate
          
        FROM clinics c
        LEFT JOIN patients p ON c.id = p.clinic_id
        LEFT JOIN users u ON c.id = u.clinic_id
        LEFT JOIN clinic_billing cb ON c.id = cb.clinic_id
        WHERE c.id IS NOT NULL
        GROUP BY c.id, c.name, c.status, c.created_at, c.max_patients
      )
      SELECT 
        *,
        -- Segmentação por tamanho
        CASE 
          WHEN current_patients <= 10 THEN 'Micro'
          WHEN current_patients <= 25 THEN 'Pequeno'
          WHEN current_patients <= 50 THEN 'Médio'
          ELSE 'Grande'
        END as segment_size,
        
        -- Health Score (0-100)
        LEAST(100, GREATEST(0, 
          CASE WHEN total_billings > 0 
               THEN (paid_billings * 40.0 / total_billings) 
               ELSE 40 
          END +
          CASE WHEN occupancy_rate >= 80 THEN 30
               WHEN occupancy_rate >= 60 THEN 20
               WHEN occupancy_rate >= 40 THEN 10
               ELSE 0
          END +
          CASE WHEN customer_age_months >= 12 THEN 20
               WHEN customer_age_months >= 6 THEN 15
               WHEN customer_age_months >= 3 THEN 10
               ELSE 5
          END +
          CASE WHEN overdue_billings = 0 THEN 10
               ELSE 0
          END
        )) as health_score,
        
        -- Risk Level
        CASE 
          WHEN overdue_billings > 2 OR occupancy_rate < 20 THEN 'Alto'
          WHEN overdue_billings > 0 OR occupancy_rate < 50 THEN 'Médio'
          ELSE 'Baixo'
        END as risk_level,
        
        -- Growth Potential
        CASE 
          WHEN occupancy_rate > 90 THEN 'Alto'
          WHEN occupancy_rate > 70 THEN 'Médio'
          ELSE 'Baixo'
        END as growth_potential
        
      FROM clinic_metrics
      ORDER BY health_score DESC, total_revenue DESC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Busca análise de coortes (cohort analysis) por mês de aquisição.
   */
  async getCohortAnalysis() {
    const query = `
      WITH clinic_cohorts AS (
        SELECT 
          c.id as clinic_id,
          DATE_TRUNC('month', c.created_at) as cohort_month,
          c.created_at
        FROM clinics c
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '12 months'
      ),
      monthly_revenue AS (
        SELECT 
          cc.clinic_id,
          cc.cohort_month,
          DATE_TRUNC('month', cb.billing_date) as billing_month,
          SUM(CASE WHEN cb.status = 'paid' THEN cb.amount ELSE 0 END) as revenue
        FROM clinic_cohorts cc
        LEFT JOIN clinic_billing cb ON cc.clinic_id = cb.clinic_id
        WHERE cb.billing_date IS NOT NULL
        GROUP BY cc.clinic_id, cc.cohort_month, DATE_TRUNC('month', cb.billing_date)
      )
      SELECT 
        cohort_month,
        COUNT(DISTINCT clinic_id) as cohort_size,
        billing_month,
        EXTRACT(EPOCH FROM (billing_month - cohort_month)) / (30.44 * 24 * 3600) as months_since_start,
        COUNT(DISTINCT CASE WHEN revenue > 0 THEN clinic_id END) as active_customers,
        SUM(revenue) as cohort_revenue,
        CASE WHEN COUNT(DISTINCT clinic_id) > 0 
             THEN COUNT(DISTINCT CASE WHEN revenue > 0 THEN clinic_id END) * 100.0 / COUNT(DISTINCT clinic_id)
             ELSE 0 
        END as retention_rate
      FROM monthly_revenue
      GROUP BY cohort_month, billing_month
      ORDER BY cohort_month DESC, billing_month ASC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Busca métricas de churn e retenção.
   */
  async getChurnAnalysis() {
    const query = `
      WITH churn_data AS (
        SELECT 
          c.id,
          c.name,
          c.status,
          c.created_at,
          c.suspended_at,
          
          -- Última atividade
          MAX(cb.payment_date) as last_payment,
          MAX(cb.billing_date) as last_billing,
          COUNT(cb.id) as total_bills,
          COUNT(CASE WHEN cb.status = 'paid' THEN 1 END) as paid_bills,
          COUNT(CASE WHEN cb.status = 'overdue' THEN 1 END) as overdue_bills,
          
          -- Indicadores de churn
          CASE 
            WHEN c.status = 'suspended' THEN true
            WHEN MAX(cb.billing_date) < CURRENT_DATE - INTERVAL '60 days' THEN true
            ELSE false
          END as is_churned,
          
          CASE 
            WHEN COUNT(CASE WHEN cb.status = 'overdue' THEN 1 END) > 2 THEN true
            WHEN MAX(cb.payment_date) < CURRENT_DATE - INTERVAL '90 days' THEN true
            WHEN COUNT(CASE WHEN cb.status = 'paid' THEN 1 END) * 1.0 / NULLIF(COUNT(cb.id), 0) < 0.5 THEN true
            ELSE false
          END as at_risk
          
        FROM clinics c
        LEFT JOIN clinic_billing cb ON c.id = cb.clinic_id
        GROUP BY c.id, c.name, c.status, c.created_at, c.suspended_at
      )
      SELECT 
        -- Métricas de Churn
        COUNT(*) as total_customers,
        COUNT(CASE WHEN is_churned THEN 1 END) as churned_customers,
        COUNT(CASE WHEN at_risk THEN 1 END) as at_risk_customers,
        
        -- Taxas
        CASE WHEN COUNT(*) > 0 
             THEN COUNT(CASE WHEN is_churned THEN 1 END) * 100.0 / COUNT(*)
             ELSE 0 
        END as churn_rate,
        
        CASE WHEN COUNT(*) > 0 
             THEN COUNT(CASE WHEN at_risk THEN 1 END) * 100.0 / COUNT(*)
             ELSE 0 
        END as at_risk_rate,
        
        CASE WHEN COUNT(*) > 0 
             THEN (COUNT(*) - COUNT(CASE WHEN is_churned THEN 1 END)) * 100.0 / COUNT(*)
             ELSE 100 
        END as retention_rate,
        
        -- Tempo médio até o churn (dias)
        AVG(CASE WHEN is_churned AND suspended_at IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (COALESCE(suspended_at, CURRENT_DATE) - created_at)) / (24 * 3600)
                 ELSE NULL 
        END) as avg_days_to_churn,
        
        -- Revenue at Risk
        (SELECT SUM(cb.amount) 
         FROM clinic_billing cb 
         JOIN churn_data cd ON cb.clinic_id = cd.id 
         WHERE cd.at_risk AND cb.status IN ('pending', 'overdue')
        ) as revenue_at_risk
        
      FROM churn_data
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  },

  /**
   * Busca métricas de crescimento e expansão.
   */
  async getGrowthMetrics() {
    const query = `
      WITH growth_data AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as new_customers,
          SUM(max_patients * 34.90) as potential_mrr
        FROM clinics 
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
      ),
      expansion_data AS (
        SELECT 
          c.id,
          c.name,
          c.max_patients,
          COUNT(p.id) as current_patients,
          c.max_patients - COUNT(p.id) as available_slots,
          CASE WHEN c.max_patients > 0 
               THEN (COUNT(p.id) * 100.0 / c.max_patients)
               ELSE 0 
          END as utilization_rate
        FROM clinics c
        LEFT JOIN patients p ON c.id = p.clinic_id
        WHERE c.status = 'active'
        GROUP BY c.id, c.name, c.max_patients
      )
      SELECT 
        -- Crescimento mensal
        (SELECT COUNT(*) FROM clinics WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_customers_this_month,
        (SELECT COUNT(*) FROM clinics WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                                        AND created_at < DATE_TRUNC('month', CURRENT_DATE)) as new_customers_last_month,
        
        -- Potencial de expansão
        COUNT(CASE WHEN ed.utilization_rate > 90 THEN 1 END) as high_utilization_customers,
        COUNT(CASE WHEN ed.utilization_rate > 80 THEN 1 END) as expansion_ready_customers,
        SUM(CASE WHEN ed.utilization_rate > 90 THEN ed.available_slots * 34.90 ELSE 0 END) as immediate_expansion_potential,
        SUM(ed.available_slots * 34.90) as total_expansion_potential,
        
        -- Médias
        AVG(ed.utilization_rate) as avg_utilization_rate,
        AVG(ed.current_patients) as avg_patients_per_clinic,
        AVG(ed.max_patients) as avg_capacity_per_clinic
        
      FROM expansion_data ed
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  },

  /**
   * Busca análise de performance operacional.
   */
  async getOperationalMetrics() {
    const query = `
      WITH operational_data AS (
        SELECT 
          c.id,
          c.name,
          c.status,
          c.created_at,
          COUNT(DISTINCT p.id) as patient_count,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT CASE WHEN u.role = 'terapeuta' THEN u.id END) as therapist_count,
          COUNT(DISTINCT CASE WHEN u.role = 'pai' THEN u.id END) as parent_count,
          
          -- Última atividade (simulada - em produção seria baseada em logs de acesso)
          GREATEST(
            COALESCE(c.created_at, '1970-01-01'),
            COALESCE(MAX(cb.updated_at), '1970-01-01'),
            COALESCE(MAX(p.created_at), '1970-01-01')
          ) as last_activity,
          
          -- Métricas de engajamento (baseadas em dados disponíveis)
          COUNT(DISTINCT cb.id) as total_transactions,
          COUNT(DISTINCT CASE WHEN cb.updated_at >= CURRENT_DATE - INTERVAL '30 days' THEN cb.id END) as recent_activity
          
        FROM clinics c
        LEFT JOIN patients p ON c.id = p.clinic_id
        LEFT JOIN users u ON c.id = u.clinic_id  
        LEFT JOIN clinic_billing cb ON c.id = cb.clinic_id
        GROUP BY c.id, c.name, c.status, c.created_at
      )
      SELECT 
        -- Métricas de atividade
        COUNT(*) as total_clinics,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clinics,
        COUNT(CASE WHEN last_activity >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_last_week,
        COUNT(CASE WHEN last_activity >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_month,
        
        -- Taxas de engajamento
        CASE WHEN COUNT(*) > 0 
             THEN COUNT(CASE WHEN recent_activity > 0 THEN 1 END) * 100.0 / COUNT(*)
             ELSE 0 
        END as engagement_rate,
        
        -- Médias por clínica
        AVG(patient_count) as avg_patients_per_clinic,
        AVG(user_count) as avg_users_per_clinic,
        AVG(therapist_count) as avg_therapists_per_clinic,
        AVG(parent_count) as avg_parents_per_clinic,
        
        -- Distribuição de tamanhos
        COUNT(CASE WHEN patient_count <= 10 THEN 1 END) as micro_clinics,
        COUNT(CASE WHEN patient_count BETWEEN 11 AND 25 THEN 1 END) as small_clinics,
        COUNT(CASE WHEN patient_count BETWEEN 26 AND 50 THEN 1 END) as medium_clinics,
        COUNT(CASE WHEN patient_count > 50 THEN 1 END) as large_clinics
        
      FROM operational_data
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  }
};

module.exports = EnterpriseMetricsModel;