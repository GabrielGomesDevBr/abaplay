// frontend/src/components/scheduling/WeekCalendarView.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCalendarDay,
  faFilter,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import { translateStatus, getStatusBadgeClasses } from '../../utils/statusTranslator';

/**
 * Visualização de agenda em formato de calendário semanal
 * Estilo Google Agenda simplificado - apenas visualização
 */
const WeekCalendarView = ({
  appointments = [],
  therapists = [],
  onAppointmentClick,
  onCreateAppointment
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedTherapist, setSelectedTherapist] = useState('all');

  // Horários de funcionamento (6h-21h)
  const workingHours = Array.from({ length: 16 }, (_, i) => i + 6); // 6-21 (16 horas)

  // Dias da semana (Seg-Sáb)
  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  /**
   * Obter a segunda-feira de uma data
   */
  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar domingo
    return new Date(d.setDate(diff));
  }

  /**
   * Obter datas da semana atual (seg-sáb)
   */
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  /**
   * Navegar para semana anterior
   */
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  /**
   * Navegar para próxima semana
   */
  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  /**
   * Voltar para semana atual
   */
  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  /**
   * Filtrar agendamentos por terapeuta
   */
  const filteredAppointments = selectedTherapist === 'all'
    ? appointments
    : appointments.filter(apt => apt.therapist_id === parseInt(selectedTherapist));

  /**
   * Obter agendamentos de uma data e hora específicas
   */
  const getAppointmentsForSlot = (date, hour) => {
    const dateStr = date.toISOString().split('T')[0];

    const slotsForDate = filteredAppointments.filter(apt => {
      if (!apt.scheduled_date || !apt.scheduled_time) return false;

      // Comparar apenas a data (ignorar timezone)
      const aptDateStr = apt.scheduled_date.split('T')[0]; // Remove timezone se houver
      if (aptDateStr !== dateStr) return false;

      // Comparar hora
      const aptHour = parseInt(apt.scheduled_time.split(':')[0]);
      return aptHour === hour;
    });

    return slotsForDate;
  };

  /**
   * Formatar data para exibição
   */
  const formatDateHeader = (date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  /**
   * Verificar se é hoje
   */
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDates = getWeekDates();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Debug Info (temporário) */}
      {appointments.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Nenhum agendamento carregado. Verifique se há agendamentos cadastrados ou ajuste os filtros na aba "Lista".
          </p>
        </div>
      )}

      {appointments.length > 0 && filteredAppointments.length === 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ Nenhum agendamento do terapeuta selecionado. Tente "Todos os Terapeutas".
          </p>
        </div>
      )}

      {/* Cabeçalho com navegação e filtros */}
      <div className="flex justify-between items-center mb-6">
        {/* Navegação de semanas */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousWeek}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Semana anterior"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-gray-700" />
          </button>

          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
            title="Voltar para semana atual"
          >
            <FontAwesomeIcon icon={faCalendarDay} />
            <span className="font-medium">Hoje</span>
          </button>

          <button
            onClick={goToNextWeek}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Próxima semana"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-gray-700" />
          </button>

          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} - {weekDates[5].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </h3>
          </div>
        </div>

        {/* Filtro por terapeuta */}
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
          <select
            value={selectedTherapist}
            onChange={(e) => setSelectedTherapist(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos os Terapeutas</option>
            {therapists.map(therapist => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid do calendário */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 border-b-2 border-gray-300">
            {/* Coluna de horários */}
            <div className="p-2 font-semibold text-gray-600 text-center bg-gray-50">
              Horário
            </div>
            {/* Colunas dos dias */}
            {weekDates.map((date, index) => (
              <div
                key={index}
                className={`p-2 font-semibold text-center ${
                  isToday(date)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <div className="text-xs">{weekDays[index]}</div>
                <div className={`text-sm ${isToday(date) ? 'font-bold' : ''}`}>
                  {formatDateHeader(date)}
                </div>
              </div>
            ))}
          </div>

          {/* Linhas de horários */}
          {workingHours.map(hour => (
            <div key={hour} className="grid grid-cols-7 border-b border-gray-200">
              {/* Coluna de horário */}
              <div className="p-2 text-sm font-medium text-gray-600 text-center bg-gray-50 border-r border-gray-200">
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>

              {/* Células dos dias */}
              {weekDates.map((date, dayIndex) => {
                const slotAppointments = getAppointmentsForSlot(date, hour);
                const hasConflict = slotAppointments.length > 1;

                return (
                  <div
                    key={dayIndex}
                    className={`p-1 min-h-[80px] border-r border-gray-200 ${
                      isToday(date) ? 'bg-blue-50/30' : ''
                    } ${hasConflict ? 'bg-red-50' : ''}`}
                  >
                    {slotAppointments.length === 0 ? (
                      // Slot vazio
                      <div className="h-full flex items-center justify-center text-gray-300">
                        <span className="text-xs">—</span>
                      </div>
                    ) : (
                      // Agendamentos
                      <div className="space-y-1">
                        {slotAppointments.map((apt, idx) => (
                          <div
                            key={apt.id || idx}
                            onClick={() => onAppointmentClick && onAppointmentClick(apt)}
                            className={`
                              p-2 rounded text-xs cursor-pointer
                              transition-all hover:shadow-md hover:scale-105
                              ${getStatusBadgeClasses(apt.status)}
                              ${hasConflict ? 'border-2 border-red-500' : ''}
                            `}
                            title={`${apt.patient_name} - ${apt.therapist_name}\n${translateStatus(apt.status, apt.justified_at)}`}
                          >
                            <div className="font-semibold truncate">
                              [{apt.therapist_name?.split(' ')[0]}]
                            </div>
                            <div className="truncate text-xs mt-0.5">
                              {apt.patient_name}
                            </div>
                            {apt.discipline_name && (
                              <div className="text-xs opacity-75 truncate mt-0.5">
                                {apt.discipline_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
              <span className="text-gray-700">Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
              <span className="text-gray-700">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
              <span className="text-gray-700">Não Realizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
              <span className="text-gray-700">Cancelado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-50 border-2 border-red-500"></div>
              <span className="text-gray-700 font-semibold">Conflito</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <FontAwesomeIcon icon={faEye} className="mr-2" />
            <span className="font-medium">{filteredAppointments.length}</span> agendamentos visíveis
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekCalendarView;
