// frontend/src/components/scheduling/AvailabilitySearchStandalone.js

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
  faCalendarWeek
} from '@fortawesome/free-solid-svg-icons';
import availabilityApi from '../../api/availabilityApi';
import { getDisciplineHierarchy } from '../../api/programApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Modal de Busca de Disponibilidade Standalone
 * Permite buscar horários disponíveis SEM NECESSIDADE DE PACIENTE
 * Útil para recepção consultar disponibilidade para enviar ao cliente
 * Permite seleção múltipla de horários com checkboxes individuais
 */
const AvailabilitySearchStandalone = ({ isOpen, onClose }) => {
  const { hasProAccess } = useAuth();

  // Estados dos filtros
  const [filters, setFilters] = useState({
    discipline_id: '',
    day_of_week: '',
    time_period: 'all',
    start_date: '',
    end_date: '',
    duration_minutes: 60,
    require_specialty: false,
    preferred_therapist_id: ''
  });

  // Estados de dados
  const [disciplines, setDisciplines] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]); // Array de slots selecionados
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'calendar'

  // Carregar disciplinas ao abrir
  useEffect(() => {
    if (isOpen && hasProAccess && hasProAccess()) {
      loadDisciplines();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

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
        if (value !== '' && value !== null && value !== undefined) {
          searchFilters[key] = value;
        }
      });

      // SEM PATIENT_ID - busca standalone
      const response = await availabilityApi.searchAvailableSlots(searchFilters);
      setResults(response.slots || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar disponibilidade');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Selecionar/desselecionar slot individual
  const handleToggleSlot = (slot) => {
    const slotKey = `${slot.therapist_id}_${slot.available_date}_${slot.available_time}`;

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

  // Verificar se slot está selecionado
  const isSlotSelected = (slot) => {
    return selectedSlots.some(s =>
      s.therapist_id === slot.therapist_id &&
      s.available_date === slot.available_date &&
      s.available_time === slot.available_time
    );
  };

  // Selecionar todos os horários de um terapeuta
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

  // Exportar seleção para tabela
  const handleExportSelection = () => {
    if (selectedSlots.length === 0) {
      alert('Selecione pelo menos um horário para exportar');
      return;
    }

    // Ordenar por data e horário
    const sorted = [...selectedSlots].sort((a, b) => {
      if (a.available_date !== b.available_date) {
        return a.available_date.localeCompare(b.available_date);
      }
      return a.available_time.localeCompare(b.available_time);
    });

    // Criar texto formatado
    let text = '═══════════════════════════════════════════════════\n';
    text += 'HORÁRIOS DISPONÍVEIS - ABAPLAY\n';
    text += '═══════════════════════════════════════════════════\n\n';

    // Agrupar por disciplina se filtrado
    const disciplineName = disciplines.find(d => d.id === parseInt(filters.discipline_id))?.name || 'Todas as disciplinas';
    text += `Especialidade: ${disciplineName}\n`;
    text += `Duração: ${filters.duration_minutes} minutos\n\n`;

    // Agrupar por terapeuta
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
      text += `─────────────────────────────────────────────────\n`;
      text += `Profissional: ${group.name}\n`;
      text += `─────────────────────────────────────────────────\n`;

      group.slots.forEach(slot => {
        text += `  📅 ${formatDate(slot.available_date)} (${translateDayName(slot.day_name)})\n`;
        text += `  🕐 ${slot.available_time.slice(0, 5)} - ${filters.duration_minutes} min\n`;
        if (slot.has_specialty) {
          text += `  ✓ Especialista\n`;
        }
        if (slot.suggested_room_name) {
          text += `  📍 Sala: ${slot.suggested_room_name}\n`;
        }
        text += `\n`;
      });
    });

    text += '═══════════════════════════════════════════════════\n';
    text += `Total: ${selectedSlots.length} horário(s) selecionado(s)\n`;
    text += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;

    // Copiar para clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert(`${selectedSlots.length} horário(s) copiado(s) para área de transferência!\n\nAgora você pode colar (Ctrl+V) em WhatsApp, email, etc.`);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      // Fallback: mostrar em um textarea para copiar manualmente
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Texto copiado para área de transferência!');
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
      preferred_therapist_id: ''
    });
    setResults([]);
    setSelectedSlots([]);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold">
            <FontAwesomeIcon icon={faSearch} className="mr-2" />
            <span className="hidden xs:inline">Consultar Disponibilidade</span>
            <span className="xs:hidden">Disponibilidade</span>
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Info Badge */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg mb-4 text-xs sm:text-sm">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
            <strong>Consulta sem paciente:</strong> Ideal para verificar horários e enviar opções para clientes via WhatsApp ou email.
          </div>

          {/* Filtros Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
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
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
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
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 flex items-center min-h-[44px] touch-manipulation"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros avançados
          </button>

          {/* Filtros Avançados */}
          {showAdvancedFilters && (
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Dia da semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana
                </label>
                <select
                  value={filters.day_of_week}
                  onChange={(e) => handleFilterChange('day_of_week', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-manipulation"
                />
              </div>

              {/* Exigir especialidade */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_specialty"
                  checked={filters.require_specialty}
                  onChange={(e) => handleFilterChange('require_specialty', e.target.checked)}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-manipulation"
                />
                <label htmlFor="require_specialty" className="ml-2 block text-sm text-gray-700">
                  Apenas terapeutas com especialidade
                </label>
              </div>
            </div>
          )}

          {/* Botão de Busca */}
          <div className="mb-4">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium min-h-[44px] touch-manipulation"
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Resultados */}
          {hasSearched && !isSearching && (
            <div>
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FontAwesomeIcon icon={faCalendarAlt} size="3x" className="mb-4 text-gray-300" />
                  <p className="text-base sm:text-lg font-medium">Nenhum horário disponível encontrado</p>
                  <p className="text-xs sm:text-sm mt-2">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <div>
                  {/* Header dos resultados */}
                  <div className="mb-4 flex flex-col xs:flex-row justify-between items-stretch xs:items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                      {results.length} horário{results.length !== 1 ? 's' : ''} disponível{results.length !== 1 ? 'is' : ''}
                    </h3>

                    {selectedSlots.length > 0 && (
                      <button
                        onClick={handleExportSelection}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 touch-manipulation"
                      >
                        <FontAwesomeIcon icon={faDownload} />
                        <span>Copiar Selecionados ({selectedSlots.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Resultados agrupados por terapeuta */}
                  <div className="space-y-3 sm:space-y-4">
                    {Object.keys(groupedResults).map(therapistId => {
                      const group = groupedResults[therapistId];
                      const therapistSlots = group.slots;
                      const allSelected = therapistSlots.every(slot => isSlotSelected(slot));
                      const someSelected = therapistSlots.some(slot => isSlotSelected(slot)) && !allSelected;

                      return (
                        <div key={therapistId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 sm:px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={input => {
                                  if (input) input.indeterminate = someSelected;
                                }}
                                onChange={() => handleSelectAllTherapist(therapistId)}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-manipulation"
                              />
                              <h4 className="font-semibold text-gray-800 flex items-center gap-2 min-w-0">
                                <FontAwesomeIcon icon={faUser} className="text-indigo-600 flex-shrink-0" />
                                <span className="truncate">{group.therapist_name}</span>
                                <span className="text-xs sm:text-sm font-normal text-gray-600 whitespace-nowrap">
                                  ({group.slots.length})
                                </span>
                              </h4>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {group.slots.map((slot, index) => {
                              const selected = isSlotSelected(slot);

                              return (
                                <label
                                  key={index}
                                  className={`px-3 sm:px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer touch-manipulation ${
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
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                                        <span className="font-medium text-xs sm:text-sm">
                                          {formatDate(slot.available_date)}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          ({translateDayName(slot.day_name)})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs sm:text-sm flex-shrink-0" />
                                        <span className="font-medium text-xs sm:text-sm">
                                          {slot.available_time.slice(0, 5)}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                          ({filters.duration_minutes} min)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                                      {slot.has_specialty && (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                                          <span className="hidden xs:inline">Especialista</span>
                                          <span className="xs:hidden">Espec.</span>
                                        </span>
                                      )}
                                      {slot.suggested_room_name && (
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 truncate max-w-[120px]">
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={handleClose}
            className="px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px] touch-manipulation"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilitySearchStandalone;
