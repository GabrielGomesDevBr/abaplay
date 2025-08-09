import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// 1. Importar o novo ícone de chat
import { faSpinner, faExclamationCircle, faChartLine, faCalendarAlt, faTimesCircle, faComments, faUsers } from '@fortawesome/free-solid-svg-icons';
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
  Filler,
  annotationPlugin
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
        return (
            <div className="flex items-center justify-center h-48 text-center bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-dashed border-gray-300">
                <div>
                    <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                        <FontAwesomeIcon icon={faChartLine} className="text-2xl text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">Sem dados de sessão</p>
                </div>
            </div>
        );
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
            borderWidth: 3,
            pointRadius: 6,
            pointBackgroundColor: programSessionData.map(s => s.is_baseline ? '#f59e0b' : '#4f46e5'),
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointStyle: programSessionData.map(s => s.is_baseline ? 'rectRot' : 'circle'),
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
                    font: { size: 11, weight: 500 },
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
                    font: { size: 11, weight: 500 },
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
                    title: (items) => {
                        const dataIndex = items[0].dataIndex;
                        const isBaseline = programSessionData[dataIndex]?.is_baseline;
                        const title = `Sessão de ${formatDate(programSessionData[dataIndex].session_date)}`;
                        return isBaseline ? `📋 [LINHA DE BASE] ${title}` : `📈 ${title}`;
                    },
                    label: (context) => `Pontuação: ${context.parsed.y.toFixed(1)}%`,
                    afterLabel: (context) => {
                        const dataIndex = context.dataIndex;
                        const session = programSessionData[dataIndex];
                        const attempts = session?.attempts || 0;
                        const successes = session?.successes || 0;
                        return attempts > 0 ? `Acertos: ${successes}/${attempts}` : '';
                    },
                    afterBody: (context) => {
                        if (!context || !context[0] || context[0].dataIndex === undefined) return '';
                        const dataIndex = context[0].dataIndex;
                        const sessionNotes = programSessionData[dataIndex]?.notes;
                        return sessionNotes ? `\n📝 Observações:\n${sessionNotes}` : '';
                    }
                }
            } 
        }
    };
    
    return (
        <div className="w-full h-48 sm:h-56 relative bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-2">
            <Line options={chartOptions} data={chartData} />
        </div>
    );
};


const ParentDashboardPage = () => {
    const navigate = useNavigate();
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
        .map(p => {
            // Tentar diferentes propriedades possíveis para o ID
            const programId = p.id || p.program_id || p.programId;
            return getProgramById(programId);
        })
        .filter(p => p); 

    const programsByDiscipline = assignedPrograms.reduce((acc, program) => {
        const discipline = program.discipline || 'Outros';
        if (!acc[discipline]) {
            acc[discipline] = [];
        }
        acc[discipline].push(program);
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
            
            {/* Botão de Acesso aos Contatos */}
            <div className="mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">💬 Quer mencionar um terapeuta específico?</h3>
                            <p className="text-blue-100 text-sm">
                                Use @ para mencionar terapeutas específicos no chat. Todos veem a mensagem, garantindo transparência e colaboração.
                            </p>
                        </div>
                        <button 
                            onClick={() => navigate('/contacts')}
                            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg hover:transform hover:scale-105"
                        >
                            <span className="text-xl">@</span>
                            <span>Mencionar Terapeuta</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Bloco de "Observações" substituído pelo novo componente de Chat */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faComments} className="mr-3 text-blue-500" />
                    Chat Geral da Equipe
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">
                        💡 <strong>Dica:</strong> Este chat é compartilhado com toda a equipe. Para conversar com um terapeuta específico, use o botão "Meus Contatos" acima.
                    </p>
                </div>
                <ParentTherapistChat 
                    patientId={selectedPatient.id} 
                    patientName={selectedPatient.name} 
                />
            </div>

            <div>
                 <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-3 text-indigo-500" />
                    Progresso por Área de Intervenção
                </h3>
                
                {Object.keys(programsByDiscipline).length > 0 ? (
                    Object.keys(programsByDiscipline).sort().map(discipline => (
                        <div key={discipline} className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-6 py-4">
                                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                                        <FontAwesomeIcon icon={faChartLine} className="text-indigo-600" />
                                    </div>
                                    {discipline}
                                </h4>
                                <p className="text-sm text-indigo-700 mt-1">Gráficos de progresso individual</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {programsByDiscipline[discipline].map(program => (
                                        <div key={program.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 px-4 py-3">
                                                <h5 className="text-sm font-semibold text-gray-800 text-center">{program.name}</h5>
                                            </div>
                                            <div className="p-4">
                                                <ParentChart program={program} sessionData={filteredSessionData} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
