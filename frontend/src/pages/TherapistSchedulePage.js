// frontend/src/pages/TherapistSchedulePage.js

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope,
  faChartBar,
  faExclamationTriangle,
  faCheckCircle,
  faRefresh,
  faCalendarCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import {
  getPersonalSchedule,
  getUpcomingAppointments,
  getTodaySchedule,
  getMissedAppointments,
  getPersonalStatistics,
  getAppointmentDetails,
  justifyMissedAppointment,
  groupAppointmentsByDate,
  getNextAppointment,
  calculateSummaryStats,
  isAppointmentOverdue,
  getTimeUntilAppointment,
  getPerformanceColor
} from '../api/therapistScheduleApi';
import AppointmentDetailsModal from '../components/scheduling/AppointmentDetailsModal';

/**
 * Página de agenda pessoal para terapeutas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const TherapistSchedulePage = () => {
  const { user } = useAuth();

  // Estados principais
  const [schedule, setSchedule] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [missedAppointments, setMissedAppointments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados dos modais
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justifyingAppointment, setJustifyingAppointment] = useState(null);

  // Estados de visualização
  const [currentView, setCurrentView] = useState('today'); // today, upcoming, schedule, missed, stats
  const [scheduleFilters, setScheduleFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 dias à frente
  });

  // Estados de justificativa
  const [justificationData, setJustificationData] = useState({
    missed_reason: '',
    missed_by: 'patient'
  });
  const [isSubmittingJustification, setIsSubmittingJustification] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadTodaySchedule(),
        loadUpcomingAppointments(),
        loadMissedAppointments(),
        loadStatistics(),
        loadSchedule()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados da agenda');
      setError('Erro ao carregar dados da agenda. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const response = await getPersonalSchedule(scheduleFilters);
      setSchedule(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agenda');
    }
  }, [scheduleFilters]);

  // Carregar dados iniciais
  useEffect(() => {
    if (user && user.role === 'terapeuta' && !user.is_admin) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Recarregar agenda quando filtros mudarem
  useEffect(() => {
    if (currentView === 'schedule') {
      loadSchedule();
    }
  }, [currentView, loadSchedule]);

  const loadTodaySchedule = async () => {
    try {
      const response = await getTodaySchedule();
      setTodaySchedule(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agenda de hoje');
    }
  };

  const loadUpcomingAppointments = async () => {
    try {
      const response = await getUpcomingAppointments(7); // próximos 7 dias
      setUpcomingAppointments(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar próximos agendamentos');
    }
  };

  const loadMissedAppointments = async () => {
    try {
      const response = await getMissedAppointments(false); // apenas não justificados
      setMissedAppointments(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos perdidos');
    }
  };

  const loadStatistics = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await getPersonalStatistics({
        start_date: startDate,
        end_date: endDate,
        period: 'month'
      });
      setStatistics(response);
    } catch (error) {
      console.error('Erro ao carregar estatísticas');
    }
  };


  const handleViewAppointment = async (appointment) => {
    try {
      const details = await getAppointmentDetails(appointment.id);
      setSelectedAppointment(details.appointment);
      setShowAppointmentDetails(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do agendamento');
      alert('Erro ao carregar detalhes do agendamento');
    }
  };

  const handleJustifyAppointment = (appointment) => {
    setJustifyingAppointment(appointment);
    setJustificationData({
      missed_reason: '',
      missed_by: 'patient'
    });
    setShowJustificationModal(true);
  };

  const handleSubmitJustification = async () => {
    if (!justificationData.missed_reason.trim()) {
      alert('Por favor, forneça um motivo para a ausência.');
      return;
    }

    try {
      setIsSubmittingJustification(true);
      await justifyMissedAppointment(justifyingAppointment.id, justificationData);

      // Recarregar dados
      await loadMissedAppointments();
      await loadStatistics();

      setShowJustificationModal(false);
      setJustifyingAppointment(null);
      alert('Justificativa adicionada com sucesso.');
    } catch (error) {
      console.error('Erro ao justificar agendamento');
      alert('Erro ao adicionar justificativa. Tente novamente.');
    } finally {
      setIsSubmittingJustification(false);
    }
  };

  const getQuickStatsCards = () => {
    const stats = calculateSummaryStats([...todaySchedule, ...upcomingAppointments]);
    const nextAppointment = getNextAppointment([...todaySchedule, ...upcomingAppointments]);

    return [
      {
        title: 'Agendamentos Hoje',
        value: todaySchedule.length,
        icon: faCalendarCheck,
        color: 'bg-blue-500'
      },
      {
        title: 'Próximos 7 Dias',
        value: upcomingAppointments.length,
        icon: faCalendarAlt,
        color: 'bg-green-500'
      },
      {
        title: 'Aguardando Justificativa',
        value: missedAppointments.length,
        icon: faExclamationTriangle,
        color: 'bg-red-500'
      },
      {
        title: 'Próximo Agendamento',
        value: nextAppointment
          ? getTimeUntilAppointment(nextAppointment)
          : 'Nenhum',
        icon: faClock,
        color: 'bg-purple-500',
        subtitle: nextAppointment
          ? `${nextAppointment.patient_name} - ${nextAppointment.scheduled_time}`
          : 'Nenhum agendamento próximo'
      }
    ];
  };

  const renderAppointmentCard = (appointment, showDate = false) => {
    const isOverdue = isAppointmentOverdue(appointment);

    return (
      <div
        key={appointment.id}
        className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 ${
          isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
        }`}
        onClick={() => handleViewAppointment(appointment)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            {showDate && (
              <div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">
                {new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')}
              </div>
            )}
            <div className="flex items-center mb-2 flex-wrap gap-2">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faClock} className="text-blue-500 mr-1.5 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium text-gray-900 text-sm sm:text-base">
                  {appointment.scheduled_time} ({appointment.duration_minutes}min)
                </span>
              </div>
              {isOverdue && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  Atrasado
                </span>
              )}
            </div>
            <div className="flex items-center mb-1.5 sm:mb-1">
              <FontAwesomeIcon icon={faUser} className="text-green-500 mr-1.5 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-gray-700 text-sm sm:text-base truncate">{appointment.patient_name}</span>
            </div>
            <div className="flex items-start">
              <FontAwesomeIcon icon={faStethoscope} className="text-purple-500 mr-1.5 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-gray-600 line-clamp-2">{appointment.program_name}</span>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end gap-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
              appointment.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
              appointment.status === 'missed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {appointment.status === 'scheduled' && 'Agendado'}
              {appointment.status === 'completed' && 'Realizado'}
              {appointment.status === 'missed' && 'Perdido'}
              {appointment.status === 'cancelled' && 'Cancelado'}
            </span>
            {appointment.status === 'missed' && !appointment.missed_reason && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleJustifyAppointment(appointment);
                }}
                className="px-3 py-2 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 active:bg-red-300 min-h-[44px] flex items-center whitespace-nowrap"
              >
                Justificar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTodayView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faCalendarCheck} className="mr-3 text-blue-600" />
          Agenda de Hoje - {new Date().toLocaleDateString('pt-BR')}
        </h2>
        {todaySchedule.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum agendamento para hoje
          </p>
        ) : (
          <div className="space-y-3">
            {todaySchedule.map(appointment => renderAppointmentCard(appointment))}
          </div>
        )}
      </div>
    </div>
  );

  const renderUpcomingView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-green-600" />
          Próximos Agendamentos (7 dias)
        </h2>
        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum agendamento nos próximos 7 dias
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map(appointment => renderAppointmentCard(appointment, true))}
          </div>
        )}
      </div>
    </div>
  );

  const renderScheduleView = () => {
    const groupedSchedule = groupAppointmentsByDate(schedule);
    const dates = Object.keys(groupedSchedule).sort();

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 sm:mr-3 text-purple-600" />
              Agenda Completa
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <input
                type="date"
                value={scheduleFilters.start_date}
                onChange={(e) => setScheduleFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto min-h-[44px]"
              />
              <input
                type="date"
                value={scheduleFilters.end_date}
                onChange={(e) => setScheduleFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto min-h-[44px]"
              />
            </div>
          </div>

          {dates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum agendamento no período selecionado
            </p>
          ) : (
            <div className="space-y-6">
              {dates.map(date => (
                <div key={date}>
                  <h3 className="text-md font-medium text-gray-700 mb-3 border-b border-gray-200 pb-2">
                    {new Date(date).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <div className="space-y-3">
                    {groupedSchedule[date].map(appointment => renderAppointmentCard(appointment))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMissedView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-red-600" />
          Agendamentos Perdidos Sem Justificativa
        </h2>
        {missedAppointments.length === 0 ? (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-4xl mb-4" />
            <p className="text-gray-500">
              Nenhum agendamento perdido aguardando justificativa
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {missedAppointments.map(appointment => renderAppointmentCard(appointment, true))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStatsView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <FontAwesomeIcon icon={faChartBar} className="mr-3 text-indigo-600" />
          Estatísticas Pessoais (Últimos 30 dias)
        </h2>

        {statistics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-blue-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1.5 sm:mb-2">Total de Agendamentos</h3>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{statistics.total_appointments || 0}</p>
            </div>
            <div className="bg-green-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-green-800 mb-1.5 sm:mb-2">Agendamentos Realizados</h3>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{statistics.completed_appointments || 0}</p>
            </div>
            <div className="bg-red-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-red-800 mb-1.5 sm:mb-2">Agendamentos Perdidos</h3>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{statistics.missed_appointments || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-purple-800 mb-1.5 sm:mb-2">Taxa de Comparecimento</h3>
              <p className={`text-xl sm:text-2xl font-bold ${getPerformanceColor(statistics.attendance_rate || 0)}`}>
                {statistics.attendance_rate || 0}%
              </p>
            </div>
            <div className="bg-yellow-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-yellow-800 mb-1.5 sm:mb-2">Taxa de Conclusão</h3>
              <p className={`text-xl sm:text-2xl font-bold ${getPerformanceColor(statistics.completion_rate || 0)}`}>
                {statistics.completion_rate || 0}%
              </p>
            </div>
            <div className="bg-indigo-50 p-4 sm:p-5 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-indigo-800 mb-1.5 sm:mb-2">Pacientes Atendidos</h3>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600">{statistics.unique_patients || 0}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm sm:text-base text-gray-500 text-center py-8">
            Carregando estatísticas...
          </p>
        )}
      </div>
    </div>
  );

  // Verificar permissões - APENAS TERAPEUTAS (não admins)
  if (!user || user.role !== 'terapeuta' || user.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-4xl mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar esta página.
              Esta funcionalidade está disponível apenas para terapeutas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sua agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 sm:mr-3 text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
                <span className="truncate">Minha Agenda</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Visualize seus agendamentos e gerencie sua rotina
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center min-h-[44px] w-full sm:w-auto"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {getQuickStatsCards().map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-2.5 sm:p-3`}>
                  <FontAwesomeIcon icon={stat.icon} className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">{stat.title}</h3>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">{stat.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 px-2 sm:px-4 md:px-0" aria-label="Tabs">
              {[
                { id: 'today', name: 'Hoje', icon: faCalendarCheck },
                { id: 'upcoming', name: 'Próximos', icon: faCalendarAlt },
                { id: 'schedule', name: 'Agenda Completa', icon: faCalendarAlt },
                { id: 'missed', name: 'Perdidos', icon: faExclamationTriangle, badge: missedAppointments.length },
                { id: 'stats', name: 'Estatísticas', icon: faChartBar }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentView(tab.id)}
                  className={`${
                    currentView === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 sm:py-4 px-3 sm:px-4 md:px-6 border-b-2 font-medium text-xs sm:text-sm flex items-center min-h-[44px]`}
                >
                  <FontAwesomeIcon icon={tab.icon} className="mr-1.5 sm:mr-2 w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">
                    {tab.id === 'today' && 'Hoje'}
                    {tab.id === 'upcoming' && 'Próx.'}
                    {tab.id === 'schedule' && 'Agenda'}
                    {tab.id === 'missed' && 'Perdidos'}
                    {tab.id === 'stats' && 'Stats'}
                  </span>
                  {tab.badge > 0 && (
                    <span className="ml-1.5 sm:ml-2 bg-red-100 text-red-600 py-0.5 px-1.5 sm:px-2 rounded-full text-xs font-medium">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {currentView === 'today' && renderTodayView()}
            {currentView === 'upcoming' && renderUpcomingView()}
            {currentView === 'schedule' && renderScheduleView()}
            {currentView === 'missed' && renderMissedView()}
            {currentView === 'stats' && renderStatsView()}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AppointmentDetailsModal
        isOpen={showAppointmentDetails}
        onClose={() => {
          setShowAppointmentDetails(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        canEdit={false}
        canDelete={false}
      />

      {/* Modal de Justificativa */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Justificar Ausência
              </h3>
              <button
                onClick={() => setShowJustificationModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável pela ausência
                </label>
                <select
                  value={justificationData.missed_by}
                  onChange={(e) => setJustificationData(prev => ({ ...prev, missed_by: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-h-[44px]"
                >
                  <option value="patient">Paciente</option>
                  <option value="therapist">Terapeuta</option>
                  <option value="both">Ambos</option>
                  <option value="other">Outros fatores</option>
                </select>
              </div>

              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo da ausência *
                </label>
                <textarea
                  value={justificationData.missed_reason}
                  onChange={(e) => setJustificationData(prev => ({ ...prev, missed_reason: e.target.value }))}
                  rows={4}
                  maxLength={500}
                  placeholder="Descreva o motivo da ausência..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none text-sm sm:text-base"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {justificationData.missed_reason.length}/500 caracteres
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setShowJustificationModal(false)}
                  disabled={isSubmittingJustification}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitJustification}
                  disabled={isSubmittingJustification || !justificationData.missed_reason.trim()}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px]"
                >
                  {isSubmittingJustification && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Justificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistSchedulePage;