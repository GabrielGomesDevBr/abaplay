// frontend/src/components/availability/ReschedulingModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCheckCircle,
  faCalendarAlt,
  faClock,
  faExclamationTriangle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import therapistAvailabilityApi from '../../api/therapistAvailabilityApi';

/**
 * Modal para reagendamento automático de sessões conflitantes
 * Mostra sugestões e permite admin aprovar reagendamento
 */
const ReschedulingModal = ({ isOpen, onClose, conflicts, therapistId }) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState({});
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const loadSuggestions = React.useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setSelectedSlots({});
    setResult(null);

    try {
      const response = await therapistAvailabilityApi.suggestRescheduling({
        conflicts: conflicts,
        therapist_id: therapistId,
        search_params: {
          days_ahead: 14,
          same_week_only: false
        }
      });

      setSuggestions(response.suggestions || []);

      // Pre-selecionar melhor opção para cada sessão
      const initialSelections = {};
      response.suggestions.forEach(suggestion => {
        if (suggestion.alternatives && suggestion.alternatives.length > 0) {
          initialSelections[suggestion.conflict.session_id] = suggestion.alternatives[0];
        }
      });
      setSelectedSlots(initialSelections);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
    } finally {
      setLoading(false);
    }
  }, [conflicts, therapistId]);

  useEffect(() => {
    if (isOpen && conflicts && conflicts.length > 0) {
      loadSuggestions();
    }
  }, [isOpen, conflicts, loadSuggestions]);

  const handleSlotSelect = (sessionId, slot) => {
    setSelectedSlots({
      ...selectedSlots,
      [sessionId]: slot
    });
  };

  const handleApplyRescheduling = async () => {
    if (Object.keys(selectedSlots).length === 0) {
      alert('Selecione pelo menos uma nova data/horário');
      return;
    }

    if (!window.confirm(`Confirma reagendamento de ${Object.keys(selectedSlots).length} sessão(ões)?`)) {
      return;
    }

    setApplying(true);

    try {
      // Montar plano de reagendamento
      const reschedulingPlan = Object.entries(selectedSlots).map(([sessionId, slot]) => {
        const conflict = suggestions.find(s => s.conflict.session_id === parseInt(sessionId))?.conflict;
        return {
          session_id: parseInt(sessionId),
          old_date: conflict.original_date,
          old_time: conflict.original_time,
          new_date: slot.available_date,
          new_time: slot.available_time
        };
      });

      const response = await therapistAvailabilityApi.applyRescheduling({
        rescheduling_plan: reschedulingPlan
      });

      setResult(response.results);

      if (response.results.success.length > 0) {
        setTimeout(() => {
          onClose(true); // true indica que houve mudanças
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao aplicar reagendamento:', error);
      alert('Erro ao aplicar reagendamento: ' + (error.response?.data?.message || error.message));
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header - Sticky on Mobile */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Reagendamento Automático
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FontAwesomeIcon icon={faSpinner} spin className="text-3xl sm:text-4xl text-indigo-600 mb-4" />
              <p className="text-gray-600 text-sm sm:text-base text-center px-4">Analisando disponibilidade e gerando sugestões...</p>
            </div>
          ) : result ? (
            // Resultado do reagendamento
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-800 text-sm sm:text-base">
                    Reagendamento Concluído
                  </h3>
                </div>
                <p className="text-green-700 text-sm sm:text-base">
                  {result.success.length} sessão(ões) reagendada(s) com sucesso!
                </p>
                {result.failed.length > 0 && (
                  <p className="text-red-600 mt-2 text-sm sm:text-base">
                    {result.failed.length} sessão(ões) falharam
                  </p>
                )}
              </div>

              {/* Detalhes */}
              <div className="space-y-2 sm:space-y-3">
                {result.success.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm text-gray-600 truncate">
                        {formatDate(item.old_date)} {item.old_time}
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-green-600 truncate">
                        {formatDate(item.new_date)} {item.new_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl sm:text-4xl text-yellow-500 mb-4" />
              <p className="text-gray-600 text-sm sm:text-base">Nenhuma sugestão de reagendamento disponível</p>
            </div>
          ) : (
            // Lista de sugestões
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-800">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  {suggestions.length} sessão(ões) em conflito. Selecione os novos horários e clique em "Aplicar Reagendamento".
                </p>
              </div>

              {suggestions.map((suggestion, index) => {
                const conflict = suggestion.conflict;
                const selected = selectedSlots[conflict.session_id];

                return (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Informação da sessão original */}
                    <div className="bg-gray-50 px-3 sm:px-4 py-3 border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{conflict.patient_name}</p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{conflict.discipline_name}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm text-gray-600">Horário original:</p>
                          <p className="font-medium text-red-600 text-sm sm:text-base">
                            {formatDate(conflict.original_date)} às {conflict.original_time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Alternativas */}
                    <div className="p-3 sm:p-4">
                      {suggestion.alternatives.length === 0 ? (
                        <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                          Nenhum horário alternativo encontrado
                        </p>
                      ) : (
                        <div className="space-y-2 sm:space-y-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                            Horários alternativos disponíveis:
                          </p>
                          {suggestion.alternatives.slice(0, 3).map((slot, slotIndex) => (
                            <label
                              key={slotIndex}
                              className={`
                                flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all touch-manipulation
                                ${selected?.available_date === slot.available_date && selected?.available_time === slot.available_time
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 hover:border-gray-300 active:border-indigo-400 bg-white'
                                }
                              `}
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <input
                                  type="radio"
                                  name={`slot-${conflict.session_id}`}
                                  checked={selected?.available_date === slot.available_date && selected?.available_time === slot.available_time}
                                  onChange={() => handleSlotSelect(conflict.session_id, slot)}
                                  className="mr-3 min-w-[20px] min-h-[20px] touch-manipulation"
                                />
                                <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-4 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-xs sm:text-sm" />
                                    <span className="font-medium text-xs sm:text-sm">{formatDate(slot.available_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs sm:text-sm" />
                                    <span className="font-medium text-xs sm:text-sm">{slot.available_time.slice(0, 5)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {Math.round(slot.score)}%
                                </span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Sticky on Mobile */}
        {!loading && !result && suggestions.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
            <button
              onClick={() => onClose(false)}
              className="bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-medium py-3 sm:py-2 px-4 rounded-md border border-gray-300 min-h-[44px] touch-manipulation transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplyRescheduling}
              disabled={applying || Object.keys(selectedSlots).length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium py-3 sm:py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
            >
              {applying ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Aplicando...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span className="hidden xs:inline">Aplicar Reagendamento ({Object.keys(selectedSlots).length})</span>
                  <span className="xs:hidden">Aplicar ({Object.keys(selectedSlots).length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReschedulingModal;
