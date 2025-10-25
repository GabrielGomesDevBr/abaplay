// frontend/src/components/scheduling/LinkSessionModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarCheck,
  faClipboardList,
  faChartLine,
  faCheckCircle,
  faExclamationTriangle,
  faLink,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import sessionLinkApi from '../../api/sessionLinkApi';

/**
 * Modal mobile-first para registro de sessão com vinculação automática
 *
 * Fase 1: Vinculação automática ao agendamento
 * Fase 2: Opção de criar agendamento retroativo
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - appointment: objeto do agendamento (pode ser null)
 * - patient: objeto do paciente
 * - assignments: array de programas atribuídos ao paciente
 * - onSuccess: function (callback após sucesso)
 */
const LinkSessionModal = ({
  isOpen,
  onClose,
  appointment = null,
  patient,
  assignments = [],
  onSuccess
}) => {
  // Estado do formulário
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [attempts, setAttempts] = useState('');
  const [successes, setSuccesses] = useState('');
  const [promptLevel, setPromptLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para sugestão de retroativo
  const [showRetroactiveOption, setShowRetroactiveOption] = useState(false);
  const [lastProgressData, setLastProgressData] = useState(null);

  // ✅ NOVO: Estado para seleção manual de agendamento (disciplinas diferentes)
  const [showAppointmentSelection, setShowAppointmentSelection] = useState(false);
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [pendingProgressData, setPendingProgressData] = useState(null);

  // Dados do assignment selecionado
  const [assignmentDetails, setAssignmentDetails] = useState(null);

  // Níveis de prompting disponíveis
  const promptLevels = [
    { id: 0, name: 'Independente', color: '#10b981' },
    { id: 1, name: 'Dica Gestual', color: '#3b82f6' },
    { id: 2, name: 'Dica Verbal', color: '#8b5cf6' },
    { id: 3, name: 'Modelo', color: '#f59e0b' },
    { id: 4, name: 'Ajuda Física Parcial', color: '#ef4444' },
    { id: 5, name: 'Ajuda Física Total', color: '#991b1b' }
  ];

  // Preenche data automaticamente se houver appointment
  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        setSessionDate(appointment.scheduled_date);
        setNotes(appointment.notes || '');
      } else {
        // Se não houver appointment, usa data de hoje
        const today = new Date().toISOString().split('T')[0];
        setSessionDate(today);
      }
    }
  }, [isOpen, appointment]);

  // Limpa o formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSelectedAssignment('');
    setSelectedStep('');
    setSessionDate('');
    setAttempts('');
    setSuccesses('');
    setPromptLevel('');
    setNotes('');
    setShowRetroactiveOption(false);
    setLastProgressData(null);
    setAssignmentDetails(null);
    setShowAppointmentSelection(false);
    setAvailableAppointments([]);
    setSelectedAppointmentId(null);
    setPendingProgressData(null);
  };

  // Busca detalhes do assignment quando selecionado
  useEffect(() => {
    if (selectedAssignment) {
      const assignment = assignments.find(a => a.id === parseInt(selectedAssignment));
      setAssignmentDetails(assignment);
      setSelectedStep(''); // Reseta o step ao mudar de programa
    } else {
      setAssignmentDetails(null);
    }
  }, [selectedAssignment, assignments]);

  // Validações
  const isFormValid = () => {
    return (
      selectedAssignment &&
      selectedStep &&
      sessionDate &&
      attempts !== '' &&
      successes !== '' &&
      parseInt(successes) <= parseInt(attempts) &&
      promptLevel !== ''
    );
  };

  const handleSubmit = async (createRetroactive = false, manualAppointmentId = null) => {
    if (!isFormValid() && !createRetroactive) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const progressData = {
        assignment_id: parseInt(selectedAssignment),
        patient_id: patient.id,
        step_id: parseInt(selectedStep),
        session_date: sessionDate,
        attempts: parseInt(attempts),
        successes: parseInt(successes),
        details: {
          promptLevel: parseInt(promptLevel)
        },
        notes: notes.trim() || null,
        create_retroactive: createRetroactive,
        selected_appointment_id: manualAppointmentId // ✅ NOVO: Enviar agendamento selecionado manualmente
      };

      const response = await sessionLinkApi.recordProgressWithLink(progressData);
      const data = response.data;

      // ✅ NOVO: Caso 0: Mesma sessão (janela de 1 hora)
      if (data.linked && data.same_session) {
        toast.success('✅ Sessão registrada no mesmo atendimento!', {
          duration: 3000,
          icon: '🔗'
        });
        if (onSuccess) onSuccess(data);
        onClose();
      }
      // Caso 1: Vinculado automaticamente
      else if (data.linked && !data.retroactive && !data.manually_selected) {
        const message = data.delayed_registration
          ? `✅ Sessão vinculada! (${data.hours_since_appointment}h depois)`
          : '✅ Sessão registrada e vinculada ao agendamento!';

        toast.success(message, {
          duration: data.delayed_registration ? 5000 : 4000,
          icon: '🔗'
        });

        // Alerta educacional se registro tardio
        if (data.delayed_registration) {
          setTimeout(() => {
            toast('💡 Dica: Registre logo após a sessão para melhor organização', {
              duration: 4000,
              icon: '💡'
            });
          }, 500);
        }

        if (onSuccess) onSuccess(data);
        onClose();
      }
      // ✅ NOVO: Caso 1.5: Seleção manual (disciplina diferente)
      else if (data.linked && data.manually_selected) {
        toast.success('✅ Sessão vinculada ao agendamento selecionado!', {
          duration: 4000,
          icon: '🔗'
        });
        if (onSuccess) onSuccess(data);
        onClose();
      }
      // Caso 2: Criou retroativo
      else if (data.linked && data.retroactive) {
        toast.success('✅ Sessão registrada e agendamento retroativo criado!', {
          duration: 4000,
          icon: '📅'
        });
        if (onSuccess) onSuccess(data);
        onClose();
      }
      // ✅ NOVO: Caso 3a: Perguntar ao terapeuta (disciplinas diferentes)
      else if (data.ask_therapist && data.available_appointments) {
        setShowAppointmentSelection(true);
        setAvailableAppointments(data.available_appointments);
        setPendingProgressData(progressData);
        toast('⚠️ Múltiplos agendamentos encontrados. Qual corresponde a esta sessão?', {
          duration: 5000,
          icon: '📋'
        });
      }
      // Caso 3b: Não encontrou agendamento - mostrar opção de retroativo
      else if (data.suggest_retroactive) {
        setShowRetroactiveOption(true);
        setLastProgressData(progressData);
        toast('⚠️ Sessão registrada, mas nenhum agendamento foi encontrado.', {
          duration: 5000,
          icon: '⚠️'
        });
      }
      // Caso 4: Apenas registrado (fallback)
      else {
        toast.success('✅ Sessão registrada com sucesso!');
        if (onSuccess) onSuccess(data);
        onClose();
      }
    } catch (error) {
      console.error('[MODAL-ERROR] handleSubmit:', error);
      toast.error(error.response?.data?.message || 'Erro ao registrar sessão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRetroactive = () => {
    handleSubmit(true);
  };

  const handleSkipRetroactive = () => {
    toast.success('✅ Sessão registrada sem agendamento');
    if (onSuccess && lastProgressData) {
      onSuccess({ progress: lastProgressData, linked: false });
    }
    onClose();
  };

  // ✅ NOVO: Handler para seleção manual de agendamento
  const handleSelectAppointment = () => {
    if (!selectedAppointmentId) {
      toast.error('Selecione um agendamento');
      return;
    }

    // Reenviar com agendamento selecionado
    handleSubmit(false, selectedAppointmentId);
  };

  const handleCancelAppointmentSelection = () => {
    // Oferecer criar retroativo
    setShowAppointmentSelection(false);
    setShowRetroactiveOption(true);
    setLastProgressData(pendingProgressData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-4 sm:rounded-t-2xl rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faClipboardList} className="text-xl sm:text-2xl" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Registrar Sessão</h2>
              <p className="text-sm text-blue-100 mt-0.5">
                {appointment ? '🔗 Com agendamento' : '📝 Registro direto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            disabled={isSubmitting}
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Informações do Agendamento (se houver) */}
        {appointment && (
          <div className="mx-4 sm:mx-6 mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-blue-600" />
              <h3 className="font-semibold text-blue-900">Agendamento Vinculado</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Data:</span>
                <span className="ml-2 font-medium">{new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-gray-600">Horário:</span>
                <span className="ml-2 font-medium">{appointment.scheduled_time?.substring(0, 5)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NOVO: Seleção manual de agendamento (disciplinas diferentes) */}
        {showAppointmentSelection && (
          <div className="mx-4 sm:mx-6 mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-4">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-yellow-600 text-xl flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Múltiplos agendamentos encontrados</h3>
                <p className="text-sm text-gray-700">
                  Há {availableAppointments.length} agendamentos para <strong>{patient?.name}</strong> hoje. Qual corresponde a esta sessão?
                </p>
              </div>
            </div>

            {/* Lista de agendamentos */}
            <div className="space-y-2 mb-4">
              {availableAppointments.map((apt) => (
                <label
                  key={apt.id}
                  className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedAppointmentId === apt.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="appointment"
                    value={apt.id}
                    checked={selectedAppointmentId === apt.id}
                    onChange={() => setSelectedAppointmentId(apt.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {apt.scheduled_time?.substring(0, 5)}
                      </span>
                      {apt.discipline_name && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {apt.discipline_name}
                        </span>
                      )}
                      {apt.status === 'completed' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Realizado
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSelectAppointment}
                disabled={isSubmitting || !selectedAppointmentId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faLink} />
                Vincular a este Agendamento
              </button>
              <button
                onClick={handleCancelAppointmentSelection}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Nenhum destes
              </button>
            </div>
          </div>
        )}

        {/* Opção de criar retroativo */}
        {showRetroactiveOption && (
          <div className="mx-4 sm:mx-6 mt-4 bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-600 text-xl flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Não há agendamento para <strong>{patient?.name}</strong> em {new Date(sessionDate).toLocaleDateString('pt-BR')}.
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Deseja criar um agendamento retroativo para esta sessão?
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCreateRetroactive}
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    Criar Retroativo
                  </button>
                  <button
                    onClick={handleSkipRetroactive}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Pular
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Paciente (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente
            </label>
            <div className="bg-gray-100 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 font-medium">
              {patient?.name}
            </div>
          </div>

          {/* Programa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programa <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              disabled={isSubmitting}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:opacity-50"
            >
              <option value="">Selecione um programa...</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.program_name}
                </option>
              ))}
            </select>
          </div>

          {/* Passo (Etapa) */}
          {assignmentDetails && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etapa/Passo <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStep}
                onChange={(e) => setSelectedStep(e.target.value)}
                disabled={isSubmitting}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:opacity-50"
              >
                <option value="">Selecione uma etapa...</option>
                {assignmentDetails.steps?.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.step_number}. {step.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Data da Sessão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Sessão <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              disabled={isSubmitting || !!appointment}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:bg-gray-100 disabled:opacity-70"
            />
          </div>

          {/* Tentativas e Acertos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tentativas <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={attempts}
                onChange={(e) => setAttempts(e.target.value)}
                disabled={isSubmitting}
                placeholder="0"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acertos <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max={attempts || 999}
                value={successes}
                onChange={(e) => setSuccesses(e.target.value)}
                disabled={isSubmitting}
                placeholder="0"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:opacity-50"
              />
            </div>
          </div>

          {/* Indicador de Taxa de Acerto */}
          {attempts > 0 && successes !== '' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Taxa de Acerto</span>
                <span className="text-lg font-bold text-blue-600">
                  {Math.round((parseInt(successes) / parseInt(attempts)) * 100)}%
                </span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(parseInt(successes) / parseInt(attempts)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Nível de Prompting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nível de Prompting <span className="text-red-500">*</span>
            </label>
            <select
              value={promptLevel}
              onChange={(e) => setPromptLevel(e.target.value)}
              disabled={isSubmitting}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base disabled:opacity-50"
            >
              <option value="">Selecione o nível...</option>
              {promptLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.id} - {level.name}
                </option>
              ))}
            </select>
            {/* Visualização do nível selecionado */}
            {promptLevel !== '' && (
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: promptLevels[parseInt(promptLevel)].color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {promptLevels[parseInt(promptLevel)].name}
                </span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows="3"
              placeholder="Descreva observações sobre a sessão..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-base resize-none disabled:opacity-50"
            ></textarea>
          </div>
        </div>

        {/* Footer - Ações */}
        <div className="sticky bottom-0 bg-gray-50 px-4 sm:px-6 py-4 border-t-2 border-gray-200 flex flex-col sm:flex-row gap-3 sm:rounded-b-2xl rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none sm:px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 order-2 sm:order-1"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={!isFormValid() || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={appointment ? faLink : faCheckCircle} />
                {appointment ? 'Registrar e Vincular' : 'Registrar Sessão'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkSessionModal;
