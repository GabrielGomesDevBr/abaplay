import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, faChartLine, faTasks, faPercent,
  faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';

/**
 * Componente de métricas visuais discretas para relatórios
 * Exibe informações resumidas dos dados do paciente de forma elegante
 */
const ReportMetrics = ({ 
  sessionData, 
  startDate, 
  endDate, 
  assignedPrograms,
  className = "",
  collapsible = true 
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Calcular métricas básicas
  const metrics = React.useMemo(() => {
    if (!sessionData || sessionData.length === 0) {
      return {
        totalSessions: 0,
        avgScore: 0,
        programsCount: 0,
        periodText: 'Período não definido',
        hasData: false
      };
    }

    const totalSessions = sessionData.length;
    const avgScore = sessionData.reduce((sum, session) => sum + (session.score || 0), 0) / totalSessions;
    const programsCount = assignedPrograms ? assignedPrograms.length : 0;
    
    // Texto do período
    let periodText = 'Período completo';
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      periodText = `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
    } else if (startDate || endDate) {
      const date = new Date(startDate || endDate);
      periodText = `A partir de ${date.toLocaleDateString('pt-BR')}`;
    }

    return {
      totalSessions,
      avgScore: Math.round(avgScore * 10) / 10,
      programsCount,
      periodText,
      hasData: true
    };
  }, [sessionData, startDate, endDate, assignedPrograms]);

  // Função para determinar cor da métrica baseada no valor
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-500';
  };

  const metricCards = [
    {
      icon: faCalendarAlt,
      label: 'Período',
      value: metrics.periodText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: faTasks,
      label: 'Sessões',
      value: metrics.totalSessions,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: faChartLine,
      label: 'Média',
      value: metrics.hasData ? `${metrics.avgScore}%` : '-',
      color: metrics.hasData ? getScoreColor(metrics.avgScore) : 'text-gray-500',
      bgColor: 'bg-gray-50'
    },
    {
      icon: faPercent,
      label: 'Programas',
      value: metrics.programsCount,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            📊 Métricas do Período
          </h3>
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <FontAwesomeIcon 
                icon={isCollapsed ? faChevronDown : faChevronUp} 
                className="w-3 h-3"
              />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>
        {!metrics.hasData ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">
              Nenhum dado disponível para o período selecionado
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {metricCards.map((card, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-full ${card.bgColor}`}>
                    <FontAwesomeIcon 
                      icon={card.icon} 
                      className={`w-3 h-3 ${card.color}`}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{card.label}</span>
                </div>
                <span className={`text-sm font-medium ${card.color}`}>
                  {card.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Indicador de qualidade */}
        {metrics.hasData && metrics.avgScore > 0 && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Indicador de Performance:</span>
              <span className={`font-medium ${getScoreColor(metrics.avgScore)}`}>
                {metrics.avgScore >= 80 ? 'Excelente' : 
                 metrics.avgScore >= 60 ? 'Satisfatório' : 'Requer Atenção'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportMetrics;