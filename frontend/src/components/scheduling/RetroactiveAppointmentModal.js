// frontend/src/components/scheduling/RetroactiveAppointmentModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarPlus,
  faUser,
  faStethoscope,
  faStickyNote,
  faCalendarAlt,
  faInfoCircle,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { createRetroactiveAppointment } from '../../api/schedulingApi';
import { getDisciplineHierarchy } from '../../api/programApi';

/**
 * Modal para criar agendamento retroativo para sessão órfã
 */
const RetroactiveAppointmentModal = ({
  isOpen,
  onClose,
  orphanSession,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    discipline_id: '',
    notes: ''
  });

  const [disciplines, setDisciplines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Carregar disciplinas quando modal abre
  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
      setFormData({
        discipline_id: '',
        notes: `Agendamento retroativo criado para sessão realizada em ${formatDate(orphanSession?.session_date)}.`
      });
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, orphanSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDisciplines = async () => {
    try {
      setIsLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();
      setDisciplines(disciplinesData || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      setError('Erro ao carregar lista de disciplinas');
    } finally {
      setIsLoadingDisciplines(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!orphanSession) return;

    try {
      setIsLoading(true);
      setError(null);

      const retroactiveData = {
        discipline_id: formData.discipline_id ? parseInt(formData.discipline_id) : null,
        notes: formData.notes || 'Agendamento retroativo'
      };

      await createRetroactiveAppointment(orphanSession.session_id, retroactiveData);

      setSuccess(true);

      // Notificar sucesso após um breve delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar agendamento retroativo:', error);
      setError(error.message || 'Erro ao criar agendamento retroativo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      discipline_id: '',
      notes: ''
    });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  if (!isOpen || !orphanSession) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faCalendarPlus} className="mr-3 text-green-600" />
            Criar Agendamento Retroativo
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {success ? (
            /* Tela de sucesso */
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Agendamento Retroativo Criado!
              </h3>
              <p className="text-gray-600">
                O agendamento foi criado com sucesso para a sessão realizada.
              </p>
            </div>
          ) : (
            <>
              {/* Informações da sessão órfã */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                  Sessão Realizada (sem agendamento prévio)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Paciente:</span>
                    <div className="text-blue-600 flex items-center">
                      <FontAwesomeIcon icon={faUser} className="mr-2" />
                      {orphanSession.patient_name}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Terapeuta:</span>
                    <div className="text-blue-600 flex items-center">
                      <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
                      {orphanSession.therapist_name}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Data da Sessão:</span>
                    <div className="text-blue-600 flex items-center">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                      {formatDate(orphanSession.session_date)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Programas Trabalhados:</span>
                    <div className="text-blue-600">
                      {orphanSession.programs_count > 0 ? (
                        `${orphanSession.programs_count} programa(s)`
                      ) : (
                        'Não identificados'
                      )}
                    </div>
                  </div>
                </div>
                {orphanSession.program_names && (
                  <div className="mt-3 text-xs text-blue-600">
                    <strong>Programas:</strong> {orphanSession.program_names}
                  </div>
                )}
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seleção de disciplina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
                    Área de Intervenção <span className="text-gray-500 text-sm">(opcional)</span>
                  </label>
                  <select
                    name="discipline_id"
                    value={formData.discipline_id}
                    onChange={handleInputChange}
                    disabled={isLoading || isLoadingDisciplines}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {isLoadingDisciplines ? 'Carregando disciplinas...' : 'Sessão geral (todos os programas)'}
                    </option>
                    {disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Deixe em branco se a sessão trabalhou programas de múltiplas áreas
                  </p>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-400" />
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    maxLength={500}
                    placeholder="Observações sobre o agendamento retroativo..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 resize-none"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    {formData.notes.length}/500 caracteres
                  </div>
                </div>

                {/* Explicação sobre agendamento retroativo */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>Agendamento Retroativo:</strong> Este agendamento será criado com a data/hora da sessão realizada
                      e marcado automaticamente como "realizado". Isso ajuda a manter o histórico completo das sessões
                      e permite que a sessão órfã seja devidamente registrada no sistema.
                    </div>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                      <span className="text-red-800 text-sm font-medium">Erro</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                        Criar Agendamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetroactiveAppointmentModal;