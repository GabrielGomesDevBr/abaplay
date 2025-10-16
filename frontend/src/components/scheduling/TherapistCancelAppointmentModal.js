// frontend/src/components/scheduling/TherapistCancelAppointmentModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faExclamationTriangle,
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope
} from '@fortawesome/free-solid-svg-icons';

const CANCELLATION_REASONS = [
  { value: 'personal_emergency', label: 'Emergência pessoal' },
  { value: 'unavoidable_commitment', label: 'Compromisso inadiável' },
  { value: 'health_issue', label: 'Problema de saúde' },
  { value: 'schedule_conflict', label: 'Conflito de agenda' },
  { value: 'other', label: 'Outro motivo' }
];

/**
 * Modal para cancelamento de agendamento pelo terapeuta
 * Permite selecionar motivo pré-definido e adicionar justificativa
 */
const TherapistCancelAppointmentModal = ({ isOpen, onClose, appointment, onConfirm, isSubmitting }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !appointment) return null;

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Por favor, selecione um motivo para o cancelamento.');
      return;
    }

    setError('');
    onConfirm({
      cancellation_reason: CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason,
      cancellation_notes: notes.trim() || null
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setNotes('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
            Cancelar Agendamento
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-5">
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500 mr-2 w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">
                {new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faClock} className="text-green-500 mr-2 w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">
                {appointment.scheduled_time} ({appointment.duration_minutes}min)
              </span>
            </div>
            <div className="flex items-center mb-2">
              <FontAwesomeIcon icon={faUser} className="text-purple-500 mr-2 w-4 h-4" />
              <span className="text-sm text-gray-700">{appointment.patient_name}</span>
            </div>
            {appointment.discipline_name && (
              <div className="flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="text-indigo-500 mr-2 w-4 h-4" />
                <span className="text-sm text-gray-700">{appointment.discipline_name}</span>
              </div>
            )}
            {!appointment.discipline_name && (
              <div className="flex items-center">
                <FontAwesomeIcon icon={faStethoscope} className="text-indigo-500 mr-2 w-4 h-4" />
                <span className="text-sm text-gray-700">Sessão Geral</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Reason Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Motivo do cancelamento *
            </label>
            <div className="space-y-2">
              {CANCELLATION_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors min-h-[44px] ${
                    selectedReason === reason.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellation_reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificativa adicional (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              rows={4}
              maxLength={300}
              placeholder="Adicione mais detalhes sobre o cancelamento, se necessário..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="mt-1 text-xs text-gray-500 text-right">
              {notes.length}/300 caracteres
            </div>
          </div>

          {/* Warning */}
          <div className="mb-5 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
              O cancelamento será notificado aos administradores da clínica.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !selectedReason}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px]"
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Confirmar Cancelamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistCancelAppointmentModal;
