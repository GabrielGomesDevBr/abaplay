import React, { useState, useMemo } from 'react';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
// --- CORREÇÃO ---
// A importação do usePrograms foi removida pois não era utilizada diretamente aqui,
// simplificando o componente.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt, faUsers, faClipboardList, faTasks, faPercentage, faChartLine, faFolderOpen, faCalendarAlt, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
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
} from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

const StatCard = ({ title, value, icon, colorClass }) => (
  <div className={`bg-white p-4 rounded-lg shadow border border-gray-200 flex items-start space-x-4`}>
    <div className={`text-xl p-3 rounded-full ${colorClass.bg} ${colorClass.text}`}>
      <FontAwesomeIcon icon={icon} className="fa-fw" />
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`text-3xl font-semibold ${colorClass.text}`}>{value}</p>
    </div>
  </div>
);

const formatDate = (dateString, format = 'long') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Data inválida';
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  
  const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
  };
  
  if (format === 'short') {
      return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  if (format === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
  }

  return adjustedDate.toLocaleDateString('pt-BR', options);
};

const OverallProgressChart = ({ sessionData }) => {
  const processDataForChart = () => {
    if (!sessionData || sessionData.length === 0) {
      return { labels: [], data: [] };
    }
    const monthlyData = {};
    const interventionSessions = sessionData.filter(s => !s.is_baseline);

    interventionSessions.forEach(session => {
      const date = new Date(session.session_date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalScore: 0, count: 0 };
      }
      monthlyData[monthKey].totalScore += session.score;
      monthlyData[monthKey].count += 1;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(monthKey => {
      const { totalScore, count } = monthlyData[monthKey];
      return (totalScore / count).toFixed(1);
    });
    return { labels, data };
  };

  const { labels, data } = processDataForChart();

  if (data.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-center text-gray-400 bg-gray-50 rounded-lg p-4">
            <p>Não há dados de sessões de intervenção suficientes no período selecionado para gerar o gráfico de progresso mensal.</p>
        </div>
    );
  }

  const chartData = {
    labels,
    datasets: [{
        label: 'Progresso Médio Mensal (%)', data,
        borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true, tension: 0.3
    }]
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } };
  return <Line options={chartOptions} data={chartData} />;
};

