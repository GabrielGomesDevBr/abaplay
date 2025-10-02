// frontend/src/components/scheduling/CancelAppointmentModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faExclamationTriangle,
  faBan,
  faSpinner,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal para cancelamento de agendamentos com motivo e auditoria
 * Diferencia cancelamento de exclusão permanente
 */
const CancelAppointmentModal = ({
  isOpen,
  onClose,
  onConfirm,
  appointment,
  isLoading = false
}) => {
  const [reasonType, setReasonType] = useState('cancelado_paciente');
  const [reasonDescription, setReasonDescription] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen || !appointment) return null;

  const reasonTypes = [
    { value: 'cancelado_paciente', label: 'Cancelado pelo Paciente/Responsável' },
    { value: 'cancelado_clinica', label: 'Cancelado pela Clínica' },
    { value: 'terapeuta_indisponivel', label: 'Terapeuta Indisponível' },
    { value: 'feriado', label: 'Feriado/Clínica Fechada' },
    { value: 'remarcacao', label: 'Remarcação Solicitada' },
    { value: 'outro', label: 'Outro Motivo' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!reasonDescription.trim()) {
      newErrors.reasonDescription = 'Descrição do motivo é obrigatória';
    } else if (reasonDescription.length < 10) {
      newErrors.reasonDescription = 'Descrição deve ter pelo menos 10 caracteres';
    } else if (reasonDescription.length > 500) {
      newErrors.reasonDescription = 'Descrição deve ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) return;

    const cancellationData = {
      reason_type: reasonType,
      reason_description: reasonDescription.trim()
    };

    onConfirm(appointment, cancellationData);
  };

  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return date;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-full">
                <FontAwesomeIcon icon={faBan} className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Cancelar Agendamento
                </h2>
                <p className="text-orange-100 text-sm">
                  Manter histórico para auditoria
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white hover:text-orange-200 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Informações do Agendamento */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
              Agendamento a ser cancelado
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Paciente:</span>
                <span className="font-semibold text-gray-900">{appointment.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Terapeuta:</span>
                <span className="font-semibold text-gray-900">{appointment.therapist_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-semibold text-gray-900">
                  {formatDate(appointment.scheduled_date)} às {appointment.scheduled_time}
                </span>
              </div>
              {appointment.discipline_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Disciplina:</span>
                  <span className="font-semibold text-gray-900">{appointment.discipline_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aviso importante */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-1 mr-3" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">Diferença entre Cancelar e Excluir</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>Cancelar:</strong> Mantém histórico, registra motivo, conta nas estatísticas</li>
                  <li>• <strong>Excluir:</strong> Remove permanentemente do banco (não recomendado)</li>
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  ⚠️ Cancelamentos não podem ser revertidos, mas mantêm rastreabilidade para auditoria.
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de Cancelamento */}
          <div className="space-y-4">
            {/* Tipo de Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Motivo *
              </label>
              <select
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reasonTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição do Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição do Motivo *
                <span className="text-gray-500 font-normal ml-2">
                  ({reasonDescription.length}/500 caracteres)
                </span>
              </label>
              <textarea
                value={reasonDescription}
                onChange={(e) => {
                  setReasonDescription(e.target.value);
                  setErrors(prev => ({ ...prev, reasonDescription: null }));
                }}
                disabled={isLoading}
                placeholder="Descreva detalhadamente o motivo do cancelamento. Ex: Paciente avisou que não poderá comparecer devido a problema de transporte."
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                  errors.reasonDescription ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.reasonDescription && (
                <p className="text-red-500 text-sm mt-1">{errors.reasonDescription}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Mínimo 10 caracteres. Seja específico para facilitar análises futuras.
              </p>
            </div>
          </div>

          {/* Informação de Auditoria */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600 mt-1 mr-3" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Registro de Auditoria</p>
                <p>
                  O cancelamento será registrado com seu nome de usuário e timestamp para
                  rastreabilidade completa. Esses dados ficam disponíveis para consulta futura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                <span>Cancelando...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faBan} />
                <span>Confirmar Cancelamento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelAppointmentModal;
