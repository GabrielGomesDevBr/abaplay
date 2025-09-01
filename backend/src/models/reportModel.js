const pool = require('./db');

const ReportModel = {

  /**
   * Buscar todos os dados necessários para o relatório de evolução terapêutica
   */
  async getCompleteReportData(patientId, userId) {
    try {
      // Query principal para buscar dados do paciente, clínica e terapeuta
      const mainQuery = `
        SELECT 
          -- Dados do paciente
          p.id, p.name, p.dob, p.diagnosis, p.general_notes,
          p.guardian_name, p.guardian_relationship, p.patient_occupation,
          p.main_complaint, p.treatment_objectives, p.created_at,
          
          -- Dados da clínica
          c.name as clinic_name,
          
          -- Dados do terapeuta
          u.full_name as therapist_name, u.professional_id,
          u.qualifications, u.professional_signature
          
        FROM patients p
        JOIN clinics c ON p.clinic_id = c.id
        LEFT JOIN users u ON u.id = $2
        WHERE p.id = $1
      `;
      
      const mainResult = await pool.query(mainQuery, [patientId, userId]);
      
      if (mainResult.rows.length === 0) {
        return null;
      }
      
      const reportData = mainResult.rows[0];
      
      // Buscar programas ativos do paciente
      const programsQuery = `
        SELECT 
          p.id as program_id, p.name as program_name, p.objective,
          p.procedure, pa.name as program_area, d.name as discipline_name,
          ppa.id as assignment_id, ppa.status
        FROM patient_program_assignments ppa
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE ppa.patient_id = $1 AND ppa.status = 'active'
        ORDER BY d.name, pa.name, p.name
      `;
      
      const programsResult = await pool.query(programsQuery, [patientId]);
      reportData.active_programs = programsResult.rows;
      
      // Buscar sessões recentes (últimos 30 dias por padrão)
      const sessionsQuery = `
        SELECT 
          ppp.id, ppp.assignment_id, ppp.session_date, ppp.score,
          ppp.attempts, ppp.successes, ppp.details, ppp.created_at,
          p.name as program_name, pa.name as program_area
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        WHERE ppa.patient_id = $1 
          AND ppp.session_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY ppp.session_date DESC, ppp.created_at DESC
      `;
      
      const sessionsResult = await pool.query(sessionsQuery, [patientId]);
      reportData.recent_sessions = sessionsResult.rows.map(session => ({
        ...session,
        score: parseFloat(session.score) || 0,
        notes: session.details?.notes || '',
        prompt_level: session.details?.promptLevel || null,
        prompt_level_name: session.details?.promptLevelName || '',
        teaching_modality: session.details?.teachingModality || ''
      }));
      
      return reportData;
      
    } catch (error) {
      console.error('Erro ao buscar dados completos do relatório:', error);
      throw error;
    }
  },

  /**
   * Atualizar dados profissionais do usuário
   */
  async updateUserProfessionalData(userId, professionalData) {
    try {
      const query = `
        UPDATE users 
        SET 
          professional_id = $1,
          qualifications = $2,
          professional_signature = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, full_name, professional_id, qualifications, professional_signature
      `;
      
      const result = await pool.query(query, [
        professionalData.professional_id,
        professionalData.qualifications,
        professionalData.professional_signature,
        userId
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      console.error('Erro ao atualizar dados profissionais:', error);
      throw error;
    }
  },

  /**
   * Atualizar dados complementares do paciente
   */
  async updatePatientComplementaryData(patientId, userId, patientData) {
    try {
      const query = `
        UPDATE patients 
        SET 
          guardian_name = $1,
          guardian_relationship = $2,
          patient_occupation = $3,
          main_complaint = $4,
          treatment_objectives = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, name, guardian_name, guardian_relationship, 
                  patient_occupation, main_complaint, treatment_objectives
      `;
      
      const result = await pool.query(query, [
        patientData.guardian_name,
        patientData.guardian_relationship,
        patientData.patient_occupation,
        patientData.main_complaint,
        patientData.treatment_objectives,
        patientId
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      console.error('Erro ao atualizar dados complementares do paciente:', error);
      throw error;
    }
  },

  /**
   * Gerar análise automática baseada nos dados das sessões
   */
  async generateAutomaticAnalysis(patientId, userId, options = {}) {
    try {
      const { startDate, endDate, programIds } = options;
      
      // Definir período padrão (últimos 30 dias)
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      
      let programFilter = '';
      let queryParams = [patientId];
      
      if (programIds && programIds.length > 0) {
        programFilter = 'AND ppa.program_id = ANY($3)';
        queryParams.push(programIds);
      }
      
      // Query para análise estatística das sessões
      const analysisQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          AVG(ppp.score::numeric) as avg_score,
          MIN(ppp.score::numeric) as min_score,
          MAX(ppp.score::numeric) as max_score,
          COUNT(DISTINCT ppa.program_id) as programs_worked,
          
          -- Análise de prompt levels
          AVG(CASE 
            WHEN (ppp.details->>'promptLevel')::int = 5 THEN 1 
            ELSE 0 
          END) * 100 as independence_percentage,
          
          -- Análise de modalidades de ensino
          COUNT(CASE 
            WHEN ppp.details->>'teachingModality' = 'dtt' THEN 1 
          END) as dtt_sessions,
          
          -- Análise temporal
          MIN(ppp.session_date) as first_session_date,
          MAX(ppp.session_date) as last_session_date,
          
          -- Tendência de melhoria (comparar primeira e segunda metade)
          AVG(CASE 
            WHEN ppp.session_date <= (
              SELECT MIN(session_date) + (MAX(session_date) - MIN(session_date)) / 2
              FROM patient_program_progress ppp2
              JOIN patient_program_assignments ppa2 ON ppp2.assignment_id = ppa2.id
              WHERE ppa2.patient_id = $1
            ) THEN ppp.score::numeric
          END) as first_half_avg,
          
          AVG(CASE 
            WHEN ppp.session_date > (
              SELECT MIN(session_date) + (MAX(session_date) - MIN(session_date)) / 2
              FROM patient_program_progress ppp2
              JOIN patient_program_assignments ppa2 ON ppp2.assignment_id = ppa2.id
              WHERE ppa2.patient_id = $1
            ) THEN ppp.score::numeric
          END) as second_half_avg
          
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        WHERE ppa.patient_id = $1 
          AND ppp.session_date >= $2
          ${programFilter}
      `;
      
      queryParams.splice(1, 0, startDate || defaultStartDate);
      
      const analysisResult = await pool.query(analysisQuery, queryParams);
      const stats = analysisResult.rows[0];
      
      // Buscar observações mais frequentes
      const notesQuery = `
        SELECT 
          ppp.details->>'notes' as note,
          COUNT(*) as frequency
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        WHERE ppa.patient_id = $1 
          AND ppp.session_date >= $2
          AND ppp.details->>'notes' IS NOT NULL
          AND LENGTH(ppp.details->>'notes') > 0
        GROUP BY ppp.details->>'notes'
        ORDER BY frequency DESC
        LIMIT 10
      `;
      
      const notesResult = await pool.query(notesQuery, [
        patientId, 
        startDate || defaultStartDate
      ]);
      
      // Buscar performance por área de programa
      const areaPerformanceQuery = `
        SELECT 
          pa.name as area_name,
          AVG(ppp.score::numeric) as avg_score,
          COUNT(*) as session_count,
          MIN(ppp.session_date) as first_session,
          MAX(ppp.session_date) as last_session
        FROM patient_program_progress ppp
        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        WHERE ppa.patient_id = $1 
          AND ppp.session_date >= $2
        GROUP BY pa.name
        ORDER BY avg_score DESC
      `;
      
      const areaPerformanceResult = await pool.query(areaPerformanceQuery, [
        patientId, 
        startDate || defaultStartDate
      ]);
      
      // Gerar insights automáticos
      const insights = this.generateInsights(stats, notesResult.rows, areaPerformanceResult.rows);
      
      return {
        period: {
          start_date: startDate || defaultStartDate,
          end_date: endDate || new Date()
        },
        statistics: {
          total_sessions: parseInt(stats.total_sessions) || 0,
          avg_score: parseFloat(stats.avg_score) || 0,
          min_score: parseFloat(stats.min_score) || 0,
          max_score: parseFloat(stats.max_score) || 0,
          programs_worked: parseInt(stats.programs_worked) || 0,
          independence_percentage: parseFloat(stats.independence_percentage) || 0,
          dtt_sessions: parseInt(stats.dtt_sessions) || 0,
          improvement_trend: this.calculateTrend(
            parseFloat(stats.first_half_avg) || 0,
            parseFloat(stats.second_half_avg) || 0
          )
        },
        frequent_observations: notesResult.rows,
        area_performance: areaPerformanceResult.rows.map(row => ({
          ...row,
          avg_score: parseFloat(row.avg_score)
        })),
        insights,
        generated_at: new Date()
      };
      
    } catch (error) {
      console.error('Erro ao gerar análise automática:', error);
      throw error;
    }
  },

  /**
   * Calcular tendência de melhoria
   */
  calculateTrend(firstHalf, secondHalf) {
    if (!firstHalf || !secondHalf) return 'insuficient_data';
    
    const difference = secondHalf - firstHalf;
    const percentageChange = (difference / firstHalf) * 100;
    
    if (percentageChange > 10) return 'significant_improvement';
    if (percentageChange > 5) return 'moderate_improvement';
    if (percentageChange < -10) return 'significant_decline';
    if (percentageChange < -5) return 'moderate_decline';
    
    return 'stable';
  },

  /**
   * Gerar insights automáticos baseados nos dados
   */
  generateInsights(stats, frequentNotes, areaPerformance) {
    const insights = [];
    
    // Insight sobre performance geral
    const avgScore = parseFloat(stats.avg_score) || 0;
    if (avgScore >= 80) {
      insights.push({
        type: 'positive',
        category: 'performance',
        text: `Excelente desempenho geral com ${avgScore.toFixed(1)}% de média de acertos, indicando boa aquisição das habilidades trabalhadas.`
      });
    } else if (avgScore >= 60) {
      insights.push({
        type: 'neutral',
        category: 'performance', 
        text: `Desempenho satisfatório com ${avgScore.toFixed(1)}% de média de acertos, com potencial para melhoria através de ajustes nas estratégias.`
      });
    } else {
      insights.push({
        type: 'attention',
        category: 'performance',
        text: `Desempenho abaixo do esperado com ${avgScore.toFixed(1)}% de média de acertos. Recomenda-se revisão dos procedimentos e estratégias utilizadas.`
      });
    }
    
    // Insight sobre independência
    const independence = parseFloat(stats.independence_percentage) || 0;
    if (independence >= 70) {
      insights.push({
        type: 'positive',
        category: 'independence',
        text: `Alto nível de independência observado (${independence.toFixed(1)}%), demonstrando boa generalização das habilidades aprendidas.`
      });
    } else if (independence < 30) {
      insights.push({
        type: 'attention',
        category: 'independence',
        text: `Baixo nível de independência (${independence.toFixed(1)}%). Considerar revisão dos níveis de dica e estratégias de fading.`
      });
    }
    
    // Insight sobre tendência
    const trend = this.calculateTrend(
      parseFloat(stats.first_half_avg) || 0,
      parseFloat(stats.second_half_avg) || 0
    );
    
    switch (trend) {
      case 'significant_improvement':
        insights.push({
          type: 'positive',
          category: 'trend',
          text: 'Tendência de melhoria significativa observada ao longo do período, indicando eficácia das intervenções aplicadas.'
        });
        break;
      case 'moderate_improvement':
        insights.push({
          type: 'positive',
          category: 'trend',
          text: 'Melhoria gradual observada, sugerindo progresso consistente no desenvolvimento das habilidades.'
        });
        break;
      case 'significant_decline':
        insights.push({
          type: 'attention',
          category: 'trend',
          text: 'Declínio significativo observado. Recomenda-se investigação de fatores que possam estar interferindo no desempenho.'
        });
        break;
      case 'stable':
        insights.push({
          type: 'neutral',
          category: 'trend',
          text: 'Desempenho estável mantido ao longo do período, indicando consolidação das habilidades trabalhadas.'
        });
        break;
    }
    
    // Insight sobre áreas de destaque
    if (areaPerformance && areaPerformance.length > 0) {
      const bestArea = areaPerformance[0];
      const worstArea = areaPerformance[areaPerformance.length - 1];
      
      if (parseFloat(bestArea.avg_score) >= 80) {
        insights.push({
          type: 'positive',
          category: 'areas',
          text: `Excelente desempenho em ${bestArea.area_name} (${parseFloat(bestArea.avg_score).toFixed(1)}%), área que pode servir como modelo para generalização.`
        });
      }
      
      if (parseFloat(worstArea.avg_score) < 60 && areaPerformance.length > 1) {
        insights.push({
          type: 'attention',
          category: 'areas',
          text: `${worstArea.area_name} apresenta desempenho mais baixo (${parseFloat(worstArea.avg_score).toFixed(1)}%), necessitando atenção especial nas próximas sessões.`
        });
      }
    }
    
    return insights;
  }
};

module.exports = ReportModel;