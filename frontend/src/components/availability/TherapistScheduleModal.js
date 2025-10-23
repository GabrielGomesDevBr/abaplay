// frontend/src/components/availability/TherapistScheduleModal.js

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';

/**
 * Modal para admin visualizar/editar horários de um terapeuta
 */
const TherapistScheduleModal = ({ therapist, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] lg:max-w-[85vw] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600 text-xl" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Horários de {therapist.full_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure os horários de trabalho semanais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Componente de grade semanal - admin sempre pode editar */}
          <WeeklyScheduleGrid
            therapistId={therapist.id}
            isAdmin={true}
            canEdit={true}
          />
        </div>

        {/* Footer com botão fechar */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TherapistScheduleModal;
