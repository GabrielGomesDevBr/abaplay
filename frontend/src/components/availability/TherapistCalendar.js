// frontend/src/components/availability/TherapistCalendar.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCalendarAlt,
  faCircle,
  faSpinner,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import therapistAvailabilityApi from '../../api/therapistAvailabilityApi';

/**
 * Calendário visual mensal para gestão de disponibilidade
 * Mostra: horários de trabalho, ausências, agendamentos
 * Permite: criar bloqueios rápidos clicando nos dias
 */
const TherapistCalendar = ({ therapistId, onCreateAbsence, isAdmin = false }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState([]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  useEffect(() => {
    if (therapistId) {
      loadData();
    }
  }, [therapistId, currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar horários padrão
      const schedulesData = await therapistAvailabilityApi.getScheduleTemplate(therapistId);
      setSchedules(schedulesData);

      // Buscar ausências do mês
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const absencesData = await therapistAvailabilityApi.getAbsences(therapistId, {
        include_past: false
      });

      // Filtrar ausências do mês atual
      const monthAbsences = absencesData.filter(absence => {
        const startDate = new Date(absence.start_date);
        const endDate = new Date(absence.end_date);
        return (startDate <= lastDay && endDate >= firstDay);
      });

      setAbsences(monthAbsences);

      // TODO: Buscar agendamentos do mês (se disponível)
      setAppointments([]);
    } catch (error) {
      console.error('Erro ao carregar dados do calendário:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias vazios do mês anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isDateInAbsence = (day) => {
    if (!day) return false;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return absences.some(absence => {
      const startDate = absence.start_date;
      const endDate = absence.end_date;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const getAbsenceForDate = (day) => {
    if (!day) return null;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return absences.find(absence => {
      const startDate = absence.start_date;
      const endDate = absence.end_date;
      return dateStr >= startDate && dateStr <= endDate;
    });
  };

  const hasWorkSchedule = (day) => {
    if (!day) return false;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();

    return schedules.some(s => s.day_of_week === dayOfWeek && s.is_active);
  };

  const isToday = (day) => {
    if (!day) return false;

    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (day) => {
    if (!day) return false;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDayClick = (day) => {
    if (!day || isPast(day)) return;

    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    // Toggle seleção
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleCreateAbsence = () => {
    if (selectedDates.length === 0) return;

    // Ordenar datas
    const sortedDates = selectedDates.sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    // Chamar callback para abrir modal de criação
    if (onCreateAbsence) {
      onCreateAbsence({ start_date: startDate, end_date: endDate });
    }

    // Limpar seleção
    setSelectedDates([]);
  };

  const days = getDaysInMonth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header do Calendário */}
      <div className="bg-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 rounded transition-colors touch-manipulation"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-lg" />
          </button>

          <h3 className="text-base sm:text-lg font-semibold">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          <button
            onClick={nextMonth}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 rounded transition-colors touch-manipulation"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-lg" />
          </button>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-3 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 bg-indigo-700 rounded px-3 sm:px-4 py-2">
            <span className="text-xs sm:text-sm">
              {selectedDates.length} dia(s) selecionado(s)
            </span>
            <button
              onClick={handleCreateAbsence}
              className="bg-white text-indigo-600 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center gap-1 min-h-[40px] touch-manipulation transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Criar Bloqueio</span>
            </button>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2 sm:gap-4 text-xs">
        <div className="flex items-center gap-1">
          <FontAwesomeIcon icon={faCircle} className="text-green-500 text-xs" />
          <span className="hidden xs:inline">Horário definido</span>
          <span className="xs:hidden">Horário</span>
        </div>
        <div className="flex items-center gap-1">
          <FontAwesomeIcon icon={faCircle} className="text-red-500 text-xs" />
          <span>Ausência</span>
        </div>
        <div className="flex items-center gap-1">
          <FontAwesomeIcon icon={faCircle} className="text-blue-500 text-xs" />
          <span>Hoje</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-100 border-2 border-indigo-600 rounded"></div>
          <span className="hidden xs:inline">Selecionado</span>
          <span className="xs:hidden">Selex.</span>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="p-3 sm:p-6">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="text-center text-xs sm:text-sm font-semibold text-gray-600 py-1 sm:py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, index) => {
            const inAbsence = isDateInAbsence(day);
            const absence = getAbsenceForDate(day);
            const hasSchedule = hasWorkSchedule(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isPast(day);
            const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
            const dateStr = date ? date.toISOString().split('T')[0] : '';
            const isSelected = selectedDates.includes(dateStr);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center
                  rounded-lg transition-all touch-manipulation min-h-[44px]
                  ${!day ? 'invisible' : ''}
                  ${isPastDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 active:scale-95'}
                  ${isCurrentDay ? 'bg-blue-50 border-2 border-blue-500' : 'border border-gray-200'}
                  ${isSelected ? 'bg-indigo-100 border-2 border-indigo-600' : ''}
                  ${inAbsence ? 'bg-red-50' : ''}
                `}
              >
                {day && (
                  <>
                    <span className={`text-xs sm:text-sm font-medium ${isCurrentDay ? 'text-blue-700' : 'text-gray-700'}`}>
                      {day}
                    </span>

                    {/* Indicadores */}
                    <div className="absolute bottom-0.5 sm:bottom-1 flex gap-0.5 sm:gap-1">
                      {hasSchedule && !inAbsence && (
                        <FontAwesomeIcon icon={faCircle} className="text-green-500 text-[6px] sm:text-xs" />
                      )}
                      {inAbsence && (
                        <FontAwesomeIcon icon={faCircle} className="text-red-500 text-[6px] sm:text-xs" />
                      )}
                    </div>

                    {/* Tooltip de ausência - Hidden on mobile */}
                    {inAbsence && absence && (
                      <div className="hidden sm:block absolute top-full left-1/2 transform -translate-x-1/2 mt-1 z-10 opacity-0 group-hover:opacity-100 pointer-events-none">
                        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {absence.absence_type}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rodapé com instruções */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
        <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
        <span className="hidden xs:inline">Clique nos dias para selecionar um período e criar um bloqueio rápido</span>
        <span className="xs:hidden">Toque nos dias para criar bloqueio</span>
      </div>
    </div>
  );
};

export default TherapistCalendar;
