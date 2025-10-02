import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// 1. Importar o novo ícone de chat
import { faSpinner, faExclamationCircle, faChartLine, faCalendarAlt, faTimesCircle, faComments } from '@fortawesome/free-solid-svg-icons';
import DateRangeSelector from '../components/shared/DateRangeSelector';
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
      .filter(session => session.program_id === program.id);
      // Dados já vêm ordenados do backend

    if (programSessionData.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 sm:h-48 text-center bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-dashed border-gray-300">
                <div>
                    <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                        <FontAwesomeIcon icon={faChartLine} className="text-xl sm:text-2xl text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 px-2">Sem dados de sessão</p>
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
            pointRadius: programSessionData.map(session => {
                // Linha de base = estrela maior
                return session.is_baseline ? 8 : 6;
            }),
            pointBackgroundColor: programSessionData.map(session => {
                // Prioridade: Linha de base > Nível de prompting > Padrão
                if (session.is_baseline) {
                    return '#f59e0b'; // Amarelo para linha de base
                } else if (session.details && session.details.promptLevelColor) {
                    return session.details.promptLevelColor; // Cor específica do nível de prompting
                } else {
                    return '#4f46e5'; // Cor padrão (azul)
                }
            }),
            pointBorderColor: programSessionData.map(session => {
                // Linha de base = borda amarela mais grossa
                return session.is_baseline ? '#f59e0b' : '#ffffff';
            }),
            pointBorderWidth: programSessionData.map(session => {
                // Linha de base = borda mais grossa para efeito estrela
                return session.is_baseline ? 4 : 2;
            }),
            pointHoverRadius: programSessionData.map(session => {
                return session.is_baseline ? 10 : 8;
            }),
            pointHoverBorderWidth: 3,
            pointStyle: programSessionData.map(session => {
                // Linha de base = estrela, outros = círculo
                return session.is_baseline ? 'star' : 'circle';
            }),
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
        <div className="w-full relative bg-gradient-to-br from-gray-50 to-indigo-50 rounded-lg p-2">
            <div className="h-40 sm:h-48 lg:h-56 mb-3 sm:mb-4">
                <Line options={chartOptions} data={chartData} />
            </div>

            {/* Legenda de cores dos níveis de prompting */}
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                <div className="text-xs font-semibold text-gray-700 mb-2">Níveis de Prompting:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#10b981'}}></div>
                        <span className="text-gray-600 truncate">Independente</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#8b5cf6'}}></div>
                        <span className="text-gray-600 truncate">Verbal</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#f59e0b'}}></div>
                        <span className="text-gray-600 truncate">Gestual</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#ef4444'}}></div>
                        <span className="text-gray-600 truncate">Física Parcial</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#dc2626'}}></div>
                        <span className="text-gray-600 truncate">Física Total</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{backgroundColor: '#6b7280'}}></div>
                        <span className="text-gray-600 truncate">Sem Resposta</span>
                    </div>
                </div>

                {/* Símbolos especiais */}
                <div className="mt-2 sm:mt-3 pt-2 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Símbolos:</div>
                    <div className="flex items-center space-x-3 sm:space-x-4 text-xs flex-wrap gap-y-1">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <span className="text-yellow-500 text-sm sm:text-base">⭐</span>
                            <span className="text-gray-600">Linha de Base</span>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <span className="text-indigo-500 text-sm sm:text-base">●</span>
                            <span className="text-gray-600">Sessão Regular</span>
                        </div>
                    </div>
                </div>
            </div>
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
            <div className="flex items-center justify-center h-full text-center p-6 sm:p-10">
                <div>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl sm:text-4xl text-indigo-500 mb-3 sm:mb-4" />
                    <p className="text-gray-500 text-sm sm:text-base break-words">A carregar dados de acompanhamento...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-red-500 p-6 sm:p-10 border-2 border-dashed border-red-200 rounded-lg bg-red-50 min-h-[300px] sm:min-h-[400px]">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl sm:text-5xl text-red-400 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-red-700">Ocorreu um erro</p>
                <p className="mt-1 text-xs sm:text-sm px-4 break-words">{error}</p>
            </div>
        );
    }

    if (!selectedPatient) {
        return (
             <div className="flex flex-col items-center justify-center text-center text-gray-500 p-6 sm:p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 min-h-[300px] sm:min-h-[400px]">
                <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl sm:text-5xl text-gray-400 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-gray-700">Paciente não encontrado</p>
                <p className="mt-1 text-xs sm:text-sm px-4 break-words">Não foi possível carregar os dados do paciente associado.</p>
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
        <div className="p-2 sm:p-4 lg:p-6">
            <div className="flex flex-wrap justify-between items-start mb-4 sm:mb-6 gap-3 sm:gap-4">
                <div className="w-full">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2 break-words">
                        Acompanhamento de {selectedPatient.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600">Progresso nos programas de intervenção.</p>
                </div>
            </div>
            

            {/* Chat com design moderno e elegante */}
            <div className="mb-6 sm:mb-8 max-w-5xl mx-auto">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl overflow-hidden border border-gray-100">
                    {/* Cabeçalho com gradiente e design sofisticado */}
                    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative overflow-hidden">
                        {/* Elementos decorativos de fundo */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-24 -translate-x-24"></div>
                        
                        {/* Conteúdo do cabeçalho */}
                        <div className="relative z-10 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                                <FontAwesomeIcon icon={faComments} className="text-2xl sm:text-3xl text-white" />
                            </div>

                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 tracking-wide px-2">
                                Comunicação com a Equipe Terapêutica
                            </h3>

                            <div className="max-w-2xl mx-auto space-y-2 sm:space-y-3">
                                <p className="text-blue-100 font-medium text-sm sm:text-base lg:text-lg leading-relaxed px-2">
                                    💬 Converse diretamente com todos os terapeutas do seu filho
                                </p>

                                <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border border-white/20 mx-2">
                                    <p className="text-white text-xs sm:text-sm leading-relaxed">
                                        ✨ Use <span className="bg-white/20 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-mono font-semibold mx-1 border border-white/30 text-xs sm:text-sm">@nome</span> para mencionar um terapeuta específico
                                    </p>
                                </div>

                                <div className="flex items-center justify-center space-x-3 sm:space-x-6 text-blue-100 text-xs sm:text-sm flex-wrap gap-y-2">
                                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                                        <span className="font-medium">📱 Tempo Real</span>
                                    </div>
                                    <div className="w-px h-3 sm:h-4 bg-white/30 hidden sm:block"></div>
                                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"></span>
                                        <span className="font-medium">🔔 Notificações</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-2 sm:p-3 lg:p-4">
                        <ParentTherapistChat
                            patientId={selectedPatient.id}
                            patientName={selectedPatient.name}
                        />
                    </div>
                </div>
            </div>

            {/* Seletor de Período - Posicionado entre chat e gráficos */}
            <div className="mb-4 sm:mb-6">
                <DateRangeSelector
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={clearFilter}
                />
            </div>

            <div>
                 <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center">
                    <FontAwesomeIcon icon={faChartLine} className="mr-2 sm:mr-3 text-indigo-500 flex-shrink-0" />
                    <span className="break-words">Progresso por Área de Intervenção</span>
                </h3>
                
                {Object.keys(programsByDiscipline).length > 0 ? (
                    Object.keys(programsByDiscipline).sort().map(discipline => (
                        <div key={discipline} className="mb-6 sm:mb-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
                                <h4 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                                    <div className="bg-indigo-100 p-1.5 sm:p-2 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                                        <FontAwesomeIcon icon={faChartLine} className="text-indigo-600 text-sm sm:text-base" />
                                    </div>
                                    <span className="break-words">{discipline}</span>
                                </h4>
                                <p className="text-xs sm:text-sm text-indigo-700 mt-1">Gráficos de progresso individual</p>
                            </div>
                            <div className="p-3 sm:p-4 lg:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    {programsByDiscipline[discipline].map(program => (
                                        <div key={program.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3">
                                                <h5 className="text-xs sm:text-sm font-semibold text-gray-800 text-center break-words">{program.name}</h5>
                                            </div>
                                            <div className="p-2 sm:p-3 lg:p-4">
                                                <ParentChart program={program} sessionData={filteredSessionData} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                     <p className="text-center text-gray-500 py-4 sm:py-6 col-span-full text-sm sm:text-base px-4">Nenhum programa atribuído para visualização.</p>
                )}
            </div>
        </div>
    );
};

export default ParentDashboardPage;
