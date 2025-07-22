import React, { useState, useMemo } from 'react';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// 1. Importar o novo ícone de chat
import { faSpinner, faExclamationCircle, faChartLine, faCalendarAlt, faTimesCircle, faComments } from '@fortawesome/free-solid-svg-icons';
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
// 2. Importar o nosso novo componente de chat
import ParentTherapistChat from '../components/chat/ParentTherapistChat';


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
                max: 105,
                ticks: { 
                    font: { size: 9 },
                    callback: (value) => value + '%'
                } 
            }, 
            x: { 
                ticks: { font: { size: 9 } } 
            } 
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
        <div className="w-full h-48 sm:h-56 relative">
            <Line options={chartOptions} data={chartData} />
        </div>
    );
};


const ParentDashboardPage = () => {
    const { selectedPatient, isLoading, error } = usePatients();
    const { getProgramById, isLoading: programsAreLoading } = usePrograms();
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredSessionData = useMemo(() => {
        if (!selectedPatient?.sessionData) return [];
        
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;

        return selectedPatient.sessionData.filter(session => {
            const sessionDate = new Date(session.session_date);
            if (start && sessionDate < start) return false;
            if (end && sessionDate > end) return false;
            return true;
        });
    }, [selectedPatient, startDate, endDate]);

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
    };

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
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                        Acompanhamento de {selectedPatient.name}
                    </h1>
                    <p className="text-sm text-gray-600">Progresso nos programas de intervenção.</p>
                </div>
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
            
            {/* 3. Bloco de "Observações" substituído pelo novo componente de Chat */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faComments} className="mr-3 text-blue-500" />
                    Comunicação com a Equipe
                </h3>
                <ParentTherapistChat 
                    patientId={selectedPatient.id} 
                    patientName={selectedPatient.name} 
                />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {programsByArea[area].map(program => (
                                    <div key={program.id} className="border border-gray-200 rounded-md p-4 bg-gray-50 flex flex-col items-center shadow-sm">
                                        <h5 className="text-sm font-medium text-gray-600 mb-2 text-center">{program.title}</h5>
                                        <ParentChart program={program} sessionData={filteredSessionData} />
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
