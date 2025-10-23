// frontend/src/components/scheduling/AppointmentForm.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarAlt, faClock, faUser, faStethoscope, faStickyNote, faSpinner, faRedoAlt, faEye, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { validateAppointmentData, validateAppointmentDateTime, validateConflicts, validateAssignment } from '../../api/schedulingApi';
import { fetchTherapists, fetchAllAdminPatients } from '../../api/adminApi';
import { getDisciplineHierarchy } from '../../api/programApi';
import { recurringAppointmentApi } from '../../api/recurringAppointmentApi';
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
  const { token, hasProAccess } = useAuth();

  // Estados dos dropdowns - NOVA ESTRUTURA
  const [therapists, setTherapists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [disciplines, setDisciplines] = useState([]);

  // Estados de loading
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    therapist_id: '',
    discipline_id: '', // Opcional: específica ou sessão geral
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: ''
  });

  // Estados para recorrência - NOVO
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    type: 'weekly',
    endDate: '',
    generateWeeks: 4,
    skipHolidays: false,
    notes: ''
  });
  const [recurrencePreview, setRecurrencePreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  const [errors, setErrors] = useState([]);
  const [dateTimeWarning, setDateTimeWarning] = useState(null);

  // Novos estados para validações críticas
  const [validatingConflicts, setValidatingConflicts] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [validatingAssignment, setValidatingAssignment] = useState(false);
  const [assignmentWarning, setAssignmentWarning] = useState(null);

  // Carregar dados quando modal abre
  useEffect(() => {
    if (isOpen && token) {
      loadTherapists();
      loadPatients();
      loadDisciplines();
    }
  }, [isOpen, token]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadDisciplines = async () => {
    // Só carregar disciplinas se o usuário tiver acesso Pro
    if (!hasProAccess || !hasProAccess()) {
      setDisciplines([]);
      return;
    }

    try {
      setLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();

      // Extrair disciplinas do objeto hierárquico
      let disciplinesList = [];
      if (disciplinesData && typeof disciplinesData === 'object') {
        disciplinesList = Object.keys(disciplinesData).map(disciplineName => ({
          id: disciplinesData[disciplineName].id,
          name: disciplineName
        }));
      }

      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas');
      setDisciplines([]); // Garantir que seja array mesmo em caso de erro
    } finally {
      setLoadingDisciplines(false);
    }
  };

  // Resetar formulário quando modal abre/fecha ou ao editar
  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        // Modo de edição - desabilitar recorrência
        setFormData({
          patient_id: editingAppointment.patient_id || '',
          therapist_id: editingAppointment.therapist_id || '',
          discipline_id: editingAppointment.discipline_id || '',
          scheduled_date: ensureYYYYMMDD(editingAppointment.scheduled_date) || '',
          scheduled_time: editingAppointment.scheduled_time || '',
          duration_minutes: editingAppointment.duration_minutes || 60,
          notes: editingAppointment.notes || ''
        });
        setRecurrenceEnabled(false); // Desabilitar recorrência no modo edição
      } else {
        // Modo criação - resetar tudo
        setFormData({
          patient_id: '',
          therapist_id: '',
          discipline_id: '',
          scheduled_date: '',
          scheduled_time: '',
          duration_minutes: 60,
          notes: ''
        });
        setRecurrenceEnabled(false);
        setRecurrenceConfig({
          type: 'weekly',
          endDate: '',
          generateWeeks: 4,
          skipHolidays: false,
          notes: ''
        });
        setRecurrencePreview([]);
        setShowPreview(false);
        setConflicts([]);
      }
      setErrors([]);
      setDateTimeWarning(null);
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

    // Não há mais dependência hierárquica entre os campos na nova estrutura

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

  // Função para lidar com mudanças na configuração de recorrência
  const handleRecurrenceConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setRecurrenceConfig(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Atualizar preview automaticamente se campos essenciais estão preenchidos
    if (formData.scheduled_date && formData.scheduled_time && formData.patient_id && formData.therapist_id) {
      updateRecurrencePreview({ ...recurrenceConfig, [name]: newValue });
    }
  };

  // Atualizar preview de recorrência
  const updateRecurrencePreview = (config = recurrenceConfig) => {
    if (!formData.scheduled_date || !formData.scheduled_time || !recurrenceEnabled) {
      setRecurrencePreview([]);
      return;
    }

    const dayOfWeek = new Date(formData.scheduled_date).getDay();

    const templateData = {
      start_date: formData.scheduled_date,
      end_date: config.endDate || null,
      recurrence_type: config.type,
      day_of_week: dayOfWeek,
      scheduled_time: formData.scheduled_time,
      generate_weeks_ahead: config.generateWeeks
    };

    const preview = recurringAppointmentApi.generatePreview(templateData);
    setRecurrencePreview(preview);
  };

  // Verificar conflitos
  const checkConflicts = async () => {
    if (!formData.patient_id || !formData.therapist_id || !formData.scheduled_date || !formData.scheduled_time) {
      return;
    }

    setCheckingConflicts(true);
    try {
      const dayOfWeek = new Date(formData.scheduled_date).getDay();

      const conflictData = {
        patient_id: parseInt(formData.patient_id),
        therapist_id: parseInt(formData.therapist_id),
        day_of_week: dayOfWeek,
        scheduled_time: formData.scheduled_time,
        start_date: formData.scheduled_date,
        end_date: recurrenceConfig.endDate || null
      };

      const result = await recurringAppointmentApi.checkConflicts(conflictData);
      setConflicts(result.conflicts || []);
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
      setConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Atualizar preview quando dados essenciais mudam
  useEffect(() => {
    if (recurrenceEnabled && formData.scheduled_date && formData.scheduled_time) {
      updateRecurrencePreview();
    }
  }, [formData.scheduled_date, formData.scheduled_time, recurrenceEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ VALIDAÇÃO CRÍTICA 1: Verificar conflitos de horário
  const checkScheduleConflicts = async () => {
    // Só validar se todos os campos necessários estiverem preenchidos
    if (!formData.patient_id || !formData.therapist_id || !formData.scheduled_date || !formData.scheduled_time) {
      setConflictWarning(null);
      return;
    }

    try {
      setValidatingConflicts(true);
      setConflictWarning(null);

      const conflictData = {
        patient_id: parseInt(formData.patient_id),
        therapist_id: parseInt(formData.therapist_id),
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: parseInt(formData.duration_minutes) || 60,
        exclude_id: editingAppointment?.id || null
      };

      const result = await validateConflicts(conflictData);

      if (result.hasConflict) {
        setConflictWarning({
          type: 'error',
          message: result.message || 'Conflito de horário detectado. Já existe um agendamento neste horário.'
        });
      } else {
        setConflictWarning({
          type: 'success',
          message: 'Horário disponível! Nenhum conflito detectado.'
        });
        // Limpar aviso de sucesso após 3 segundos
        setTimeout(() => {
          setConflictWarning(null);
        }, 3000);
      }
    } catch (error) {
      setConflictWarning({
        type: 'warning',
        message: 'Não foi possível verificar conflitos. Prossiga com cautela.'
      });
    } finally {
      setValidatingConflicts(false);
    }
  };

  // ✅ VALIDAÇÃO CRÍTICA 2: Verificar assignment paciente-terapeuta
  const checkPatientTherapistAssignment = async () => {
    // Só validar se paciente e terapeuta estiverem selecionados
    if (!formData.patient_id || !formData.therapist_id) {
      setAssignmentWarning(null);
      return;
    }

    try {
      setValidatingAssignment(true);
      setAssignmentWarning(null);

      const result = await validateAssignment(
        parseInt(formData.patient_id),
        parseInt(formData.therapist_id)
      );

      if (!result.isValid) {
        setAssignmentWarning({
          type: 'error',
          message: result.message || 'Este terapeuta não está atribuído a este paciente.'
        });
      } else {
        setAssignmentWarning({
          type: 'success',
          message: `✓ Assignment válido: ${result.assignment.therapist_name} atende ${result.assignment.patient_name}`
        });
        // Limpar aviso de sucesso após 3 segundos
        setTimeout(() => {
          setAssignmentWarning(null);
        }, 3000);
      }
    } catch (error) {
      // Erro silencioso - não bloqueia o agendamento
      // A validação de assignment é um "nice to have", não obrigatória
      setAssignmentWarning(null);
    } finally {
      setValidatingAssignment(false);
    }
  };

  // Validar assignment quando paciente ou terapeuta mudar
  useEffect(() => {
    if (formData.patient_id && formData.therapist_id) {
      checkPatientTherapistAssignment();
    }
  }, [formData.patient_id, formData.therapist_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validar conflitos quando dados de agendamento mudarem
  useEffect(() => {
    if (formData.patient_id && formData.therapist_id && formData.scheduled_date && formData.scheduled_time) {
      checkScheduleConflicts();
    }
  }, [formData.patient_id, formData.therapist_id, formData.scheduled_date, formData.scheduled_time, formData.duration_minutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ BLOQUEAR SUBMIT se houver erros críticos
    if (assignmentWarning && assignmentWarning.type === 'error') {
      setErrors(['Corrija o problema de assignment antes de continuar. Este terapeuta não está atribuído a este paciente.']);
      return;
    }

    if (conflictWarning && conflictWarning.type === 'error') {
      setErrors(['Há um conflito de horário. Escolha outro horário ou resolva o conflito antes de continuar.']);
      return;
    }

    // Validar dados básicos
    const validationErrors = validateAppointmentData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Se recorrência está habilitada, criar template recorrente
    if (recurrenceEnabled && !editingAppointment) {
      // Validar dados de recorrência
      const dayOfWeek = new Date(formData.scheduled_date).getDay();

      const templateData = {
        patient_id: parseInt(formData.patient_id),
        therapist_id: parseInt(formData.therapist_id),
        recurrence_type: recurrenceConfig.type,
        day_of_week: dayOfWeek,
        scheduled_time: formData.scheduled_time,
        duration_minutes: parseInt(formData.duration_minutes),
        start_date: ensureYYYYMMDD(formData.scheduled_date),
        generate_weeks_ahead: parseInt(recurrenceConfig.generateWeeks),
        skip_holidays: Boolean(recurrenceConfig.skipHolidays),
        notes: recurrenceConfig.notes || formData.notes || null
      };

      // Adicionar discipline_id apenas se preenchido (evitar enviar null)
      if (formData.discipline_id) {
        templateData.discipline_id = parseInt(formData.discipline_id);
      }

      // Adicionar end_date apenas se preenchido (evitar enviar string vazia)
      if (recurrenceConfig.endDate && recurrenceConfig.endDate.trim() !== '') {
        templateData.end_date = ensureYYYYMMDD(recurrenceConfig.endDate);
      }

      const templateErrors = recurringAppointmentApi.validateTemplate(templateData);
      if (templateErrors.length > 0) {
        setErrors(templateErrors);
        return;
      }

      try {
        const result = await recurringAppointmentApi.createTemplate(templateData);
        // Chamar callback de sucesso com informações da recorrência
        onSubmit({
          type: 'recurring',
          template: result.template,
          generated_appointments: result.generated_appointments,
          conflicts: result.conflicts
        });
      } catch (error) {
        setErrors(error.errors?.map(err => err.msg) || ['Erro ao criar agendamento recorrente']);
      }
    } else {
      // Agendamento único (modo normal)
      const submitData = {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        therapist_id: parseInt(formData.therapist_id),
        discipline_id: formData.discipline_id ? parseInt(formData.discipline_id) : null,
        duration_minutes: parseInt(formData.duration_minutes),
        scheduled_date: ensureYYYYMMDD(formData.scheduled_date)
      };

      onSubmit(submitData);
    }
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

          {/* Nova estrutura: Paciente → Terapeuta → Disciplina (opcional) */}
          <div className="space-y-6 mb-6">
            {/* 1. Seleção de Paciente */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faUser} className="mr-2 text-gray-400" />
                Paciente *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleInputChange}
                required
                disabled={isLoading || loadingPatients}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

            {/* 2. Seleção de Terapeuta */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
                Terapeuta *
              </label>
              <select
                name="therapist_id"
                value={formData.therapist_id}
                onChange={handleInputChange}
                required
                disabled={isLoading || loadingTherapists}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

            {/* 3. Seleção de Disciplina (Opcional - Apenas Plano Pro) */}
            {hasProAccess && hasProAccess() && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-400" />
                  Área de Intervenção <span className="text-gray-500 text-xs sm:text-sm">(opcional)</span>
                </label>
                <select
                  name="discipline_id"
                  value={formData.discipline_id}
                  onChange={handleInputChange}
                  disabled={isLoading || loadingDisciplines}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDisciplines ? 'Carregando disciplinas...' : 'Sessão geral (todos os programas)'}
                  </option>
                  {Array.isArray(disciplines) && disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  💡 Deixe em branco para sessão geral que pode trabalhar qualquer programa do paciente
                </div>
                {loadingDisciplines && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                    Carregando áreas de intervenção...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Data */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Horário */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
                Horário *
              </label>
              <select
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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

          {/* ✅ VALIDAÇÃO CRÍTICA: Assignment Paciente-Terapeuta */}
          {(validatingAssignment || assignmentWarning) && (
            <div className={`mb-6 p-3 rounded-md border ${
              validatingAssignment ? 'bg-blue-50 border-blue-200' :
              assignmentWarning.type === 'error' ? 'bg-red-50 border-red-300' :
              assignmentWarning.type === 'success' ? 'bg-green-50 border-green-300' :
              'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center">
                {validatingAssignment ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-blue-500 mr-2" />
                    <span className="text-blue-800 text-sm">Verificando assignment...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={assignmentWarning.type === 'error' ? faExclamationTriangle : faExclamationTriangle}
                      className={`mr-2 ${
                        assignmentWarning.type === 'error' ? 'text-red-500' :
                        assignmentWarning.type === 'success' ? 'text-green-500' :
                        'text-yellow-500'
                      }`}
                    />
                    <span className={`text-sm ${
                      assignmentWarning.type === 'error' ? 'text-red-800 font-semibold' :
                      assignmentWarning.type === 'success' ? 'text-green-800' :
                      'text-yellow-800'
                    }`}>
                      {assignmentWarning.message}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ✅ VALIDAÇÃO CRÍTICA: Conflitos de Horário */}
          {(validatingConflicts || conflictWarning) && (
            <div className={`mb-6 p-3 rounded-md border ${
              validatingConflicts ? 'bg-blue-50 border-blue-200' :
              conflictWarning.type === 'error' ? 'bg-red-50 border-red-300' :
              conflictWarning.type === 'success' ? 'bg-green-50 border-green-300' :
              'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center">
                {validatingConflicts ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-blue-500 mr-2" />
                    <span className="text-blue-800 text-sm">Verificando conflitos de horário...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={conflictWarning.type === 'error' ? faExclamationTriangle : faExclamationTriangle}
                      className={`mr-2 ${
                        conflictWarning.type === 'error' ? 'text-red-500' :
                        conflictWarning.type === 'success' ? 'text-green-500' :
                        'text-yellow-500'
                      }`}
                    />
                    <span className={`text-sm ${
                      conflictWarning.type === 'error' ? 'text-red-800 font-semibold' :
                      conflictWarning.type === 'success' ? 'text-green-800' :
                      'text-yellow-800'
                    }`}>
                      {conflictWarning.message}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Duração */}
          <div className="mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
              Duração (minutos)
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[88px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
            />
            <div className="mt-1 text-xs text-gray-500">
              {formData.notes.length}/500 caracteres
            </div>
          </div>

          {/* Seção de Recorrência - NOVA */}
          {!editingAppointment && (
            <div className="mb-6 border-t pt-6">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="recurrence-enabled"
                  checked={recurrenceEnabled}
                  onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="recurrence-enabled" className="ml-2 font-medium text-gray-700">
                  <FontAwesomeIcon icon={faRedoAlt} className="mr-2 text-blue-600" />
                  Criar agendamento recorrente
                </label>
              </div>

              {recurrenceEnabled && (
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tipo de recorrência */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Frequência
                      </label>
                      <select
                        name="type"
                        value={recurrenceConfig.type}
                        onChange={handleRecurrenceConfigChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="weekly">📅 Toda semana</option>
                        <option value="biweekly">📅 A cada 2 semanas</option>
                        <option value="monthly">📅 Todo mês</option>
                      </select>
                    </div>

                    {/* Semanas à frente para gerar */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Gerar para próximas
                      </label>
                      <select
                        name="generateWeeks"
                        value={recurrenceConfig.generateWeeks}
                        onChange={handleRecurrenceConfigChange}
                        disabled={isLoading}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value={4}>4 semanas</option>
                        <option value={6}>6 semanas</option>
                        <option value={8}>8 semanas</option>
                        <option value={12}>12 semanas</option>
                        <option value={16}>16 semanas</option>
                      </select>
                    </div>
                  </div>

                  {/* Data de término (opcional) */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Terminar em (opcional)
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={recurrenceConfig.endDate}
                      onChange={handleRecurrenceConfigChange}
                      min={formData.scheduled_date}
                      disabled={isLoading}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 min-h-[44px] border border-gray-300 rounded-md shadow-sm text-sm sm:text-base focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Deixe em branco para gerar indefinidamente
                    </div>
                  </div>

                  {/* Opções avançadas */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="skip-holidays"
                      name="skipHolidays"
                      checked={recurrenceConfig.skipHolidays}
                      onChange={handleRecurrenceConfigChange}
                      disabled={isLoading}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="skip-holidays" className="ml-2 text-sm text-gray-700">
                      Pular feriados automaticamente
                    </label>
                  </div>

                  {/* Observações da recorrência */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações da recorrência
                    </label>
                    <textarea
                      name="notes"
                      value={recurrenceConfig.notes}
                      onChange={handleRecurrenceConfigChange}
                      rows={2}
                      maxLength={200}
                      placeholder="Observações específicas da série recorrente..."
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      {recurrenceConfig.notes.length}/200 caracteres
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      disabled={isLoading || !formData.scheduled_date || !formData.scheduled_time}
                      className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md shadow-sm hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1 w-3 h-3" />
                      {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                    </button>

                    <button
                      type="button"
                      onClick={checkConflicts}
                      disabled={isLoading || checkingConflicts || !formData.patient_id || !formData.therapist_id || !formData.scheduled_date || !formData.scheduled_time}
                      className="px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md shadow-sm hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {checkingConflicts ? (
                        <FontAwesomeIcon icon={faSpinner} className="mr-1 w-3 h-3 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 w-3 h-3" />
                      )}
                      Verificar Conflitos
                    </button>
                  </div>

                  {/* Preview dos agendamentos */}
                  {showPreview && recurrencePreview.length > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Preview dos Agendamentos ({recurrencePreview.length} agendamentos)
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {recurrencePreview.slice(0, 10).map((appointment, index) => (
                          <div key={index} className="text-xs text-gray-600 flex justify-between">
                            <span>{appointment.formatted_date} ({appointment.day_name})</span>
                            <span>{appointment.time}</span>
                          </div>
                        ))}
                        {recurrencePreview.length > 10 && (
                          <div className="text-xs text-gray-500 text-center pt-1">
                            ... e mais {recurrencePreview.length - 10} agendamentos
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conflitos encontrados */}
                  {conflicts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-center mb-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                        <h4 className="text-sm font-medium text-red-800">
                          Conflitos Detectados ({conflicts.length})
                        </h4>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {conflicts.slice(0, 3).map((conflict, index) => (
                          <div key={index} className="text-xs text-red-700">
                            {conflict.scheduled_date} às {conflict.scheduled_time} - {conflict.patient_name}
                          </div>
                        ))}
                        {conflicts.length > 3 && (
                          <div className="text-xs text-red-600">
                            ... e mais {conflicts.length - 3} conflitos
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-red-600">
                        ⚠️ Agendamentos com conflito não serão criados automaticamente
                      </div>
                    </div>
                  )}

                  {/* Resumo */}
                  {formData.scheduled_date && formData.scheduled_time && (
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm text-gray-600">
                        <strong>Resumo:</strong> {recurringAppointmentApi.formatRecurrenceDescription({
                          recurrence_type: recurrenceConfig.type,
                          day_of_week: new Date(formData.scheduled_date).getDay(),
                          scheduled_time: formData.scheduled_time,
                          duration_minutes: formData.duration_minutes,
                          discipline_name: formData.discipline_id ? disciplines.find(d => d.id === parseInt(formData.discipline_id))?.name : null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 sm:space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 sm:px-6 sm:py-3 min-h-[44px] text-sm sm:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 sm:px-6 sm:py-3 min-h-[44px] text-sm sm:text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {editingAppointment
                ? 'Atualizar'
                : recurrenceEnabled
                  ? 'Criar Série Recorrente'
                  : 'Agendar'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;