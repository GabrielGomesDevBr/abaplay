// frontend/src/components/scheduling/AvailabilitySearchModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSearch,
  faCalendarAlt,
  faClock,
  faUser,
  faStethoscope,
  faSpinner,
  faFilter,
  faCheckCircle,
  faDownload,
  faUserPlus,
  faEye,
  faFilePdf,
  faCopy
} from '@fortawesome/free-solid-svg-icons';
import availabilityApi from '../../api/availabilityApi';
import { getDisciplineHierarchy } from '../../api/programApi';
import { useAuth } from '../../context/AuthContext';
import { generateAvailabilityPDF } from '../../utils/pdfGenerator';

/**
 * Modal de Busca Rápida de Disponibilidade - UNIFICADO
 * Permite buscar horários disponíveis com filtros avançados
 *
 * MODOS:
 * 1. Agendamento (para paciente) - Seleciona 1 horário e agenda
 * 2. Consulta (sem paciente) - Seleciona múltiplos e exporta
 */
const AvailabilitySearchModal = ({
  isOpen,
  onClose,
  onSelectSlot,
  prefilledDisciplineId = null,
  prefilledPatientId = null
}) => {
  const { hasProAccess } = useAuth();

  // NOVO: Modo de operação
  const [searchMode, setSearchMode] = useState('schedule'); // 'schedule' ou 'consult'

  // Estados dos filtros
  const [filters, setFilters] = useState({
    discipline_id: prefilledDisciplineId || '',
    day_of_week: '',
    time_period: 'all',
    start_date: '',
    end_date: '',
    duration_minutes: 60,
    require_specialty: false,
    preferred_therapist_id: '',
    patient_id: prefilledPatientId || ''
  });

  // Estados de dados
  const [disciplines, setDisciplines] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]); // NOVO: Para modo consulta
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); // NOVO: Loading do PDF
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Carregar disciplinas ao abrir
  useEffect(() => {
    if (isOpen && hasProAccess && hasProAccess()) {
      loadDisciplines();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar filtros quando props mudam
  useEffect(() => {
    if (isOpen) {
      setFilters(prev => ({
        ...prev,
        discipline_id: prefilledDisciplineId || prev.discipline_id,
        patient_id: prefilledPatientId || prev.patient_id
      }));
    }
  }, [isOpen, prefilledDisciplineId, prefilledPatientId]);

  const loadDisciplines = async () => {
    try {
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
    }
  };

  /**
   * Formata data no formato DD/MM/YYYY
   * @param {string} dateString - Data no formato YYYY-MM-DD ou ISO do PostgreSQL
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';

    // Se vier no formato ISO (2025-10-27T03:00:00.000Z), extrair só a data
    // Se vier no formato simples (2025-10-27), usar direto
    let datePart = dateString;
    if (dateString.includes('T')) {
      datePart = dateString.split('T')[0];
    }

    // Agora datePart está no formato "YYYY-MM-DD"
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  /**
   * Traduz nomes de dias da semana do inglês para português
   * @param {string} dayName - Nome do dia em inglês (ex: "Monday", "Tuesday")
   */
  const translateDayName = (dayName) => {
    if (!dayName) return '';

    const dayTranslations = {
      'Monday': 'Segunda',
      'Tuesday': 'Terça',
      'Wednesday': 'Quarta',
      'Thursday': 'Quinta',
      'Friday': 'Sexta',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };

    // Remove espaços em branco e capitaliza
    const cleanDayName = dayName.trim();
    return dayTranslations[cleanDayName] || cleanDayName;
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setSelectedSlots([]); // Limpar seleção anterior

    try {
      // Preparar filtros para envio (remover valores vazios)
      const searchFilters = {};
      Object.keys(filters).forEach(key => {
        const value = filters[key];

        // NOVO: No modo consulta, não enviar patient_id
        if (key === 'patient_id' && searchMode === 'consult') {
          return; // Pula o patient_id
        }

        if (value !== '' && value !== null && value !== undefined) {
          searchFilters[key] = value;
        }
      });

      const response = await availabilityApi.searchAvailableSlots(searchFilters);
      setResults(response.slots || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar disponibilidade');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSlot = (slot) => {
    if (onSelectSlot) {
      onSelectSlot({
        therapist_id: slot.therapist_id,
        therapist_name: slot.therapist_name,
        scheduled_date: slot.available_date,
        scheduled_time: slot.available_time,
        duration_minutes: Math.min(slot.available_duration, filters.duration_minutes),
        room_id: slot.suggested_room_id,
        has_specialty: slot.has_specialty,
        is_preferred: slot.is_preferred
      });
    }
    onClose();
  };

  // NOVO: Selecionar/desselecionar slot individual (modo consulta)
  const handleToggleSlot = (slot) => {
    setSelectedSlots(prev => {
      const exists = prev.find(s =>
        s.therapist_id === slot.therapist_id &&
        s.available_date === slot.available_date &&
        s.available_time === slot.available_time
      );

      if (exists) {
        // Desselecionar
        return prev.filter(s =>
          !(s.therapist_id === slot.therapist_id &&
            s.available_date === slot.available_date &&
            s.available_time === slot.available_time)
        );
      } else {
        // Selecionar
        return [...prev, slot];
      }
    });
  };

  // NOVO: Verificar se slot está selecionado
  const isSlotSelected = (slot) => {
    return selectedSlots.some(s =>
      s.therapist_id === slot.therapist_id &&
      s.available_date === slot.available_date &&
      s.available_time === slot.available_time
    );
  };

  // NOVO: Selecionar todos os horários de um terapeuta
  const handleSelectAllTherapist = (therapistId) => {
    const therapistSlots = results.filter(s => s.therapist_id === therapistId);
    const allSelected = therapistSlots.every(slot => isSlotSelected(slot));

    if (allSelected) {
      // Desselecionar todos do terapeuta
      setSelectedSlots(prev => prev.filter(s => s.therapist_id !== therapistId));
    } else {
      // Selecionar todos do terapeuta
      const slotsToAdd = therapistSlots.filter(slot => !isSlotSelected(slot));
      setSelectedSlots(prev => [...prev, ...slotsToAdd]);
    }
  };

  // NOVO: Gerar PDF profissional
  const handleGeneratePDF = async () => {
    if (selectedSlots.length === 0) {
      alert('Selecione pelo menos um horário para gerar o PDF.');
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await generateAvailabilityPDF({
        selectedSlots,
        filters,
        disciplines
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // NOVO: Copiar como texto simples (uso interno rápido)
  const handleCopyAsText = () => {
    if (selectedSlots.length === 0) {
      alert('Selecione pelo menos um horário para copiar');
      return;
    }

    // Criar texto simples
    let text = 'HORÁRIOS DISPONÍVEIS - ABAPLAY\n\n';

    const disciplineName = disciplines.find(d => d.id === parseInt(filters.discipline_id))?.name || 'Todas as disciplinas';
    text += `Especialidade: ${disciplineName}\n`;
    text += `Duração: ${filters.duration_minutes} minutos\n\n`;

    // Ordenar e agrupar
    const sorted = [...selectedSlots].sort((a, b) => {
      if (a.available_date !== b.available_date) {
        return a.available_date.localeCompare(b.available_date);
      }
      return a.available_time.localeCompare(b.available_time);
    });

    const groupedByTherapist = sorted.reduce((acc, slot) => {
      if (!acc[slot.therapist_id]) {
        acc[slot.therapist_id] = {
          name: slot.therapist_name,
          slots: []
        };
      }
      acc[slot.therapist_id].slots.push(slot);
      return acc;
    }, {});

    Object.values(groupedByTherapist).forEach(group => {
      text += `\n${group.name}:\n`;
      group.slots.forEach(slot => {
        text += `  • ${formatDate(slot.available_date)} (${translateDayName(slot.day_name)}) - ${slot.available_time.slice(0, 5)}`;
        if (slot.has_specialty) text += ' [Especialista]';
        text += `\n`;
      });
    });

    text += `\nTotal: ${selectedSlots.length} horário(s)\n`;

    // Copiar para clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ ${selectedSlots.length} horário(s) copiado(s) como texto!`);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Texto copiado!');
    });
  };

  const handleClose = () => {
    // Resetar estados
    setFilters({
      discipline_id: '',
      day_of_week: '',
      time_period: 'all',
      start_date: '',
      end_date: '',
      duration_minutes: 60,
      require_specialty: false,
      preferred_therapist_id: '',
      patient_id: ''
    });
    setResults([]);
    setSelectedSlots([]); // NOVO
    setSearchMode('schedule'); // NOVO
    setHasSearched(false);
    setError(null);
    setShowAdvancedFilters(false);
    onClose();
  };

  // Agrupar resultados por terapeuta
  const groupedResults = results.reduce((acc, slot) => {
    if (!acc[slot.therapist_id]) {
      acc[slot.therapist_id] = {
        therapist_name: slot.therapist_name,
        slots: []
      };
    }
    acc[slot.therapist_id].slots.push(slot);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            <FontAwesomeIcon icon={faSearch} className="mr-2" />
            Buscar Disponibilidade
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
          {/* NOVO: Toggle de Modo */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">Tipo de busca:</p>
                <div className="flex flex-col xs:flex-row gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchMode"
                      value="schedule"
                      checked={searchMode === 'schedule'}
                      onChange={(e) => setSearchMode(e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <FontAwesomeIcon icon={faUserPlus} className="text-indigo-600" />
                    <span className="text-sm font-medium">
                      Para agendar (com paciente)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="searchMode"
                      value="consult"
                      checked={searchMode === 'consult'}
                      onChange={(e) => setSearchMode(e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <FontAwesomeIcon icon={faEye} className="text-indigo-600" />
                    <span className="text-sm font-medium">
                      Apenas consultar (sem paciente)
                    </span>
                  </label>
                </div>
              </div>
              <div className="text-xs text-gray-600 bg-white p-2 rounded border border-indigo-100">
                {searchMode === 'schedule' ? (
                  <>
                    <FontAwesomeIcon icon={faUserPlus} className="mr-1 text-indigo-600" />
                    Selecione 1 horário para agendar
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faFilePdf} className="mr-1 text-indigo-600" />
                    Selecione múltiplos e gere PDF profissional
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filtros Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Disciplina */}
            {hasProAccess && hasProAccess() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faStethoscope} className="mr-2" />
                  Disciplina
                </label>
                <select
                  value={filters.discipline_id}
                  onChange={(e) => handleFilterChange('discipline_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as disciplinas</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Período do dia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                Período
              </label>
              <select
                value={filters.time_period}
                onChange={(e) => handleFilterChange('time_period', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os períodos</option>
                <option value="morning">Manhã (6h-12h)</option>
                <option value="afternoon">Tarde (12h-18h)</option>
                <option value="evening">Noite (18h-21h)</option>
              </select>
            </div>

            {/* Duração */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faClock} className="mr-2" />
                Duração (minutos)
              </label>
              <select
                value={filters.duration_minutes}
                onChange={(e) => handleFilterChange('duration_minutes', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
                <option value="90">90 minutos</option>
                <option value="120">120 minutos</option>
              </select>
            </div>
          </div>

          {/* Toggle Filtros Avançados */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 flex items-center"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros avançados
          </button>

          {/* Filtros Avançados */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dia da semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana
                </label>
                <select
                  value={filters.day_of_week}
                  onChange={(e) => handleFilterChange('day_of_week', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os dias</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                </select>
              </div>

              {/* Data inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Data Final
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Exigir especialidade */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_specialty"
                  checked={filters.require_specialty}
                  onChange={(e) => handleFilterChange('require_specialty', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require_specialty" className="ml-2 block text-sm text-gray-700">
                  Apenas terapeutas com especialidade
                </label>
              </div>
            </div>
          )}

          {/* Botão de Busca */}
          <div className="mb-6">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isSearching ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Buscando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSearch} className="mr-2" />
                  Buscar Horários
                </>
              )}
            </button>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Resultados */}
          {hasSearched && !isSearching && (
            <div>
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FontAwesomeIcon icon={faCalendarAlt} size="3x" className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Nenhum horário disponível encontrado</p>
                  <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex flex-col xs:flex-row justify-between items-stretch xs:items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {results.length} horário{results.length !== 1 ? 's' : ''} disponível{results.length !== 1 ? 'is' : ''}
                    </h3>

                    {/* NOVO: Botões de exportação (modo consulta) */}
                    {searchMode === 'consult' && selectedSlots.length > 0 && (
                      <div className="flex flex-col xs:flex-row gap-2">
                        {/* Botão Principal: Gerar PDF */}
                        <button
                          onClick={handleGeneratePDF}
                          disabled={isGeneratingPDF}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingPDF ? (
                            <>
                              <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                              <span>Gerando PDF...</span>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faFilePdf} />
                              <span>Gerar PDF ({selectedSlots.length})</span>
                            </>
                          )}
                        </button>

                        {/* Botão Secundário: Copiar como texto */}
                        <button
                          onClick={handleCopyAsText}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 touch-manipulation"
                        >
                          <FontAwesomeIcon icon={faCopy} />
                          <span className="hidden sm:inline">Copiar Texto</span>
                          <span className="sm:hidden">Texto</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Resultados agrupados por terapeuta */}
                  <div className="space-y-4">
                    {Object.keys(groupedResults).map(therapistId => {
                      const group = groupedResults[therapistId];
                      // NOVO: Para checkbox master
                      const therapistSlots = group.slots;
                      const allSelected = searchMode === 'consult' && therapistSlots.every(slot => isSlotSelected(slot));
                      const someSelected = searchMode === 'consult' && therapistSlots.some(slot => isSlotSelected(slot)) && !allSelected;

                      return (
                        <div key={therapistId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              {/* NOVO: Checkbox master (só no modo consulta) */}
                              {searchMode === 'consult' && (
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={input => {
                                    if (input) input.indeterminate = someSelected;
                                  }}
                                  onChange={() => handleSelectAllTherapist(therapistId)}
                                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-manipulation"
                                />
                              )}

                              <h4 className="font-semibold text-gray-800 flex items-center">
                                <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600" />
                                {group.therapist_name}
                                <span className="ml-2 text-sm font-normal text-gray-600">
                                  ({group.slots.length} horário{group.slots.length !== 1 ? 's' : ''})
                                </span>
                              </h4>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {group.slots.map((slot, index) => {
                              const selected = isSlotSelected(slot);

                              return searchMode === 'consult' ? (
                                // MODO CONSULTA: Checkbox
                                <label
                                  key={index}
                                  className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer touch-manipulation ${
                                    selected ? 'bg-indigo-50' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => handleToggleSlot(slot)}
                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded flex-shrink-0 touch-manipulation"
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
                                      <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-xs sm:text-sm" />
                                        <span className="font-medium text-sm">
                                          {formatDate(slot.available_date)}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          ({translateDayName(slot.day_name)})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs sm:text-sm" />
                                        <span className="font-medium text-sm">
                                          {slot.available_time.slice(0, 5)}
                                        </span>
                                        <span className="text-gray-500 text-sm ml-2">
                                          ({filters.duration_minutes} min)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Badges */}
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
                                      {slot.suggested_room_name && (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                          Sala: {slot.suggested_room_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              ) : (
                                // MODO SCHEDULE: Botão selecionar (comportamento original)
                                <div
                                  key={index}
                                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4">
                                      <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-xs sm:text-sm" />
                                        <span className="font-medium text-sm">
                                          {formatDate(slot.available_date)}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          ({translateDayName(slot.day_name)})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs sm:text-sm" />
                                        <span className="font-medium text-sm">
                                          {slot.available_time.slice(0, 5)}
                                        </span>
                                        <span className="text-gray-500 text-sm ml-2">
                                          ({filters.duration_minutes} min)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Badges */}
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
                                      {slot.suggested_room_name && (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                          Sala: {slot.suggested_room_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleSelectSlot(slot)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium min-h-[44px] flex-shrink-0 touch-manipulation"
                                  >
                                    Selecionar
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySearchModal;
