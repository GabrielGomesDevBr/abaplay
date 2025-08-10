import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faCheck, faBullseye, faChartLine } from '@fortawesome/free-solid-svg-icons';
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
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { recordProgress, getAssignmentEvolution } from '../../api/programApi';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

const formatDate = (dateString, format = 'long') => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const options = format === 'short' 
        ? { day: '2-digit', month: '2-digit' } 
        : { day: '2-digit', month: '2-digit', year: 'numeric' };
    return adjustedDate.toLocaleDateString('pt-BR', options);
};

const SessionProgress = ({ program, assignment }) => {
  const { user } = useAuth();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStepIndex, setSelectedStepIndex] = useState('');
  const [attempts, setAttempts] = useState(program?.trials || '');
  const [successes, setSuccesses] = useState('');
  const [notes, setNotes] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [evolutionData, setEvolutionData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const procedureSteps = useMemo(() => {
    if (!program?.procedure) return [];
    try {
      return typeof program.procedure === 'string'
        ? JSON.parse(program.procedure)
        : program.procedure;
    } catch (e) {
      console.error("Falha ao analisar o 'procedure' do programa:", e);
      return [];
    }
  }, [program]);

  const fetchEvolutionHistory = useCallback(async () => {
    if (!assignment?.assignment_id) return;
    setIsLoadingHistory(true);
    try {
      const history = await getAssignmentEvolution(assignment.assignment_id);
      const validHistory = Array.isArray(history) ? history : [];
      // Backend já retorna ordenado por data ascendente
      setEvolutionData(validHistory);
    } catch (err) {
      setError('Não foi possível carregar o histórico de progresso.');
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [assignment]);

  useEffect(() => {
    if (!program || !assignment) {
      // Limpa os dados quando nenhum programa é selecionado
      setEvolutionData([]);
      setIsLoadingHistory(false);
      return;
    }
    
    fetchEvolutionHistory();
    setAttempts(program.trials || '');

    if (procedureSteps.length > 0) {
      setSelectedStepIndex('0');
    } else {
      setSelectedStepIndex('');
    }
  }, [program, assignment, fetchEvolutionHistory, procedureSteps]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAttempts = parseInt(attempts, 10);
    const numSuccesses = parseInt(successes, 10);

    if (selectedStepIndex === '') {
      setError('Por favor, selecione um passo do programa.');
      return;
    }
    if (isNaN(numAttempts) || numAttempts <= 0) {
      setError('O número de tentativas é inválido.');
      return;
    }
    if (isNaN(numSuccesses) || numSuccesses < 0 || numSuccesses > numAttempts) {
      setError(`O número de acertos deve ser entre 0 e ${numAttempts}.`);
      return;
    }

    setError('');
    setIsSubmitting(true);
    setSaveSuccess(false);
    
    const score = (numAttempts > 0) ? (numSuccesses / numAttempts) * 100 : 0;
    
    const selectedStep = procedureSteps[parseInt(selectedStepIndex, 10)];
    const evolutionPayload = {
      assignment_id: assignment.assignment_id,
      step_id: null,
      session_date: sessionDate,
      attempts: numAttempts,
      successes: numSuccesses,
      score: parseFloat(score.toFixed(2)),
      details: {
        notes: notes,
        step: selectedStep,
        isBaseline: isBaseline,
      },
    };

    try {
        await recordProgress(evolutionPayload);
        setSuccesses('');
        setNotes('');
        setIsBaseline(false);
        setSaveSuccess(true);
        fetchEvolutionHistory();
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
        setError(err.response?.data?.message || 'Ocorreu um erro ao salvar a sessão.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const chartData = {
    labels: evolutionData.map(session => session.session_date),
    datasets: [{
        label: 'Pontuação (%)',
        data: evolutionData.map(session => session.score),
        borderColor: '#4f46e5',
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(79, 70, 229, 0.1)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
          gradient.addColorStop(0.5, 'rgba(79, 70, 229, 0.2)');
          gradient.addColorStop(1, 'rgba(67, 56, 202, 0.1)');
          return gradient;
        },
        borderWidth: 3,
        pointRadius: 6,
        pointBackgroundColor: evolutionData.map(session => session.details?.isBaseline ? '#f59e0b' : '#4f46e5'),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        fill: true,
        tension: 0.4,
        shadowColor: 'rgba(79, 70, 229, 0.3)',
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e5e7eb',
            borderColor: '#4f46e5',
            borderWidth: 2,
            padding: 16,
            cornerRadius: 12,
            displayColors: false,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
                title: (context) => {
                    const dataIndex = context[0].dataIndex;
                    const session = evolutionData[dataIndex];
                    const isBaselinePoint = session?.details?.isBaseline;
                    const sessionDate = formatDate(context[0].label);
                    
                    // Título básico para todos os usuários
                    let title = `Sessão de ${sessionDate}`;
                    if (isBaselinePoint) {
                        title = `📋 [LINHA DE BASE] ${title}`;
                    } else {
                        title = `📈 ${title}`;
                    }
                    
                    return title;
                },
                
                label: (context) => {
                    const score = context.parsed.y.toFixed(1);
                    return `🎯 Pontuação: ${score}%`;
                },
                
                afterLabel: (context) => {
                    if (!context || context.dataIndex === undefined) return '';
                    const dataIndex = context.dataIndex;
                    const session = evolutionData[dataIndex];
                    
                    // Debug: verificar estrutura dos dados (apenas o primeiro)
                    if (dataIndex === 0) {
                        console.log('SessionProgress data (FUNCIONA) - attempts:', session?.attempts);
                        console.log('SessionProgress data (FUNCIONA) - successes:', session?.successes);
                        console.log('SessionProgress data (FUNCIONA) - created_at:', session?.created_at);
                        console.log('SessionProgress data (FUNCIONA) - FULL OBJECT:', JSON.stringify(session, null, 2));
                    }
                    
                    const attempts = session?.attempts || 0;
                    const successes = session?.successes || 0;
                    
                    return [`📊 Acertos: ${successes}/${attempts}`];
                },
                
                afterBody: (context) => {
                    if (!context || !context[0] || context[0].dataIndex === undefined) return '';
                    const dataIndex = context[0].dataIndex;
                    const session = evolutionData[dataIndex];
                    const sessionNotes = session?.details?.notes;
                    
                    let result = [];
                    
                    // Observações da sessão (para todos)
                    if (sessionNotes) {
                        result.push(`\n📝 Observações:`); 
                        result.push(`${sessionNotes}`);
                    }
                    
                    // Debug do papel do usuário (apenas no primeiro tooltip)
                    if (dataIndex === 0) {
                        console.log('SessionProgress User role:', user?.role);
                    }
                    
                    // Horário do registro para terapeutas e admins (suporta 'therapist'/'terapeuta' e 'admin'/'administrador')
                    if (user && (user.role === 'therapist' || user.role === 'terapeuta' || user.role === 'admin' || user.role === 'administrador')) {
                        if (session?.created_at) {
                            const recordedTime = new Date(session.created_at).toLocaleString('pt-BR');
                            result.push(`\n📅 Registrado: ${recordedTime}`);
                        }
                    }
                    
                    return result.length > 0 ? result : '';
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
                    borderWidth: 3,
                    borderDash: [8, 4],
                    label: {
                        content: '🎯 Meta (80%)',
                        position: 'end',
                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                        font: { size: 12, weight: 'bold' },
                        color: 'white',
                        padding: 8,
                        borderRadius: 6,
                        yAdjust: -10
                    }
                }
            }
        }
    },
    scales: {
        x: {
            display: true,
            grid: {
              display: true,
              color: 'rgba(156, 163, 175, 0.2)',
              drawBorder: false,
            },
            ticks: {
                color: '#6b7280',
                font: {
                  size: 11,
                  weight: 500
                },
                maxTicksLimit: 8,
                callback: function(value) {
                    const label = this.getLabelForValue(value);
                    return formatDate(label, 'short');
                }
            },
            border: {
              display: false
            }
        },
        y: {
            display: true,
            beginAtZero: true,
            max: 105,
            grid: {
              display: true,
              color: 'rgba(156, 163, 175, 0.2)',
              drawBorder: false,
            },
            ticks: {
                color: '#6b7280',
                font: {
                  size: 11,
                  weight: 500
                },
                stepSize: 20,
                callback: (value) => (value >= 0 && value <= 100) ? `${value}%` : ''
            },
            border: {
              display: false
            }
        }
    }
  };

  // Estado vazio redesenhado
  if (!program || !assignment) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-12 h-full">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faChartLine} className="text-4xl text-indigo-600" />
          </div>
          <h4 className="font-semibold text-xl text-gray-700 mb-3">Nenhum Programa Selecionado</h4>
          <p className="text-gray-500 leading-relaxed max-w-md">
            Selecione um programa na lista ao lado para visualizar gráficos de progresso e registrar sessões.
          </p>
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Aguardando seleção</span>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div>
      {program?.objective && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
          <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <FontAwesomeIcon icon={faBullseye} className="text-blue-600" />
              </div>
              Objetivo do Programa
          </h5>
          <p className="text-blue-700 leading-relaxed text-base">{program.objective}</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <div className="bg-indigo-100 p-2 rounded-full mr-3">
              <FontAwesomeIcon icon={faSave} className="text-indigo-600" />
            </div>
            Registrar Nova Sessão
          </h3>
          <p className="text-sm text-gray-600 mt-1">Insira os dados da sessão para acompanhar o progresso</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input type="date" id="session-date" required value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                  <label htmlFor="program-step" className="block text-sm font-medium text-gray-700 mb-1.5">Passo do Programa</label>
                  <select id="program-step" value={selectedStepIndex} onChange={e => setSelectedStepIndex(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="" disabled>Selecione um passo</option>
                      {procedureSteps.map((step, index) => (
                          <option key={index} value={index}>
                              Passo {index + 1}: {step.term}
                          </option>
                      ))}
                  </select>
              </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="session-attempts" className="block text-sm font-medium text-gray-700 mb-1.5">Tentativas</label>
                  <input 
                    type="number" 
                    id="session-attempts" 
                    value={attempts} 
                    readOnly 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 cursor-not-allowed" 
                  />
              </div>
              <div>
                  <label htmlFor="session-successes" className="block text-sm font-medium text-gray-700 mb-1.5">Acertos</label>
                  <input type="number" id="session-successes" value={successes} onChange={e => setSuccesses(e.target.value)} min="0" step="1" required placeholder="Ex: 8" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
          </div>
          <div>
              <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea id="session-notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Observações sobre a sessão..." className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 resize-vertical"></textarea>
          </div>
          
          <div className="flex items-center justify-start pt-2">
              <input 
                type="checkbox" 
                id="is-baseline" 
                checked={isBaseline} 
                onChange={e => setIsBaseline(e.target.checked)} 
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
              />
              <label htmlFor="is-baseline" className="ml-2 block text-sm text-gray-900">
                Marcar como Linha de Base
              </label>
          </div>

          <div className="flex items-center justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`
                  font-semibold py-3 px-8 rounded-lg text-sm transition-all duration-200 flex items-center justify-center min-w-[180px] shadow-sm transform hover:scale-105 disabled:hover:scale-100
                  ${saveSuccess 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-200' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-200 disabled:from-gray-300 disabled:to-gray-400'
                  }
                `}
              >
                <div className="bg-white bg-opacity-20 p-1 rounded-full mr-3">
                  <FontAwesomeIcon icon={isSubmitting ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`text-sm ${isSubmitting && 'fa-spin'}`} />
                </div>
                {isSubmitting ? 'Salvando...' : saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Sessão'}
              </button>
          </div>
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <FontAwesomeIcon icon={faBullseye} className="text-red-600 mt-1 mr-3" />
                <div>
                  <p className="text-red-800 font-medium mb-1">Erro na Sessão</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                <div className="bg-emerald-100 p-2 rounded-full mr-3">
                  <FontAwesomeIcon icon={faChartLine} className="text-emerald-600" />
                </div>
                Gráfico de Evolução
              </h4>
              <p className="text-sm text-gray-600 mt-1">Histórico de desempenho ao longo das sessões</p>
            </div>
            {evolutionData.length > 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{evolutionData.length}</span> sessões registradas
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  Média: {(evolutionData.reduce((sum, s) => sum + s.score, 0) / evolutionData.length).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="relative h-80 md:h-96">
              {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-indigo-600" />
                      </div>
                      <p className="text-gray-600 font-medium">Carregando histórico...</p>
                    </div>
                  </div>
              ) : evolutionData.length > 0 ? (
                  <div className="h-full bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-4">
                    <Line options={chartOptions} data={chartData} />
                  </div>
              ) : (
                  <div className="flex items-center justify-center h-full text-center bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div>
                      <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <FontAwesomeIcon icon={faChartLine} className="text-3xl text-gray-400" />
                      </div>
                      <h5 className="font-semibold text-gray-600 mb-2">Nenhum Histórico</h5>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                        Registre a primeira sessão para começar a visualizar o progresso no gráfico.
                      </p>
                    </div>
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionProgress;
