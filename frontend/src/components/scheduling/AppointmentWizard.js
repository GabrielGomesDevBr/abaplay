// frontend/src/components/scheduling/AppointmentWizard.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faArrowRight,
  faArrowLeft,
  faUser,
  faStethoscope,
  faClock,
  faCalendarAlt,
  faCheckCircle,
  faSpinner,
  faMagic,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import availabilityApi from '../../api/availabilityApi';
import { getDisciplineHierarchy } from '../../api/programApi';
import { fetchAllAdminPatients } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Assistente de Agendamento Inteligente
 * Guia o usuário pelo processo de agendamento com sugestões inteligentes
 */
const AppointmentWizard = ({
  isOpen,
  onClose,
  onScheduleAppointments,
  isLoading = false
}) => {
  const { token, hasProAccess } = useAuth();

  // Estados do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Passo 1: Seleção de paciente e disciplinas
  const [patients, setPatients] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);

  // Passo 2: Preferências
  const [preferences, setPreferences] = useState({
    time_period: 'all',
    require_specialty: true,
    max_suggestions_per_discipline: 5
  });

  // Passo 3: Sugestões
  const [suggestions, setSuggestions] = useState({});
  const [selectedSlots, setSelectedSlots] = useState({});
  const [error, setError] = useState(null);

  // Carregar dados ao abrir
  useEffect(() => {
    if (isOpen && token) {
      loadPatients();
      if (hasProAccess && hasProAccess()) {
        loadDisciplines();
      }
    }
  }, [isOpen, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const patientsData = await fetchAllAdminPatients(token);
      setPatients(patientsData);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();

      let disciplinesList = [];
      if (disciplinesData && typeof disciplinesData === 'object') {
        disciplinesList = Object.keys(disciplinesData).map(disciplineName => ({
          id: disciplinesData[disciplineName].id,
          name: disciplineName
        }));
      }

      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    } finally {
      setLoadingDisciplines(false);
    }
  };

  const handleDisciplineToggle = (disciplineId) => {
    setSelectedDisciplines(prev => {
      if (prev.includes(disciplineId)) {
        return prev.filter(id => id !== disciplineId);
      } else {
        return [...prev, disciplineId];
      }
    });
  };

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    setError(null);

    try {
      const response = await availabilityApi.suggestAppointments({
        patient_id: parseInt(selectedPatient),
        disciplines: selectedDisciplines.map(id => parseInt(id)),
        time_period: preferences.time_period,
        require_specialty: preferences.require_specialty,
        max_suggestions_per_discipline: preferences.max_suggestions_per_discipline
      });

      setSuggestions(response.suggestions || {});
      setCurrentStep(3);
    } catch (err) {
      setError(err.message || 'Erro ao gerar sugestões');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSlotSelection = (disciplineId, slot) => {
    setSelectedSlots(prev => ({
      ...prev,
      [disciplineId]: slot
    }));
  };

  const handleFinish = () => {
    // Preparar lista de agendamentos para criar
    const appointmentsToCreate = Object.keys(selectedSlots).map(disciplineId => {
      const slot = selectedSlots[disciplineId];
      return {
        patient_id: parseInt(selectedPatient),
        therapist_id: slot.therapist_id,
        discipline_id: parseInt(disciplineId),
        scheduled_date: slot.available_date,
        scheduled_time: slot.available_time,
        duration_minutes: slot.available_duration,
        room_id: slot.suggested_room_id || null,
        notes: `Agendamento criado via assistente inteligente${slot.has_specialty ? ' - Terapeuta especialista' : ''}${slot.is_preferred ? ' - Terapeuta preferido' : ''}`
      };
    });

    if (onScheduleAppointments) {
      onScheduleAppointments(appointmentsToCreate);
    }
  };

  const handleClose = () => {
    // Resetar estados
    setCurrentStep(1);
    setSelectedPatient('');
    setSelectedDisciplines([]);
    setPreferences({
      time_period: 'all',
      require_specialty: true,
      max_suggestions_per_discipline: 5
    });
    setSuggestions({});
    setSelectedSlots({});
    setError(null);
    onClose();
  };

  const canProceedToStep2 = selectedPatient && selectedDisciplines.length > 0;
  const canProceedToStep3 = true; // Sempre pode gerar sugestões
  const canFinish = Object.keys(selectedSlots).length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              <FontAwesomeIcon icon={faMagic} className="mr-2" />
              Assistente de Agendamento Inteligente
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              Passo {currentStep} de 3
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Passo 1: Paciente e Disciplinas */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Selecione o paciente e as disciplinas necessárias
                </h3>

                {/* Seleção de Paciente */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Paciente
                  </label>
                  {loadingPatients ? (
                    <div className="text-center py-4">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600" />
                    </div>
                  ) : (
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Seleção de Disciplinas */}
                {hasProAccess && hasProAccess() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
                      Disciplinas
                    </label>
                    {loadingDisciplines ? (
                      <div className="text-center py-4">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {disciplines.map(discipline => (
                          <label
                            key={discipline.id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedDisciplines.includes(discipline.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDisciplines.includes(discipline.id)}
                              onChange={() => handleDisciplineToggle(discipline.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              {discipline.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!hasProAccess || !hasProAccess() ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">
                      O assistente de agendamento com disciplinas específicas requer acesso Pro
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Passo 2: Preferências */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Configure as preferências de busca
                </h3>

                <div className="space-y-4">
                  {/* Período do dia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FontAwesomeIcon icon={faClock} className="mr-2" />
                      Período do Dia
                    </label>
                    <select
                      value={preferences.time_period}
                      onChange={(e) => setPreferences(prev => ({ ...prev, time_period: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todos os períodos</option>
                      <option value="morning">Manhã (6h-12h)</option>
                      <option value="afternoon">Tarde (12h-18h)</option>
                      <option value="evening">Noite (18h-21h)</option>
                    </select>
                  </div>

                  {/* Exigir especialidade */}
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="require_specialty"
                      checked={preferences.require_specialty}
                      onChange={(e) => setPreferences(prev => ({ ...prev, require_specialty: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    />
                    <div className="ml-3">
                      <label htmlFor="require_specialty" className="font-medium text-gray-700">
                        Exigir terapeutas com especialidade
                      </label>
                      <p className="text-sm text-gray-500">
                        Mostra apenas terapeutas que tenham a especialidade registrada na disciplina
                      </p>
                    </div>
                  </div>

                  {/* Máximo de sugestões */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de sugestões por disciplina
                    </label>
                    <select
                      value={preferences.max_suggestions_per_discipline}
                      onChange={(e) => setPreferences(prev => ({ ...prev, max_suggestions_per_discipline: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="3">3 sugestões</option>
                      <option value="5">5 sugestões</option>
                      <option value="10">10 sugestões</option>
                      <option value="20">20 sugestões</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passo 3: Sugestões */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Selecione os horários para agendar
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                {Object.keys(suggestions).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FontAwesomeIcon icon={faCalendarAlt} size="3x" className="mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Nenhuma sugestão disponível</p>
                    <p className="text-sm mt-2">
                      Não foram encontrados horários disponíveis com os critérios selecionados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(suggestions).map(disciplineId => {
                      const disciplineName = disciplines.find(d => d.id === parseInt(disciplineId))?.name || 'Disciplina';
                      const slots = suggestions[disciplineId] || [];

                      return (
                        <div key={disciplineId} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-800 flex items-center justify-between">
                              <span>
                                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-blue-600" />
                                {disciplineName}
                              </span>
                              <span className="text-sm font-normal text-gray-600">
                                {slots.length} sugestõ{slots.length !== 1 ? 'es' : ''}
                              </span>
                            </h4>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {slots.map((slot, index) => {
                              const isSelected = selectedSlots[disciplineId]?.available_date === slot.available_date &&
                                                 selectedSlots[disciplineId]?.available_time === slot.available_time;

                              return (
                                <div
                                  key={index}
                                  className={`px-4 py-3 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleSlotSelection(disciplineId, slot)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-4 mb-2">
                                        <div>
                                          <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                                          <span className="font-medium">{slot.therapist_name}</span>
                                        </div>
                                        <div>
                                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2" />
                                          <span>
                                            {new Date(slot.available_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                        <div>
                                          <FontAwesomeIcon icon={faClock} className="text-gray-400 mr-2" />
                                          <span>{slot.available_time.slice(0, 5)}</span>
                                        </div>
                                      </div>

                                      <div className="flex gap-2">
                                        {slot.has_specialty && (
                                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                            <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                            Especialista
                                          </span>
                                        )}
                                        {slot.is_preferred && (
                                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            Preferido
                                          </span>
                                        )}
                                        {slot.suggested_room_name && (
                                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                            Sala: {slot.suggested_room_name}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {isSelected && (
                                      <div className="ml-4 text-blue-600">
                                        <FontAwesomeIcon icon={faCheckCircle} size="lg" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={isLoading || isGeneratingSuggestions}
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Voltar
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isLoading || isGeneratingSuggestions}
            >
              Cancelar
            </button>

            {currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Próximo
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={handleGenerateSuggestions}
                disabled={isGeneratingSuggestions}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGeneratingSuggestions ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    Gerar Sugestões
                    <FontAwesomeIcon icon={faMagic} className="ml-2" />
                  </>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleFinish}
                disabled={!canFinish || isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                    Agendar ({Object.keys(selectedSlots).length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentWizard;
