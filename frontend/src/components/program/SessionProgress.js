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
      const sortedHistory = validHistory.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
      setEvolutionData(sortedHistory);
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
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: evolutionData.map(session => session.details?.isBaseline ? '#facc15' : '#4f46e5'),
        pointBorderColor: '#ffffff',
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#fff',
            titleColor: '#1f2937',
            bodyColor: '#4b5563',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            padding: 10,
            callbacks: {
                title: (context) => {
                    const dataIndex = context[0].dataIndex;
                    const isBaselinePoint = evolutionData[dataIndex]?.details?.isBaseline;
                    const title = `Sessão de ${formatDate(context[0].label)}`;
                    return isBaselinePoint ? `[LINHA DE BASE] ${title}` : title;
                },
                label: (context) => `Pontuação: ${context.parsed.y.toFixed(2)}%`,
                afterBody: (context) => {
                    const dataIndex = context[0].dataIndex;
                    const sessionNotes = evolutionData[dataIndex]?.details?.notes;
                    return sessionNotes ? `\nObservações:\n${sessionNotes}` : '';
                }
            }
        },
        annotation: {
            annotations: {
                line1: {
                    type: 'line',
                    yMin: 80,
                    yMax: 80,
                    borderColor: 'rgb(45, 212, 191)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: {
                        content: 'Meta (80%)',
                        position: 'end',
                        backgroundColor: 'rgba(45, 212, 191, 0.8)',
                        font: { size: 10 },
                        color: 'white',
                        padding: 4,
                        borderRadius: 4,
                    }
                }
            }
        }
    },
    scales: {
        x: {
            ticks: {
                callback: function(value) {
                    const label = this.getLabelForValue(value);
                    return formatDate(label, 'short');
                }
            }
        },
        y: {
            beginAtZero: true,
            max: 100,
            suggestedMin: -10,
            suggestedMax: 110,
            ticks: {
                callback: (value) => (value >= 0 && value <= 100) ? `${value}%` : ''
            }
        }
    }
  };

  // *** ALTERAÇÃO PRINCIPAL ***
  // Verifica se um programa foi selecionado. Se não, exibe a mensagem para o usuário.
  if (!program || !assignment) {
    return (
        <div className="flex flex-col items-center justify-center text-center text-gray-400 p-10 h-full">
          <FontAwesomeIcon icon={faChartLine} className="text-4xl mb-4" />
          <h4 className="font-semibold text-lg text-gray-600">Nenhum Programa Selecionado</h4>
          <p className="text-sm">Selecione um programa na lista ao lado para começar.</p>
        </div>
      );
  }

  return (
    <div>
      {program?.objective && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
              <FontAwesomeIcon icon={faBullseye} className="mr-2" />
              Objetivo do Programa
          </h5>
          <p className="text-blue-700 leading-relaxed">{program.objective}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mb-6 pb-6 border-b border-gray-200">
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
              <button type="submit" disabled={isSubmitting} className={`font-semibold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 flex items-center justify-center w-40 shadow hover:shadow-lg disabled:opacity-60 active:scale-95 ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                  <FontAwesomeIcon icon={isSubmitting ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`mr-2 ${isSubmitting && 'fa-spin'}`} />
                  {isSubmitting ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Registo'}
              </button>
          </div>
          {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
      </form>

      <div className="mt-4">
          <h4 className="text-base font-semibold text-gray-700 mb-2">Progresso do Programa</h4>
          <div className="relative h-64 md:h-72">
              {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-indigo-500" /></div>
              ) : evolutionData.length > 0 ? (
                  <Line options={chartOptions} data={chartData} />
              ) : (
                  <div className="flex items-center justify-center h-full text-center text-gray-400 bg-gray-50 rounded-lg">
                    <p>Nenhum dado de sessão registado para este programa.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default SessionProgress;