const AllProgramsChartsGrid = ({ activePrograms, sessionData }) => {
    if (!activePrograms || activePrograms.length === 0) return null;

    // Organiza os programas por disciplina (usando os dados que vêm do banco)
    const programsByDiscipline = {};
    activePrograms.forEach(program => {
        const disciplineName = program.discipline_name || 'Outros';
        if (!programsByDiscipline[disciplineName]) {
            programsByDiscipline[disciplineName] = [];
        }
        programsByDiscipline[disciplineName].push(program);
    });
    
    const sortedDisciplines = Object.keys(programsByDiscipline).sort();
    
    const MiniChart = ({ program }) => {
        const programSessionData = (sessionData || [])
            .filter(session => session.program_id === program.program_id)
            .sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
        
        if (programSessionData.length === 0) {
            return <div className="flex items-center justify-center h-48 text-xs text-gray-400 p-4">Sem dados neste período.</div>;
        }

        const chartData = {
            labels: programSessionData.map(s => formatDate(s.session_date, 'short')),
            datasets: [{
                data: programSessionData.map(s => s.score),
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
                    display: true, 
                    min: 0, 
                    max: 105, 
                    ticks: { 
                        font: { size: 9 },
                        callback: (value) => value + '%'
                    } 
                }, 
                x: { 
                    display: true, 
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
                        afterBody: (items) => {
                            const session = programSessionData[items[0].dataIndex];
                            let details = [];
                            if (session.is_baseline) details.push('Tipo: Linha de Base');
                            if (session.notes) details.push(`Obs: ${session.notes}`);
                            return details;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        goalLine: {
                            type: 'line',
                            yMin: 80,
                            yMax: 80,
                            borderColor: '#16a34a',
                            borderWidth: 2,
                            borderDash: [6, 6],
                            label: {
                                content: 'Meta',
                                enabled: true,
                                position: 'end',
                                font: { size: 9 },
                                yAdjust: -10,
                            }
                        }
                    }
                } 
            } 
        };

        return <div className="h-48 w-full"><Line options={chartOptions} data={chartData} /></div>;
    };

    return (
        <div className="mt-8">
            {sortedDisciplines.map(discipline => {
                if (!programsByDiscipline[discipline] || programsByDiscipline[discipline].length === 0) return null;

                return (
                    <div key={discipline} className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                            <FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-gray-400" />
                            {discipline}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {programsByDiscipline[discipline].map(program => (
                                <div key={program.program_id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col">
                                    <p className="text-sm font-semibold text-gray-700 truncate" title={program.program_name}>{program.program_name}</p>
                                    <p className="text-xs text-gray-500 mb-3">Trials: {program.trials || 'N/A'}</p>
                                    <MiniChart program={program} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const DashboardPage = () => {
  const { user } = useAuth();
  // --- CORREÇÃO ---
  // Adicionamos isLoading para saber quando os dados dos pacientes estão a ser carregados.
  const { patients, selectedPatient, isLoading: isLoadingPatients } = usePatients();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Programas ativos do paciente com dados completos do banco
  const activeAssignedPrograms = useMemo(() => {
    if (!selectedPatient?.assigned_programs) return [];
    return selectedPatient.assigned_programs.filter(p => p.status === 'active');
  }, [selectedPatient]);
  
  const activeProgramIds = useMemo(() => new Set(activeAssignedPrograms.map(p => p.program_id)), [activeAssignedPrograms]);

  const filteredSessionData = useMemo(() => {
    if (!selectedPatient?.sessionData) return [];
    
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;

    return selectedPatient.sessionData.filter(session => {
        // A verificação agora usa `session.program_id` que vem do backend.
        if (!activeProgramIds.has(session.program_id)) return false;
        
        const sessionDate = new Date(session.session_date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        
        return true;
    });
  }, [selectedPatient, startDate, endDate, activeProgramIds]);
  
  // --- CORREÇÃO DE SEGURANÇA ---
  // Adicionamos uma verificação para saber se os pacientes já foram carregados.
  // Se não, exibimos uma tela de carregamento para evitar o "crash".
  if (isLoadingPatients) {
      return (
          <div className="flex items-center justify-center h-64">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl text-indigo-500" />
          </div>
      );
  }

  // As calculadoras agora só rodam quando 'patients' é garantidamente um array.
  const totalPatients = patients?.length || 0;
  const patientLimit = user?.max_patients || 0;
  const totalSessions = patients?.reduce((total, patient) => total + (patient.sessionData?.length || 0), 0) || 0;
  const assignedProgramsCount = activeAssignedPrograms.length;
  const sessionsCountInPeriod = filteredSessionData.length;
  
  const calculateOverallAverageProgress = (data) => {
    if (!data || data.length === 0) return '--';
    const interventionScores = data.filter(s => !s.is_baseline && typeof s.score === 'number').map(s => s.score);
    if (interventionScores.length === 0) return '--';
    return (interventionScores.reduce((sum, score) => sum + score, 0) / interventionScores.length).toFixed(1);
  };
  const averageProgressInPeriod = calculateOverallAverageProgress(filteredSessionData);

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div>
      {selectedPatient ? (
        <>
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl font-semibold text-gray-800">Dashboard: {selectedPatient.name}</h1>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Programas Ativos" value={assignedProgramsCount} icon={faTasks} colorClass={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
            <StatCard title="Sessões no Período (Programas Ativos)" value={sessionsCountInPeriod} icon={faClipboardList} colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} />
            <StatCard title="Progresso Médio no Período (Programas Ativos)" value={`${averageProgressInPeriod}%`} icon={faPercentage} colorClass={{ bg: 'bg-amber-100', text: 'text-amber-600' }} />
          </div>

          <div className="mt-8 bg-white p-6 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-3 text-emerald-500" />
                Progressão Geral (Média Mensal dos Programas Ativos)
            </h2>
            <div className="relative h-72">
                <OverallProgressChart sessionData={filteredSessionData} />
            </div>
          </div>

          <AllProgramsChartsGrid 
            activePrograms={activeAssignedPrograms} 
            sessionData={filteredSessionData}
          />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard Geral</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="Total de Clientes" value={`${totalPatients} / ${patientLimit}`} icon={faUsers} colorClass={{ bg: 'bg-indigo-100', text: 'text-indigo-600' }} />
             <StatCard title="Total de Sessões (Todos os Clientes)" value={totalSessions} icon={faClipboardList} colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }} />
          </div>
          <div className="mt-8 text-center text-gray-500 p-8 border-2 border-dashed rounded-lg bg-gray-50">
            <FontAwesomeIcon icon={faTachometerAlt} className="text-4xl text-gray-300 mb-3" />
            <p>Selecione um cliente para ver um dashboard mais detalhado.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
