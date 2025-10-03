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
  faExclamationCircle,
  faBell,
  faRefresh
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
  const [showDetails, setShowDetails] = useState(false); // ✅ NOVO: Controla expansão de detalhes

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

  // ✅ NOVO: Renderizar badges compactos
  return (
    <div className="space-y-3">
      {/* Badges Compactos - Linha única em desktop, adaptável em mobile */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          {/* Badge 1: Status do Sistema */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg flex-1 sm:flex-none ${
            totalPending === 0
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            <FontAwesomeIcon
              icon={totalPending === 0 ? faCheckCircle : faRobot}
              className="h-4 w-4"
            />
            <span className="font-semibold text-sm whitespace-nowrap">
              Sistema {totalPending === 0 ? 'OK' : 'ON'}
            </span>
          </div>

          {/* Badge 2: Ações Pendentes - Clicável se > 0 */}
          <button
            onClick={() => totalPending > 0 && setShowDetails(!showDetails)}
            disabled={totalPending === 0}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg flex-1 sm:flex-none transition-all ${
              totalPending === 0
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer'
            }`}
          >
            <FontAwesomeIcon
              icon={totalPending === 0 ? faCheckCircle : faBell}
              className="h-4 w-4"
            />
            <span className="font-semibold text-sm whitespace-nowrap">
              {totalPending === 0 ? '0 Pendentes' : `${totalPending} Pendente${totalPending > 1 ? 's' : ''}`}
            </span>
            {totalPending > 0 && (
              <FontAwesomeIcon
                icon={faChevronRight}
                className={`h-3 w-3 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              />
            )}
          </button>

          {/* Badge 3: Última Atualização + Refresh */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-none">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700">
              <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
              <span className="font-medium text-sm whitespace-nowrap">
                {getTimeAgo()}
              </span>
            </div>
            <button
              onClick={loadPendingActions}
              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="Atualizar agora"
            >
              <FontAwesomeIcon icon={faRefresh} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ NOVO: Detalhes expandíveis - Mostrar apenas se houver pendentes e usuário clicar */}
      {showDetails && totalPending > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 space-y-3">
            {/* Sessões Detectadas Hoje - Métrica de Sucesso */}
            {detected_today > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg shadow-sm flex-shrink-0">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-white h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-900 font-semibold text-sm">{detected_today} Sessões Vinculadas Hoje</p>
                    <p className="text-green-700 text-xs mt-0.5">
                      Sistema detectou e vinculou automaticamente
                    </p>
                  </div>
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                    Automático
                  </div>
                </div>
              </div>
            )}

            {/* Sessões Órfãs - Requer Atenção */}
            {orphan_sessions.length > 0 && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-2 rounded-lg shadow-sm flex-shrink-0">
                      <FontAwesomeIcon icon={faCalendarPlus} className="text-white h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-900 font-semibold text-sm">
                        {orphan_sessions.length} Sessão(ões) Órfã(s)
                      </p>
                      <p className="text-orange-700 text-xs mt-0.5">
                        Sessões sem agendamento prévio
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve('orphans')}
                    className="ml-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold text-xs hover:from-orange-600 hover:to-amber-700 transition-all flex items-center space-x-2 flex-shrink-0"
                  >
                    <span>Resolver</span>
                    <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Agendamentos Não Realizados - Resumo Expandível */}
            {missed_appointments.length > 0 && (
              <MissedAppointmentsSummary
                appointments={missed_appointments}
                onNotifyTherapist={handleNotifyTherapist}
                onViewDetails={handleViewDetails}
                onJustify={handleJustify}
                onRefresh={loadPendingActions}
              />
            )}

            {/* Sessões Órfãs - Resumo Expandível */}
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
      )}
    </div>
  );
};

export default PendingActionsPanel;