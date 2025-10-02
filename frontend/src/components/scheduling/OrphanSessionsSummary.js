// frontend/src/components/scheduling/OrphanSessionsSummary.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faUser,
  faStethoscope,
  faCalendarAlt,
  faCalendarPlus,
  faChevronDown,
  faChevronUp,
  faListAlt,
  faCheckSquare,
  faSquare
} from '@fortawesome/free-solid-svg-icons';

/**
 * Componente de resumo expandível para sessões órfãs
 * Mostra sessões realizadas sem agendamento prévio que precisam de agendamento retroativo
 */
const OrphanSessionsSummary = ({
  orphanSessions = [],
  onCreateRetroactive,
  onCreateBatch,
  maxDisplay = 5
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getSessionKey = (session) => {
    return `${session.patient_id}-${session.therapist_id}-${session.session_date}`;
  };

  const handleSelectSession = (session) => {
    const sessionKey = getSessionKey(session);
    setSelectedSessions(prev => {
      const exists = prev.some(s => getSessionKey(s) === sessionKey);
      if (exists) {
        return prev.filter(s => getSessionKey(s) !== sessionKey);
      } else {
        return [...prev, session];
      }
    });
  };

  const handleSelectAll = () => {
    const displayedSessions = expanded ? orphanSessions : orphanSessions.slice(0, maxDisplay);
    if (selectedSessions.length === displayedSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions([...displayedSessions]);
    }
  };

  const handleCreateBatch = () => {
    if (selectedSessions.length === 0) {
      alert('Selecione pelo menos uma sessão órfã');
      return;
    }
    if (onCreateBatch) {
      onCreateBatch(selectedSessions);
    }
  };

  if (orphanSessions.length === 0) {
    return null;
  }

  const displayedSessions = expanded ? orphanSessions : orphanSessions.slice(0, maxDisplay);
  const hasMore = orphanSessions.length > maxDisplay;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-3 rounded-full shadow-sm flex-shrink-0">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-white h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-orange-900 font-bold text-lg">
                {orphanSessions.length} Sessão(ões) Órfã(s)
              </p>
              <p className="text-orange-700 text-sm mt-1">
                Sessões realizadas sem agendamento prévio
              </p>
              {selectedSessions.length > 0 && (
                <p className="text-orange-600 text-xs mt-1 font-medium">
                  {selectedSessions.length} selecionada(s)
                </p>
              )}
            </div>
          </div>
          <button className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center space-x-2">
            <span className="font-medium">
              {expanded ? 'Fechar' : hasMore ? `Ver ${maxDisplay} Primeiras` : 'Ver Detalhes'}
            </span>
            <FontAwesomeIcon
              icon={expanded ? faChevronUp : faChevronDown}
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>

      {/* Lista Expandida */}
      {expanded && (
        <div className="border-t-2 border-orange-200 p-4 space-y-4 bg-white">
          {/* Barra de Ações */}
          <div className="flex items-center justify-between pb-3 border-b border-orange-200">
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-orange-700 hover:text-orange-800 flex items-center"
            >
              <FontAwesomeIcon
                icon={selectedSessions.length === displayedSessions.length ? faCheckSquare : faSquare}
                className="mr-2"
              />
              {selectedSessions.length === displayedSessions.length ? 'Desmarcar todas' : 'Selecionar todas visíveis'}
            </button>

            {selectedSessions.length > 0 && (
              <button
                onClick={handleCreateBatch}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                Criar {selectedSessions.length} Retroativo(s)
              </button>
            )}
          </div>

          {/* Lista de Sessões */}
          <div className="space-y-3">
            {displayedSessions.map(session => {
              const sessionKey = getSessionKey(session);
              const isSelected = selectedSessions.some(s => getSessionKey(s) === sessionKey);

              return (
                <div
                  key={sessionKey}
                  className={`bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-orange-400 shadow-md'
                      : 'border-orange-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectSession(session)}
                      className="mt-1 mr-3 h-5 w-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />

                    {/* Informações */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Paciente</p>
                        <p className="font-medium text-gray-900 flex items-center">
                          <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2 w-4" />
                          {session.patient_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Terapeuta</p>
                        <p className="font-medium text-gray-900 flex items-center">
                          <FontAwesomeIcon icon={faStethoscope} className="text-gray-400 mr-2 w-4" />
                          {session.therapist_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Data da Sessão</p>
                        <p className="font-medium text-gray-900 flex items-center">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 w-4" />
                          {formatDate(session.session_date)}
                        </p>
                      </div>
                    </div>

                    {/* Botão Individual */}
                    <button
                      onClick={() => onCreateRetroactive && onCreateRetroactive(session)}
                      className="ml-4 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap flex items-center"
                      title="Criar agendamento retroativo para esta sessão"
                    >
                      <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                      Criar Retroativo
                    </button>
                  </div>

                  {/* Programas Trabalhados */}
                  {session.program_names && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-xs text-gray-600 mb-1 flex items-center">
                        <FontAwesomeIcon icon={faListAlt} className="mr-2" />
                        Programas trabalhados ({session.programs_count || 0}):
                      </p>
                      <p className="text-sm text-gray-700">
                        {session.program_names.length > 150
                          ? session.program_names.substring(0, 150) + '...'
                          : session.program_names
                        }
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rodapé Informativo */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-blue-600" />
              <strong>Sessões órfãs</strong>&nbsp;são sessões que foram realizadas mas não tinham agendamento prévio.
              Criar agendamentos retroativos ajuda a manter o histórico completo.
            </p>
          </div>

          {/* Link para Análise Completa */}
          {hasMore && !expanded && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setExpanded(true)}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Ver todas as {orphanSessions.length} sessões órfãs →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrphanSessionsSummary;
