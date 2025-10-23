// frontend/src/components/availability/WeeklyScheduleGrid.js
// VERSÃO MOBILE-OPTIMIZED

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faEdit,
  faSave,
  faTimes,
  faSpinner,
  faClock,
  faChevronDown,
  faChevronRight,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import therapistAvailabilityApi from '../../api/therapistAvailabilityApi';

/**
 * Componente de grade semanal MOBILE-FIRST
 * Accordion em mobile, grid em desktop
 */
const WeeklyScheduleGrid = ({ therapistId, isAdmin = false, canEdit = true }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null); // Para accordion mobile
  const [addingDay, setAddingDay] = useState(null);

  const [formData, setFormData] = useState({
    start_time: '08:00',
    end_time: '17:00'
  });

  const daysOfWeek = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda', short: 'Seg' },
    { value: 2, label: 'Terça', short: 'Ter' },
    { value: 3, label: 'Quarta', short: 'Qua' },
    { value: 4, label: 'Quinta', short: 'Qui' },
    { value: 5, label: 'Sexta', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' }
  ];

  const loadSchedules = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await therapistAvailabilityApi.getScheduleTemplate(therapistId);
      setSchedules(data);
    } catch (err) {
      console.error('Erro ao carregar horários:', err);
      setError('Erro ao carregar horários');
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => {
    if (therapistId) {
      loadSchedules();
    }
  }, [therapistId, loadSchedules]);

  const getSchedulesForDay = (dayOfWeek) => {
    return schedules.filter(s => s.day_of_week === dayOfWeek && s.is_active);
  };

  const handleAdd = async (dayOfWeek) => {
    try {
      setError(null);
      await therapistAvailabilityApi.addScheduleTemplate({
        therapist_id: therapistId,
        day_of_week: dayOfWeek,
        ...formData
      });

      setFormData({ start_time: '08:00', end_time: '17:00' });
      setAddingDay(null);
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao adicionar horário:', err);
      setError(err.response?.data?.message || 'Erro ao adicionar horário');
    }
  };

  const handleUpdate = async (id) => {
    try {
      setError(null);
      await therapistAvailabilityApi.updateScheduleTemplate(id, formData);

      setFormData({ start_time: '08:00', end_time: '17:00' });
      setEditingId(null);
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao atualizar horário:', err);
      setError(err.response?.data?.message || 'Erro ao atualizar horário');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este horário?')) {
      return;
    }

    try {
      setError(null);
      await therapistAvailabilityApi.deleteScheduleTemplate(id);
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao remover horário:', err);
      setError(err.response?.data?.message || 'Erro ao remover horário');
    }
  };

  const toggleDay = (dayValue) => {
    setExpandedDay(expandedDay === dayValue ? null : dayValue);
    setAddingDay(null);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-indigo-600" />
        <p className="mt-4 text-sm sm:text-base text-gray-600">Carregando horários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {!canEdit && !isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 sm:px-4 sm:py-3 rounded-md text-sm">
          <FontAwesomeIcon icon={faLock} className="mr-2" />
          Sua agenda está bloqueada para edição. Entre em contato com o administrador para fazer alterações.
        </div>
      )}

      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        <FontAwesomeIcon icon={faClock} className="mr-1.5 sm:mr-2" />
        {canEdit || isAdmin ? 'Configure os horários de trabalho para cada dia da semana' : 'Visualize os horários de trabalho configurados'}
      </p>

      {/* Accordion Mobile / Cards Desktop */}
      <div className="space-y-2">
        {daysOfWeek.map((day) => {
          const daySchedules = getSchedulesForDay(day.value);
          const isExpanded = expandedDay === day.value;

          return (
            <div
              key={day.value}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              {/* Header - Sempre visível */}
              <button
                onClick={() => toggleDay(day.value)}
                className="w-full p-3 sm:p-4 flex justify-between items-center touch-manipulation active:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronDown : faChevronRight}
                    className="text-gray-400 text-sm"
                  />
                  <div className="text-left">
                    <span className="font-medium text-sm sm:text-base text-gray-800">
                      {day.label}
                    </span>
                    <span className="hidden xs:inline text-xs sm:text-sm text-gray-500 ml-2">
                      ({daySchedules.length} horário{daySchedules.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 xs:hidden">
                    {daySchedules.length}
                  </span>
                  {daySchedules.length === 0 ? (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      Sem horários
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      Ativo
                    </span>
                  )}
                </div>
              </button>

              {/* Conteúdo - Expansível */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-3 sm:p-4 space-y-3 bg-gray-50">
                  {/* Lista de horários existentes */}
                  {daySchedules.map((schedule) => {
                    const isEditing = editingId === schedule.id;

                    if (isEditing) {
                      return (
                        <div key={schedule.id} className="bg-white p-3 rounded-md border-2 border-indigo-500">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1.5">
                                  Início
                                </label>
                                <input
                                  type="time"
                                  value={formData.start_time}
                                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                  className="w-full px-3 py-2.5 text-base border rounded-md touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1.5">
                                  Fim
                                </label>
                                <input
                                  type="time"
                                  value={formData.end_time}
                                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                  className="w-full px-3 py-2.5 text-base border rounded-md touch-manipulation"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col xs:flex-row gap-2">
                              <button
                                onClick={() => handleUpdate(schedule.id)}
                                className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-md text-sm font-medium touch-manipulation active:scale-[0.98] transition-transform"
                              >
                                <FontAwesomeIcon icon={faSave} className="mr-2" />
                                Salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setFormData({ start_time: '08:00', end_time: '17:00' });
                                }}
                                className="flex-1 py-2.5 px-4 bg-gray-300 text-gray-800 rounded-md text-sm font-medium touch-manipulation active:scale-[0.98] transition-transform"
                              >
                                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={schedule.id}
                        className="bg-white p-3 rounded-md flex items-center justify-between border border-gray-200"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <FontAwesomeIcon icon={faClock} className="text-indigo-600 text-sm sm:text-base flex-shrink-0" />
                          <span className="font-medium text-sm sm:text-base text-gray-800 truncate">
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </span>
                        </div>

                        {(canEdit || isAdmin) && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingId(schedule.id);
                                setFormData({
                                  start_time: schedule.start_time.slice(0, 5),
                                  end_time: schedule.end_time.slice(0, 5)
                                });
                                setAddingDay(null);
                              }}
                              className="p-2 min-w-[40px] min-h-[40px] text-indigo-600 hover:bg-indigo-50 rounded-md touch-manipulation active:scale-95 transition-transform"
                              title="Editar"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => handleDelete(schedule.id)}
                              className="p-2 min-w-[40px] min-h-[40px] text-red-600 hover:bg-red-50 rounded-md touch-manipulation active:scale-95 transition-transform"
                              title="Remover"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Formulário de adicionar */}
                  {(canEdit || isAdmin) && (
                    <>
                      {addingDay === day.value ? (
                        <div className="bg-white p-3 rounded-md border-2 border-green-500">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1.5">
                                  Início
                                </label>
                                <input
                                  type="time"
                                  value={formData.start_time}
                                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                  className="w-full px-3 py-2.5 text-base border rounded-md touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="block text-xs sm:text-sm font-medium mb-1.5">
                                  Fim
                                </label>
                                <input
                                  type="time"
                                  value={formData.end_time}
                                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                  className="w-full px-3 py-2.5 text-base border rounded-md touch-manipulation"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col xs:flex-row gap-2">
                              <button
                                onClick={() => handleAdd(day.value)}
                                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-md text-sm font-medium touch-manipulation active:scale-[0.98] transition-transform"
                              >
                                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                Adicionar
                              </button>
                              <button
                                onClick={() => {
                                  setAddingDay(null);
                                  setFormData({ start_time: '08:00', end_time: '17:00' });
                                }}
                                className="flex-1 py-2.5 px-4 bg-gray-300 text-gray-800 rounded-md text-sm font-medium touch-manipulation active:scale-[0.98] transition-transform"
                              >
                                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingDay(day.value);
                            setEditingId(null);
                            setFormData({ start_time: '08:00', end_time: '17:00' });
                          }}
                          className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 text-gray-600 hover:border-indigo-500 hover:text-indigo-600 rounded-md text-sm font-medium flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] transition-all"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                          Adicionar Horário
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyScheduleGrid;
