import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFilePdf, faSpinner, faCalendarAlt, faTimesCircle, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { usePatients } from '../../context/PatientContext';
// A importação do usePrograms não é mais necessária.
import { generateConsolidatedReportPDF } from '../../utils/pdfGenerator';
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

// Regista os componentes do Chart.js que vamos usar
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

// Função auxiliar para formatar a data
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

// <<< NOVO COMPONENTE PARA O GRÁFICO DE PRÉ-VISUALIZAÇÃO >>>
const ReportChart = ({ program, sessionData }) => {
    const programSessionData = (sessionData || [])
      .filter(session => session.program_id === program.id)
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

    if (programSessionData.length === 0) {
        return null; // Não renderiza nada se não houver dados
    }

    const chartData = {
        labels: programSessionData.map(session => formatDate(session.session_date, 'short')),
        datasets: [{
            label: 'Pontuação (%)',
            data: programSessionData.map(session => session.score),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#4f46e5',
            fill: true,
            tension: 0.3,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { 
            y: { beginAtZero: true, max: 105, ticks: { callback: (value) => value + '%' } }, 
            x: {} 
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: '#111827',
                titleColor: '#fff',
                bodyColor: '#e5e7eb',
                padding: 12,
                cornerRadius: 6,
                displayColors: false,
                callbacks: {
                    title: (items) => `Data: ${formatDate(programSessionData[items[0].dataIndex].session_date)}`,
                    label: (context) => `Pontuação: ${context.parsed.y.toFixed(2)}%`,
                }
            } 
        }
    };
    
    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
            <h5 className="text-sm font-semibold text-gray-700 mb-2 text-center">{program.title}</h5>
            <div className="w-full h-56 relative">
                <Line options={chartOptions} data={chartData} />
            </div>
        </div>
    );
};


const ConsolidatedReportModal = ({ isOpen, onClose }) => {
  const { selectedPatient } = usePatients();
  // A chamada a usePrograms() foi removida.

  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReportText('');
      setStartDate('');
      setEndDate('');
      setError('');
    }
  }, [isOpen]);

  const filteredSessionData = useMemo(() => {
    if (!selectedPatient?.sessionData) return [];
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;
    return (selectedPatient.sessionData || []).filter(session => {
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      });
  }, [selectedPatient, startDate, endDate]);

  // CORREÇÃO: A lógica agora usa diretamente os dados do paciente selecionado.
  const assignedPrograms = useMemo(() => {
    if (!selectedPatient?.assigned_programs) return [];
    return selectedPatient.assigned_programs;
  }, [selectedPatient]);


  const handleGenerate = () => {
    if (!selectedPatient) return;
    setIsGenerating(true);
    setError('');
    try {
      const patientForReport = { ...selectedPatient, sessionData: filteredSessionData };
      // A função generate... não precisa mais de getProgramById
      generateConsolidatedReportPDF(patientForReport, reportText);
      setTimeout(() => onClose(), 1000); 
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao gerar o relatório.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  if (!isOpen || !selectedPatient) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Gerar Relatório Consolidado para: <span className="text-indigo-600">{selectedPatient.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período do Relatório (opcional)</label>
            <div className="bg-gray-50 p-3 rounded-lg border flex flex-wrap items-center gap-2 text-sm">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 ml-2" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <span className="text-gray-500">até</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded-md text-xs" />
                <button onClick={clearFilter} className="text-xs text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-gray-100" title="Limpar filtro">
                    <FontAwesomeIcon icon={faTimesCircle} />
                </button>
            </div>
             <p className="text-xs text-gray-500 mt-2">Deixe em branco para incluir todos os dados de sessão.</p>
          </div>
        
          <div>
            <label htmlFor="report-text" className="block text-sm font-medium text-gray-700 mb-1">Análise e Observações do Terapeuta</label>
            <p className="text-xs text-gray-500 mb-2">Este texto será incluído no início do relatório em PDF.</p>
            <textarea
              id="report-text" rows="6"
              placeholder="Escreva aqui a sua análise qualitativa..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-vertical"
            ></textarea>
          </div>

          {/* <<< NOVA SECÇÃO DE PRÉ-VISUALIZAÇÃO DOS GRÁFICOS >>> */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-3 text-indigo-500" />
                Pré-visualização do Progresso no Período
            </h3>
            <div className="space-y-4">
              {assignedPrograms.length > 0 ? (
                assignedPrograms.map(program => (
                  <ReportChart 
                    key={program.id} 
                    program={program} 
                    sessionData={filteredSessionData} 
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">Nenhum programa para exibir.</p>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 text-right mt-auto">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            <FontAwesomeIcon icon={isGenerating ? faSpinner : faFilePdf} className={`mr-2 ${isGenerating && 'fa-spin'}`} />
            {isGenerating ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReportModal;
