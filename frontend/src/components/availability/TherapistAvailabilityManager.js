// frontend/src/components/availability/TherapistAvailabilityManager.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faCalendarTimes
} from '@fortawesome/free-solid-svg-icons';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';
import AbsenceManager from './AbsenceManager';

/**
 * Componente principal para gestão de disponibilidade
 * Integra horários padrão e ausências/bloqueios
 * Usado tanto por terapeutas (própria agenda) quanto admin (qualquer terapeuta)
 */
const TherapistAvailabilityManager = ({ therapistId, therapistName, isAdmin = false }) => {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' ou 'absences'

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          Gestão de Disponibilidade
          {therapistName && (
            <span className="block sm:inline text-sm sm:text-base font-normal text-gray-600 sm:ml-2 mt-1 sm:mt-0">
              - {therapistName}
            </span>
          )}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Configure horários de trabalho e registre ausências para controlar sua agenda.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] touch-manipulation ${
              activeTab === 'schedule'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faClock} />
            <span className="hidden xs:inline">Horários de Trabalho</span>
            <span className="xs:hidden">Horários</span>
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] touch-manipulation ${
              activeTab === 'absences'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarTimes} />
            <span className="hidden xs:inline">Ausências e Bloqueios</span>
            <span className="xs:hidden">Ausências</span>
          </button>
        </div>

        <div className="p-3 sm:p-6">
          {activeTab === 'schedule' ? (
            <WeeklyScheduleGrid therapistId={therapistId} isAdmin={isAdmin} />
          ) : (
            <AbsenceManager therapistId={therapistId} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TherapistAvailabilityManager;
