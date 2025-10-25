// frontend/src/components/scheduling/ManageRecurrenceModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faExclamationTriangle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal para Gerenciar Sessões Recorrentes
 * Permite cancelar, pausar ou modificar séries recorrentes
 */
const ManageRecurrenceModal = ({
  isOpen,
  onClose,
  appointment,
  onConfirm
}) => {
  const [action, setAction] = useState('cancel_single'); // 'cancel_single', 'cancel_future', 'cancel_range', 'end_recurrence', 'pause'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !appointment) return null;

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        action,
        appointmentId: appointment.id,
        parentAppointmentId: appointment.parent_appointment_id || appointment.id,
        startDate: startDate || appointment.scheduled_date,
        endDate,
        reason
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao processar ação:', error);
      alert('Erro ao processar ação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAction('cancel_single');
    setStartDate('');
    setEndDate('');
    setReason('');
    onClose();
  };

  const getEstimatedCount = () => {
    // Estimativa simples baseada na ação
    if (action === 'cancel_single') return 1;
    if (action === 'cancel_future') return '~127'; // Placeholder
    if (action === 'cancel_range') {
      if (!startDate || !endDate) return '?';
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const weeks = Math.ceil(days / 7);
      return `~${weeks}`;
    }
    return '?';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
            Gerenciar Sessões Recorrentes
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Informações do Agendamento */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Informações da Sessão</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Paciente:</span>
                <span className="ml-2 font-medium">{appointment.patient_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Disciplina:</span>
                <span className="ml-2 font-medium">{appointment.discipline_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Terapeuta:</span>
                <span className="ml-2 font-medium">{appointment.therapist_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Horário:</span>
                <span className="ml-2 font-medium">{appointment.scheduled_time?.slice(0, 5) || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Recorrência:</span>
                <span className="ml-2 font-medium">
                  {appointment.recurrence_pattern === 'weekly' ? 'Semanal' :
                   appointment.recurrence_pattern === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                  {appointment.recurrence_end_date && ` (até ${formatDate(appointment.recurrence_end_date)})`}
                </span>
              </div>
            </div>
          </div>

          {/* Opções de Ação */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O que deseja fazer?
            </label>

            {/* Cancelar apenas esta */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="cancel_single"
                checked={action === 'cancel_single'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Cancelar apenas esta sessão</div>
                <div className="text-sm text-gray-600">
                  Data: {formatDate(appointment.scheduled_date)}
                </div>
              </div>
            </label>

            {/* Cancelar esta e futuras */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="cancel_future"
                checked={action === 'cancel_future'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Cancelar esta e todas as futuras</div>
                <div className="text-sm text-gray-600">
                  A partir de: {formatDate(appointment.scheduled_date)} ({getEstimatedCount()} sessões)
                </div>
              </div>
            </label>

            {/* Cancelar intervalo */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="cancel_range"
                checked={action === 'cancel_range'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">Cancelar intervalo específico</div>
                {action === 'cancel_range' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">De:</label>
                      <input
                        type="date"
                        value={startDate}
                        min={getTodayString()}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Até:</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || getTodayString()}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  {action === 'cancel_range' && startDate && endDate ?
                    `~${getEstimatedCount()} sessões neste período` :
                    'Selecione as datas acima'}
                </div>
              </div>
            </label>

            {/* Encerrar recorrência */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="end_recurrence"
                checked={action === 'end_recurrence'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">Encerrar recorrência (definir data final)</div>
                {action === 'end_recurrence' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Última sessão será:</label>
                    <input
                      type="date"
                      value={endDate}
                      min={appointment.scheduled_date}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  Remove sessões após a data escolhida
                </div>
              </div>
            </label>

            {/* Pausar temporariamente */}
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="action"
                value="pause"
                checked={action === 'pause'}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-2">Pausar temporariamente</div>
                {action === 'pause' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Pausar de:</label>
                      <input
                        type="date"
                        value={startDate}
                        min={getTodayString()}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Até:</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || getTodayString()}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  Suspende sessões neste período
                </div>
              </div>
            </label>
          </div>

          {/* Motivo */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo (opcional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva o motivo do cancelamento/pausa..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (action === 'cancel_range' && (!startDate || !endDate)) || (action === 'end_recurrence' && !endDate) || (action === 'pause' && (!startDate || !endDate))}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} />
                Confirmar Ação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRecurrenceModal;
