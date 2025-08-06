import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faCheck, faBullseye, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
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
// --- NOVA IMPORTAÇÃO ---
// Importa as funções da API que este componente irá usar.
import { recordProgramEvolution, getProgramEvolution } from '../../api/programApi';

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

// --- COMPONENTE REATORIZADO ---
const SessionProgress = ({ program, assignment }) => {
  // Estados para o formulário
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStepId, setSelectedStepId] = useState('');
  const [attempts, setAttempts] = useState('');
  const [successes, setSuccesses] = useState('');
  const [details, setDetails] = useState('');

  // Estados para o feedback da UI e dados
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [evolutionData, setEvolutionData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Função para buscar o histórico de progresso
  const fetchEvolutionHistory = useCallback(async () => {
    if (!assignment) return;
    setIsLoadingHistory(true);
    try {
      const history = await getProgramEvolution(assignment.patient_id, assignment.program_id);
      setEvolutionData(history);
    } catch (err) {
      setError('Não foi possível carregar o histórico de progresso.');
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [assignment]);

  useEffect(() => {
    fetchEvolutionHistory();
    // Define o primeiro passo como selecionado por defeito
    if (program?.steps?.length > 0) {
      setSelectedStepId(program.steps[0].step_id);
    }
  }, [program, fetchEvolutionHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAttempts = parseInt(attempts, 10);
    const numSuccesses = parseInt(successes, 10);

    if (!selectedStepId) {
      setError('Por favor, selecione um passo do programa.');
      return;
    }
    if (isNaN(numAttempts) || numAttempts <= 0) {
      setError('O número de tentativas deve ser maior que zero.');
      return;
    }
    if (isNaN(numSuccesses) || numSuccesses < 0 || numSuccesses > numAttempts) {
      setError(`O número de acertos deve ser entre 0 e ${numAttempts}.`);
      return;
    }

    setError('');
    setIsSubmitting(true);
    setSaveSuccess(false);
    
    const score = (numSuccesses / numAttempts) * 100;
    const evolutionPayload = {
      assignmentId: assignment.assignment_id,
      stepId: selectedStepId,
      sessionDate,
      attempts: numAttempts,
      successes: numSuccesses,
      score: parseFloat(score.toFixed(2)),
      details,
    };

    try {
        await recordProgramEvolution(evolutionPayload);
        // Limpa o formulário e atualiza o histórico
        setAttempts('');
        setSuccesses('');
        setDetails('');
        setSaveSuccess(true);
        fetchEvolutionHistory(); // Re-busca os dados para atualizar o gráfico
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
        setError(err.response?.data || 'Ocorreu um erro ao salvar a sessão.');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const chartData = {
    labels: evolutionData.map(session => formatDate(session.session_date, 'short')),
    datasets: [{
        label: 'Pontuação (%)',
        data: evolutionData.map(session => session.score),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: '#4f46e5',
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
    }]
  };
  
  const chartOptions = { /* ... (as suas excelentes opções de gráfico são mantidas aqui) ... */ };

  return (
    <div>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
            <FontAwesomeIcon icon={faBullseye} className="mr-2" />
            Objetivo do Programa
        </h5>
        <p className="text-blue-700 leading-relaxed">{program.objective}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6 pb-6 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input type="date" id="session-date" required value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                  <label htmlFor="program-step" className="block text-sm font-medium text-gray-700 mb-1.5">Passo do Programa</label>
                  <select id="program-step" value={selectedStepId} onChange={e => setSelectedStepId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500">
                      <option value="" disabled>Selecione um passo</option>
                      {program.steps?.map(step => (
                          <option key={step.step_id} value={step.step_id}>
                              Passo {step.step_number}: {step.step_name}
                          </option>
                      ))}
                  </select>
              </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="session-attempts" className="block text-sm font-medium text-gray-700 mb-1.5">Tentativas</label>
                  <input type="number" id="session-attempts" value={attempts} onChange={e => setAttempts(e.target.value)} min="1" step="1" required placeholder="Ex: 10" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                  <label htmlFor="session-successes" className="block text-sm font-medium text-gray-700 mb-1.5">Acertos</label>
                  <input type="number" id="session-successes" value={successes} onChange={e => setSuccesses(e.target.value)} min="0" step="1" required placeholder="Ex: 8" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
          </div>
          <div>
              <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea id="session-notes" value={details} onChange={e => setDetails(e.target.value)} rows="3" placeholder="Observações sobre a sessão..." className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 resize-vertical"></textarea>
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