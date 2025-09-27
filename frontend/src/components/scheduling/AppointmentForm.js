// frontend/src/components/scheduling/AppointmentForm.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarAlt, faClock, faUser, faStethoscope, faStickyNote, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { validateAppointmentData, validateAppointmentDateTime } from '../../api/schedulingApi';
import { fetchTherapists, fetchAllAdminPatients, fetchPatientPrograms } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';
import { ensureYYYYMMDD, debugDateFormat } from '../../utils/dateUtils';

/**
 * Componente de formulário para criar/editar agendamentos
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const AppointmentForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingAppointment = null,
  isLoading = false
}) => {
  const { token } = useAuth();

  // Estados dos dropdowns hierárquicos
  const [therapists, setTherapists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientPrograms, setPatientPrograms] = useState([]);

  // Estados de loading
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [formData, setFormData] = useState({
    therapist_id: '',
    patient_id: '',
    assignment_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: ''
  });

  const [errors, setErrors] = useState([]);
  const [dateTimeWarning, setDateTimeWarning] = useState(null);

  // Carregar terapeutas quando modal abre
  useEffect(() => {
    if (isOpen && token) {
      loadTherapists();
      loadPatients();
    }
  }, [isOpen, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar programas quando paciente é selecionado
  useEffect(() => {
    if (formData.patient_id && token) {
      loadPatientPrograms(formData.patient_id);
    } else {
      setPatientPrograms([]);
      setFormData(prev => ({ ...prev, assignment_id: '' }));
    }
  }, [formData.patient_id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funções de carregamento
  const loadTherapists = async () => {
    try {
      setLoadingTherapists(true);
      const therapistsData = await fetchTherapists(token);
      setTherapists(therapistsData);
    } catch (error) {
      console.error('Erro ao carregar terapeutas');
      setErrors(['Erro ao carregar lista de terapeutas']);
    } finally {
      setLoadingTherapists(false);
    }
  };

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const patientsData = await fetchAllAdminPatients(token);
      setPatients(patientsData);
    } catch (error) {
      console.error('Erro ao carregar pacientes');
      setErrors(['Erro ao carregar lista de pacientes']);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadPatientPrograms = async (patientId) => {
    try {
      setLoadingPrograms(true);
      const programsData = await fetchPatientPrograms(token, patientId);
      setPatientPrograms(programsData);
    } catch (error) {
      console.error('Erro ao carregar programas do paciente');
      setErrors(['Erro ao carregar programas do paciente']);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // Resetar formulário quando modal abre/fecha ou ao editar
  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        setFormData({
          therapist_id: editingAppointment.therapist_id || '',
          patient_id: editingAppointment.patient_id || '',
          assignment_id: editingAppointment.assignment_id || '',
          scheduled_date: ensureYYYYMMDD(editingAppointment.scheduled_date) || '',
          scheduled_time: editingAppointment.scheduled_time || '',
          duration_minutes: editingAppointment.duration_minutes || 60,
          notes: editingAppointment.notes || ''
        });
      } else {
        setFormData({
          therapist_id: '',
          patient_id: '',
          assignment_id: '',
          scheduled_date: '',
          scheduled_time: '',
          duration_minutes: 60,
          notes: ''
        });
      }
      setErrors([]);
    }
  }, [isOpen, editingAppointment]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Se for campo de data, garantir formato YYYY-MM-DD
    let processedValue = value;
    if (name === 'scheduled_date' && value) {
      processedValue = ensureYYYYMMDD(value);
      // Debug apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        debugDateFormat(value, 'handleInputChange');
      }
    }

    const newFormData = { ...formData, [name]: processedValue };
    setFormData(newFormData);

    // Limpar erros quando usuário começa a digitar
    if (errors.length > 0) {
      setErrors([]);
    }

    // Se mudou paciente, limpar seleção de programa
    if (name === 'patient_id') {
      setFormData(prev => ({ ...prev, assignment_id: '' }));
    }

    // Validação em tempo real para data/hora
    if ((name === 'scheduled_date' || name === 'scheduled_time') &&
        newFormData.scheduled_date && newFormData.scheduled_time) {
      const validation = validateAppointmentDateTime(
        newFormData.scheduled_date,
        newFormData.scheduled_time
      );

      if (!validation.isValid) {
        setDateTimeWarning(validation.message);
      } else {
        setDateTimeWarning(null);
      }
    } else if (name === 'scheduled_date' || name === 'scheduled_time') {
      setDateTimeWarning(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar dados
    const validationErrors = validateAppointmentData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Submeter dados com data garantidamente no formato correto
    const submitData = {
      ...formData,
      assignment_id: parseInt(formData.assignment_id),
      duration_minutes: parseInt(formData.duration_minutes),
      scheduled_date: ensureYYYYMMDD(formData.scheduled_date)
    };

    // Debug detalhado dos dados enviados
    console.log('[APPOINTMENT-FORM] Dados enviados:', {
      'formData': formData,
      'submitData': submitData,
      'therapist_id': submitData.therapist_id,
      'patient_id': submitData.patient_id,
      'assignment_id': submitData.assignment_id,
      'scheduled_date': submitData.scheduled_date,
      'scheduled_time': submitData.scheduled_time
    });

    onSubmit(submitData);
  };

  // Gerar opções de horário (7:00 às 20:00, intervalos de 30min)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 7; hour <= 20; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) {
        times.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return times;
  };

  // Obter data mínima (hoje) no formato YYYY-MM-DD
  const getMinDate = () => {
    return ensureYYYYMMDD(new Date());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-blue-600" />
            {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Erros */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">Corrigir os seguintes erros:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Dropdown Hierárquico: Terapeuta → Paciente → Programa */}
          <div className="space-y-6 mb-6">
            {/* 1. Seleção de Terapeuta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
                Terapeuta *
              </label>
              <select
                name="therapist_id"
                value={formData.therapist_id}
                onChange={handleInputChange}
                required
                disabled={isLoading || loadingTherapists}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingTherapists ? 'Carregando terapeutas...' : 'Selecione um terapeuta'}
                </option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Seleção de Paciente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
                Paciente *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleInputChange}
                required
                disabled={isLoading || loadingPatients}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingPatients ? 'Carregando pacientes...' : 'Selecione um paciente'}
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Seleção de Programa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-400" />
                Programa *
              </label>
              <select
                name="assignment_id"
                value={formData.assignment_id}
                onChange={handleInputChange}
                required
                disabled={isLoading || loadingPrograms || !formData.patient_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.patient_id
                    ? 'Primeiro selecione um paciente'
                    : loadingPrograms
                      ? 'Carregando programas...'
                      : 'Selecione um programa'
                  }
                </option>
                {patientPrograms.map((program) => (
                  <option key={program.assignment_id} value={program.assignment_id}>
                    {program.program_name}
                    {program.status !== 'active' && ` (${program.status})`}
                  </option>
                ))}
              </select>
              {loadingPrograms && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Carregando programas do paciente...
                </div>
              )}
            </div>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-400" />
                Data do Agendamento *
              </label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleInputChange}
                min={getMinDate()}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Horário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
                Horário *
              </label>
              <select
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selecione um horário...</option>
                {generateTimeOptions().map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback da validação de data/hora */}
          {dateTimeWarning && (
            <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                <span className="text-orange-800 text-sm">{dateTimeWarning}</span>
              </div>
            </div>
          )}

          {/* Duração */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
              Duração (minutos)
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
              <option value={120}>120 minutos</option>
            </select>
          </div>

          {/* Observações */}
          <div className="mb-6">
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
              placeholder="Observações sobre o agendamento (opcional)..."
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
            />
            <div className="mt-1 text-xs text-gray-500">
              {formData.notes.length}/500 caracteres
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {editingAppointment ? 'Atualizar' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;