// frontend/src/components/scheduling/TerminatePatientModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faExclamationTriangle,
  faCheckCircle,
  faCalendarAlt,
  faUser,
  faStethoscope
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal para Encerrar Tratamento de um Paciente
 * Cancela TODAS as sessões futuras de TODAS as disciplinas
 */
const TerminatePatientModal = ({
  isOpen,
  onClose,
  patient,
  futureSessions = [], // Array de sessões futuras por disciplina
  onConfirm
}) => {
  const [reason, setReason] = useState('requested'); // 'requested', 'discharged', 'transfer', 'default', 'other'
  const [otherReason, setOtherReason] = useState('');
  const [observations, setObservations] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const totalSessions = futureSessions.reduce((sum, item) => sum + item.session_count, 0);
  const canConfirm = confirmName.toLowerCase().trim() === patient.name.toLowerCase().trim();

  const handleSubmit = async () => {
    if (!canConfirm) {
      alert('Por favor, digite o nome do paciente corretamente para confirmar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        patientId: patient.id,
        reason: reason === 'other' ? otherReason : reason,
        observations
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao encerrar tratamento:', error);
      alert('Erro ao encerrar tratamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('requested');
    setOtherReason('');
    setObservations('');
    setConfirmName('');
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            Encerrar Tratamento
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
          {/* Alerta de atenção */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xl mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-800 mb-2">ATENÇÃO: Ação Irreversível</h3>
                <p className="text-sm text-red-700">
                  Esta ação cancelará <span className="font-bold">TODAS as sessões futuras</span> agendadas para este paciente em <span className="font-bold">TODAS as disciplinas</span>. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>

          {/* Informações do Paciente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-blue-600" />
              Paciente: {patient.name}
            </h3>
          </div>

          {/* Sessões que serão canceladas */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">
              Sessões que serão canceladas:
            </h3>

            <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              {futureSessions.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">
                  Nenhuma sessão futura encontrada
                </p>
              ) : (
                futureSessions.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <FontAwesomeIcon icon={faStethoscope} className="text-blue-600 text-sm" />
                          {item.discipline_name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Terapeuta: {item.therapist_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Próxima: {item.next_session_date ? formatDate(item.next_session_date) : 'N/A'} às {item.scheduled_time?.slice(0, 5) || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {item.session_count}
                        </div>
                        <div className="text-xs text-gray-600">
                          sessõ{item.session_count !== 1 ? 'es' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total */}
            <div className="mt-4 bg-red-100 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-red-800">
                  Total de sessões que serão canceladas:
                </span>
                <span className="text-3xl font-bold text-red-600">
                  {totalSessions}
                </span>
              </div>
            </div>
          </div>

          {/* Motivo do encerramento */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Motivo do encerramento:
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="requested"
                  checked={reason === 'requested'}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Paciente solicitou desligamento</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="discharged"
                  checked={reason === 'discharged'}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Alta médica</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="transfer"
                  checked={reason === 'transfer'}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Transferência para outra clínica</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="default"
                  checked={reason === 'default'}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Inadimplência</span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="reason"
                  value="other"
                  checked={reason === 'other'}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm">Outro:</span>
                  {reason === 'other' && (
                    <input
                      type="text"
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      placeholder="Descreva o motivo..."
                      className="w-full mt-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Observações adicionais */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações adicionais (opcional):
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows="3"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Informações adicionais sobre o encerramento..."
            />
          </div>

          {/* Confirmação de segurança */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2" />
              Para confirmar, digite o nome do paciente:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={patient.name}
              className="w-full border-2 border-yellow-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            {confirmName && !canConfirm && (
              <p className="text-sm text-red-600 mt-1">
                ❌ O nome não corresponde. Digite exatamente como mostrado acima.
              </p>
            )}
            {canConfirm && (
              <p className="text-sm text-green-600 mt-1">
                ✅ Confirmação válida
              </p>
            )}
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
            disabled={!canConfirm || isSubmitting || (reason === 'other' && !otherReason.trim())}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon icon={faCheckCircle} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                Confirmar Encerramento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerminatePatientModal;
