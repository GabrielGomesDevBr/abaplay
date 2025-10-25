// frontend/src/components/scheduling/AppointmentActions.js

import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV,
  faEdit,
  faTrash,
  faFileAlt,
  faCalendarAlt,
  faSync,
  faExclamationTriangle,
  faTimes,  // ✅ Ícone para cancelar
  faCalendarTimes  // ✅ Ícone para gerenciar recorrências
} from '@fortawesome/free-solid-svg-icons';

/**
 * Menu contextual de ações para agendamentos
 * Diferencia ações entre agendamentos normais e recorrentes
 *
 * ✅ FASE 3: Menu contextual com ações específicas por tipo
 */
const AppointmentActions = ({
  appointment,
  onEdit,
  onEditSeries,
  onDelete,
  onDeleteSeries,
  onViewDetails,
  onJustify,
  onViewNextOccurrences,
  onCancel, // ✅ Handler para cancelamento
  onManageRecurrence, // ✅ Handler para gerenciar recorrências
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const isRecurring = !!appointment.recurring_template_id;
  const isMissed = appointment.status === 'missed';
  const isCompleted = appointment.status === 'completed';
  const isScheduled = appointment.status === 'scheduled';
  const isCancelled = appointment.status === 'cancelled';
  const isJustified = !!appointment.justified_at;
  // hasLinkedSession removido - não é mais necessário sem a opção "Registrar Sessão"

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action, callback) => {
    setIsOpen(false);
    if (callback) {
      callback(appointment);
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Botão de Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Ações"
      >
        <FontAwesomeIcon icon={faEllipsisV} className="h-4 w-4" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 py-2">
          {/* Ações Comuns */}
          <button
            onClick={() => handleAction('view', onViewDetails)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
          >
            <FontAwesomeIcon icon={faFileAlt} className="w-4 h-4 text-blue-500" />
            <span>Ver Detalhes</span>
          </button>

          {/* ✅ CANCELAR - Só para agendamentos "scheduled" */}
          {isScheduled && !isCancelled && (
            <button
              onClick={() => handleAction('cancel', onCancel)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center space-x-3"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-orange-500" />
              <span>Cancelar Agendamento</span>
            </button>
          )}

          {/* Editar - diferente para recorrentes */}
          {!isCompleted && !isMissed && !isCancelled && (
            <>
              {isRecurring ? (
                <>
                  <button
                    onClick={() => handleAction('edit', onEdit)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-4 h-4 text-yellow-500" />
                    <span>Editar Este Agendamento</span>
                  </button>
                  <button
                    onClick={() => handleAction('editSeries', onEditSeries)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                  >
                    <FontAwesomeIcon icon={faSync} className="w-4 h-4 text-purple-500" />
                    <span>Editar Toda a Série</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleAction('edit', onEdit)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                >
                  <FontAwesomeIcon icon={faEdit} className="w-4 h-4 text-yellow-500" />
                  <span>Editar</span>
                </button>
              )}
            </>
          )}

          {/* Ver próximas ocorrências - só para recorrentes */}
          {isRecurring && (
            <button
              onClick={() => handleAction('viewNext', onViewNextOccurrences)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-indigo-500" />
              <span>Ver Próximas Ocorrências</span>
            </button>
          )}

          {/* Gerenciar recorrências - só para recorrentes */}
          {isRecurring && (
            <button
              onClick={() => handleAction('manageRecurrence', onManageRecurrence)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center space-x-3"
            >
              <FontAwesomeIcon icon={faCalendarTimes} className="w-4 h-4 text-orange-600" />
              <span>Gerenciar Recorrências</span>
            </button>
          )}

          {/* Justificar - só para missed NÃO justificado */}
          {isMissed && !isJustified && (
            <button
              onClick={() => handleAction('justify', onJustify)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-orange-500" />
              <span>Justificar Ausência</span>
            </button>
          )}

          {/* Divisor */}
          <div className="my-2 border-t border-gray-200"></div>

          {/* Excluir - diferente para recorrentes, NÃO permitir excluir justificados NEM cancelados */}
          {!isCompleted && !isJustified && !isCancelled && (
            <>
              {isRecurring ? (
                <>
                  <button
                    onClick={() => handleAction('delete', onDelete)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                    <span>Excluir Este Agendamento</span>
                  </button>
                  <button
                    onClick={() => handleAction('deleteSeries', onDeleteSeries)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                  >
                    <FontAwesomeIcon icon={faSync} className="w-4 h-4" />
                    <span>Excluir Toda a Série</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleAction('delete', onDelete)}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  <span>Excluir</span>
                </button>
              )}
            </>
          )}

          {/* Mensagem se agendamento justificado */}
          {isJustified && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-blue-500 flex-shrink-0 mt-0.5 w-3 h-3" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Justificado. Não pode ser alterado (auditoria).
                </p>
              </div>
            </div>
          )}

          {/* ✅ Mensagem se agendamento cancelado */}
          {isCancelled && (
            <div className="px-4 py-3 bg-orange-50 border-t border-orange-100">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faTimes} className="text-orange-500 flex-shrink-0 mt-0.5 w-3 h-3" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Cancelado. Não pode ser alterado ou excluído (auditoria).
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentActions;
