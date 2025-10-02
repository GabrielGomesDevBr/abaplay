// frontend/src/components/scheduling/MissedAppointmentsSummary.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt,
  faUser,
  faStethoscope,
  faCalendarAlt,
  faClock,
  faEnvelope,
  faEye,
  faEdit,
  faChevronDown,
  faChevronUp,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { notifyTherapist } from '../../api/schedulingApi';

/**
 * Componente de resumo expandível para agendamentos não realizados
 * Mostra detalhes completos e ações rápidas para o administrador
 * ✅ INTEGRADO: Sistema de notificações existente (notificationstatus)
 */
const MissedAppointmentsSummary = ({
  appointments = [],
  onNotifyTherapist,
  onViewDetails,
  onJustify,
  onRefresh
}) => {
  const [expanded, setExpanded] = useState(false);
  const [notifying, setNotifying] = useState({});
  const [notifiedAppointments, setNotifiedAppointments] = useState({});

  const calculatePendingTime = (scheduledDate, scheduledTime) => {
    // Validação de entrada
    if (!scheduledDate || !scheduledTime) {
      return 'Data não informada';
    }

    try {
      // ✅ NORMALIZAÇÃO ROBUSTA: Garantir formato correto independente do input

      // Garantir que scheduledDate seja string YYYY-MM-DD
      let dateStr;
      if (scheduledDate instanceof Date) {
        dateStr = scheduledDate.toISOString().split('T')[0];
      } else {
        // Pode vir como "2025-01-15" ou "2025-01-15T00:00:00"
        dateStr = String(scheduledDate).split('T')[0];
      }

      // Garantir que scheduledTime seja string HH:MM (remover segundos e microsegundos)
      const timeStr = String(scheduledTime).slice(0, 5); // "HH:MM"

      // Validar formato básico
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return 'Formato de data inválido';
      }
      if (!/^\d{2}:\d{2}$/.test(timeStr)) {
        return 'Formato de hora inválido';
      }

      // Criar data com timezone local
      const dateTimeString = `${dateStr}T${timeStr}:00`;
      const appointmentDateTime = new Date(dateTimeString);

      // Verificar se data é válida
      if (isNaN(appointmentDateTime.getTime())) {
        return 'Data inválida';
      }

      const now = new Date();
      const diffMs = now - appointmentDateTime;

      // Se for negativo, ainda não passou (não deveria acontecer em missed)
      if (diffMs < 0) {
        return 'Agendamento futuro';
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        return `${days} dia(s), ${hours} hora(s)`;
      }
      return `${hours} hora(s)`;
    } catch (error) {
      return 'Erro no cálculo';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.slice(0, 5);
  };

  // ✅ NOVO: Handler para notificar terapeuta usando API real
  const handleNotifyTherapist = async (therapistId, appointmentId) => {
    setNotifying(prev => ({ ...prev, [appointmentId]: true }));

    try {
      const result = await notifyTherapist(therapistId, appointmentId);

      // Marcar como notificado
      setNotifiedAppointments(prev => ({ ...prev, [appointmentId]: true }));

      // Feedback visual
      alert(`✅ Notificação enviada com sucesso para ${result.therapist_name}!`);

      // Callback externo se existir
      if (onNotifyTherapist) {
        onNotifyTherapist(therapistId, appointmentId);
      }

      // Refresh opcional
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      alert(`❌ Erro ao enviar notificação: ${error.message}`);
    } finally {
      setNotifying(prev => ({ ...prev, [appointmentId]: false }));
    }
  };

  if (appointments.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-3 rounded-full shadow-sm flex-shrink-0">
              <FontAwesomeIcon icon={faFileAlt} className="text-white h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-red-900 font-bold text-lg">
                {appointments.length} Agendamento(s) Não Realizado(s)
              </p>
              <p className="text-red-700 text-sm mt-1">
                Aguardando justificativa do terapeuta
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2">
            <span className="font-medium">
              {expanded ? 'Recolher' : 'Expandir Lista'}
            </span>
            <FontAwesomeIcon
              icon={expanded ? faChevronUp : faChevronDown}
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>

      {/* Lista Expandida */}
      {expanded && (
        <div className="border-t-2 border-red-200 p-4 space-y-4 bg-white">
          {appointments.map(apt => (
            <div
              key={apt.id}
              className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200 hover:border-red-300 transition-all duration-200"
            >
              {/* Informações do Agendamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Paciente:</span>
                    <span className="ml-2 font-medium text-gray-900">{apt.patient_name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faStethoscope} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Terapeuta:</span>
                    <span className="ml-2 font-medium text-gray-900">{apt.therapist_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Data/Hora:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDate(apt.scheduled_date)} às {formatTime(apt.scheduled_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faClock} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Pendente há:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {calculatePendingTime(apt.scheduled_date, apt.scheduled_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observações (se houver) */}
              {apt.notes && (
                <div className="mb-4 p-3 bg-white rounded border border-red-100">
                  <p className="text-xs text-gray-600 mb-1">Observações:</p>
                  <p className="text-sm text-gray-700">{apt.notes}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-2">
                {/* Botão de Notificar - Usa API real */}
                <button
                  onClick={() => handleNotifyTherapist(apt.therapist_id, apt.id)}
                  disabled={notifying[apt.id] || notifiedAppointments[apt.id]}
                  className={`flex-1 min-w-[140px] px-3 py-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center ${
                    notifiedAppointments[apt.id]
                      ? 'bg-green-500 text-white cursor-default'
                      : notifying[apt.id]
                      ? 'bg-gray-400 text-white cursor-wait'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title={
                    notifiedAppointments[apt.id]
                      ? 'Terapeuta já foi notificado'
                      : 'Enviar notificação ao terapeuta'
                  }
                >
                  <FontAwesomeIcon
                    icon={notifiedAppointments[apt.id] ? faCheckCircle : faEnvelope}
                    className="mr-2"
                  />
                  {notifiedAppointments[apt.id]
                    ? 'Notificado ✓'
                    : notifying[apt.id]
                    ? 'Enviando...'
                    : 'Notificar Terapeuta'}
                </button>
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(apt)}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors text-sm font-medium flex items-center justify-center"
                    title="Abrir modal com informações completas do agendamento"
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    Detalhes Completos
                  </button>
                )}
                {onJustify && (
                  <button
                    onClick={() => onJustify(apt)}
                    className="flex-1 min-w-[140px] px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium flex items-center justify-center"
                    title="Adicionar justificativa de ausência"
                  >
                    <FontAwesomeIcon icon={faEdit} className="mr-2" />
                    Justificar
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Rodapé Informativo */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              <strong>Dica:</strong> Notifique os terapeutas para que eles adicionem as justificativas dos agendamentos não realizados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissedAppointmentsSummary;
