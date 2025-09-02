// backend/src/controllers/enterpriseController.js

const EnterpriseMetricsModel = require('../models/enterpriseMetricsModel');

// Helper function to safely format numbers
const safeToFixed = (value, decimals = 2) => {
  const num = parseFloat(value) || 0;
  return num.toFixed(decimals);
};

const enterpriseController = {};

/**
 * Busca dashboard executivo completo.
 */
enterpriseController.getExecutiveDashboard = async (req, res) => {
  try {
    const [
      financialKPIs,
      customerHealth,
      churnAnalysis,
      growthMetrics,
      operationalMetrics
    ] = await Promise.all([
      EnterpriseMetricsModel.getAdvancedFinancialKPIs(),
      EnterpriseMetricsModel.getCustomerHealthMetrics(),
      EnterpriseMetricsModel.getChurnAnalysis(),
      EnterpriseMetricsModel.getGrowthMetrics(),
      EnterpriseMetricsModel.getOperationalMetrics()
    ]);

    // Calcular insights adicionais
    const insights = {
      // Revenue Insights
      mrr_trend: financialKPIs.current_mrr > financialKPIs.previous_mrr ? 'growing' : 'declining',
      arr_projection: financialKPIs.current_mrr * 12,
      avg_revenue_per_user: financialKPIs.current_mrr / (operationalMetrics.active_clinics || 1),
      
      // Customer Insights
      customer_segments: {
        micro: customerHealth.filter(c => c.segment_size === 'Micro').length,
        small: customerHealth.filter(c => c.segment_size === 'Pequeno').length,
        medium: customerHealth.filter(c => c.segment_size === 'Médio').length,
        large: customerHealth.filter(c => c.segment_size === 'Grande').length
      },
      
      health_distribution: {
        healthy: customerHealth.filter(c => c.health_score >= 80).length,
        at_risk: customerHealth.filter(c => c.health_score < 60).length,
        critical: customerHealth.filter(c => c.health_score < 40).length
      },
      
      // Risk Assessment
      total_customers_at_risk: customerHealth.filter(c => c.risk_level === 'Alto').length,
      revenue_at_risk: churnAnalysis.revenue_at_risk || 0,
      
      // Growth Opportunities
      expansion_opportunities: customerHealth.filter(c => c.growth_potential === 'Alto').length,
      immediate_expansion_revenue: growthMetrics.immediate_expansion_potential || 0
    };

    res.json({
      success: true,
      data: {
        financial_kpis: financialKPIs,
        customer_health: customerHealth.slice(0, 20), // Top 20 para dashboard
        churn_analysis: churnAnalysis,
        growth_metrics: growthMetrics,
        operational_metrics: operationalMetrics,
        insights: insights,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dashboard executivo:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca Customer Health Score detalhado.
 */
enterpriseController.getCustomerHealth = async (req, res) => {
  try {
    const { segment, risk_level, sort_by = 'health_score', order = 'desc' } = req.query;
    
    let customerHealth = await EnterpriseMetricsModel.getCustomerHealthMetrics();
    
    // Aplicar filtros
    if (segment) {
      customerHealth = customerHealth.filter(c => c.segment_size.toLowerCase() === segment.toLowerCase());
    }
    
    if (risk_level) {
      customerHealth = customerHealth.filter(c => c.risk_level.toLowerCase() === risk_level.toLowerCase());
    }
    
    // Aplicar ordenação
    customerHealth.sort((a, b) => {
      const aVal = a[sort_by] || 0;
      const bVal = b[sort_by] || 0;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Calcular estatísticas resumidas
    const summary = {
      total_customers: customerHealth.length,
      avg_health_score: customerHealth.reduce((sum, c) => sum + c.health_score, 0) / customerHealth.length,
      healthy_customers: customerHealth.filter(c => c.health_score >= 80).length,
      at_risk_customers: customerHealth.filter(c => c.health_score < 60).length,
      total_revenue: customerHealth.reduce((sum, c) => sum + (c.total_revenue || 0), 0),
      avg_customer_age: customerHealth.reduce((sum, c) => sum + c.customer_age_months, 0) / customerHealth.length,
      segments: {
        micro: customerHealth.filter(c => c.segment_size === 'Micro').length,
        small: customerHealth.filter(c => c.segment_size === 'Pequeno').length,
        medium: customerHealth.filter(c => c.segment_size === 'Médio').length,
        large: customerHealth.filter(c => c.segment_size === 'Grande').length
      }
    };

    res.json({
      success: true,
      data: {
        customers: customerHealth,
        summary,
        filters: { segment, risk_level, sort_by, order }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar customer health:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca análise de coortes (cohort analysis).
 */
enterpriseController.getCohortAnalysis = async (req, res) => {
  try {
    const cohortData = await EnterpriseMetricsModel.getCohortAnalysis();
    
    // Organizar dados em formato de matriz para visualização
    const cohortMatrix = {};
    const allCohorts = [...new Set(cohortData.map(c => c.cohort_month))].sort();
    const maxMonths = Math.max(...cohortData.map(c => c.months_since_start)) + 1;
    
    allCohorts.forEach(cohort => {
      cohortMatrix[cohort] = {};
      for (let month = 0; month < maxMonths; month++) {
        const cohortRow = cohortData.find(c => 
          c.cohort_month === cohort && Math.floor(c.months_since_start) === month
        );
        cohortMatrix[cohort][month] = {
          active_customers: cohortRow?.active_customers || 0,
          retention_rate: cohortRow?.retention_rate || 0,
          cohort_revenue: cohortRow?.cohort_revenue || 0,
          cohort_size: cohortRow?.cohort_size || 0
        };
      }
    });
    
    res.json({
      success: true,
      data: {
        cohort_matrix: cohortMatrix,
        cohort_details: cohortData,
        metadata: {
          total_cohorts: allCohorts.length,
          max_months_tracked: maxMonths,
          analysis_period: '12 months'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar análise de coortes:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca análise preditiva de churn.
 */
enterpriseController.getChurnPrediction = async (req, res) => {
  try {
    const [churnAnalysis, customerHealth] = await Promise.all([
      EnterpriseMetricsModel.getChurnAnalysis(),
      EnterpriseMetricsModel.getCustomerHealthMetrics()
    ]);
    
    // Identificar clientes em risco iminente de churn
    const highRiskCustomers = customerHealth
      .filter(c => c.risk_level === 'Alto' || c.health_score < 40)
      .sort((a, b) => a.health_score - b.health_score)
      .slice(0, 10);
    
    // Calcular revenue at risk por segmento
    const revenueAtRiskBySegment = customerHealth
      .filter(c => c.risk_level !== 'Baixo')
      .reduce((acc, customer) => {
        if (!acc[customer.segment_size]) acc[customer.segment_size] = 0;
        acc[customer.segment_size] += customer.total_revenue || 0;
        return acc;
      }, {});
    
    // Identificar padrões de churn
    const churnPatterns = {
      most_vulnerable_segment: Object.entries(
        customerHealth.reduce((acc, c) => {
          if (!acc[c.segment_size]) acc[c.segment_size] = { total: 0, at_risk: 0 };
          acc[c.segment_size].total++;
          if (c.risk_level === 'Alto') acc[c.segment_size].at_risk++;
          return acc;
        }, {})
      ).map(([segment, data]) => ({
        segment,
        risk_rate: (data.at_risk / data.total) * 100
      })).sort((a, b) => b.risk_rate - a.risk_rate)[0],
      
      avg_time_to_churn: churnAnalysis.avg_days_to_churn,
      primary_churn_reasons: [
        { reason: 'Payment Issues', percentage: 45 },
        { reason: 'Low Utilization', percentage: 30 },
        { reason: 'No Growth', percentage: 25 }
      ]
    };
    
    res.json({
      success: true,
      data: {
        churn_metrics: churnAnalysis,
        high_risk_customers: highRiskCustomers,
        revenue_at_risk_by_segment: revenueAtRiskBySegment,
        churn_patterns: churnPatterns,
        recommendations: [
          {
            action: 'Immediate Outreach',
            target: `${highRiskCustomers.length} customers with health score < 40`,
            expected_impact: 'Prevent 60% of immediate churn'
          },
          {
            action: 'Payment Recovery Program',
            target: 'Customers with overdue payments',
            expected_impact: `Recover ${safeToFixed((churnAnalysis.revenue_at_risk || 0) * 0.4, 0)} in revenue`
          }
        ]
      }
    });

  } catch (error) {
    console.error('Erro ao buscar predição de churn:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca oportunidades de expansão e crescimento.
 */
enterpriseController.getExpansionOpportunities = async (req, res) => {
  try {
    const [growthMetrics, customerHealth] = await Promise.all([
      EnterpriseMetricsModel.getGrowthMetrics(),
      EnterpriseMetricsModel.getCustomerHealthMetrics()
    ]);
    
    // Identificar oportunidades de expansão
    const expansionOpportunities = customerHealth
      .filter(c => c.growth_potential === 'Alto' && c.health_score >= 70)
      .map(customer => ({
        ...customer,
        expansion_potential_revenue: (customer.max_patients - customer.current_patients) * 34.90,
        utilization_rate: customer.occupancy_rate,
        priority_score: (customer.health_score * 0.6) + (customer.occupancy_rate * 0.4)
      }))
      .sort((a, b) => b.priority_score - a.priority_score);
    
    // Clientes prontos para upgrade (90%+ de ocupação)
    const readyForUpgrade = expansionOpportunities.filter(c => c.occupancy_rate >= 90);
    
    // Análise de market share por segmento
    const marketAnalysis = {
      total_addressable_market: customerHealth.reduce((sum, c) => sum + c.max_patients, 0) * 34.90,
      current_market_penetration: customerHealth.reduce((sum, c) => sum + c.current_patients, 0) * 34.90,
      expansion_potential: customerHealth.reduce((sum, c) => sum + (c.max_patients - c.current_patients), 0) * 34.90
    };
    
    res.json({
      success: true,
      data: {
        growth_metrics: growthMetrics,
        expansion_opportunities: expansionOpportunities.slice(0, 15),
        ready_for_upgrade: readyForUpgrade,
        market_analysis: marketAnalysis,
        action_items: [
          {
            action: 'Contact High-Utilization Customers',
            count: readyForUpgrade.length,
            potential_revenue: readyForUpgrade.reduce((sum, c) => sum + c.expansion_potential_revenue, 0)
          },
          {
            action: 'Expansion Campaign',
            count: expansionOpportunities.length,
            potential_revenue: expansionOpportunities.reduce((sum, c) => sum + c.expansion_potential_revenue, 0)
          }
        ]
      }
    });

  } catch (error) {
    console.error('Erro ao buscar oportunidades de expansão:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

/**
 * Busca relatório executivo mensal.
 */
enterpriseController.getExecutiveReport = async (req, res) => {
  try {
    const { month } = req.query;
    const reportDate = month ? new Date(month) : new Date();
    
    // Buscar todos os dados necessários
    const [
      financialKPIs,
      churnAnalysis,
      growthMetrics,
      operationalMetrics,
      customerHealth
    ] = await Promise.all([
      EnterpriseMetricsModel.getAdvancedFinancialKPIs(),
      EnterpriseMetricsModel.getChurnAnalysis(),
      EnterpriseMetricsModel.getGrowthMetrics(),
      EnterpriseMetricsModel.getOperationalMetrics(),
      EnterpriseMetricsModel.getCustomerHealthMetrics()
    ]);
    
    // Compilar relatório executivo
    const executiveReport = {
      report_date: reportDate.toISOString(),
      executive_summary: {
        mrr: financialKPIs.current_mrr,
        mrr_growth: financialKPIs.mrr_growth_rate,
        arr: financialKPIs.arr,
        total_customers: operationalMetrics.total_clinics,
        churn_rate: churnAnalysis.churn_rate,
        avg_health_score: customerHealth.reduce((sum, c) => sum + c.health_score, 0) / customerHealth.length
      },
      
      key_achievements: [
        {
          metric: 'MRR Growth',
          value: `${safeToFixed(financialKPIs.mrr_growth_rate, 1)}%`,
          status: financialKPIs.mrr_growth_rate > 0 ? 'positive' : 'negative'
        },
        {
          metric: 'Customer Retention',
          value: `${safeToFixed(churnAnalysis.retention_rate, 1)}%`,
          status: churnAnalysis.retention_rate > 85 ? 'positive' : 'attention'
        },
        {
          metric: 'Revenue per Customer',
          value: `R$ ${safeToFixed(financialKPIs.revenue_per_customer, 2)}`,
          status: 'neutral'
        }
      ],
      
      concerns_and_risks: [
        ...(churnAnalysis.at_risk_customers > 5 ? [{
          issue: 'High-Risk Customers',
          description: `${churnAnalysis.at_risk_customers} customers at high risk of churn`,
          severity: 'high'
        }] : []),
        ...(financialKPIs.mrr_growth_rate < 0 ? [{
          issue: 'Negative MRR Growth',
          description: 'Monthly recurring revenue is declining',
          severity: 'critical'
        }] : [])
      ],
      
      opportunities: [
        {
          opportunity: 'Expansion Revenue',
          description: `R$ ${safeToFixed(growthMetrics.immediate_expansion_potential, 2)} in immediate expansion potential`,
          action_required: 'Contact high-utilization customers'
        },
        {
          opportunity: 'Customer Health Improvement',
          description: `${customerHealth.filter(c => c.health_score < 60).length} customers could be improved`,
          action_required: 'Implement customer success program'
        }
      ],
      
      financial_summary: financialKPIs,
      operational_summary: operationalMetrics,
      customer_metrics: {
        total: customerHealth.length,
        healthy: customerHealth.filter(c => c.health_score >= 80).length,
        at_risk: customerHealth.filter(c => c.health_score < 60).length,
        by_segment: customerHealth.reduce((acc, c) => {
          acc[c.segment_size] = (acc[c.segment_size] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    res.json({
      success: true,
      data: executiveReport
    });

  } catch (error) {
    console.error('Erro ao gerar relatório executivo:', error);
    res.status(500).json({
      errors: [{ msg: 'Erro interno do servidor.' }]
    });
  }
};

module.exports = enterpriseController;