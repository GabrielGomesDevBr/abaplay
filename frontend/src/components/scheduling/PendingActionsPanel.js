// frontend/src/components/scheduling/PendingActionsPanel.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSpinner,
  faCalendarPlus,
  faFileAlt,
  faBolt,
  faChevronRight,
  faRobot,
  faClock,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { getPendingActions } from '../../api/schedulingApi';
import { translateStatus } from '../../utils/statusTranslator';
import MissedAppointmentsSummary from './MissedAppointmentsSummary';
import OrphanSessionsSummary from './OrphanSessionsSummary';

/**
 * Painel de ações pendentes - UX profissional
 * Mostra resumo consolidado do sistema automático
 *
 * ✅ ATUALIZAÇÃO: Terminologia padronizada "Não Realizado" (antes "Perdido")
 * ✅ NOVO: Resumo expandível com detalhes completos
 * ✅ FASE 2: Órfãs integradas no painel principal
 */
const PendingActionsPanel = ({
  onResolveAction,
  onResolveOrphans,
  onResolveAll,
  onViewAppointmentDetails,
  onJustifyAppointment,
  onCreateRetroactive,
  onCreateBatchRetroactive,
  refreshTrigger = 0
}) => {
  const [pendingData, setPendingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadPendingActions();
  }, [refreshTrigger]);

  const loadPendingActions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPendingActions();
      setPendingData(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Erro ao carregar dados do sistema');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler unificado
  const handleResolve = (action) => {
    if (onResolveAction) {
      onResolveAction(action);
    } else if (action === 'orphans' && onResolveOrphans) {
      onResolveOrphans();
    } else if (action === 'all' && onResolveAll) {
      onResolveAll();
    } else if (action === 'missed') {
      alert('Para justificar ausências, acesse a lista de agendamentos e clique no agendamento não realizado para adicionar a justificativa.');
    }
  };

  // ✅ NOVO: Handler para notificar terapeuta
  const handleNotifyTherapist = (therapistId, appointmentId) => {
    // TODO: Implementar notificação (Fase 2)
    console.log(`Notificar terapeuta ${therapistId} sobre agendamento ${appointmentId}`);
    alert('Funcionalidade de notificação será implementada na Fase 2');
  };

  // ✅ NOVO: Handler para ver detalhes
  const handleViewDetails = (appointment) => {
    if (onViewAppointmentDetails) {
      onViewAppointmentDetails(appointment);
    } else {
      console.log(`Ver detalhes do agendamento ${appointment.id}`);
    }
  };

  // ✅ NOVO: Handler para justificar
  const handleJustify = (appointment) => {
    if (onJustifyAppointment) {
      onJustifyAppointment(appointment);
    } else {
      console.log(`Justificar agendamento ${appointment.id}`);
    }
  };

  // Formatar tempo decorrido
  const getTimeAgo = () => {
    if (!lastUpdate) return '';
    const seconds = Math.floor((new Date() - lastUpdate) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return 'há 1 minuto';
    return `há ${minutes} minutos`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-6 w-6 text-blue-600" />
          <span className="text-gray-600 font-medium">Carregando status do sistema...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="bg-red-100 p-3 rounded-full">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold">{error}</h3>
            <button
              onClick={loadPendingActions}
              className="text-sm text-red-600 hover:text-red-700 underline mt-1"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { orphan_sessions = [], missed_appointments = [], detected_today = 0 } = pendingData || {};
  const totalPending = orphan_sessions.length + missed_appointments.length;

  // Estado perfeito - tudo automatizado
  if (totalPending === 0 && detected_today === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-full shadow-sm">
              <FontAwesomeIcon icon={faCheckCircle} className="text-white h-6 w-6" />
            </div>
            <div>
              <h3 className="text-green-900 font-bold text-lg">Sistema Funcionando Perfeitamente</h3>
              <p className="text-green-700 text-sm flex items-center mt-1">
                <FontAwesomeIcon icon={faRobot} className="mr-2" />
                Automação ativa • Nenhuma ação pendente
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-green-600 flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-1" />
              Atualizado {getTimeAgo()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Status do Sistema */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <FontAwesomeIcon icon={faRobot} className="text-white h-5 w-5" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Sistema de Automação</h2>
                <p className="text-blue-100 text-sm flex items-center">
                  <FontAwesomeIcon icon={faClock} className="mr-2 text-xs" />
                  Atualizado {getTimeAgo()} • Execução a cada 30 minutos
                </p>
              </div>
            </div>
            {totalPending > 0 && (
              <div className="bg-white text-blue-600 px-4 py-2 rounded-full font-bold text-lg shadow-sm">
                {totalPending}
              </div>
            )}
          </div>
        </div>

        {/* Cards de Ações */}
        <div className="p-6 space-y-4">
          {/* Sessões Detectadas Hoje - Métrica de Sucesso */}
          {detected_today > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-full shadow-sm flex-shrink-0">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-white h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-green-900 font-bold text-lg">{detected_today} Sessões Vinculadas Hoje</p>
                  <p className="text-green-700 text-sm mt-1">
                    Sistema detectou e vinculou automaticamente às sessões agendadas
                  </p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                  Automático
                </div>
              </div>
            </div>
          )}

          {/* Sessões Órfãs - Requer Atenção */}
          {orphan_sessions.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-3 rounded-full shadow-sm flex-shrink-0">
                    <FontAwesomeIcon icon={faCalendarPlus} className="text-white h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-orange-900 font-bold text-lg">
                      {orphan_sessions.length} Sessão(ões) Órfã(s)
                    </p>
                    <p className="text-orange-700 text-sm mt-1">
                      Sessões realizadas sem agendamento prévio • Criar retroativos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleResolve('orphans')}
                  className="ml-4 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-amber-700 hover:shadow-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105 flex-shrink-0"
                >
                  <span>Resolver</span>
                  <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* ✅ NOVO: Agendamentos Não Realizados - Resumo Expandível */}
          {missed_appointments.length > 0 && (
            <MissedAppointmentsSummary
              appointments={missed_appointments}
              onNotifyTherapist={handleNotifyTherapist}
              onViewDetails={handleViewDetails}
              onJustify={handleJustify}
              onRefresh={loadPendingActions}
            />
          )}

          {/* ✅ FASE 2: Sessões Órfãs - Resumo Expandível */}
          {orphan_sessions.length > 0 && (
            <OrphanSessionsSummary
              orphanSessions={orphan_sessions}
              onCreateRetroactive={onCreateRetroactive}
              onCreateBatch={onCreateBatchRetroactive}
              maxDisplay={5}
            />
          )}
        </div>
      </div>

      {/* Indicador de Próxima Execução */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-center space-x-2 text-sm text-blue-700">
        <FontAwesomeIcon icon={faRobot} className="text-blue-500" />
        <span className="font-medium">
          Próxima detecção automática em aproximadamente {30 - (new Date().getMinutes() % 30)} minutos
        </span>
      </div>
    </div>
  );
};

export default PendingActionsPanel;