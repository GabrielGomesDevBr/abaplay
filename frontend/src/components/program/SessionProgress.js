import React, { useState, useEffect } from 'react';
import { usePatients } from '../../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTasks, faSave, faSpinner, faCheck, faBullseye, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
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

// Registra os componentes do Chart.js que vamos usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Função para formatar a data, garantindo consistência
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


const SessionProgress = () => {
  const { selectedPatient, programForProgress, addSession } = usePatients();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Estados locais para o formulário
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [correctTrials, setCorrectTrials] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);


  // Limpa o formulário sempre que um novo programa for selecionado
  useEffect(() => {
    setSessionDate(new Date().toISOString().split('T')[0]);
    setCorrectTrials('');
    setSessionNotes('');
    setIsBaseline(false);
    setError('');
    setSaveSuccess(false);
  }, [programForProgress]);

  // Placeholder melhorado
  if (!programForProgress) {
    return (
      // MELHORIA: Adicionado 'md:col-span-1 lg:col-span-2' para o placeholder se ajustar
      <div className="md:col-span-1 lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <FontAwesomeIcon icon={faTasks} className="text-5xl mb-4 text-gray-300" />
          <p className="text-lg font-semibold text-gray-700">Registo de Sessão</p>
          <p className="text-sm mt-1">
            Selecione um programa na lista ao lado para ver o progresso e registar uma nova sessão.
          </p>
        </div>
      </div>
    );
  }
  
  const totalTrials = programForProgress.trials || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalTrials <= 0) {
        alert("Número total de tentativas não definido ou inválido para este programa.");
        return;
    }
    const trials = parseInt(correctTrials, 10);
    if (isNaN(trials) || trials < 0 || trials > totalTrials) {
        setError(`Número de acertos inválido. Deve ser entre 0 e ${totalTrials}.`);
        return;
    }
    setError('');
    setIsSubmitting(true);
    setSaveSuccess(false);
    
    const scorePercentage = (trials / totalTrials) * 100;
    const sessionData = { programId: programForProgress.id, date: sessionDate, score: parseFloat(scorePercentage.toFixed(2)), notes: sessionNotes, isBaseline: isBaseline };

    try {
        await addSession(sessionData);
        setCorrectTrials('');
        setSessionNotes('');
        setIsBaseline(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
        setError(err.message || 'Ocorreu um erro ao guardar a sessão.');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Prepara os dados para o gráfico
  const programSessionData = (selectedPatient?.sessionData || [])
      .filter(session => session.program_id === programForProgress.id)
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

  const chartData = {
    labels: programSessionData.map(session => formatDate(session.session_date, 'short')),
    datasets: [{
        label: 'Pontuação (%)',
        data: programSessionData.map(session => session.score),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        pointRadius: programSessionData.map(s => s.is_baseline ? 5 : 4),
        pointBackgroundColor: programSessionData.map(s => s.is_baseline ? '#fbbf24' : '#4f46e5'),
        pointStyle: programSessionData.map(s => s.is_baseline ? 'rect' : 'circle'),
        fill: true,
        tension: 0.2,
    }]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { 
        y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
        x: { grid: { display: false } }
    },
    plugins: { 
        legend: { display: false },
        tooltip: {
            backgroundColor: '#1f2937', titleColor: '#fff', bodyColor: '#fff',
            padding: 10, cornerRadius: 4, displayColors: true,
            callbacks: {
                title: (items) => `Data: ${formatDate(programSessionData[items[0].dataIndex].session_date)}`,
                label: (context) => {
                    const session = programSessionData[context.dataIndex];
                    let label = `${session.is_baseline ? '[Linha de Base] ' : ''}Pontuação: ${context.parsed.y}%`;
                    if (session.notes) {
                        label += `\nObs: ${session.notes}`;
                    }
                    return label;
                }
            }
        }
    }
  };


  return (
    // MELHORIA: Adicionado 'md:col-span-1 lg:col-span-2' para o componente se ajustar
    <div className="md:col-span-1 lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Registo de Sessão: <span className="text-indigo-600 font-bold">{programForProgress.title}</span>
      </h3>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
            <FontAwesomeIcon icon={faBullseye} className="mr-2" />
            Objetivo do Programa
        </h5>
        <p className="text-blue-700 leading-relaxed">{programForProgress.objective}</p>
        
        {programForProgress.criteria_for_advancement && (
            <>
                <h5 className="font-semibold text-blue-800 mt-3 mb-2 flex items-center">
                    <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                    Critério para Avanço
                </h5>
                <p className="text-blue-700 leading-relaxed italic">{programForProgress.criteria_for_advancement}</p>
            </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6 pb-6 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="session-date" className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input type="date" id="session-date" required value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm" />
              </div>
              <div>
                  <label htmlFor="session-correct-trials" className="block text-sm font-medium text-gray-700 mb-1.5">Nº de Acertos</label>
                  <input type="number" id="session-correct-trials" value={correctTrials} onChange={e => setCorrectTrials(e.target.value)} min="0" max={totalTrials} step="1" required placeholder="Acertos" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm" />
                  <p className="text-xs text-gray-500 mt-1">De {totalTrials} tentativas planeadas.</p>
              </div>
          </div>
          <div>
              <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1.5">Observações da Sessão</label>
              <textarea id="session-notes" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} rows="3" placeholder="Observações sobre a sessão, como nível de ajuda, motivação, etc." className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm resize-vertical"></textarea>
          </div>
          <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="session-is-baseline" type="checkbox" checked={isBaseline} onChange={e => setIsBaseline(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <label htmlFor="session-is-baseline" className="ml-2 block text-sm font-medium text-gray-700">Marcar como Linha de Base</label>
              </div>
              <button type="submit" disabled={isSubmitting} className={`font-semibold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 flex items-center justify-center w-40 shadow hover:shadow-lg disabled:opacity-60 active:scale-95 ${saveSuccess ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                  <FontAwesomeIcon icon={isSubmitting ? faSpinner : (saveSuccess ? faCheck : faSave)} className={`mr-2 ${isSubmitting && 'fa-spin'}`} />
                  {isSubmitting ? 'A Guardar...' : saveSuccess ? 'Guardado!' : 'Guardar Registo'}
              </button>
          </div>
          {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
      </form>

      <div className="mt-4">
          <h4 className="text-base font-semibold text-gray-700 mb-2">Progresso do Programa</h4>
          <div className="relative h-64 md:h-72">
              {programSessionData.length > 0 ? (
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
