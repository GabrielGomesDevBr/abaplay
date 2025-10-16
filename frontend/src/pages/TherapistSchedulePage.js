// frontend/src/pages/TherapistSchedulePage.js

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope,
  faExclamationTriangle,
  faCheckCircle,
  faRefresh,
  faCalendarCheck,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom'; // ✅ NOVO: Para receber state da navegação
import {
  getPersonalSchedule,
  getUpcomingAppointments,
  getTodaySchedule,
  getMissedAppointments,
  getAppointmentDetails,
  justifyMissedAppointment,
  cancelTherapistAppointment,
  completeSessionWithNotes,
  groupAppointmentsByDate,
  getNextAppointment,
  calculateSummaryStats,
  isAppointmentOverdue,
  getTimeUntilAppointment
} from '../api/therapistScheduleApi';
import AppointmentDetailsModal from '../components/scheduling/AppointmentDetailsModal';
import SessionNoteModal from '../components/scheduling/SessionNoteModal';
import TherapistCancelAppointmentModal from '../components/scheduling/TherapistCancelAppointmentModal';

/**
 * Página de agenda pessoal para terapeutas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const TherapistSchedulePage = () => {
  const { user } = useAuth();
  const location = useLocation(); // ✅ NOVO: Para receber state da navegação

  // Estados principais
  const [schedule, setSchedule] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [missedAppointments, setMissedAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedAppointments, setHighlightedAppointments] = useState([]); // ✅ NOVO: Para destacar appointments

  // Estados dos modais
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justifyingAppointment, setJustifyingAppointment] = useState(null);
  const [showSessionNoteModal, setShowSessionNoteModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // Estados de visualização
  const [currentView, setCurrentView] = useState('today'); // today, upcoming, schedule, missed
  const [scheduleFilters, setScheduleFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 dias à frente (incluindo recorrentes)
  });

  // Estados de justificativa
  const [justificationData, setJustificationData] = useState({
    missed_reason: '',
    missed_by: 'patient'
  });
  const [isSubmittingJustification, setIsSubmittingJustification] = useState(false);

  // ✅ CORREÇÃO: Definir funções de carregamento ANTES de loadAllData para evitar erro de inicialização
  const loadSchedule = useCallback(async () => {
    try {
      const response = await getPersonalSchedule(scheduleFilters);
      setSchedule(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agenda');
    }
  }, [scheduleFilters]);

  const loadTodaySchedule = useCallback(async () => {
    try {
      const response = await getTodaySchedule();
      setTodaySchedule(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agenda de hoje');
    }
  }, []);

  const loadUpcomingAppointments = useCallback(async () => {
    try {
      const response = await getUpcomingAppointments(30); // próximos 30 dias (incluindo agendamentos recorrentes)
      const appointments = response.appointments || [];

      // Deduplicate appointments by ID (safeguard)
      const uniqueAppointments = Array.from(
        new Map(appointments.map(apt => [apt.id, apt])).values()
      );

      setUpcomingAppointments(uniqueAppointments);
    } catch (error) {
      console.error('Erro ao carregar próximos agendamentos');
    }
  }, []);

  const loadMissedAppointments = useCallback(async () => {
    try {
      const response = await getMissedAppointments(false); // apenas não justificados
      setMissedAppointments(response.appointments || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos perdidos');
    }
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadTodaySchedule(),
        loadUpcomingAppointments(),
        loadMissedAppointments(),
        loadSchedule()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados da agenda');
      setError('Erro ao carregar dados da agenda. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [loadTodaySchedule, loadUpcomingAppointments, loadMissedAppointments, loadSchedule]);

  // Carregar dados iniciais
  useEffect(() => {
    if (user && user.role === 'terapeuta' && !user.is_admin) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // ✅ NOVO: Processar state da navegação (vindo de TodayPriorities)
  useEffect(() => {
    if (location.state) {
      const { filterByMissed, highlightAppointments, showMissedOnly } = location.state;

      // Se veio das prioridades para ver sessões perdidas
      if (filterByMissed || showMissedOnly) {
        setCurrentView('missed'); // Mudar para aba de perdidos

        if (highlightAppointments && Array.isArray(highlightAppointments)) {
          setHighlightedAppointments(highlightAppointments);

          // Mostrar toast informativo
          toast.success(`Exibindo ${highlightAppointments.length} sessão${highlightAppointments.length > 1 ? 'ões' : ''} que precisa${highlightAppointments.length > 1 ? 'm' : ''} de justificativa`, {
            icon: '📋',
            duration: 3000
          });
        }
      }

      // Limpar o state após processar para evitar reprocessamento
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Recarregar agenda quando filtros mudarem
  useEffect(() => {
    if (currentView === 'schedule') {
      loadSchedule();
    }
  }, [currentView, loadSchedule]);


  const handleViewAppointment = async (appointment) => {
    try {
      const details = await getAppointmentDetails(appointment.id);
      setSelectedAppointment(details.appointment);
      setShowAppointmentDetails(true);
    } catch (error) {
      console.error('Erro ao carregar detalhes do agendamento');
      toast.error('Erro ao carregar detalhes do agendamento');
    }
  };

  const handleAddSessionNote = (appointment) => {
    setEditingSession(appointment);
    setShowSessionNoteModal(true);
  };

  const handleSaveSessionNote = async (sessionId, notes) => {
    try {
      await completeSessionWithNotes(sessionId, notes);

      // Recarregar dados após salvar
      await loadAllData();
    } catch (error) {
      throw new Error(error.message || 'Erro ao salvar anotação');
    }
  };

  // Quick Win #2: Registro rápido sem modal
  const handleQuickComplete = async (appointment) => {
    try {
      // ✅ VALIDAÇÃO: Verificar se o agendamento não está no futuro
      const appointmentDateTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
      const now = new Date();

      if (appointmentDateTime > now) {
        toast.error('Não é possível registrar uma sessão que ainda não aconteceu. A data/hora do agendamento está no futuro.', {
          icon: '⏰',
          duration: 4000
        });
        return;
      }

      const defaultNote = `Sessão realizada - ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      await completeSessionWithNotes(appointment.id, defaultNote);
      await loadAllData();

      toast.success('Sessão marcada como realizada!', {
        icon: '✓',
        duration: 2000
      });
    } catch (error) {
      console.error('Erro ao registrar sessão:', error);
      // Mostrar mensagem de erro do backend se disponível
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.message || 'Erro ao registrar sessão. Tente novamente.';
      toast.error(errorMessage, {
        duration: 4000
      });
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
      toast.error('Por favor, forneça um motivo para a ausência.');
      return;
    }

    try {
      setIsSubmittingJustification(true);
      await justifyMissedAppointment(justifyingAppointment.id, justificationData);

      // Recarregar dados
      await loadMissedAppointments();

      setShowJustificationModal(false);
      setJustifyingAppointment(null);
      toast.success('Justificativa adicionada com sucesso.');
    } catch (error) {
      console.error('Erro ao justificar agendamento');
      toast.error('Erro ao adicionar justificativa. Tente novamente.');
    } finally {
      setIsSubmittingJustification(false);
    }
  };

  const handleCancelAppointment = (appointment) => {
    setCancellingAppointment(appointment);
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = async (cancellationData) => {
    try {
      setIsSubmittingCancellation(true);
      await cancelTherapistAppointment(cancellingAppointment.id, cancellationData);

      // Recarregar todos os dados
      await loadAllData();

      setShowCancelModal(false);
      setCancellingAppointment(null);
      toast.success('Agendamento cancelado com sucesso. Os administradores foram notificados.');
    } catch (error) {
      console.error('Erro ao cancelar agendamento');
      toast.error(error.message || 'Erro ao cancelar agendamento. Tente novamente.');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const getQuickStatsCards = () => {
    const stats = calculateSummaryStats([...todaySchedule, ...upcomingAppointments]);
    const nextAppointment = getNextAppointment([...todaySchedule, ...upcomingAppointments]);

    // Quick Win #3: Calcular horas trabalhadas (sessões completed)
    const completedToday = todaySchedule.filter(a => a.status === 'completed');
    const totalMinutesToday = completedToday.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    const hoursWorked = Math.floor(totalMinutesToday / 60);
    const minutesRemaining = totalMinutesToday % 60;
    const hoursDisplay = hoursWorked > 0
      ? `${hoursWorked}h${minutesRemaining > 0 ? minutesRemaining + 'm' : ''}`
      : `${minutesRemaining}min`;

    // Calcular pendentes de registro hoje
    const scheduledToday = todaySchedule.filter(a =>
      a.status === 'scheduled' &&
      new Date(`${a.scheduled_date}T${a.scheduled_time}`) < new Date()
    );

    return [
      {
        title: 'Agendamentos Hoje',
        value: todaySchedule.length,
        icon: faCalendarCheck,
        color: 'bg-blue-500'
      },
      {
        title: 'Horas Trabalhadas Hoje',
        value: hoursDisplay,
        icon: faClock,
        color: 'bg-indigo-500',
        subtitle: `${completedToday.length} sessões realizadas`
      },
      {
        title: 'Pendentes de Registro',
        value: scheduledToday.length,
        icon: faExclamationTriangle,
        color: scheduledToday.length > 0 ? 'bg-orange-500' : 'bg-green-500',
        subtitle: scheduledToday.length > 0 ? 'Sessões atrasadas' : 'Tudo em dia!'
      },
      {
        title: 'Próximo Agendamento',
        value: nextAppointment
          ? getTimeUntilAppointment(nextAppointment)
          : 'Nenhum',
        icon: faCalendarAlt,
        color: 'bg-purple-500',
        subtitle: nextAppointment
          ? `${nextAppointment.patient_name} - ${nextAppointment.scheduled_time}`
          : 'Nenhum agendamento próximo'
      }
    ];
  };

  const renderAppointmentCard = (appointment, showDate = false) => {
    const isOverdue = isAppointmentOverdue(appointment);
    const hasNote = appointment.notes && appointment.notes.trim() !== '';
    const isHighlighted = highlightedAppointments.includes(appointment.id); // ✅ NOVO: Verificar se está destacado

    // Determinar status visual
    const getStatusConfig = () => {
      if (appointment.status === 'completed') {
        return {
          bgColor: 'bg-green-50 border-green-200',
          icon: faCheckCircle,
          iconColor: 'text-green-600',
          label: 'Sessão realizada'
        };
      }
      if (appointment.status === 'missed') {
        return {
          bgColor: 'bg-red-50 border-red-300',
          icon: faExclamationTriangle,
          iconColor: 'text-red-600',
          label: 'Perdido'
        };
      }
      if (appointment.status === 'cancelled') {
        return {
          bgColor: 'bg-gray-50 border-gray-300',
          icon: faTimes,
          iconColor: 'text-gray-600',
          label: 'Cancelado'
        };
      }
      if (isOverdue) {
        return {
          bgColor: 'bg-orange-50 border-orange-300',
          icon: faClock,
          iconColor: 'text-orange-600',
          label: 'Atrasado'
        };
      }
      return {
        bgColor: 'bg-blue-50 border-blue-200',
        icon: faClock,
        iconColor: 'text-blue-600',
        label: 'Agendado'
      };
    };

    const statusConfig = getStatusConfig();

    return (
      <div
        key={appointment.id}
        className={`relative p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md active:bg-gray-100 ${statusConfig.bgColor} ${
          isHighlighted ? 'ring-4 ring-yellow-400 ring-opacity-60 shadow-lg' : ''
        }`}
        onClick={() => handleViewAppointment(appointment)}
      >
        {/* ✅ NOVO: Badge de destaque */}
        {isHighlighted && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
              REQUER JUSTIFICATIVA
            </span>
          </div>
        )}

        {/* Ícone de status no canto superior direito */}
        <div className="absolute top-2 right-2">
          <div className={`flex items-center gap-1 ${statusConfig.iconColor}`} title={statusConfig.label}>
            <FontAwesomeIcon icon={statusConfig.icon} className="w-4 h-4" />
            {hasNote && appointment.status === 'completed' && (
              <span className="text-[10px] font-medium bg-green-600 text-white px-1.5 py-0.5 rounded-full">COM NOTA</span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0 pr-8">
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
              {appointment.status === 'scheduled' && (
                <>
                  {/* Quick Win #2: Botão de check rápido */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickComplete(appointment);
                    }}
                    className="px-2 py-1 text-xs font-medium bg-green-500 text-white rounded hover:bg-green-600 active:bg-green-700 flex items-center gap-1 shadow-sm"
                    title="Marcar como realizada (sem nota)"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                    ✓ Realizado
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddSessionNote(appointment);
                    }}
                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded hover:bg-blue-200 active:bg-blue-300 flex items-center gap-1"
                    title="Registrar com nota"
                  >
                    + Nota
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelAppointment(appointment);
                    }}
                    className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded hover:bg-red-200 active:bg-red-300 flex items-center gap-1"
                    title="Cancelar agendamento"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                  </button>
                </>
              )}
              {appointment.notes && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSessionNote(appointment);
                  }}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded hover:bg-blue-200 active:bg-blue-300"
                >
                  Editar nota
                </button>
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

  const renderTodayView = () => {
    // Quick Win #4: Calcular sessões pendentes de registro
    const pendingRegistration = todaySchedule.filter(a =>
      a.status === 'scheduled' &&
      new Date(`${a.scheduled_date}T${a.scheduled_time}`) < new Date()
    );

    return (
      <div className="space-y-6">
        {/* Quick Win #4: Banner de pendentes */}
        {pendingRegistration.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg p-4 sm:p-5 border-2 border-orange-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold mb-1">
                  ⚠️ {pendingRegistration.length} {pendingRegistration.length === 1 ? 'sessão precisa' : 'sessões precisam'} de registro
                </h3>
                <p className="text-sm sm:text-base text-orange-50 mb-3">
                  {pendingRegistration.length === 1
                    ? 'Há uma sessão de hoje que já foi realizada mas ainda não foi registrada.'
                    : `Há ${pendingRegistration.length} sessões de hoje que já foram realizadas mas ainda não foram registradas.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingRegistration.slice(0, 3).map(apt => (
                    <span key={apt.id} className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      {apt.scheduled_time} - {apt.patient_name}
                    </span>
                  ))}
                  {pendingRegistration.length > 3 && (
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      +{pendingRegistration.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
  };

  const renderUpcomingView = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-green-600" />
          Próximos Agendamentos (30 dias)
        </h2>
        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum agendamento nos próximos 30 dias
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
                { id: 'missed', name: 'Perdidos', icon: faExclamationTriangle, badge: missedAppointments.length }
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

      {/* Modal de Registro de Sessão (Plano Agendamento) */}
      <SessionNoteModal
        session={editingSession}
        isOpen={showSessionNoteModal}
        onClose={() => {
          setShowSessionNoteModal(false);
          setEditingSession(null);
        }}
        onSave={handleSaveSessionNote}
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

      {/* Modal de Cancelamento */}
      <TherapistCancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingAppointment(null);
        }}
        appointment={cancellingAppointment}
        onConfirm={handleConfirmCancellation}
        isSubmitting={isSubmittingCancellation}
      />
    </div>
  );
};

export default TherapistSchedulePage;