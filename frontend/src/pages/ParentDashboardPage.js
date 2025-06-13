import React from 'react';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationCircle, faChartLine, faStickyNote } from '@fortawesome/free-solid-svg-icons';
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

// Função auxiliar para formatar a data, garantindo consistência
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

// <<< COMPONENTE PARENTCHART ATUALIZADO >>>
const ParentChart = ({ program, sessionData }) => {
    const programSessionData = (sessionData || [])
      .filter(session => session.program_id === program.id)
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

    if (programSessionData.length === 0) {
        return <div className="flex items-center justify-center h-48 text-xs text-gray-400 p-4">Sem dados de sessão.</div>;
    }

    const chartData = {
        labels: programSessionData.map(session => formatDate(session.session_date, 'short')),
        datasets: [{
            label: 'Pontuação (%)',
            data: programSessionData.map(session => session.score),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: programSessionData.map(s => s.is_baseline ? '#f59e0b' : '#4f46e5'),
            pointStyle: programSessionData.map(s => s.is_baseline ? 'rectRot' : 'circle'),
            pointHoverRadius: 7,
            fill: true,
            tension: 0.3,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { 
            y: { 
                beginAtZero: true, 
                max: 105, // Margem superior para não cortar
                ticks: { 
                    font: { size: 9 },
                    callback: (value) => value + '%' // Adiciona '%'
                } 
            }, 
            x: { 
                ticks: { font: { size: 9 } } 
            } 
        },
        plugins: { 
            legend: { display: false },
            tooltip: { // Tooltip simplificado para pais
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
                    // afterBody callback foi removido para não mostrar as anotações
                }
            } 
        }
    };
    
    return (
        <div className="w-full h-48 sm:h-56 relative">
            <Line options={chartOptions} data={chartData} />
        </div>
    );
};


const ParentDashboardPage = () => {
    const { selectedPatient, isLoading, error } = usePatients();
    const { getProgramById, isLoading: programsAreLoading } = usePrograms();

    if (isLoading || programsAreLoading) {
        return (
            <div className="flex items-center justify-center h-full text-center p-10">
                <div>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500 mb-4" />
                    <p className="text-gray-500">A carregar dados de acompanhamento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-red-500 p-10 border-2 border-dashed border-red-200 rounded-lg bg-red-50 h-full">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-red-400 mb-4" />
                <p className="text-lg font-medium text-red-700">Ocorreu um erro</p>
                <p className="mt-1 text-sm">{error}</p>
            </div>
        );
    }
    
    if (!selectedPatient) {
        return (
             <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-full">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700">Paciente não encontrado</p>
                <p className="mt-1 text-sm">Não foi possível carregar os dados do paciente associado.</p>
            </div>
        );
    }

    const assignedPrograms = (selectedPatient.assigned_programs || [])
        .map(p => getProgramById(p.id))
        .filter(p => p); 

    const programsByArea = assignedPrograms.reduce((acc, program) => {
        const area = program.area || 'Outros';
        if (!acc[area]) {
            acc[area] = [];
        }
        acc[area].push(program);
        return acc;
    }, {});

    return (
        <div className="p-4 md:p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                    Acompanhamento de {selectedPatient.name}
                </h1>
                <p className="text-sm text-gray-600">Progresso nos programas de intervenção.</p>
            </div>
            
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faStickyNote} className="mr-3 text-yellow-500" />
                    Observações do Terapeuta
                </h3>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-sm text-gray-600 whitespace-pre-wrap min-h-[100px]">
                    {selectedPatient.general_notes || <p className="text-gray-400 italic">Nenhuma observação recente.</p>}
                </div>
            </div>

            <div>
                 <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-3 text-indigo-500" />
                    Progresso por Programa
                </h3>
                
                {Object.keys(programsByArea).length > 0 ? (
                    Object.keys(programsByArea).sort().map(area => (
                        <div key={area} className="mb-8 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                            <h4 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">
                                {area}
                            </h4>
                            {/* <<< ALTERAÇÃO NA GRELHA APLICADA AQUI >>> */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {programsByArea[area].map(program => (
                                    <div key={program.id} className="border border-gray-200 rounded-md p-4 bg-gray-50 flex flex-col items-center shadow-sm">
                                        <h5 className="text-sm font-medium text-gray-600 mb-2 text-center">{program.title}</h5>
                                        <ParentChart program={program} sessionData={selectedPatient.sessionData} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                     <p className="text-center text-gray-500 py-6 col-span-full">Nenhum programa atribuído para visualização.</p>
                )}
            </div>
        </div>
    );
};

export default ParentDashboardPage;
