// frontend/src/components/admin/PatientPreferencesManager.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserFriends,
  faUser,
  faHeart,
  faMinus,
  faExclamationTriangle,
  faSave,
  faSpinner,
  faCheckCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import availabilityApi from '../../api/availabilityApi';
import { fetchAllAdminPatients, fetchTherapists } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente para gerenciar preferências de rapport entre pacientes e terapeutas
 * Permite marcar terapeutas como preferidos, neutros ou a evitar
 */
const PatientPreferencesManager = () => {
  const { token } = useAuth();

  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [preferences, setPreferences] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPatients();
    loadTherapists();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedPatient) {
      loadPreferences(selectedPatient);
    } else {
      setPreferences([]);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const data = await fetchAllAdminPatients(token);
      setPatients(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast.error('Erro ao carregar lista de pacientes');
    } finally {
      setLoadingPatients(false);
    }
  };

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

  const loadPreferences = async (patientId) => {
    try {
      setLoadingPreferences(true);
      const response = await availabilityApi.getPatientPreferences(patientId);
      setPreferences(response.preferences || []);
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
      setPreferences([]);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleSetPreference = async (therapistId, preferenceType, notes = '') => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente');
      return;
    }

    try {
      setSaving(true);

      await availabilityApi.setPatientPreference(selectedPatient, {
        therapist_id: therapistId,
        preference_type: preferenceType,
        notes: notes
      });

      // Recarregar preferências
      await loadPreferences(selectedPatient);

      const therapistName = therapists.find(t => t.id === therapistId)?.full_name || '';
      toast.success(
        `Preferência atualizada: ${therapistName} - ${availabilityApi.getPreferenceTypeLabel(preferenceType)}`
      );
    } catch (error) {
      console.error('Erro ao definir preferência:', error);
      toast.error(error.message || 'Erro ao definir preferência');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPreferenceWithNotes = (therapistId, preferenceType) => {
    const therapistName = therapists.find(t => t.id === therapistId)?.full_name || '';

    const notes = prompt(
      `Definir como "${availabilityApi.getPreferenceTypeLabel(preferenceType)}"\n\n` +
      `Terapeuta: ${therapistName}\n\n` +
      `Observações (opcional):`
    );

    // Se cancelou, não fazer nada
    if (notes === null) return;

    handleSetPreference(therapistId, preferenceType, notes);
  };

  const getPreferenceForTherapist = (therapistId) => {
    return preferences.find(p => p.therapist_id === therapistId);
  };

  const selectedPatientName = patients.find(p => p.id === parseInt(selectedPatient))?.name || '';

  // Agrupar terapeutas por preferência
  const therapistsByPreference = {
    preferred: therapists.filter(t => {
      const pref = getPreferenceForTherapist(t.id);
      return pref?.preference_type === 'preferred';
    }),
    neutral: therapists.filter(t => {
      const pref = getPreferenceForTherapist(t.id);
      return !pref || pref.preference_type === 'neutral';
    }),
    avoid: therapists.filter(t => {
      const pref = getPreferenceForTherapist(t.id);
      return pref?.preference_type === 'avoid';
    })
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faUserFriends} className="mr-3 text-blue-600" />
          Preferências de Rapport
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Gerencie as preferências de cada paciente em relação aos terapeutas
        </p>
      </div>

      {/* Seleção de Paciente */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FontAwesomeIcon icon={faUser} className="mr-2" />
          Selecione o Paciente
        </label>
        {loadingPatients ? (
          <div className="text-center py-4">
            <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600" />
          </div>
        ) : (
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um paciente</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Gerenciamento de Preferências */}
      {selectedPatient && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Preferências de {selectedPatientName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Clique nos botões para definir a preferência do paciente em relação a cada terapeuta
            </p>
          </div>

          {loadingPreferences || loadingTherapists ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Terapeutas Preferidos */}
              {therapistsByPreference.preferred.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-green-800 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faHeart} className="mr-2" />
                    Terapeutas Preferidos ({therapistsByPreference.preferred.length})
                  </h4>
                  <div className="space-y-2">
                    {therapistsByPreference.preferred.map(therapist => {
                      const pref = getPreferenceForTherapist(therapist.id);
                      return (
                        <div
                          key={therapist.id}
                          className="border-2 border-green-300 bg-green-50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{therapist.full_name}</p>
                              {pref?.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <strong>Obs:</strong> {pref.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleSetPreference(therapist.id, 'neutral')}
                                disabled={saving}
                                className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                                title="Marcar como Neutro"
                              >
                                <FontAwesomeIcon icon={faMinus} />
                              </button>
                              <button
                                onClick={() => handleSetPreferenceWithNotes(therapist.id, 'avoid')}
                                disabled={saving}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                                title="Marcar para Evitar"
                              >
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terapeutas Neutros */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <FontAwesomeIcon icon={faMinus} className="mr-2" />
                  Terapeutas Neutros ({therapistsByPreference.neutral.length})
                </h4>
                <div className="space-y-2">
                  {therapistsByPreference.neutral.map(therapist => (
                    <div
                      key={therapist.id}
                      className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-900">{therapist.full_name}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSetPreferenceWithNotes(therapist.id, 'preferred')}
                            disabled={saving}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                            title="Marcar como Preferido"
                          >
                            <FontAwesomeIcon icon={faHeart} className="mr-1" />
                            Preferido
                          </button>
                          <button
                            onClick={() => handleSetPreferenceWithNotes(therapist.id, 'avoid')}
                            disabled={saving}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                            title="Marcar para Evitar"
                          >
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                            Evitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terapeutas a Evitar */}
              {therapistsByPreference.avoid.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-red-800 mb-3 flex items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    Terapeutas a Evitar ({therapistsByPreference.avoid.length})
                  </h4>
                  <div className="space-y-2">
                    {therapistsByPreference.avoid.map(therapist => {
                      const pref = getPreferenceForTherapist(therapist.id);
                      return (
                        <div
                          key={therapist.id}
                          className="border-2 border-red-300 bg-red-50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{therapist.full_name}</p>
                              {pref?.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <strong>Motivo:</strong> {pref.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleSetPreference(therapist.id, 'neutral')}
                                disabled={saving}
                                className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                                title="Marcar como Neutro"
                              >
                                <FontAwesomeIcon icon={faMinus} />
                              </button>
                              <button
                                onClick={() => handleSetPreferenceWithNotes(therapist.id, 'preferred')}
                                disabled={saving}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                                title="Marcar como Preferido"
                              >
                                <FontAwesomeIcon icon={faHeart} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Resumo:</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {therapistsByPreference.preferred.length}
                </div>
                <div className="text-sm text-gray-600">Preferidos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {therapistsByPreference.neutral.length}
                </div>
                <div className="text-sm text-gray-600">Neutros</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {therapistsByPreference.avoid.length}
                </div>
                <div className="text-sm text-gray-600">A Evitar</div>
              </div>
            </div>
          </div>

          {/* Informação */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
              <strong>Como funciona:</strong> O sistema de agendamento inteligente prioriza terapeutas preferidos
              e evita automaticamente os marcados como "a evitar" nas sugestões de horários.
            </p>
          </div>
        </div>
      )}

      {!selectedPatient && (
        <div className="text-center py-12 text-gray-500">
          <FontAwesomeIcon icon={faUser} size="3x" className="mb-4 text-gray-300" />
          <p className="text-lg">Selecione um paciente para gerenciar preferências</p>
        </div>
      )}
    </div>
  );
};

export default PatientPreferencesManager;
