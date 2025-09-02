import { getAutomaticAnalysis } from '../api/reportApi';

/**
 * Serviço para gerar pré-preenchimento inteligente de relatórios convencionais
 * Reutiliza a infraestrutura de análise automática dos relatórios de evolução
 */
const reportPreFillService = {

  /**
   * Gera sugestão de texto para relatório convencional baseado em análise automática
   * @param {number} patientId - ID do paciente
   * @param {Array} sessionData - Dados das sessões filtradas por período
   * @param {Object} periodOptions - Opções de período (startDate, endDate)
   * @returns {Promise<string>} Texto sugerido formatado
   */
  async generateConventionalReportSuggestion(patientId, sessionData, periodOptions) {
    try {
      // Reutilizar análise automática existente
      const analysisData = await getAutomaticAnalysis(patientId, periodOptions);
      
      // Gerar texto sugerido baseado nos dados
      return this.generateSuggestedText(analysisData, sessionData, periodOptions);
      
    } catch (error) {
      console.error('Erro ao gerar sugestão de relatório:', error);
      throw new Error('Não foi possível gerar a sugestão de texto. Tente novamente.');
    }
  },

  /**
   * Processa dados da análise automática e gera texto formatado
   * @param {Object} analysisData - Dados da análise automática
   * @param {Array} sessionData - Dados das sessões
   * @param {Object} periodOptions - Opções de período
   * @returns {string} Texto sugerido formatado
   */
  generateSuggestedText(analysisData, sessionData, periodOptions) {
    const { statistics, insights, area_performance } = analysisData;
    
    let text = this.generateDisclaimer();
    text += this.generatePeriodSummary(statistics, periodOptions);
    text += this.generateAreaAnalysis(area_performance);
    text += this.generateIndependenceAnalysis(statistics);
    text += this.generateInsightsSection(insights);
    text += this.generateRecommendations(statistics, insights);
    
    return text;
  },

  /**
   * Gera disclaimer de responsabilidade profissional
   */
  generateDisclaimer() {
    return `**[IMPORTANTE: Esta análise é baseada em dados quantitativos. Como profissional responsável, revise, adapte e complemente com suas observações clínicas qualitativas antes de utilizar.]**\n\n`;
  },

  /**
   * Gera resumo do período analisado
   */
  generatePeriodSummary(statistics, periodOptions) {
    const periodText = this.formatPeriodText(periodOptions);
    
    let summary = `RESUMO DO PERÍODO ANALISADO\n\n`;
    summary += `${periodText} foram realizadas ${statistics.total_sessions} sessões terapêuticas, `;
    
    if (statistics.total_sessions > 0) {
      summary += `com média de desempenho de ${statistics.avg_score.toFixed(1)}%. `;
      
      if (statistics.independence_percentage !== null) {
        summary += `O nível de independência alcançado foi de ${statistics.independence_percentage.toFixed(1)}%, `;
        summary += `indicando ${this.getIndependenceDescription(statistics.independence_percentage)}. `;
      }
      
      summary += `O paciente trabalhou em ${statistics.programs_worked} programa(s) diferentes `;
      summary += `durante este período.\n\n`;
    } else {
      summary += `porém não há dados de desempenho disponíveis para análise.\n\n`;
    }
    
    return summary;
  },

  /**
   * Gera análise por área de intervenção
   */
  generateAreaAnalysis(areaPerformance) {
    if (!areaPerformance || areaPerformance.length === 0) {
      return `ANÁLISE POR ÁREA DE INTERVENÇÃO\n\nNão há dados suficientes para análise por área de intervenção.\n\n`;
    }
    
    let analysis = `ANÁLISE POR ÁREA DE INTERVENÇÃO\n\n`;
    
    // Ordenar por performance (maior para menor)
    const sortedAreas = [...areaPerformance].sort((a, b) => b.avg_score - a.avg_score);
    
    sortedAreas.forEach((area, index) => {
      const performance = this.getPerformanceDescription(area.avg_score);
      analysis += `${area.area_name}: Média de ${area.avg_score.toFixed(1)}% em ${area.session_count} sessão(ões), `;
      analysis += `demonstrando ${performance}`;
      
      if (index === 0 && sortedAreas.length > 1) {
        analysis += ` (área de melhor desempenho)`;
      } else if (index === sortedAreas.length - 1 && sortedAreas.length > 1) {
        analysis += ` (área que requer maior atenção)`;
      }
      
      analysis += `.\n`;
    });
    
    analysis += `\n`;
    return analysis;
  },

  /**
   * Gera análise de níveis de independência
   */
  generateIndependenceAnalysis(statistics) {
    if (statistics.independence_percentage === null) {
      return `NÍVEIS DE INDEPENDÊNCIA\n\nDados de prompt level não disponíveis para análise.\n\n`;
    }
    
    let analysis = `NÍVEIS DE INDEPENDÊNCIA\n\n`;
    
    const independenceLevel = statistics.independence_percentage;
    const description = this.getDetailedIndependenceAnalysis(independenceLevel);
    
    analysis += `Durante o período analisado, o paciente apresentou ${independenceLevel.toFixed(1)}% de `;
    analysis += `respostas independentes. ${description}\n\n`;
    
    return analysis;
  },

  /**
   * Gera seção de insights e observações
   */
  generateInsightsSection(insights) {
    if (!insights || insights.length === 0) {
      return `OBSERVAÇÕES RELEVANTES\n\nNão há insights específicos gerados para este período.\n\n`;
    }
    
    let section = `OBSERVAÇÕES RELEVANTES\n\n`;
    
    // Agrupar insights por tipo
    const positiveInsights = insights.filter(i => i.type === 'positive');
    const attentionInsights = insights.filter(i => i.type === 'attention');
    const neutralInsights = insights.filter(i => i.type === 'neutral');
    
    if (positiveInsights.length > 0) {
      section += `Aspectos Positivos:\n`;
      positiveInsights.forEach(insight => {
        section += `• ${insight.text}\n`;
      });
      section += `\n`;
    }
    
    if (attentionInsights.length > 0) {
      section += `Pontos de Atenção:\n`;
      attentionInsights.forEach(insight => {
        section += `• ${insight.text}\n`;
      });
      section += `\n`;
    }
    
    if (neutralInsights.length > 0) {
      section += `Observações Gerais:\n`;
      neutralInsights.forEach(insight => {
        section += `• ${insight.text}\n`;
      });
      section += `\n`;
    }
    
    return section;
  },

  /**
   * Gera recomendações baseadas nos dados
   */
  generateRecommendations(statistics, insights) {
    let recommendations = `RECOMENDAÇÕES\n\n`;
    
    // Recomendações baseadas na performance geral
    if (statistics.avg_score < 60) {
      recommendations += `• Considerar revisão das estratégias de ensino, dado que a média de desempenho está abaixo de 60%.\n`;
      recommendations += `• Avaliar possível necessidade de ajuste nos níveis de prompting utilizados.\n`;
    } else if (statistics.avg_score > 85) {
      recommendations += `• Excelente desempenho observado. Considerar progressão para objetivos mais avançados.\n`;
      recommendations += `• Avaliar possibilidade de redução gradual dos níveis de prompting.\n`;
    } else {
      recommendations += `• Desempenho satisfatório observado. Manter estratégias atuais de intervenção.\n`;
    }
    
    // Recomendações baseadas na independência
    if (statistics.independence_percentage !== null) {
      if (statistics.independence_percentage < 30) {
        recommendations += `• Focar no desenvolvimento da independência através de estratégias de fading de prompts.\n`;
      } else if (statistics.independence_percentage > 70) {
        recommendations += `• Alto nível de independência alcançado. Considerar introdução de novos desafios.\n`;
      }
    }
    
    // Recomendações baseadas nos insights
    const attentionInsights = insights?.filter(i => i.type === 'attention') || [];
    if (attentionInsights.length > 0) {
      recommendations += `• Atenção especial aos pontos identificados na análise automática.\n`;
    }
    
    recommendations += `• Continuar monitoramento regular do progresso através dos dados de sessão.\n`;
    recommendations += `\n`;
    
    return recommendations;
  },

  /**
   * Utilitários para formatação de texto
   */
  formatPeriodText(periodOptions) {
    if (periodOptions.startDate && periodOptions.endDate) {
      const start = new Date(periodOptions.startDate);
      const end = new Date(periodOptions.endDate);
      return `No período de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')},`;
    }
    return `Durante o período analisado,`;
  },

  getPerformanceDescription(score) {
    if (score >= 90) return 'excelente desempenho';
    if (score >= 80) return 'bom desempenho';
    if (score >= 70) return 'desempenho satisfatório';
    if (score >= 60) return 'desempenho adequado';
    if (score >= 50) return 'desempenho moderado';
    return 'desempenho que requer atenção';
  },

  getIndependenceDescription(percentage) {
    if (percentage >= 80) return 'alto nível de autonomia';
    if (percentage >= 60) return 'bom nível de independência';
    if (percentage >= 40) return 'nível moderado de independência';
    if (percentage >= 20) return 'baixo nível de independência';
    return 'necessidade de apoio significativo';
  },

  getDetailedIndependenceAnalysis(percentage) {
    if (percentage >= 80) {
      return 'Isso indica que o paciente está demonstrando excelente capacidade de resposta autônoma, sugerindo boa consolidação das habilidades trabalhadas.';
    }
    if (percentage >= 60) {
      return 'Isso demonstra boa evolução na direção da independência, com potencial para progressão contínua.';
    }
    if (percentage >= 40) {
      return 'Isso indica progresso moderado na direção da autonomia, com necessidade de manutenção das estratégias atuais.';
    }
    if (percentage >= 20) {
      return 'Isso sugere que o paciente ainda requer apoio significativo, sendo recomendável foco no desenvolvimento da independência.';
    }
    return 'Isso indica necessidade de apoio intensivo e possível revisão das estratégias de ensino para promover maior autonomia.';
  }

};

export default reportPreFillService;