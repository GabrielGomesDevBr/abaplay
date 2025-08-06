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
    // ... (código do gráfico mantido, sem alterações)
};

const AllProgramsChartsGrid = ({ activePrograms, sessionData, allProgramsData }) => {
    // ... (código do gráfico mantido, sem alterações)
};


const DashboardPage = () => {
  const { user } = useAuth();
  // --- CORREÇÃO ---
  // Adicionamos isLoading para saber quando os dados dos pacientes estão a ser carregados.
  const { patients, selectedPatient, isLoading: isLoadingPatients } = usePatients();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- CORREÇÃO ---
  // Adicionamos verificações para garantir que `selectedPatient` e `assigned_programs` existem.
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

          {/* O restante do JSX permanece o mesmo */}
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
