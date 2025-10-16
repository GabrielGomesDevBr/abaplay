// frontend/src/components/scheduling/RetroactiveSessionModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarPlus, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

/**
 * Modal para criação de agendamentos retroativos no Plano Agendamento
 * Permite registrar sessões realizadas sem agendamento prévio (até 7 dias no passado)
 */
const RetroactiveSessionModal = ({ isOpen, onClose, onSubmit, patients, therapists, isLoading }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    therapist_id: '',
    scheduled_date: '',
    scheduled_time: '10:00',
    duration_minutes: 60,
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [dateWarning, setDateWarning] = useState('');

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setFormData({
        patient_id: '',
        therapist_id: '',
        scheduled_date: '',
        scheduled_time: '10:00',
        duration_minutes: 60,
        notes: ''
      });
      setErrors({});
      setDateWarning('');
    }
  }, [isOpen]);

  // Validar data (deve estar no passado e máximo 7 dias atrás)
  useEffect(() => {
    if (formData.scheduled_date) {
      const selectedDate = new Date(formData.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      if (selectedDate > today) {
        setDateWarning('⚠️ A data está no futuro. Use agendamento normal para datas futuras.');
        setErrors(prev => ({ ...prev, scheduled_date: 'Data não pode ser futura' }));
      } else if (selectedDate < sevenDaysAgo) {
        setDateWarning('❌ Data muito antiga. Apenas sessões dos últimos 7 dias podem ser registradas retroativamente.');
        setErrors(prev => ({ ...prev, scheduled_date: 'Máximo de 7 dias no passado' }));
      } else {
        setDateWarning('✅ Data válida para registro retroativo.');
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.scheduled_date;
          return newErrors;
        });
      }
    }
  }, [formData.scheduled_date]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpar erro do campo quando usuário digita
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.patient_id) {
      newErrors.patient_id = 'Paciente é obrigatório';
    }

    if (!formData.therapist_id) {
      newErrors.therapist_id = 'Terapeuta é obrigatório';
    }

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Data é obrigatória';
    }

    if (!formData.scheduled_time) {
      newErrors.scheduled_time = 'Horário é obrigatório';
    }

    if (!formData.notes || formData.notes.trim().length < 10) {
      newErrors.notes = 'Observações são obrigatórias (mínimo 10 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        is_retroactive: true,
        detection_source: 'manual_retroactive'
      });

      toast.success('Sessão retroativa registrada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao criar sessão retroativa:', error);
      toast.error(error.message || 'Erro ao registrar sessão retroativa');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
              Registrar Sessão Passada
            </h2>
            <p className="text-sm text-orange-100 mt-1">Últimos 7 dias apenas</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-100 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>

        {/* Aviso Importante */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-6 mt-4">
          <div className="flex items-start">
            <FontAwesomeIcon icon={faInfoCircle} className="text-yellow-600 mt-1 mr-3" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Uso Excepcional</p>
              <p>
                Este recurso deve ser usado apenas quando uma sessão foi realizada mas não foi agendada previamente.
                Para datas futuras, use o agendamento normal.
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Paciente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paciente <span className="text-red-500">*</span>
            </label>
            <select
              name="patient_id"
              value={formData.patient_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                errors.patient_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Selecione um paciente</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
            {errors.patient_id && (
              <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>
            )}
          </div>

          {/* Terapeuta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terapeuta <span className="text-red-500">*</span>
            </label>
            <select
              name="therapist_id"
              value={formData.therapist_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                errors.therapist_id ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">Selecione um terapeuta</option>
              {therapists.map(therapist => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.full_name}
                </option>
              ))}
            </select>
            {errors.therapist_id && (
              <p className="text-red-500 text-xs mt-1">{errors.therapist_id}</p>
            )}
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data da Sessão <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                  errors.scheduled_date ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.scheduled_date && (
                <p className="text-red-500 text-xs mt-1">{errors.scheduled_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="scheduled_time"
                value={formData.scheduled_time}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
                  errors.scheduled_time ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.scheduled_time && (
                <p className="text-red-500 text-xs mt-1">{errors.scheduled_time}</p>
              )}
            </div>
          </div>

          {/* Aviso de validação de data */}
          {dateWarning && (
            <div className={`p-3 rounded-lg text-sm ${
              dateWarning.startsWith('✅')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : dateWarning.startsWith('⚠️')
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {dateWarning}
            </div>
          )}

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duração (minutos)
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              disabled={isLoading}
            >
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
              <option value="120">120 minutos</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações da Sessão <span className="text-red-500">*</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Descreva o que foi trabalhado na sessão, progressos observados, dificuldades, etc. (mínimo 10 caracteres)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 resize-none ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.notes && (
                <p className="text-red-500 text-xs">{errors.notes}</p>
              )}
              <p className="text-gray-500 text-xs ml-auto">
                {formData.notes.length} caracteres
              </p>
            </div>
          </div>

          {/* Informação sobre auditoria */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
            <strong>Auditoria:</strong> Este agendamento será marcado como "retroativo" no sistema e incluirá informações sobre quem e quando o criou.
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isLoading || Object.keys(errors).length > 0}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Registrando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                  Registrar Sessão
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RetroactiveSessionModal;
