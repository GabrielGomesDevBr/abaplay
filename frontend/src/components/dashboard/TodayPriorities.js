// frontend/src/components/dashboard/TodayPriorities.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faExclamationTriangle,
  faClipboardList,
  faComments,
  faChevronRight,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import {
  getTodaySchedule,
  getMissedAppointments
} from '../../api/therapistScheduleApi';
import { getUnreadMessagesCount, getUnreadChats } from '../../api/parentChatApi';
import { fetchAssignmentsWithoutProgress } from '../../api/patientApi';
import { usePatients } from '../../context/PatientContext'; // ✅ NOVO: Para selecionar paciente

/**
 * Componente de Prioridades do Dia para Terapeutas
 * Exibe um resumo das ações mais importantes que o terapeuta precisa realizar hoje
 */
const TodayPriorities = () => {
  const navigate = useNavigate();
  const { selectPatient } = usePatients(); // ✅ NOVO: Para selecionar paciente antes de navegar

  const [priorities, setPriorities] = useState({
    nextAppointment: null,
    missedCount: 0,
    missedAppointments: [], // ✅ NOVO: Array completo
    programsWithoutProgress: 0,
    programsList: [], // ✅ NOVO: Array completo
    unreadMessages: 0,
    unreadChats: [] // ✅ NOVO: Array completo
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPriorities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar todos os dados em paralelo
      const [todayResponse, missedResponse, messagesCount, unreadChatsData, programsData] = await Promise.all([
        getTodaySchedule().catch(() => ({ appointments: [] })),
        getMissedAppointments(false).catch(() => ({ appointments: [] })),
        getUnreadMessagesCount().catch(() => 0),
        getUnreadChats().catch(() => []), // ✅ NOVO: Buscar lista de conversas
        fetchAssignmentsWithoutProgress(7).catch(() => []) // Programas sem progresso há 7+ dias
      ]);

      // Encontrar próximo agendamento
      const now = new Date();
      const upcomingAppointments = (todayResponse.appointments || [])
        .filter(apt => {
          const aptTime = new Date(`${apt.scheduled_date}T${apt.scheduled_time}`);
          return aptTime > now && apt.status === 'scheduled';
        })
        .sort((a, b) => {
          const timeA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
          const timeB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
          return timeA - timeB;
        });

      // ✅ NOVO: Armazenar dados completos para navegação contextual
      const missedAppointments = missedResponse.appointments || [];
      const programsList = Array.isArray(programsData) ? programsData : [];
      const unreadChats = Array.isArray(unreadChatsData) ? unreadChatsData : [];

      setPriorities({
        nextAppointment: upcomingAppointments[0] || null,
        missedCount: missedAppointments.length,
        missedAppointments, // ✅ NOVO: Array completo
        programsWithoutProgress: programsList.length,
        programsList, // ✅ NOVO: Array completo
        unreadMessages: messagesCount || 0,
        unreadChats // ✅ NOVO: Array completo
      });

    } catch (error) {
      console.error('Erro ao carregar prioridades:', error);
      setError('Erro ao carregar prioridades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPriorities();

    // Atualizar a cada 5 minutos
    const interval = setInterval(loadPriorities, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeUntilAppointment = (appointment) => {
    if (!appointment) return null;

    const now = new Date();
    const aptTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
    const diff = aptTime - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `em ${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      return `em ${minutes} minutos`;
    } else {
      return 'agora';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Carregando prioridades...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Não mostrar card se houver erro
  }

  const hasPriorities = priorities.nextAppointment ||
                        priorities.missedCount > 0 ||
                        priorities.programsWithoutProgress > 0 ||
                        priorities.unreadMessages > 0;

  if (!hasPriorities) {
    return null; // Não mostrar card se não há prioridades
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white bg-opacity-20 rounded-full p-2 mr-3">
            <FontAwesomeIcon icon={faClock} className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Prioridades de Hoje</h3>
            <p className="text-blue-100 text-sm">Ações que requerem sua atenção</p>
          </div>
        </div>
        <button
          onClick={loadPriorities}
          className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          title="Atualizar"
        >
          <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" />
        </button>
      </div>

      {/* Priority Items */}
      <div className="p-6 space-y-3">
        {/* Próxima Sessão */}
        {priorities.nextAppointment && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/my-schedule');
            }}
            className="bg-white rounded-lg p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <FontAwesomeIcon icon={faClock} className="text-blue-600 mr-2 w-4 h-4" />
                  <span className="font-semibold text-gray-900">Próxima sessão</span>
                  <span className="ml-2 text-sm text-blue-600 font-medium">
                    {getTimeUntilAppointment(priorities.nextAppointment)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 ml-6">
                  <span className="font-medium">{priorities.nextAppointment.patient_name}</span>
                  {' - '}
                  {priorities.nextAppointment.scheduled_time}
                  {priorities.nextAppointment.program_name && (
                    <span className="text-gray-500"> • {priorities.nextAppointment.program_name}</span>
                  )}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-gray-400 group-hover:text-blue-600 transition-colors w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* Sessões Perdidas Aguardando Justificativa */}
        {priorities.missedCount > 0 && (
          <div
            onClick={(e) => {
              e.preventDefault(); // ✅ NOVO: Prevenir comportamento padrão
              e.stopPropagation(); // ✅ NOVO: Impedir propagação de eventos

              // Navegar diretamente sem selecionar paciente (são sessões do terapeuta)
              navigate('/my-schedule', {
                state: {
                  filterByMissed: true,
                  highlightAppointments: priorities.missedAppointments.map(a => a.id),
                  showMissedOnly: true
                }
              });
            }}
            className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2 w-4 h-4" />
                  <span className="font-semibold text-gray-900">
                    {priorities.missedCount} {priorities.missedCount === 1 ? 'sessão perdida' : 'sessões perdidas'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Aguardando justificativa
                  {priorities.missedAppointments && priorities.missedAppointments.length > 0 && (
                    <span className="text-yellow-600 font-medium"> • {priorities.missedAppointments[0].patient_name}</span>
                  )}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-gray-400 group-hover:text-yellow-600 transition-colors w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* Programas Sem Registro de Progresso */}
        {priorities.programsWithoutProgress > 0 && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // ✅ CORRIGIDO: Navegar para /programs com paciente selecionado
              if (priorities.programsList && priorities.programsList.length > 0) {
                const firstProgram = priorities.programsList[0];
                // Selecionar paciente primeiro
                if (firstProgram.patient_id) {
                  selectPatient(firstProgram.patient_id);
                }
                // Navegar com state para destacar programas
                navigate('/programs', {
                  state: {
                    highlightAssignments: priorities.programsList.map(p => p.assignment_id),
                    showWithoutProgress: true
                  }
                });
              } else {
                // Fallback: apenas navegar para programs
                navigate('/programs');
              }
            }}
            className="bg-white rounded-lg p-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <FontAwesomeIcon icon={faClipboardList} className="text-orange-600 mr-2 w-4 h-4" />
                  <span className="font-semibold text-gray-900">
                    {priorities.programsWithoutProgress} {priorities.programsWithoutProgress === 1 ? 'programa' : 'programas'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Sem registro de progresso há mais de 7 dias
                  {priorities.programsList && priorities.programsList.length > 0 && (
                    <span className="text-orange-600 font-medium"> • {priorities.programsList[0].patient_name}</span>
                  )}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-gray-400 group-hover:text-orange-600 transition-colors w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* Mensagens Não Lidas */}
        {priorities.unreadMessages > 0 && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // ✅ CORRIGIDO: Navegar para /parent-chat com primeiro chat aberto
              if (priorities.unreadChats && priorities.unreadChats.length > 0) {
                const firstChat = priorities.unreadChats[0];
                // Selecionar paciente primeiro
                if (firstChat.patient_id) {
                  selectPatient(firstChat.patient_id);
                }
                // Navegar com state para abrir chat específico
                navigate('/parent-chat', {
                  state: {
                    openChatPatientId: firstChat.patient_id,
                    highlightUnread: true
                  }
                });
              } else {
                // Fallback: apenas navegar para parent-chat
                navigate('/parent-chat');
              }
            }}
            className="bg-white rounded-lg p-4 border-l-4 border-purple-500 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-1">
                  <FontAwesomeIcon icon={faComments} className="text-purple-600 mr-2 w-4 h-4" />
                  <span className="font-semibold text-gray-900">
                    {priorities.unreadMessages} {priorities.unreadMessages === 1 ? 'nova mensagem' : 'novas mensagens'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Dos pais/responsáveis
                  {priorities.unreadChats && priorities.unreadChats.length > 0 && (
                    <span className="text-purple-600 font-medium"> • {priorities.unreadChats[0].patient_name}</span>
                  )}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="text-gray-400 group-hover:text-purple-600 transition-colors w-4 h-4"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayPriorities;
