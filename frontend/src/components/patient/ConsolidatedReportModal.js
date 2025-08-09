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
      .filter(session => session.program_id === program.program_id)
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
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: programSessionData.map(s => s.is_baseline ? '#f59e0b' : '#4f46e5'),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointStyle: programSessionData.map(s => s.is_baseline ? 'rectRot' : 'circle'),
            pointHoverRadius: 7,
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.4,
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
                beginAtZero: true, 
                max: 105,
                grid: {
                    display: true,
                    color: 'rgba(156, 163, 175, 0.2)',
                    drawBorder: false,
                },
                ticks: { 
                    font: { size: 10, weight: 500 },
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
                    font: { size: 10, weight: 500 },
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
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#e5e7eb',
                borderColor: '#4f46e5',
                borderWidth: 2,
                padding: 14,
                cornerRadius: 10,
                displayColors: false,
                titleFont: {
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 12
                },
                callbacks: {
                    title: (items) => {
                        const dataIndex = items[0].dataIndex;
                        const isBaseline = programSessionData[dataIndex]?.is_baseline;
                        const title = `${formatDate(programSessionData[dataIndex].session_date)}`;
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
            } 
        }
    };
    
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-4 py-3">
                <h5 className="text-sm font-semibold text-gray-800 text-center">{program.program_name}</h5>
                <p className="text-xs text-indigo-600 text-center mt-1">{program.discipline_name}</p>
            </div>
            <div className="p-4">
                <div className="w-full h-56 relative bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-2">
                    <Line options={chartOptions} data={chartData} />
                </div>
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
                    key={program.program_id} 
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
