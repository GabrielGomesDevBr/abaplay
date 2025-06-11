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
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';

    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    
    return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Componente para renderizar um único gráfico
const ParentChart = ({ program, sessionData }) => {
    const programSessionData = (sessionData || [])
      .filter(session => session.program_id === program.id)
      .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));

    if (programSessionData.length === 0) {
        return <p className="text-xs text-gray-500 italic mt-2">Nenhum dado de sessão para este programa.</p>;
    }

    const chartData = {
        labels: programSessionData.map(session => formatDate(session.session_date)),
        datasets: [{
            label: 'Pontuação (%)',
            data: programSessionData.map(session => session.score),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
            fill: true,
            tension: 0.1,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 9 } } }, x: { ticks: { font: { size: 9 } } } },
        plugins: { legend: { display: false } }
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
        .filter(p => p); // Garante que apenas programas válidos são incluídos

    // Agrupa os programas atribuídos por área
    const programsByArea = assignedPrograms.reduce((acc, program) => {
        const area = program.area || 'Outros'; // Assume que 'area' é uma propriedade do programa. Se não houver, categoriza como 'Outros'.
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
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
