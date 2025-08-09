import React, { useState, useMemo } from 'react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
// --- CORREÇÃO ---
// A importação do usePrograms foi removida pois não era utilizada diretamente aqui,
// simplificando o componente.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faUsers, faClipboardList, faTasks, faPercentage, faChartLine, faFolderOpen, faCalendarAlt, faTimesCircle, faSpinner, faInfoCircle, faExclamationTriangle, faCheckCircle, faBullseye, faClock, faBalanceScale, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

const StatCard = ({ title, value, icon, colorClass, interpretation }) => {
  const getInterpretationStyle = (interp) => {
    switch (interp) {
      case 'good': return { bg: 'bg-green-100', border: 'border-green-200', icon: faCheckCircle, color: 'text-green-600' };
      case 'attention': return { bg: 'bg-yellow-100', border: 'border-yellow-200', icon: faExclamationTriangle, color: 'text-yellow-600' };
      case 'critical': return { bg: 'bg-red-100', border: 'border-red-200', icon: faExclamationTriangle, color: 'text-red-600' };
      default: return { bg: 'bg-gray-100', border: 'border-gray-200', icon: faInfoCircle, color: 'text-gray-600' };
    }
  };

  const interpStyle = interpretation ? getInterpretationStyle(interpretation) : null;

  return (
    <div className={`bg-white p-4 rounded-lg shadow border ${interpStyle ? interpStyle.border : 'border-gray-200'} flex items-start space-x-4 relative`}>
      <div className={`text-xl p-3 rounded-full ${colorClass.bg} ${colorClass.text}`}>
        <FontAwesomeIcon icon={icon} className="fa-fw" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <p className={`text-3xl font-semibold ${colorClass.text}`}>{value}</p>
      </div>
      {interpStyle && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full ${interpStyle.bg} flex items-center justify-center`}>
          <FontAwesomeIcon icon={interpStyle.icon} className={`text-xs ${interpStyle.color}`} />
        </div>
      )}
    </div>
  );
};

// Componente para guia de métricas com melhor organização visual
const MetricsGuide = () => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 overflow-hidden">
    {/* Cabeçalho principal */}
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
      <h3 className="text-xl font-bold text-white flex items-center">
        <FontAwesomeIcon icon={faInfoCircle} className="mr-3" />
        Guia de Métricas ABA
      </h3>
      <p className="text-blue-100 text-sm mt-1">Compreenda os indicadores e interpretações utilizados</p>
    </div>

    <div className="p-6">
      {/* Seção 1: Definições das Métricas */}
      <div className="mb-8">
        <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
          <h4 className="text-lg font-semibold text-gray-800">📊 Definições das Métricas</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-l-4 border-blue-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-blue-600 mr-2">📊</span> Progresso Médio
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Média de todas as sessões de intervenção no período selecionado.
            </p>
            <div className="mt-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full inline-block">
              Meta: ≥70%
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-l-4 border-purple-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-purple-600 mr-2">🎯</span> Taxa de Aquisição
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Percentual de programas que atingiram critério (≥80%) recentemente.
            </p>
            <div className="mt-2 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded-full inline-block">
              Meta: ≥30%
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border-l-4 border-amber-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-amber-600 mr-2">⏱️</span> Frequência Semanal
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Número de dias únicos com sessões por semana em média.
            </p>
            <div className="mt-2 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full inline-block">
              Ideal ABA: 3-5 dias/semana
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-green-600 mr-2">📈</span> Estabilidade
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Consistência da performance (0-100). Alta estabilidade indica manutenção.
            </p>
            <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full inline-block">
              Alta: ≥80%
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border-l-4 border-emerald-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-emerald-600 mr-2">🏆</span> Programas na Meta
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Quantidade de programas que atingiram ≥80% de desempenho médio.
            </p>
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full inline-block">
              Objetivo: Maioria
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border-l-4 border-indigo-500">
            <h5 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="text-indigo-600 mr-2">📅</span> Dias até Critério
            </h5>
            <p className="text-gray-700 text-sm leading-relaxed">
              Tempo médio para dominar habilidades. Varia por complexidade da tarefa.
            </p>
            <div className="mt-2 text-xs text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full inline-block">
              Variável
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Sistema de Interpretação */}
      <div className="mb-6">
        <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
          <h4 className="text-lg font-semibold text-gray-800">🎨 Sistema de Interpretação</h4>
        </div>
        
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
          <p className="text-gray-600 text-sm mb-4">Os indicadores visuais nas métricas seguem este sistema de cores:</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
              <span className="text-green-700 font-medium">Bom desempenho</span>
              <span className="text-gray-500 text-sm">- Dentro das metas</span>
            </div>
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-sm"></div>
              <span className="text-yellow-700 font-medium">Requer atenção</span>
              <span className="text-gray-500 text-sm">- Monitoramento necessário</span>
            </div>
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
              <span className="text-red-700 font-medium">Crítico</span>
              <span className="text-gray-500 text-sm">- Ação imediata necessária</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nota de rodapé */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="flex items-start">
          <FontAwesomeIcon icon={faLightbulb} className="text-blue-600 mt-1 mr-3" />
          <div>
            <p className="text-blue-800 font-medium mb-1">Dica Profissional</p>
            <p className="text-blue-700 text-sm leading-relaxed">
              Use estas métricas em conjunto para uma análise completa do progresso. 
              Métricas isoladas podem não refletir o quadro completo do desenvolvimento.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Componente para recomendações com design melhorado
const RecommendationPanel = ({ recommendations, regressionAlerts }) => {
  if (recommendations.length === 0 && regressionAlerts === 0) return null;

  return (
    <div className="bg-white border border-orange-200 rounded-xl shadow-sm mb-8 overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <FontAwesomeIcon icon={faLightbulb} className="mr-3" />
          Recomendações Clínicas
        </h3>
        <p className="text-orange-100 text-sm mt-1">Sugestões baseadas na análise dos dados</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {regressionAlerts > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start space-x-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-800 mb-1">⚠️ Alerta de Regressão</p>
                  <p className="text-red-700 text-sm">
                    {regressionAlerts} programa{regressionAlerts > 1 ? 's apresentam' : ' apresenta'} declínio na performance. 
                    Revisão imediata recomendada.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                  <div className="flex items-start space-x-3">
                    <div className="bg-amber-100 p-2 rounded-full flex-shrink-0">
                      <FontAwesomeIcon icon={faLightbulb} className="text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-800 text-sm leading-relaxed">{rec}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(recommendations.length > 0 || regressionAlerts > 0) && (
          <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faInfoCircle} className="text-orange-600 mt-1 mr-3" />
              <div>
                <p className="text-orange-800 font-medium mb-1">💡 Dica</p>
                <p className="text-orange-700 text-sm leading-relaxed">
                  Estas recomendações são geradas automaticamente com base nas métricas atuais. 
                  Considere o contexto clínico individual ao implementar mudanças.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (dateString, format = 'long') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Data inválida';
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  
  const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
  };
  
  if (format === 'short') {
      return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  if (format === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
  }

  return adjustedDate.toLocaleDateString('pt-BR', options);
};

const ProgressByDisciplineChart = ({ sessionData, activePrograms, analytics }) => {
  const processDisciplineData = () => {
    if (!sessionData || sessionData.length === 0 || !activePrograms || activePrograms.length === 0) {
      return [];
    }

    // Agrupar programas por disciplina
    const disciplineMap = {};
    activePrograms.forEach(program => {
      const disciplineName = program.discipline_name || 'Outros';
      if (!disciplineMap[disciplineName]) {
        disciplineMap[disciplineName] = {
          name: disciplineName,
          programIds: new Set(),
          sessions: [],
          totalScore: 0,
          sessionCount: 0
        };
      }
      disciplineMap[disciplineName].programIds.add(program.program_id);
    });

    // Filtrar sessões por disciplina (apenas intervenções, sem baseline)
    const interventionSessions = sessionData.filter(s => !s.is_baseline);
    interventionSessions.forEach(session => {
      Object.values(disciplineMap).forEach(discipline => {
        if (discipline.programIds.has(session.program_id)) {
          discipline.sessions.push(session);
          discipline.totalScore += session.score;
          discipline.sessionCount += 1;
        }
      });
    });

    // Calcular médias e tendências
    return Object.values(disciplineMap)
      .filter(d => d.sessionCount > 0)
      .map(discipline => {
        const average = (discipline.totalScore / discipline.sessionCount);
        
        // Calcular tendência (últimas 5 sessões vs primeiras 5)
        const sortedSessions = discipline.sessions.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
        let trend = 'stable';
        if (sortedSessions.length >= 6) {
          const firstHalf = sortedSessions.slice(0, Math.floor(sortedSessions.length / 2));
          const secondHalf = sortedSessions.slice(Math.floor(sortedSessions.length / 2));
          const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
          
          const difference = secondAvg - firstAvg;
          if (difference > 5) trend = 'improving';
          else if (difference < -5) trend = 'declining';
        }

        return {
          name: discipline.name,
          average: Math.round(average * 10) / 10,
          sessionCount: discipline.sessionCount,
          trend,
          programCount: discipline.programIds.size
        };
      })
      .sort((a, b) => b.average - a.average); // Ordenar por performance
  };

  const disciplineData = processDisciplineData();

  if (disciplineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-400 bg-gray-50 rounded-lg p-6">
        <div>
          <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-3" />
          <p>Não há dados suficientes no período selecionado para gerar o resumo por disciplina.</p>
        </div>
      </div>
    );
  }

  // Cores por disciplina
  const getColorByName = (name) => {
    const colorMap = {
      'Fonoaudiologia': { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
      'Psicologia': { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600' },
      'Musicoterapia': { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
      'TerapiaOcupacional': { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
      'Psicomotricidade': { bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600' },
      'Psicopedagogia': { bg: 'bg-yellow-500', light: 'bg-yellow-100', text: 'text-yellow-600' },
    };
    return colorMap[name] || { bg: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-600' };
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return { icon: '📈', color: 'text-green-600', text: 'Melhorando' };
      case 'declining': return { icon: '📉', color: 'text-red-600', text: 'Em queda' };
      default: return { icon: '➡️', color: 'text-gray-600', text: 'Estável' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumo geral */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
        <div>
          <h3 className="font-semibold text-gray-800">Resumo Geral</h3>
          <p className="text-sm text-gray-600">
            {disciplineData.length} disciplina{disciplineData.length !== 1 ? 's' : ''} • {' '}
            Média geral: {Math.round(disciplineData.reduce((sum, d) => sum + d.average, 0) / disciplineData.length * 10) / 10}%
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-600">
            {analytics.overallAverage}%
          </div>
          <div className="text-xs text-gray-500">Progresso médio geral</div>
        </div>
      </div>

      {/* Barras por disciplina */}
      <div className="space-y-3">
        {disciplineData.map((discipline) => {
          const colors = getColorByName(discipline.name);
          const trendInfo = getTrendIcon(discipline.trend);
          const percentage = Math.min(discipline.average, 100);

          return (
            <div key={discipline.name} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              {/* Header da disciplina */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded ${colors.bg}`}></div>
                  <h4 className="font-medium text-gray-800">{discipline.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${colors.light} ${colors.text}`}>
                    {discipline.programCount} programa{discipline.programCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${trendInfo.color} flex items-center space-x-1`}>
                    <span>{trendInfo.icon}</span>
                    <span>{trendInfo.text}</span>
                  </span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-800">{discipline.average}%</div>
                    <div className="text-xs text-gray-500">{discipline.sessionCount} sessões</div>
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${colors.bg}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                {/* Meta de 80% */}
                <div 
                  className="absolute top-0 h-3 w-0.5 bg-green-600"
                  style={{ left: '80%' }}
                  title="Meta: 80%"
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé informativo */}
      <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
        💡 <strong>Dica:</strong> A linha verde nas barras indica a meta de 80%. 
        Tendências são calculadas comparando primeira e segunda metade das sessões.
      </div>
    </div>
  );
};

