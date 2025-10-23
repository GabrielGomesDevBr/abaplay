// frontend/src/components/availability/WeeklyScheduleGrid.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faEdit,
  faSave,
  faTimes,
  faSpinner,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import therapistAvailabilityApi from '../../api/therapistAvailabilityApi';

/**
 * Componente de grade semanal para definir horários de trabalho
 * Exibe os 7 dias da semana com horários de trabalho configuráveis
 */
const WeeklyScheduleGrid = ({ therapistId, isAdmin = false }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [addingDay, setAddingDay] = useState(null);

  // Form state para adicionar/editar
  const [formData, setFormData] = useState({
    start_time: '08:00',
    end_time: '17:00',
    notes: ''
  });

  const daysOfWeek = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' }
  ];

  useEffect(() => {
    if (therapistId) {
      loadSchedules();
    }
  }, [therapistId]);

  const loadSchedules = async () => {
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
  };

  // Agrupa horários por dia da semana
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

      setFormData({ start_time: '08:00', end_time: '17:00', notes: '' });
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

      setFormData({ start_time: '08:00', end_time: '17:00', notes: '' });
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

  const startEditing = (schedule) => {
    setEditingId(schedule.id);
    setFormData({
      start_time: schedule.start_time.slice(0, 5),
      end_time: schedule.end_time.slice(0, 5),
      notes: schedule.notes || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setAddingDay(null);
    setFormData({ start_time: '08:00', end_time: '17:00', notes: '' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-indigo-600" />
        <p className="mt-4 text-gray-600">Carregando horários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md text-sm">
        <FontAwesomeIcon icon={faClock} className="mr-2" />
        Configure os horários de trabalho por dia da semana. Se nenhum horário for definido, o sistema
        assumirá disponibilidade das 06:00 às 21:00.
      </div>

      <div className="grid grid-cols-1 gap-4">
        {daysOfWeek.map((day) => {
          const daySchedules = getSchedulesForDay(day.value);
          const isAdding = addingDay === day.value;

          return (
            <div
              key={day.value}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">{day.label}</h3>
                {!isAdding && (
                  <button
                    onClick={() => setAddingDay(day.value)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Adicionar horário
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Lista de horários existentes */}
                {daySchedules.length > 0 ? (
                  daySchedules.map((schedule) => {
                    const isEditing = editingId === schedule.id;

                    return (
                      <div
                        key={schedule.id}
                        className="bg-gray-50 border border-gray-200 rounded-md p-3"
                      >
                        {isEditing ? (
                          // Modo de edição
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Início</label>
                                <input
                                  type="time"
                                  value={formData.start_time}
                                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Fim</label>
                                <input
                                  type="time"
                                  value={formData.end_time}
                                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Observações</label>
                              <input
                                type="text"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Ex: Horário de almoço 12h-13h"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdate(schedule.id)}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center justify-center"
                              >
                                <FontAwesomeIcon icon={faSave} className="mr-1" />
                                Salvar
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm flex items-center justify-center"
                              >
                                <FontAwesomeIcon icon={faTimes} className="mr-1" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Modo de visualização
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-800">
                                {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                              </p>
                              {schedule.notes && (
                                <p className="text-xs text-gray-500 mt-1">{schedule.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(schedule)}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="Editar"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button
                                onClick={() => handleDelete(schedule.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Remover"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : !isAdding ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Nenhum horário definido
                  </p>
                ) : null}

                {/* Formulário para adicionar novo horário */}
                {isAdding && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Início</label>
                        <input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Fim</label>
                        <input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Observações</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Ex: Horário de almoço 12h-13h"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdd(day.value)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm flex items-center justify-center"
                      >
                        <FontAwesomeIcon icon={faPlus} className="mr-1" />
                        Adicionar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-sm flex items-center justify-center"
                      >
                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyScheduleGrid;
