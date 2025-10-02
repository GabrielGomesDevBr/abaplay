// frontend/src/components/scheduling/EditRecurringSeriesModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faEdit,
  faSync,
  faExclamationTriangle,
  faCalendarAlt,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

/**
 * Modal para escolher escopo de edição em agendamentos recorrentes
 * Permite ao usuário escolher entre editar apenas o agendamento atual
 * ou toda a série de agendamentos futuros
 *
 * ✅ FASE 3: Modal de seleção de escopo de edição
 */
const EditRecurringSeriesModal = ({
  isOpen,
  onClose,
  onEditSingle,
  onEditSeries,
  onDeleteSingle,  // ✅ Adicionado
  onDeleteSeries,  // ✅ Adicionado
  appointment,
  actionType = 'edit' // 'edit' | 'delete'
}) => {
  const [selectedOption, setSelectedOption] = useState('single');

  if (!isOpen || !appointment) return null;

  const handleConfirm = () => {
    if (selectedOption === 'single') {
      if (actionType === 'edit') {
        onEditSingle(appointment);
      } else {
        onDeleteSingle(appointment);
      }
    } else {
      if (actionType === 'edit') {
        onEditSeries(appointment);
      } else {
        onDeleteSeries(appointment);
      }
    }
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const getRecurrenceLabel = () => {
    const map = {
      'weekly': 'Semanal',
      'biweekly': 'Quinzenal',
      'monthly': 'Mensal'
    };
    return map[appointment.recurrence_type] || 'Recorrente';
  };

  const actionLabels = {
    edit: {
      title: 'Editar Agendamento Recorrente',
      single: 'Editar apenas este agendamento',
      singleDesc: 'Altera somente este agendamento específico, sem afetar os demais da série',
      series: 'Editar toda a série',
      seriesDesc: 'Altera este e todos os agendamentos futuros da série recorrente',
      icon: faEdit,
      color: 'blue'
    },
    delete: {
      title: 'Excluir Agendamento Recorrente',
      single: 'Excluir apenas este agendamento',
      singleDesc: 'Remove somente este agendamento específico, mantendo os demais da série',
      series: 'Excluir toda a série',
      seriesDesc: 'Remove este e todos os agendamentos futuros da série recorrente',
      icon: faTrash,
      color: 'red'
    }
  };

  const labels = actionLabels[actionType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${labels.color}-500 to-${labels.color}-600 px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-full">
              <FontAwesomeIcon icon={labels.icon} className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-white">{labels.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Informações do Agendamento */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FontAwesomeIcon icon={faSync} className="text-purple-600" />
              <h3 className="font-bold text-purple-900">Agendamento Recorrente - {getRecurrenceLabel()}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Paciente</p>
                <p className="font-medium text-gray-900">{appointment.patient_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Terapeuta</p>
                <p className="font-medium text-gray-900">{appointment.therapist_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Data</p>
                <p className="font-medium text-gray-900">{formatDate(appointment.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-gray-600">Horário</p>
                <p className="font-medium text-gray-900">{formatTime(appointment.scheduled_time)}</p>
              </div>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Atenção</h4>
              <p className="text-sm text-yellow-800">
                Este agendamento faz parte de uma série recorrente. Escolha como deseja proceder:
              </p>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            {/* Opção 1: Editar/Excluir Apenas Este */}
            <label
              className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === 'single'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="editOption"
                  value="single"
                  checked={selectedOption === 'single'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600" />
                    <h4 className="font-bold text-gray-900">{labels.single}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {labels.singleDesc}
                  </p>
                </div>
              </div>
            </label>

            {/* Opção 2: Editar/Excluir Toda a Série */}
            <label
              className={`block border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === 'series'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="editOption"
                  value="series"
                  checked={selectedOption === 'series'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <FontAwesomeIcon icon={faSync} className="text-purple-600" />
                    <h4 className="font-bold text-gray-900">{labels.series}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {labels.seriesDesc}
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end space-x-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 bg-gradient-to-r from-${labels.color}-500 to-${labels.color}-600 text-white rounded-lg hover:from-${labels.color}-600 hover:to-${labels.color}-700 transition-all font-semibold shadow-sm hover:shadow-md`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRecurringSeriesModal;
