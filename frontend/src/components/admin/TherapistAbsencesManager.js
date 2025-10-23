// frontend/src/components/admin/TherapistAbsencesManager.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCalendarTimes,
  faPlus,
  faTrash,
  faSave,
  faTimes,
  faSpinner,
  faCalendarAlt,
  faClock,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import availabilityApi from '../../api/availabilityApi';
import { fetchTherapists } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente para gerenciar ausências e férias dos terapeutas
 * Permite registrar períodos em que terapeutas não estarão disponíveis
 */
const TherapistAbsencesManager = () => {
  const { token } = useAuth();

  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [absences, setAbsences] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPastAbsences, setShowPastAbsences] = useState(false);

  const [formData, setFormData] = useState({
    absence_type: 'vacation',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  useEffect(() => {
    loadTherapists();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedTherapist) {
      loadAbsences(selectedTherapist);
    } else {
      setAbsences([]);
    }
  }, [selectedTherapist, showPastAbsences]);

  const loadTherapists = async () => {
    try {
      setLoadingTherapists(true);
      const data = await fetchTherapists(token);
      setTherapists(data);
    } catch (error) {
      console.error('Erro ao carregar terapeutas:', error);
      toast.error('Erro ao carregar lista de terapeutas');
    } finally {
      setLoadingTherapists(false);
    }
  };

  const loadAbsences = async (therapistId) => {
    try {
      setLoadingAbsences(true);
      const response = await availabilityApi.getAbsences(therapistId, !showPastAbsences);
      setAbsences(response.absences || []);
    } catch (error) {
      console.error('Erro ao carregar ausências:', error);
      setAbsences([]);
    } finally {
      setLoadingAbsences(false);
    }
  };

  const resetForm = () => {
    setFormData({
      absence_type: 'vacation',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      reason: ''
    });
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTherapist) {
      toast.error('Selecione um terapeuta');
      return;
    }

    // Validação
    const errors = availabilityApi.validateAbsenceData(formData);
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    try {
      setSaving(true);

      await availabilityApi.createAbsence(selectedTherapist, formData);
      toast.success('Ausência registrada com sucesso!');

      resetForm();
      loadAbsences(selectedTherapist);
    } catch (error) {
      console.error('Erro ao criar ausência:', error);
      toast.error(error.message || 'Erro ao registrar ausência');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (absenceId) => {
    const confirmDelete = window.confirm(
      'Tem certeza que deseja cancelar esta ausência?'
    );

    if (!confirmDelete) return;

    try {
      await availabilityApi.deleteAbsence(absenceId);
      toast.success('Ausência cancelada com sucesso!');
      loadAbsences(selectedTherapist);
    } catch (error) {
      console.error('Erro ao cancelar ausência:', error);
      toast.error(error.message || 'Erro ao cancelar ausência');
    }
  };

  const isPartialDayAbsence = (absence) => {
    return absence.start_time && absence.end_time;
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const isAbsencePast = (absence) => {
    const endDate = new Date(absence.end_date + 'T23:59:59');
    return endDate < new Date();
  };

  const selectedTherapistName = therapists.find(t => t.id === parseInt(selectedTherapist))?.full_name || '';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faCalendarTimes} className="mr-3 text-blue-600" />
          Ausências e Férias
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Gerencie períodos de ausência dos terapeutas (férias, atestados, treinamentos)
        </p>
      </div>

      {/* Seleção de Terapeuta */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FontAwesomeIcon icon={faUser} className="mr-2" />
          Selecione o Terapeuta
        </label>
        {loadingTherapists ? (
          <div className="text-center py-4">
            <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600" />
          </div>
        ) : (
          <div className="flex gap-4">
            <select
              value={selectedTherapist}
              onChange={(e) => {
                setSelectedTherapist(e.target.value);
                setShowForm(false);
              }}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um terapeuta</option>
              {therapists.map(therapist => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.full_name}
                </option>
              ))}
            </select>

            {selectedTherapist && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Nova Ausência
              </button>
            )}
          </div>
        )}
      </div>

      {/* Formulário */}
      {selectedTherapist && showForm && (
        <div className="mb-6 bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Registrar Ausência - {selectedTherapistName}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Ausência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Ausência *
                </label>
                <select
                  value={formData.absence_type}
                  onChange={(e) => setFormData({ ...formData, absence_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="vacation">Férias</option>
                  <option value="sick_leave">Atestado Médico</option>
                  <option value="training">Treinamento</option>
                  <option value="personal">Pessoal</option>
                  <option value="other">Outros</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Data Inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Data Inicial *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Data Final */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                  Data Final *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Horários (Opcional) */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Ausência Parcial (opcional)
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Preencha os horários apenas se a ausência for em parte do dia
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Horário Inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    Horário Inicial
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Horário Final */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    Horário Final
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo / Observações
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o motivo da ausência..."
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    Registrar Ausência
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Ausências */}
      {selectedTherapist && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Ausências de {selectedTherapistName}
            </h3>
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPastAbsences}
                onChange={(e) => setShowPastAbsences(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
              />
              Mostrar passadas
            </label>
          </div>

          {loadingAbsences ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-2xl" />
            </div>
          ) : absences.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <FontAwesomeIcon icon={faCalendarTimes} size="2x" className="mb-3 text-gray-300" />
              <p className="text-lg">Nenhuma ausência registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {absences.map(absence => {
                const isPast = isAbsencePast(absence);
                const isPartial = isPartialDayAbsence(absence);

                return (
                  <div
                    key={absence.id}
                    className={`border rounded-lg p-4 ${
                      isPast
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-blue-300 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                            isPast
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-blue-600 text-white'
                          }`}>
                            {availabilityApi.getAbsenceTypeLabel(absence.absence_type)}
                          </span>
                          {isPartial && (
                            <span className="inline-block px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs">
                              Parcial
                            </span>
                          )}
                          {isPast && (
                            <span className="inline-block px-2 py-1 rounded bg-gray-200 text-gray-600 text-xs">
                              Passada
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-700">
                          <div className="flex items-center">
                            <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-400 w-4" />
                            <span>
                              {formatDate(absence.start_date)} até {formatDate(absence.end_date)}
                            </span>
                          </div>

                          {isPartial && (
                            <div className="flex items-center">
                              <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400 w-4" />
                              <span>
                                {absence.start_time.slice(0, 5)} às {absence.end_time.slice(0, 5)}
                              </span>
                            </div>
                          )}

                          {absence.reason && (
                            <div className="mt-2 p-2 bg-white rounded text-xs">
                              <strong>Motivo:</strong>
                              <p className="mt-1 text-gray-600">{absence.reason}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isPast && (
                        <button
                          onClick={() => handleDelete(absence.id)}
                          className="ml-4 text-red-600 hover:text-red-800 p-2"
                          title="Cancelar ausência"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedTherapist && (
        <div className="text-center py-12 text-gray-500">
          <FontAwesomeIcon icon={faUser} size="3x" className="mb-4 text-gray-300" />
          <p className="text-lg">Selecione um terapeuta para gerenciar ausências</p>
        </div>
      )}
    </div>
  );
};

export default TherapistAbsencesManager;
