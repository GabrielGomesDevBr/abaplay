// frontend/src/components/availability/AbsenceManager.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faSpinner,
  faCalendarTimes,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import therapistAvailabilityApi from '../../api/therapistAvailabilityApi';
import ReschedulingModal from './ReschedulingModal';

/**
 * Componente para gerenciar ausências e bloqueios de agenda
 * Férias, atestados, bloqueios pontuais, etc.
 */
const AbsenceManager = ({ therapistId, isAdmin = false }) => {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [showReschedulingModal, setShowReschedulingModal] = useState(false);

  const [formData, setFormData] = useState({
    absence_type: 'personal',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const absenceTypes = {
    vacation: 'Férias',
    sick_leave: 'Atestado Médico',
    training: 'Curso/Treinamento',
    maternity_leave: 'Licença Maternidade',
    personal: 'Pessoal',
    other: 'Outro'
  };

  const statusBadges = {
    pending: {
      label: 'Pendente Aprovação',
      className: 'bg-yellow-100 text-yellow-800',
      icon: faClock
    },
    approved: {
      label: 'Aprovada',
      className: 'bg-green-100 text-green-800',
      icon: faCheckCircle
    },
    rejected: {
      label: 'Rejeitada',
      className: 'bg-red-100 text-red-800',
      icon: faTimesCircle
    }
  };

  useEffect(() => {
    if (therapistId) {
      loadAbsences();
    }
  }, [therapistId]);

  const loadAbsences = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await therapistAvailabilityApi.getAbsences(therapistId, {
        include_past: false
      });
      setAbsences(data);
    } catch (err) {
      console.error('Erro ao carregar ausências:', err);
      setError('Erro ao carregar ausências');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConflicts = async () => {
    if (!formData.start_date || !formData.end_date) {
      return;
    }

    try {
      const result = await therapistAvailabilityApi.checkConflicts({
        therapist_id: therapistId,
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null
      });

      setConflicts(result);
    } catch (err) {
      console.error('Erro ao verificar conflitos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await therapistAvailabilityApi.createAbsence({
        therapist_id: therapistId,
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null
      });

      // Verificar se houve conflitos
      if (response.has_conflicts && !isAdmin) {
        setError(`Existem ${response.conflicts.length} agendamento(s) neste período. Apenas administradores podem forçar o bloqueio.`);
        setConflicts(response);
        return;
      }

      // Se admin e há conflitos, abrir modal de reagendamento
      if (response.has_conflicts && isAdmin && response.conflicts.length > 0) {
        setConflicts(response);
        setShowReschedulingModal(true);
        return;
      }

      // Resetar formulário
      setFormData({
        absence_type: 'personal',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        reason: ''
      });
      setShowForm(false);
      setConflicts(null);
      await loadAbsences();

      // Mostrar mensagem de sucesso
      if (response.data.status === 'pending') {
        alert('Solicitação enviada para aprovação do administrador.');
      } else {
        alert('Bloqueio criado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao criar ausência:', err);
      setError(err.response?.data?.message || 'Erro ao criar ausência');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta ausência?')) {
      return;
    }

    try {
      await therapistAvailabilityApi.deleteAbsence(id);
      await loadAbsences();
    } catch (err) {
      console.error('Erro ao remover ausência:', err);
      setError(err.response?.data?.message || 'Erro ao remover ausência');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-indigo-600" />
        <p className="mt-4 text-gray-600">Carregando ausências...</p>
      </div>
    );
  }

  const handleReschedulingClose = (hasChanges) => {
    setShowReschedulingModal(false);
    if (hasChanges) {
      // Se houve reagendamento, resetar e recarregar
      setFormData({
        absence_type: 'personal',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        reason: ''
      });
      setShowForm(false);
      setConflicts(null);
      loadAbsences();
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-1 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {/* Modal de Reagendamento */}
      <ReschedulingModal
        isOpen={showReschedulingModal}
        onClose={handleReschedulingClose}
        conflicts={conflicts?.conflicts || []}
        therapistId={therapistId}
      />

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Ausências e Bloqueios</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Nova Ausência
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-4">Registrar Ausência/Bloqueio</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Ausência *
              </label>
              <select
                value={formData.absence_type}
                onChange={(e) => setFormData({ ...formData, absence_type: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {Object.entries(absenceTypes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inicial *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  onBlur={handleCheckConflicts}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Final *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  onBlur={handleCheckConflicts}
                  required
                  min={formData.start_date}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário Inicial (opcional)
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário Final (opcional)
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo/Observações
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: Viagem programada, exames médicos..."
              />
            </div>

            {/* Aviso sobre conflitos */}
            {conflicts?.has_conflicts && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    <strong>Atenção:</strong> Existem {conflicts.conflict_count} agendamento(s) neste período.
                    {!isAdmin && ' Apenas administradores podem forçar o bloqueio.'}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowReschedulingModal(true)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium"
                    >
                      Reagendar Automaticamente
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              {formData.start_date && formData.end_date ? (
                <>
                  Período: {calculateDays(formData.start_date, formData.end_date)} dia(s).
                  {calculateDays(formData.start_date, formData.end_date) > 5
                    ? ' Requer aprovação do administrador.'
                    : ' Aprovação automática (≤5 dias).'}
                </>
              ) : (
                'Preencha as datas para ver o período.'
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
              >
                Registrar Ausência
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setConflicts(null);
                  setError(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de ausências */}
      <div className="space-y-3">
        {absences.length > 0 ? (
          absences.map((absence) => {
            const status = statusBadges[absence.status];
            const days = calculateDays(absence.start_date, absence.end_date);

            return (
              <div
                key={absence.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {absenceTypes[absence.absence_type]}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.className}`}>
                        <FontAwesomeIcon icon={status.icon} className="mr-1" />
                        {status.label}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <FontAwesomeIcon icon={faCalendarTimes} className="mr-2 text-gray-400" />
                        {formatDate(absence.start_date)} a {formatDate(absence.end_date)} ({days} dia{days !== 1 ? 's' : ''})
                      </p>
                      {absence.start_time && absence.end_time && (
                        <p className="ml-6">
                          Horário: {absence.start_time.slice(0, 5)} - {absence.end_time.slice(0, 5)}
                        </p>
                      )}
                      {absence.reason && (
                        <p className="ml-6 text-gray-500 italic">"{absence.reason}"</p>
                      )}
                      {absence.approved_by_name && (
                        <p className="ml-6 text-xs text-gray-400">
                          Aprovado por: {absence.approved_by_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(absence.id)}
                    className="text-red-600 hover:text-red-800 ml-4"
                    title="Remover"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500 py-8">
            Nenhuma ausência registrada
          </p>
        )}
      </div>
    </div>
  );
};

export default AbsenceManager;