const AllProgramsChartsGrid = ({ activePrograms, sessionData }) => {
    if (!activePrograms || activePrograms.length === 0) return null;

    // Organiza os programas por disciplina (usando os dados que vêm do banco)
    const programsByDiscipline = {};
    activePrograms.forEach(program => {
        const disciplineName = program.discipline_name || 'Outros';
        if (!programsByDiscipline[disciplineName]) {
            programsByDiscipline[disciplineName] = [];
        }
        programsByDiscipline[disciplineName].push(program);
    });
    
    const sortedDisciplines = Object.keys(programsByDiscipline).sort();
    
    const MiniChart = ({ program }) => {
        const programSessionData = (sessionData || [])
            .filter(session => session.program_id === program.program_id)
            .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
        
        if (programSessionData.length === 0) {
            return (
                <div className="flex items-center justify-center h-48 text-center bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div>
                        <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <FontAwesomeIcon icon={faChartLine} className="text-2xl text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500">Sem dados neste período</p>
                    </div>
                </div>
            );
        }

        const chartData = {
            labels: programSessionData.map(s => formatDate(s.session_date, 'short')),
            datasets: [{
                data: programSessionData.map(s => s.score),
                borderColor: '#4f46e5',
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) return 'rgba(79, 70, 229, 0.1)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                    gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.15)');
                    gradient.addColorStop(1, 'rgba(67, 56, 202, 0.05)');
                    return gradient;
                },
                borderWidth: 2.5,
                pointRadius: 5,
                pointBackgroundColor: programSessionData.map(s => s.is_baseline ? '#f59e0b' : '#4f46e5'),
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointStyle: programSessionData.map(s => s.is_baseline ? 'rectRot' : 'circle'),
                pointHoverRadius: 8,
                pointHoverBorderWidth: 3,
                fill: true,
                tension: 0.35,
                shadowColor: 'rgba(79, 70, 229, 0.2)',
                shadowBlur: 8,
                shadowOffsetX: 0,
                shadowOffsetY: 3,
            }]
        };

        const chartOptions = { 
            responsive: true, 
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: { 
                y: { 
                    display: true, 
                    min: 0, 
                    max: 105,
                    grid: {
                        display: true,
                        color: 'rgba(156, 163, 175, 0.2)',
                        drawBorder: false,
                    },
                    ticks: { 
                        font: { size: 9, weight: 500 },
                        color: '#6b7280',
                        callback: (value) => value + '%'
                    },
                    border: {
                        display: false
                    }
                }, 
                x: { 
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(156, 163, 175, 0.2)',
                        drawBorder: false,
                    },
                    ticks: { 
                        font: { size: 9, weight: 500 },
                        color: '#6b7280'
                    },
                    border: {
                        display: false
                    }
                } 
            }, 
            plugins: { 
                legend: { display: false }, 
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#e5e7eb',
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: {
                        size: 12,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11
                    },
                    callbacks: {
                        title: (items) => {
                            if (!items || !items[0] || items[0].dataIndex === undefined) return 'Sessão';
                            const isBaseline = programSessionData[items[0].dataIndex]?.is_baseline;
                            const title = `${formatDate(programSessionData[items[0].dataIndex].session_date)}`;
                            return isBaseline ? `📋 [BASELINE] ${title}` : `📈 ${title}`;
                        },
                        label: (context) => `Pontuação: ${context.parsed.y.toFixed(1)}%`,
                        afterBody: (items) => {
                            if (!items || !items[0] || items[0].dataIndex === undefined) return '';
                            const session = programSessionData[items[0].dataIndex];
                            let details = [];
                            if (session?.notes) details.push(`\n📝 Obs: ${session.notes}`);
                            return details;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        goalLine: {
                            type: 'line',
                            yMin: 80,
                            yMax: 80,
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: '🎯 Meta (80%)',
                                enabled: true,
                                position: 'end',
                                backgroundColor: 'rgba(16, 185, 129, 0.9)',
                                font: { size: 9, weight: 'bold' },
                                color: 'white',
                                padding: 4,
                                borderRadius: 4,
                                yAdjust: -8
                            }
                        }
                    }
                } 
            } 
        };

        return (
            <div className="h-48 w-full">
                <Line options={chartOptions} data={chartData} />
            </div>
        );
    };

    return (
        <div className="mt-8">
            {sortedDisciplines.map(discipline => {
                if (!programsByDiscipline[discipline] || programsByDiscipline[discipline].length === 0) return null;

                return (
                    <div key={discipline} className="mb-8">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-6">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                                <div className="bg-indigo-100 p-2 rounded-full mr-3">
                                    <FontAwesomeIcon icon={faFolderOpen} className="text-indigo-600" />
                                </div>
                                {discipline}
                            </h2>
                            <p className="text-sm text-indigo-700 mt-1">
                                Gráficos de progresso individual por programa
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {programsByDiscipline[discipline].map(program => (
                                <div key={program.program_id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-4 py-3">
                                        <p className="text-sm font-semibold text-gray-800 truncate" title={program.program_name}>{program.program_name}</p>
                                        <p className="text-xs text-indigo-600 mt-1">Trials: {program.trials || 'N/A'}</p>
                                    </div>
                                    <div className="p-4">
                                        <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-2">
                                            <MiniChart program={program} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const DashboardPage = () => {
  const { user } = useAuth();
  // --- CORREÇÃO ---
  // Adicionamos isLoading para saber quando os dados dos pacientes estão a ser carregados.
  const { patients, selectedPatient, isLoading: isLoadingPatients } = usePatients();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Programas ativos do paciente com dados completos do banco
  const activeAssignedPrograms = useMemo(() => {
    if (!selectedPatient?.assigned_programs) return [];
    return selectedPatient.assigned_programs.filter(p => p.status === 'active');
  }, [selectedPatient]);
  
  const activeProgramIds = useMemo(() => new Set(activeAssignedPrograms.map(p => p.program_id)), [activeAssignedPrograms]);

  const filteredSessionData = useMemo(() => {
    if (!selectedPatient?.sessionData) return [];
    
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    return selectedPatient.sessionData.filter(session => {
        // A verificação agora usa `session.program_id` que vem do backend.
        if (!activeProgramIds.has(session.program_id)) return false;
        
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        
        return true;
    });
  }, [selectedPatient, startDate, endDate, activeProgramIds]);
  
  // --- CORREÇÃO DE SEGURANÇA ---
  // Adicionamos uma verificação para saber se os pacientes já foram carregados.
  // Se não, exibimos uma tela de carregamento para evitar o "crash".
  if (isLoadingPatients) {
      return (
          <div className="flex items-center justify-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl text-indigo-500" />
          </div>
      );
  }

  // As calculadoras agora só rodam quando 'patients' é garantidamente um array.
  const totalPatients = patients?.length || 0;
  const patientLimit = user?.max_patients || 0;
  const totalSessions = patients?.reduce((total, patient) => total + (patient.sessionData?.length || 0), 0) || 0;
  
  // Análises avançadas ABA para dashboard analítico
  const calculateAnalytics = () => {
    if (!filteredSessionData || filteredSessionData.length === 0) {
      return {
        assignedProgramsCount: activeAssignedPrograms.length,
        overallAverage: '--',
        programsAboveGoal: '--',
        sessionFrequency: '--',
        acquisitionRate: '--',
        averageDaysToMastery: '--',
        stabilityIndex: '--',
        regressionAlerts: 0,
        interpretations: {},
        recommendations: []
      };
    }

    const interventionScores = filteredSessionData.filter(s => !s.is_baseline && typeof s.score === 'number').map(s => s.score);
    const overallAverage = interventionScores.length > 0 
      ? (interventionScores.reduce((sum, score) => sum + score, 0) / interventionScores.length).toFixed(1)
      : '--';

    // Análise por programa
    const programStats = {};
    filteredSessionData.filter(s => !s.is_baseline).forEach(session => {
      if (!programStats[session.program_id]) {
        programStats[session.program_id] = { scores: [], dates: [], sessions: [] };
      }
      programStats[session.program_id].scores.push(session.score);
      programStats[session.program_id].dates.push(new Date(session.session_date));
      programStats[session.program_id].sessions.push(session);
    });
    
    const programAverages = Object.values(programStats).map(program => 
      program.scores.reduce((sum, score) => sum + score, 0) / program.scores.length
    );
    const programsAboveGoal = programAverages.filter(avg => avg >= 80).length;
    const totalPrograms = Math.max(programAverages.length, activeAssignedPrograms.length);

    // Taxa de Aquisição (programas que atingiram critério recentemente)
    let recentMasteries = 0;
    let totalDaysToMastery = 0;
    let masteryCount = 0;
    let regressionAlerts = 0;

    Object.values(programStats).forEach(program => {
      program.dates.sort((a, b) => a - b);
      const recentSessions = program.sessions.slice(-5); // últimas 5 sessões
      const recentAverage = recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length;
      
      // Verifica se atingiu critério recentemente
      if (recentAverage >= 80 && recentSessions.length >= 3) {
        recentMasteries++;
        
        // Calcula dias até critério
        const firstSession = program.dates[0];
        const lastSession = program.dates[program.dates.length - 1];
        const daysToMastery = (lastSession - firstSession) / (1000 * 60 * 60 * 24);
        totalDaysToMastery += daysToMastery;
        masteryCount++;
      }
      
      // Detecta regressão (últimas sessões < primeiras sessões por >10%)
      if (program.sessions.length >= 6) {
        const firstThird = program.sessions.slice(0, Math.floor(program.sessions.length / 3));
        const lastThird = program.sessions.slice(-Math.floor(program.sessions.length / 3));
        const firstAvg = firstThird.reduce((sum, s) => sum + s.score, 0) / firstThird.length;
        const lastAvg = lastThird.reduce((sum, s) => sum + s.score, 0) / lastThird.length;
        
        if (firstAvg - lastAvg > 10) regressionAlerts++;
      }
    });

    const acquisitionRate = totalPrograms > 0 ? ((recentMasteries / totalPrograms) * 100).toFixed(1) : '--';
    const averageDaysToMastery = masteryCount > 0 ? (totalDaysToMastery / masteryCount).toFixed(0) : '--';

    // Índice de Estabilidade (baseado no desvio padrão das últimas sessões)
    let stabilitySum = 0;
    let stabilityCount = 0;
    Object.values(programStats).forEach(program => {
      if (program.scores.length >= 5) {
        const recentScores = program.scores.slice(-5);
        const avg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / recentScores.length;
        const stdDev = Math.sqrt(variance);
        const stability = Math.max(0, 100 - stdDev * 2); // Inverte: menos desvio = mais estabilidade
        stabilitySum += stability;
        stabilityCount++;
      }
    });
    const stabilityIndex = stabilityCount > 0 ? (stabilitySum / stabilityCount).toFixed(1) : '--';

    // Frequência de sessões por semana (corrigida)
    const sessionDates = filteredSessionData.map(s => new Date(s.session_date)).sort((a, b) => a - b);
    let sessionFrequency = '--';
    if (sessionDates.length >= 2) {
      // Agrupa sessões por data única para evitar contar múltiplas sessões do mesmo dia
      const uniqueDates = [...new Set(sessionDates.map(date => date.toDateString()))];
      const totalDays = Math.max((sessionDates[sessionDates.length - 1] - sessionDates[0]) / (1000 * 60 * 60 * 24), 1);
      const totalWeeks = Math.max(totalDays / 7, 1); // Garante pelo menos 1 semana
      sessionFrequency = totalWeeks > 0 ? (uniqueDates.length / totalWeeks).toFixed(1) : '--';
    }

    // Interpretações e recomendações
    const interpretations = {
      overallAverage: parseFloat(overallAverage) >= 70 ? 'good' : parseFloat(overallAverage) >= 50 ? 'attention' : 'critical',
      sessionFrequency: parseFloat(sessionFrequency) >= 3 ? 'good' : parseFloat(sessionFrequency) >= 2 ? 'attention' : 'critical',
      acquisitionRate: parseFloat(acquisitionRate) >= 30 ? 'good' : parseFloat(acquisitionRate) >= 15 ? 'attention' : 'critical',
      stabilityIndex: parseFloat(stabilityIndex) >= 80 ? 'good' : parseFloat(stabilityIndex) >= 60 ? 'attention' : 'critical'
    };

    const recommendations = [];
    if (interpretations.overallAverage === 'critical') recommendations.push('Revisar estratégias de intervenção - progresso abaixo do esperado');
    if (interpretations.sessionFrequency === 'critical') recommendations.push('Aumentar frequência de atendimentos para acelerar aquisições');
    if (parseFloat(acquisitionRate) < 20) recommendations.push('Analisar critérios de domínio - poucos programas atingindo metas');
    if (regressionAlerts > 0) recommendations.push(`Atenção: ${regressionAlerts} programa(s) apresentando regressão`);
    if (interpretations.stabilityIndex === 'critical') recommendations.push('Focar na manutenção - performance inconsistente');

    return {
      assignedProgramsCount: activeAssignedPrograms.length,
      overallAverage,
      programsAboveGoal: `${programsAboveGoal}/${totalPrograms}`,
      sessionFrequency: sessionFrequency === '--' ? '--' : sessionFrequency,
      acquisitionRate,
      averageDaysToMastery,
      stabilityIndex,
      regressionAlerts,
      interpretations,
      recommendations
    };
  };

  const analytics = calculateAnalytics();

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div>
      {selectedPatient ? (
        <>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard: {selectedPatient.name}</h1>
            <div className="bg-white p-2 rounded-lg shadow-sm border flex flex-wrap items-center gap-2 text-sm">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 ml-2" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <span className="text-gray-500">até</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <button onClick={clearFilter} className="text-xs text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-gray-100" title="Limpar filtro">
                    <FontAwesomeIcon icon={faTimesCircle} />
                </button>
            </div>
          </div>
          
          {/* Guia de métricas reformulado */}
          <MetricsGuide />
          
          {/* Recomendações clínicas */}
          <RecommendationPanel recommendations={analytics.recommendations} regressionAlerts={analytics.regressionAlerts} />
          
          {/* Cards principais expandidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatCard 
              title="Programas Ativos" 
              value={analytics.assignedProgramsCount} 
              icon={faTasks} 
              colorClass={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }}
            />
            <StatCard 
              title="Programas Acima da Meta (≥80%)" 
              value={analytics.programsAboveGoal} 
              icon={faBullseye} 
              colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }}
              interpretation={analytics.interpretations.overallAverage}
            />
            <StatCard 
              title="Frequência Semanal de Sessões" 
              value={`${analytics.sessionFrequency}${analytics.sessionFrequency !== '--' ? '/sem' : ''}`} 
              icon={faClipboardList} 
              colorClass={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
              interpretation={analytics.interpretations.sessionFrequency}
            />
          </div>

          {/* Cards ABA avançados */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
              title="Taxa de Aquisição (%)" 
              value={`${analytics.acquisitionRate}%`} 
              icon={faPercentage} 
              colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
              interpretation={analytics.interpretations.acquisitionRate}
            />
            <StatCard 
              title="Tempo Médio até Critério" 
              value={`${analytics.averageDaysToMastery}${analytics.averageDaysToMastery !== '--' ? ' dias' : ''}`} 
              icon={faClock} 
              colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
            />
            <StatCard 
              title="Índice de Estabilidade" 
              value={`${analytics.stabilityIndex}${analytics.stabilityIndex !== '--' ? '%' : ''}`} 
              icon={faBalanceScale} 
              colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
              interpretation={analytics.interpretations.stabilityIndex}
            />
          </div>

          <div className="mt-8 bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-3 text-emerald-500" />
                Progresso por Área de Intervenção
            </h2>
            <div className="relative">
                <ProgressByDisciplineChart sessionData={filteredSessionData} activePrograms={activeAssignedPrograms} analytics={analytics} />
            </div>
          </div>

          <AllProgramsChartsGrid 
            activePrograms={activeAssignedPrograms} 
            sessionData={filteredSessionData}
          />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard Geral</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="Total de Clientes" value={`${totalPatients} / ${patientLimit}`} icon={faUsers} colorClass={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
             <StatCard title="Total de Sessões (Todos os Clientes)" value={totalSessions} icon={faClipboardList} colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} />
          </div>
          <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed rounded-lg bg-gray-50">
            <FontAwesomeIcon icon={faTachometerAlt} className="text-4xl text-gray-300 mb-3" />
            <p>Selecione um cliente para ver um dashboard mais detalhado.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
