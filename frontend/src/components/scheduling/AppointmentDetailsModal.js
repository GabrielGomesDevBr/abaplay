// frontend/src/components/scheduling/AppointmentDetailsModal.js

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope,
  faStickyNote,
  faInfoCircle,
  faEdit,
  faTrash,
  faCheckCircle,
  faTimesCircle,
  faHistory,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';
import { formatDate, formatTime, getStatusBadgeClass, getStatusText } from '../../api/schedulingApi';

/**
 * Traduções para tipos de cancelamento
 * Mapeia valores técnicos do banco para textos amigáveis
 */
const CANCELLATION_REASON_LABELS = {
  'personal_emergency': 'Emergência pessoal',
  'unavoidable_commitment': 'Compromisso inadiável',
  'health_issue': 'Problema de saúde',
  'schedule_conflict': 'Conflito de agenda',
  'other': 'Outro motivo',
  'outro': 'Outro motivo',
  'admin': 'Cancelado pela administração'
};

/**
 * Modal para visualizar detalhes de um agendamento
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  onEdit = null,
  onDelete = null,
  canEdit = false,
  canDelete = false
}) => {
  if (!isOpen || !appointment) return null;

  const isScheduled = appointment.status === 'scheduled';
  const isCompleted = appointment.status === 'completed';
  const isMissed = appointment.status === 'missed';
  const isCancelled = appointment.status === 'cancelled';

  // Verificar se está atrasado
  const now = new Date();
  // Construir data/hora no fuso horário local (evitar problemas de UTC)
  const appointmentDateTime = (() => {
    try {
      const dateStr = appointment.scheduled_date;
      const timeStr = appointment.scheduled_time;

      if (!dateStr || !timeStr) return new Date();

      // Se a data for um objeto Date, converter para YYYY-MM-DD
      let normalizedDate = dateStr;
      if (dateStr instanceof Date) {
        const year = dateStr.getFullYear();
        const month = String(dateStr.getMonth() + 1).padStart(2, '0');
        const day = String(dateStr.getDate()).padStart(2, '0');
        normalizedDate = `${year}-${month}-${day}`;
      } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
        // Se for ISO string, extrair apenas a data
        normalizedDate = dateStr.split('T')[0];
      }

      // Construir data no fuso horário local
      const [year, month, day] = normalizedDate.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0);
    } catch (error) {
      console.error('Erro ao processar data do agendamento:', error);
      return new Date();
    }
  })();
  const isOverdue = isScheduled && appointmentDateTime < now;

  const getTimeInfo = () => {
    if (isCompleted && appointment.completed_at) {
      const completedAt = new Date(appointment.completed_at);
      return {
        label: 'Realizado em:',
        value: completedAt.toLocaleString('pt-BR'),
        icon: faCheckCircle,
        color: 'text-green-600'
      };
    }

    if (isMissed && appointment.missed_at) {
      const missedAt = new Date(appointment.missed_at);
      return {
        label: 'Marcado como não realizado em:',
        value: missedAt.toLocaleString('pt-BR'),
        icon: faTimesCircle,
        color: 'text-red-600'
      };
    }

    if (isCancelled && appointment.cancelled_at) {
      const cancelledAt = new Date(appointment.cancelled_at);
      return {
        label: 'Cancelado em:',
        value: cancelledAt.toLocaleString('pt-BR'),
        icon: faTimesCircle,
        color: 'text-gray-600'
      };
    }

    if (isOverdue) {
      const diffMs = now - appointmentDateTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        label: 'Atrasado há:',
        value: diffHours > 0 ? `${diffHours}h ${diffMinutes}min` : `${diffMinutes} minutos`,
        icon: faTimesCircle,
        color: 'text-red-600'
      };
    }

    if (isScheduled) {
      const diffMs = appointmentDateTime - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffDays = Math.floor(diffHours / 24);

      let timeText;
      if (diffDays > 0) {
        timeText = `Em ${diffDays} dia(s)`;
      } else if (diffHours > 0) {
        timeText = `Em ${diffHours}h ${diffMinutes}min`;
      } else {
        timeText = `Em ${diffMinutes} minutos`;
      }

      return {
        label: 'Tempo restante:',
        value: timeText,
        icon: faClock,
        color: 'text-blue-600'
      };
    }

    return null;
  };

  const timeInfo = getTimeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-3 text-blue-600" />
            Detalhes do Agendamento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Status */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                {getStatusText(appointment.status, appointment.justified_at)}
              </span>
              {isOverdue && (
                <span className="ml-3 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Atrasado
                </span>
              )}
            </div>

            {/* Ações */}
            <div className="flex space-x-2">
              {canEdit && isScheduled && onEdit && (
                <button
                  onClick={() => onEdit(appointment)}
                  className="px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2 w-4 h-4" />
                  Editar
                </button>
              )}
              {canDelete && (isScheduled || isCancelled || isMissed || isCompleted) && onDelete && (
                <button
                  onClick={() => onDelete(appointment)}
                  className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                >
                  <FontAwesomeIcon icon={faTrash} className="mr-2 w-4 h-4" />
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* Informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Data e Horário */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Data e Horário
              </h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Data:</span>
                  <span className="ml-2 text-blue-600">{formatDate(appointment.scheduled_date)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Horário:</span>
                  <span className="ml-2 text-blue-600">{formatTime(appointment.scheduled_time)}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Duração:</span>
                  <span className="ml-2 text-blue-600">{appointment.duration_minutes} minutos</span>
                </div>
                {timeInfo && (
                  <div className="text-sm pt-2 border-t border-blue-200">
                    <span className="font-medium text-blue-700">{timeInfo.label}</span>
                    <span className={`ml-2 ${timeInfo.color} flex items-center`}>
                      <FontAwesomeIcon icon={timeInfo.icon} className="mr-1 w-3 h-3" />
                      {timeInfo.value}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Paciente */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-3 flex items-center">
                <FontAwesomeIcon icon={faUser} className="mr-2" />
                Paciente
              </h3>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-green-700">Nome:</span>
                  <span className="ml-2 text-green-600">{appointment.patient_name}</span>
                </div>
                {appointment.patient_age && (
                  <div className="text-sm">
                    <span className="font-medium text-green-700">Idade:</span>
                    <span className="ml-2 text-green-600">{appointment.patient_age} anos</span>
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium text-green-700">Terapeuta:</span>
                  <span className="ml-2 text-green-600">{appointment.therapist_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Programa */}
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h3 className="text-sm font-medium text-purple-800 mb-3 flex items-center">
              <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
              Área de Intervenção
            </h3>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-purple-700">Área:</span>
                <span className="ml-2 text-purple-600">{appointment.discipline_name || 'Sessão Geral'}</span>
              </div>
              {appointment.active_programs_count > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-purple-700">Programas Ativos:</span>
                  <span className="ml-2 text-purple-600">{appointment.active_programs_count} programa(s)</span>
                </div>
              )}
              {appointment.available_programs && (
                <div className="text-sm">
                  <span className="font-medium text-purple-700">Programas Disponíveis:</span>
                  <div className="ml-2 text-purple-600 text-xs mt-1">
                    {appointment.available_programs.length > 100
                      ? appointment.available_programs.substring(0, 100) + '...'
                      : appointment.available_programs
                    }
                  </div>
                </div>
              )}
              {appointment.area_name && (
                <div className="text-sm">
                  <span className="font-medium text-purple-700">Área:</span>
                  <span className="ml-2 text-purple-600">{appointment.area_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                <FontAwesomeIcon icon={faStickyNote} className="mr-2" />
                Observações
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Justificativa (se houver) */}
          {(isMissed || isCancelled) && (appointment.missed_reason_type || appointment.cancellation_reason_type) && (
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-red-800 mb-3 flex items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                {isMissed ? 'Justificativa da Ausência' : 'Motivo do Cancelamento'}
              </h3>
              <div className="space-y-2">
                {/* Missed appointment fields */}
                {appointment.missed_reason_type && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Motivo:</span>
                    <span className="ml-2 text-red-600">{appointment.missed_reason_type}</span>
                  </div>
                )}
                {appointment.missed_reason_description && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Descrição:</span>
                    <span className="ml-2 text-red-600">{appointment.missed_reason_description}</span>
                  </div>
                )}
                {appointment.missed_by && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Responsável:</span>
                    <span className="ml-2 text-red-600">
                      {appointment.missed_by === 'patient' && 'Paciente'}
                      {appointment.missed_by === 'therapist' && 'Terapeuta'}
                      {appointment.missed_by === 'both' && 'Ambos'}
                      {appointment.missed_by === 'other' && 'Outros fatores'}
                    </span>
                  </div>
                )}

                {/* Cancellation fields - ✅ CORRECTED TO USE ADMIN PATTERN */}
                {appointment.cancellation_reason_type && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Motivo:</span>
                    <span className="ml-2 text-red-600">
                      {CANCELLATION_REASON_LABELS[appointment.cancellation_reason_type] || appointment.cancellation_reason_type}
                    </span>
                  </div>
                )}
                {appointment.cancellation_reason_description && (
                  <div className="text-sm">
                    <span className="font-medium text-red-700">Detalhes:</span>
                    <span className="ml-2 text-red-600">{appointment.cancellation_reason_description}</span>
                  </div>
                )}

                {/* Show who cancelled and when */}
                {appointment.cancelled_at && (
                  <>
                    {appointment.cancelled_by_name && (
                      <div className="text-sm pt-2 border-t border-red-200">
                        <span className="font-medium text-red-700">Cancelado por:</span>
                        <span className="ml-2 text-red-600 font-semibold">{appointment.cancelled_by_name}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-medium text-red-700">Cancelado em:</span>
                      <span className="ml-2 text-red-600">
                        {new Date(appointment.cancelled_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ✅ NOVO: Histórico de Auditoria - Quem justificou e quando */}
          {appointment.justified_at && appointment.justified_by_name && (
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                <FontAwesomeIcon icon={faHistory} className="mr-2" />
                Histórico de Justificativa (Auditoria)
              </h3>
              <div className="space-y-3">
                {/* Quem justificou */}
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faUserShield} className="text-blue-600 mt-1 mr-3 w-4 h-4" />
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium text-blue-700">Justificado por:</span>
                      <span className="ml-2 text-blue-900 font-semibold">{appointment.justified_by_name}</span>
                      {appointment.justified_by === appointment.therapist_id ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Terapeuta Responsável
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          Administrador (Override)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quando justificou */}
                <div className="flex items-start">
                  <FontAwesomeIcon icon={faClock} className="text-blue-600 mt-1 mr-3 w-4 h-4" />
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium text-blue-700">Data/Hora da Justificativa:</span>
                      <span className="ml-2 text-blue-900">
                        {new Date(appointment.justified_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {/* Calcular tempo desde justificativa */}
                    <div className="text-xs text-blue-600 mt-1">
                      {(() => {
                        const justifiedDate = new Date(appointment.justified_at);
                        const now = new Date();
                        const diffMs = now - justifiedDate;
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffDays > 0) {
                          return `Justificado há ${diffDays} dia(s)`;
                        } else if (diffHours > 0) {
                          return `Justificado há ${diffHours} hora(s)`;
                        } else {
                          return 'Justificado recentemente';
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* ID do usuário (para rastreabilidade técnica) */}
                <div className="pt-2 border-t border-blue-200">
                  <div className="text-xs text-blue-600">
                    <span className="font-medium">ID do Responsável:</span>
                    <span className="ml-2 font-mono">#{appointment.justified_by}</span>
                    <span className="ml-4 font-medium">ID do Agendamento:</span>
                    <span className="ml-2 font-mono">#{appointment.id}</span>
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800 flex items-start">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Nota de Auditoria:</strong> Todas as justificativas são rastreadas no sistema para fins de auditoria e controle de qualidade.
                  {appointment.justified_by !== appointment.therapist_id && (
                    <span className="block mt-1">
                      Esta justificativa foi realizada por um administrador usando override administrativo.
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Informações do sistema */}
          <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">ID do Agendamento:</span>
                <span className="ml-2">#{appointment.id}</span>
              </div>
              <div>
                <span className="font-medium">Criado em:</span>
                <span className="ml-2">
                  {appointment.created_at
                    ? new Date(appointment.created_at).toLocaleString('pt-BR')
                    : 'Não informado'
                  }
                </span>
              </div>
              {appointment.session_id && (
                <div>
                  <span className="font-medium">Sessão vinculada:</span>
                  <span className="ml-2">#{appointment.session_id}</span>
                </div>
              )}
              {appointment.updated_at && (
                <div>
                  <span className="font-medium">Última atualização:</span>
                  <span className="ml-2">
                    {new Date(appointment.updated_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal;