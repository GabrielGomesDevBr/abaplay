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
  faExclamationTriangle,
  faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
    start_date: '', // NOVO: Data inicial de busca
    end_date: '',   // NOVO: Data final de busca
    require_specialty: true,
    max_suggestions_per_discipline: 5
  });

  // Passo 3: Sugestões
  const [suggestions, setSuggestions] = useState({});
  const [selectedSlots, setSelectedSlots] = useState({});
  const [error, setError] = useState(null);

  // Passo 4: Recorrência (NOVO)
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    is_recurring: false,
    recurrence_pattern: 'weekly', // weekly, biweekly, monthly
    end_type: 'date', // date, count, indefinite
    end_date: '',
    session_count: 8
  });

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

  // NOVO: Helper para formatar data em YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getDatePlusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // NOVO: Calcular datas de recorrência para preview
  const calculateRecurrenceDates = (baseDate, pattern, endType, endDate, sessionCount) => {
    const dates = [baseDate];
    let currentDate = new Date(baseDate + 'T00:00:00');

    const maxIterations = endType === 'count' ? sessionCount - 1 : 100; // Máx 100 para indefinite/date
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Adicionar intervalo conforme padrão
      if (pattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (pattern === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (pattern === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      const nextDateStr = currentDate.toISOString().split('T')[0];

      // Verificar se ultrapassou data final (se definida)
      if (endType === 'date' && endDate && nextDateStr > endDate) {
        break;
      }

      dates.push(nextDateStr);

      // Para indefinite, mostrar apenas algumas datas como preview
      if (endType === 'indefinite' && dates.length >= 8) {
        break;
      }
    }

    return dates;
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
      // NOVO: Preparar parâmetros com datas
      const params = {
        patient_id: parseInt(selectedPatient),
        disciplines: selectedDisciplines.map(id => parseInt(id)),
        time_period: preferences.time_period,
        require_specialty: preferences.require_specialty,
        max_suggestions_per_discipline: preferences.max_suggestions_per_discipline
      };

      // Adicionar datas se fornecidas
      if (preferences.start_date) {
        params.start_date = preferences.start_date;
      }
      if (preferences.end_date) {
        params.end_date = preferences.end_date;
      }

      const response = await availabilityApi.suggestAppointments(params);

      setSuggestions(response.suggestions || {});
      setCurrentStep(3);
    } catch (err) {
      setError(err.message || 'Erro ao gerar sugestões');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // REFATORADO: Seleção manual com toggle (checkbox)
  const handleSlotToggle = (disciplineId, slot) => {
    setSelectedSlots(prev => {
      const currentSlots = prev[disciplineId] || [];
      const slotKey = `${slot.available_date}_${slot.available_time}_${slot.therapist_id}`;

      // Verificar se já está selecionado
      const isSelected = currentSlots.some(s =>
        `${s.available_date}_${s.available_time}_${s.therapist_id}` === slotKey
      );

      if (isSelected) {
        // Remover da seleção
        return {
          ...prev,
          [disciplineId]: currentSlots.filter(s =>
            `${s.available_date}_${s.available_time}_${s.therapist_id}` !== slotKey
          )
        };
      } else {
        // Adicionar à seleção
        return {
          ...prev,
          [disciplineId]: [...currentSlots, slot]
        };
      }
    });
  };

  // Helper: Verificar se um slot está selecionado
  const isSlotSelected = (disciplineId, slot) => {
    const currentSlots = selectedSlots[disciplineId] || [];
    const slotKey = `${slot.available_date}_${slot.available_time}_${slot.therapist_id}`;
    return currentSlots.some(s =>
      `${s.available_date}_${s.available_time}_${s.therapist_id}` === slotKey
    );
  };

  // NOVO: Selecionar todos os slots de uma disciplina
  const handleSelectAllSlots = (disciplineId) => {
    const disciplineSlots = suggestions[disciplineId] || [];
    setSelectedSlots(prev => ({
      ...prev,
      [disciplineId]: [...disciplineSlots]
    }));
  };

  // NOVO: Limpar seleção de uma disciplina
  const handleClearSlots = (disciplineId) => {
    setSelectedSlots(prev => ({
      ...prev,
      [disciplineId]: []
    }));
  };

  // NOVO: Exportar preview para PDF
  const handleExportPreviewPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const patient = patients.find(p => p.id === parseInt(selectedPatient));

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Prévia de Agendamentos', pageWidth / 2, 15, { align: 'center' });

    // Informações do paciente e recorrência
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 25;

    doc.text(`Paciente: ${patient?.name || 'N/A'}`, 14, yPos);
    yPos += 6;
    doc.text(`Horários selecionados: ${getTotalSelectedSlots()}`, 14, yPos);
    yPos += 6;
    doc.text(`Tipo: ${recurrenceConfig.is_recurring ? 'Recorrente' : 'Sessão Única'}`, 14, yPos);

    if (recurrenceConfig.is_recurring) {
      yPos += 6;
      const patternLabel = recurrenceConfig.recurrence_pattern === 'weekly' ? 'Semanal' :
                           recurrenceConfig.recurrence_pattern === 'biweekly' ? 'Quinzenal' : 'Mensal';
      doc.text(`Frequência: ${patternLabel}`, 14, yPos);
      yPos += 6;

      let endLabel = '';
      if (recurrenceConfig.end_type === 'date' && recurrenceConfig.end_date) {
        endLabel = `Até ${new Date(recurrenceConfig.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}`;
      } else if (recurrenceConfig.end_type === 'count') {
        endLabel = `${recurrenceConfig.session_count} sessões`;
      } else {
        endLabel = 'Indefinido';
      }
      doc.text(`Término: ${endLabel}`, 14, yPos);
    }

    yPos += 10;

    // Tabela para cada disciplina
    Object.keys(selectedSlots).forEach((disciplineId, index) => {
      const disciplineName = disciplines.find(d => d.id === parseInt(disciplineId))?.name || 'Disciplina';
      const slots = selectedSlots[disciplineId] || [];

      if (slots.length === 0) return;

      // Adicionar nova página se necessário
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Título da disciplina
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(disciplineName, 14, yPos);
      yPos += 7;

      // Preparar dados da tabela
      const tableData = [];

      slots.forEach(slot => {
        let occurrences = [slot.available_date];
        if (recurrenceConfig.is_recurring) {
          occurrences = calculateRecurrenceDates(
            slot.available_date,
            recurrenceConfig.recurrence_pattern,
            recurrenceConfig.end_type,
            recurrenceConfig.end_date,
            recurrenceConfig.session_count
          );
        }

        const datesStr = occurrences.slice(0, 3).map(d =>
          new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        ).join(', ') + (occurrences.length > 3 ? `... (+${occurrences.length - 3})` : '');

        tableData.push([
          slot.therapist_name,
          slot.available_time.slice(0, 5),
          `${slot.available_duration} min`,
          recurrenceConfig.is_recurring ? datesStr : new Date(slot.available_date + 'T00:00:00').toLocaleDateString('pt-BR'),
          recurrenceConfig.is_recurring ? `${occurrences.length} sessões` : '1 sessão'
        ]);
      });

      // Gerar tabela
      doc.autoTable({
        startY: yPos,
        head: [['Terapeuta', 'Horário', 'Duração', recurrenceConfig.is_recurring ? 'Datas' : 'Data', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    });

    // Rodapé
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Salvar
    doc.save(`previa-agendamentos-${patient?.name?.replace(/\s+/g, '-').toLowerCase() || 'paciente'}.pdf`);
  };

  const handleFinish = () => {
    // REFATORADO: Preparar lista de agendamentos (agora com múltiplas seleções e recorrência)
    const appointmentsToCreate = [];

    Object.keys(selectedSlots).forEach(disciplineId => {
      const slots = selectedSlots[disciplineId] || [];

      slots.forEach(slot => {
        const appointment = {
          patient_id: parseInt(selectedPatient),
          therapist_id: slot.therapist_id,
          discipline_id: parseInt(disciplineId),
          scheduled_date: slot.available_date,
          scheduled_time: slot.available_time,
          duration_minutes: slot.available_duration,
          room_id: slot.suggested_room_id || null,
          notes: `Agendamento criado via assistente inteligente${slot.has_specialty ? ' - Terapeuta especialista' : ''}${slot.is_preferred ? ' - Terapeuta preferido' : ''}`
        };

        // NOVO: Adicionar configuração de recorrência
        if (recurrenceConfig.is_recurring) {
          appointment.is_recurring = true;
          appointment.recurrence_pattern = recurrenceConfig.recurrence_pattern;

          if (recurrenceConfig.end_type === 'date' && recurrenceConfig.end_date) {
            appointment.recurrence_end_date = recurrenceConfig.end_date;
          } else if (recurrenceConfig.end_type === 'count') {
            appointment.recurrence_count = recurrenceConfig.session_count;
          }
          // Se indefinite, não passa end_date nem count (null = indefinido)
        }

        appointmentsToCreate.push(appointment);
      });
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
      start_date: '',
      end_date: '',
      require_specialty: true,
      max_suggestions_per_discipline: 5
    });
    setSuggestions({});
    setSelectedSlots({});
    setRecurrenceConfig({
      is_recurring: false,
      recurrence_pattern: 'weekly',
      end_type: 'date',
      end_date: '',
      session_count: 8
    });
    setError(null);
    onClose();
  };

  const canProceedToStep2 = selectedPatient && selectedDisciplines.length > 0;
  const canProceedToStep3 = true; // Sempre pode gerar sugestões

  // REFATORADO: Verificar se há pelo menos 1 slot selecionado em qualquer disciplina
  const canFinish = Object.values(selectedSlots).some(slots => slots && slots.length > 0);

  // Helper: Contar total de slots selecionados
  const getTotalSelectedSlots = () => {
    return Object.values(selectedSlots).reduce((total, slots) => {
      return total + (slots ? slots.length : 0);
    }, 0);
  };

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
              Passo {currentStep} de 5
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
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        {/* NOVO: Breadcrumb/Resumo do Progresso */}
        {currentStep > 1 && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 px-6 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {selectedPatient && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
                  <span className="font-medium text-gray-700">
                    {patients.find(p => p.id === parseInt(selectedPatient))?.name || 'Paciente'}
                  </span>
                </div>
              )}

              {selectedDisciplines.length > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faStethoscope} className="text-blue-600" />
                    <span className="text-gray-700">
                      {selectedDisciplines.length} disciplina{selectedDisciplines.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              )}

              {currentStep >= 3 && preferences.start_date && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600" />
                    <span className="text-gray-700">
                      {new Date(preferences.start_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {preferences.end_date && ` - ${new Date(preferences.end_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                    </span>
                  </div>
                </>
              )}

              {currentStep >= 4 && getTotalSelectedSlots() > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="text-green-600" />
                    <span className="font-medium text-green-700">
                      {getTotalSelectedSlots()} horário{getTotalSelectedSlots() !== 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              )}

              {currentStep >= 5 && recurrenceConfig.is_recurring && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-orange-600" />
                    <span className="text-gray-700">
                      {recurrenceConfig.recurrence_pattern === 'weekly' ? 'Semanal' :
                       recurrenceConfig.recurrence_pattern === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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

                {/* NOVO: Presets de configurações comuns */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Atalhos de Configuração
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPreferences({
                        time_period: 'all',
                        start_date: getTodayString(),
                        end_date: getDatePlusDays(7),
                        require_specialty: false,
                        max_suggestions_per_discipline: 10
                      })}
                      className="p-3 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="font-medium text-blue-700 text-sm mb-1">⚡ Busca Rápida</div>
                      <div className="text-xs text-gray-600">
                        Esta semana • Todos períodos • 10 sugestões
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreferences({
                        time_period: 'all',
                        start_date: getTodayString(),
                        end_date: '',
                        require_specialty: true,
                        max_suggestions_per_discipline: 5
                      })}
                      className="p-3 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left"
                    >
                      <div className="font-medium text-green-700 text-sm mb-1">👨‍⚕️ Especialistas</div>
                      <div className="text-xs text-gray-600">
                        Apenas especialistas • 5 sugestões
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreferences({
                        time_period: 'morning',
                        start_date: getTodayString(),
                        end_date: getDatePlusDays(14),
                        require_specialty: false,
                        max_suggestions_per_discipline: 5
                      })}
                      className="p-3 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="font-medium text-purple-700 text-sm mb-1">🌅 Manhãs</div>
                      <div className="text-xs text-gray-600">
                        Período manhã • Próximas 2 semanas
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* NOVO: Filtro de período (datas) */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                      Quando buscar horários?
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Data Inicial
                        </label>
                        <input
                          type="date"
                          value={preferences.start_date}
                          min={getTodayString()}
                          onChange={(e) => setPreferences(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="A partir de hoje"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {preferences.start_date ? `Buscar a partir de ${new Date(preferences.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Padrão: hoje'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Data Final (opcional)
                        </label>
                        <input
                          type="date"
                          value={preferences.end_date}
                          min={preferences.start_date || getTodayString()}
                          onChange={(e) => setPreferences(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Até quando buscar"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {preferences.end_date ? `Buscar até ${new Date(preferences.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'Padrão: +14 dias'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, start_date: getTodayString(), end_date: '' }))}
                        className="text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        A partir de hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, start_date: getDatePlusDays(7), end_date: '' }))}
                        className="text-xs bg-white border border-blue-300 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        A partir da próxima semana
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferences(prev => ({ ...prev, start_date: '', end_date: '' }))}
                        className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Selecione os horários para agendar
                  </h3>
                  {/* NOVO: Contador global visível */}
                  {getTotalSelectedSlots() > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 px-4 py-2 rounded-lg">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
                      <span className="text-sm font-semibold text-gray-800">
                        {getTotalSelectedSlots()} horário{getTotalSelectedSlots() !== 1 ? 's' : ''} selecionado{getTotalSelectedSlots() !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

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
                      const selectedCount = (selectedSlots[disciplineId] || []).length;

                      return (
                        <div key={disciplineId} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-800 flex items-center gap-3">
                                <FontAwesomeIcon icon={faStethoscope} className="text-blue-600" />
                                {disciplineName}
                                {selectedCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </h4>
                              <span className="text-sm font-normal text-gray-600">
                                {slots.length} sugestõ{slots.length !== 1 ? 'es' : ''}
                              </span>
                            </div>
                            {/* NOVO: Botões de ação rápida */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectAllSlots(disciplineId)}
                                className="text-xs bg-white border border-green-300 text-green-600 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                              >
                                Selecionar todos
                              </button>
                              <button
                                type="button"
                                onClick={() => handleClearSlots(disciplineId)}
                                disabled={selectedCount === 0}
                                className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Limpar seleção
                              </button>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {slots.map((slot, index) => {
                              const isSelected = isSlotSelected(disciplineId, slot);

                              return (
                                <label
                                  key={index}
                                  className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {/* NOVO: Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSlotToggle(disciplineId, slot)}
                                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1 flex-shrink-0"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                      <div className="flex items-center">
                                        <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2 text-sm" />
                                        <span className="font-medium">{slot.therapist_name}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 text-sm" />
                                        <span className="text-sm">
                                          {new Date(slot.available_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400 mr-2 text-sm" />
                                        <span className="text-sm font-medium">{slot.available_time.slice(0, 5)}</span>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
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
                                </label>
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

          {/* Passo 4: Recorrência */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Configure a recorrência dos agendamentos
                </h3>

                <div className="space-y-6">
                  {/* Tipo de agendamento */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de Agendamento
                    </label>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_recurring"
                          checked={!recurrenceConfig.is_recurring}
                          onChange={() => setRecurrenceConfig(prev => ({ ...prev, is_recurring: false }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Sessão Única</div>
                          <p className="text-sm text-gray-600">
                            Agendar apenas uma vez (não repetir)
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="is_recurring"
                          checked={recurrenceConfig.is_recurring}
                          onChange={() => setRecurrenceConfig(prev => ({ ...prev, is_recurring: true }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Sessão Recorrente</div>
                          <p className="text-sm text-gray-600">
                            Repetir automaticamente conforme configurado
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Configurações de recorrência (só se is_recurring = true) */}
                  {recurrenceConfig.is_recurring && (
                    <>
                      {/* Padrão de recorrência */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frequência
                        </label>
                        <select
                          value={recurrenceConfig.recurrence_pattern}
                          onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, recurrence_pattern: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="weekly">Semanal (toda semana)</option>
                          <option value="biweekly">Quinzenal (a cada 2 semanas)</option>
                          <option value="monthly">Mensal (a cada mês)</option>
                        </select>
                      </div>

                      {/* Tipo de término */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Quando terminar?
                        </label>

                        <div className="space-y-4">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="end_type"
                              value="date"
                              checked={recurrenceConfig.end_type === 'date'}
                              onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, end_type: e.target.value }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-2">Até uma data específica</div>
                              {recurrenceConfig.end_type === 'date' && (
                                <input
                                  type="date"
                                  value={recurrenceConfig.end_date}
                                  min={getTodayString()}
                                  onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, end_date: e.target.value }))}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              )}
                            </div>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="end_type"
                              value="count"
                              checked={recurrenceConfig.end_type === 'count'}
                              onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, end_type: e.target.value }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-2">Número de sessões</div>
                              {recurrenceConfig.end_type === 'count' && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="52"
                                    value={recurrenceConfig.session_count}
                                    onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, session_count: parseInt(e.target.value) || 1 }))}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  />
                                  <span className="text-sm text-gray-600">sessões</span>
                                </div>
                              )}
                            </div>
                          </label>

                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name="end_type"
                              value="indefinite"
                              checked={recurrenceConfig.end_type === 'indefinite'}
                              onChange={(e) => setRecurrenceConfig(prev => ({ ...prev, end_type: e.target.value }))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Indefinido</div>
                              <p className="text-sm text-gray-600">
                                Continuar até pausa/cancelamento manual
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Preview de recorrência */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800 flex-1">
                            <p className="font-medium mb-2">Resumo da recorrência:</p>
                            <ul className="list-disc list-inside space-y-1 mb-3">
                              <li>
                                Frequência: {recurrenceConfig.recurrence_pattern === 'weekly' ? 'Semanal' : recurrenceConfig.recurrence_pattern === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                              </li>
                              <li>
                                {recurrenceConfig.end_type === 'date' && recurrenceConfig.end_date && `Até ${new Date(recurrenceConfig.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                                {recurrenceConfig.end_type === 'count' && `${recurrenceConfig.session_count} sessões`}
                                {recurrenceConfig.end_type === 'indefinite' && 'Indefinido (até pausa manual)'}
                              </li>
                              <li>Total de horários selecionados: {getTotalSelectedSlots()}</li>
                            </ul>

                            {/* NOVO: Preview inline de datas */}
                            {(() => {
                              // Pegar a primeira data disponível dos slots selecionados como exemplo
                              const firstSlot = Object.values(selectedSlots).flat()[0];
                              if (!firstSlot) return null;

                              const exampleDates = calculateRecurrenceDates(
                                firstSlot.available_date,
                                recurrenceConfig.recurrence_pattern,
                                recurrenceConfig.end_type,
                                recurrenceConfig.end_date,
                                recurrenceConfig.session_count
                              );

                              const previewDates = exampleDates.slice(0, 4);
                              const totalCount = exampleDates.length;

                              return (
                                <div className="bg-yellow-100 rounded px-3 py-2 mt-2">
                                  <p className="font-medium mb-1">Exemplo de datas (baseado no primeiro horário):</p>
                                  <p className="text-xs">
                                    {previewDates.map(d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })).join(', ')}
                                    {totalCount > 4 && `... (~${totalCount} sessões no total)`}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Passo 5: Preview do Calendário (NOVO) */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                    Prévia dos Agendamentos
                  </h3>
                  {/* NOVO: Botão de exportar PDF */}
                  <button
                    type="button"
                    onClick={handleExportPreviewPDF}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <FontAwesomeIcon icon={faFilePdf} />
                    Exportar PDF
                  </button>
                </div>

                {/* Resumo Geral */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600 text-xl mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Resumo do Agendamento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Paciente:</span>
                          <span className="ml-2 font-medium">
                            {patients.find(p => p.id === parseInt(selectedPatient))?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Disciplinas:</span>
                          <span className="ml-2 font-medium">
                            {Object.keys(selectedSlots).length} selecionada{Object.keys(selectedSlots).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Horários selecionados:</span>
                          <span className="ml-2 font-medium text-blue-600">
                            {getTotalSelectedSlots()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tipo:</span>
                          <span className="ml-2 font-medium">
                            {recurrenceConfig.is_recurring ? 'Recorrente' : 'Sessão Única'}
                          </span>
                        </div>
                      </div>

                      {recurrenceConfig.is_recurring && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-sm">
                            <span className="text-gray-600">Recorrência:</span>
                            <span className="ml-2 font-medium">
                              {recurrenceConfig.recurrence_pattern === 'weekly' ? 'Semanal' :
                               recurrenceConfig.recurrence_pattern === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="text-gray-600">
                              {recurrenceConfig.end_type === 'date' && recurrenceConfig.end_date &&
                                `Até ${new Date(recurrenceConfig.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                              {recurrenceConfig.end_type === 'count' &&
                                `${recurrenceConfig.session_count} sessões`}
                              {recurrenceConfig.end_type === 'indefinite' &&
                                'Indefinido'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview por disciplina */}
                <div className="space-y-5">
                  {Object.keys(selectedSlots).map(disciplineId => {
                    const disciplineName = disciplines.find(d => d.id === parseInt(disciplineId))?.name || 'Disciplina';
                    const slots = selectedSlots[disciplineId] || [];

                    return (
                      <div key={disciplineId} className="border border-gray-300 rounded-lg overflow-hidden">
                        {/* Header da Disciplina */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <FontAwesomeIcon icon={faStethoscope} />
                            {disciplineName}
                            <span className="ml-auto text-sm font-normal">
                              {slots.length} horário{slots.length !== 1 ? 's' : ''} selecionado{slots.length !== 1 ? 's' : ''}
                            </span>
                          </h4>
                        </div>

                        {/* Lista de slots */}
                        <div className="divide-y divide-gray-200 bg-white">
                          {slots.map((slot, idx) => {
                            // Calcular datas de recorrência para este slot
                            let occurrences = [slot.available_date];
                            if (recurrenceConfig.is_recurring) {
                              occurrences = calculateRecurrenceDates(
                                slot.available_date,
                                recurrenceConfig.recurrence_pattern,
                                recurrenceConfig.end_type,
                                recurrenceConfig.end_date,
                                recurrenceConfig.session_count
                              );
                            }

                            const totalSessions = occurrences.length;
                            const showAllOccurrences = occurrences.length <= 5;
                            const previewOccurrences = showAllOccurrences ? occurrences : occurrences.slice(0, 4);

                            return (
                              <div key={idx} className="p-4">
                                {/* Info do slot base */}
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 mb-1">
                                      {slot.therapist_name}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400" />
                                        {slot.available_time.slice(0, 5)}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>•</span>
                                        {slot.available_duration} min
                                      </div>
                                      {slot.suggested_room_name && (
                                        <div className="flex items-center gap-1">
                                          <span>•</span>
                                          Sala: {slot.suggested_room_name}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
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
                                    </div>
                                  </div>
                                </div>

                                {/* Datas de recorrência */}
                                <div className="ml-13 pl-4 border-l-2 border-blue-200">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                      {recurrenceConfig.is_recurring ? 'Ocorrências:' : 'Data:'}
                                    </span>
                                    {totalSessions > 1 && (
                                      <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                        {totalSessions} sessão{totalSessions !== 1 ? 'ões' : ''} no total
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    {previewOccurrences.map((dateStr, dateIdx) => (
                                      <div key={dateIdx} className="flex items-center gap-2 text-sm">
                                        <FontAwesomeIcon
                                          icon={faCalendarAlt}
                                          className={`text-xs ${dateIdx === 0 ? 'text-blue-600' : 'text-gray-400'}`}
                                        />
                                        <span className={dateIdx === 0 ? 'font-medium text-blue-600' : 'text-gray-600'}>
                                          {new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
                                            weekday: 'short',
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </span>
                                        {dateIdx === 0 && (
                                          <span className="text-xs text-blue-600">(primeira sessão)</span>
                                        )}
                                      </div>
                                    ))}

                                    {!showAllOccurrences && (
                                      <div className="text-sm text-gray-500 italic pt-1">
                                        ... e mais {occurrences.length - previewOccurrences.length} data{occurrences.length - previewOccurrences.length !== 1 ? 's' : ''}
                                        {recurrenceConfig.end_type === 'indefinite' && ' (mostrando primeiras 8 sessões)'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Aviso Final */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Atenção:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Ao finalizar, todos os agendamentos listados acima serão criados automaticamente.</li>
                        {recurrenceConfig.is_recurring && (
                          <>
                            <li>Sessões recorrentes seguirão o padrão configurado e podem ser gerenciadas posteriormente.</li>
                            {recurrenceConfig.end_type === 'indefinite' && (
                              <li>Sessões indefinidas continuarão até que você as pause ou cancele manualmente.</li>
                            )}
                          </>
                        )}
                        <li>Verifique se todos os horários e datas estão corretos antes de prosseguir.</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                onClick={() => setCurrentStep(4)}
                disabled={!canFinish}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Próximo
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                onClick={() => setCurrentStep(5)}
                disabled={!canFinish}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Prévia
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            )}

            {currentStep === 5 && (
              <button
                onClick={handleFinish}
                disabled={!canFinish || isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <span>Agendando...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <span>Confirmar e Agendar</span>
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
