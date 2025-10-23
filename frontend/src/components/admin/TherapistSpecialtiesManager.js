// frontend/src/components/admin/TherapistSpecialtiesManager.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faStethoscope,
  faSave,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import availabilityApi from '../../api/availabilityApi';
import { getDisciplineHierarchy } from '../../api/programApi';
import { fetchTherapists } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente para gerenciar especialidades dos terapeutas
 * Permite definir quais disciplinas cada terapeuta está apto a atender
 */
const TherapistSpecialtiesManager = () => {
  const { token } = useAuth();

  const [therapists, setTherapists] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [therapistSpecialties, setTherapistSpecialties] = useState([]);
  const [loadingTherapists, setLoadingTherapists] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar terapeutas e disciplinas ao montar
  useEffect(() => {
    loadTherapists();
    loadDisciplines();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Carregar especialidades quando terapeuta é selecionado
  useEffect(() => {
    if (selectedTherapist) {
      loadTherapistSpecialties(selectedTherapist);
    } else {
      setTherapistSpecialties([]);
    }
  }, [selectedTherapist]);

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

  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();

      let disciplinesList = [];
      if (disciplinesData && typeof disciplinesData === 'object') {
        disciplinesList = Object.keys(disciplinesData).map(disciplineName => ({
          id: disciplinesData[disciplineName].id,
          name: disciplineName
        }));
      }

      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    } finally {
      setLoadingDisciplines(false);
    }
  };

  const loadTherapistSpecialties = async (therapistId) => {
    try {
      setLoadingSpecialties(true);
      const response = await availabilityApi.getTherapistSpecialties(therapistId);
      setTherapistSpecialties(response.specialties || []);
    } catch (error) {
      console.error('Erro ao carregar especialidades:', error);
      setTherapistSpecialties([]);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const handleToggleSpecialty = (disciplineId) => {
    setTherapistSpecialties(prev => {
      const exists = prev.find(s => s.discipline_id === disciplineId);

      if (exists) {
        // Remover especialidade
        return prev.filter(s => s.discipline_id !== disciplineId);
      } else {
        // Adicionar especialidade
        return [...prev, {
          discipline_id: disciplineId,
          main_specialty: false,
          years_of_experience: 0
        }];
      }
    });
  };

  const handleSetMainSpecialty = (disciplineId) => {
    setTherapistSpecialties(prev =>
      prev.map(spec => ({
        ...spec,
        main_specialty: spec.discipline_id === disciplineId
      }))
    );
  };

  const handleSetYearsOfExperience = (disciplineId, years) => {
    setTherapistSpecialties(prev =>
      prev.map(spec =>
        spec.discipline_id === disciplineId
          ? { ...spec, years_of_experience: parseInt(years) || 0 }
          : spec
      )
    );
  };

  const handleSave = async () => {
    if (!selectedTherapist) {
      toast.error('Selecione um terapeuta');
      return;
    }

    try {
      setSaving(true);
      await availabilityApi.updateTherapistSpecialties(
        selectedTherapist,
        therapistSpecialties
      );
      toast.success('Especialidades atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar especialidades:', error);
      toast.error(error.message || 'Erro ao salvar especialidades');
    } finally {
      setSaving(false);
    }
  };

  const selectedTherapistName = therapists.find(t => t.id === parseInt(selectedTherapist))?.full_name || '';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faStethoscope} className="mr-3 text-blue-600" />
          Especialidades dos Terapeutas
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Defina quais disciplinas cada terapeuta está apto a atender
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
          <select
            value={selectedTherapist}
            onChange={(e) => setSelectedTherapist(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um terapeuta</option>
            {therapists.map(therapist => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de Especialidades */}
      {selectedTherapist && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Especialidades de {selectedTherapistName}
            </h3>
            <button
              onClick={handleSave}
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
                  Salvar
                </>
              )}
            </button>
          </div>

          {loadingSpecialties ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-2xl" />
            </div>
          ) : loadingDisciplines ? (
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-2xl" />
            </div>
          ) : (
            <div className="space-y-3">
              {disciplines.map(discipline => {
                const specialty = therapistSpecialties.find(s => s.discipline_id === discipline.id);
                const isSelected = !!specialty;

                return (
                  <div
                    key={discipline.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSpecialty(discipline.id)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-3 text-base font-medium text-gray-900">
                          {discipline.name}
                        </label>
                      </div>

                      {isSelected && (
                        <button
                          onClick={() => handleSetMainSpecialty(discipline.id)}
                          className={`ml-4 px-3 py-1 rounded-lg text-sm flex items-center transition-colors ${
                            specialty.main_specialty
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <FontAwesomeIcon icon={faStar} className="mr-1" />
                          {specialty.main_specialty ? 'Principal' : 'Marcar como Principal'}
                        </button>
                      )}
                    </div>

                    {isSelected && (
                      <div className="ml-8 mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Anos de Experiência
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={specialty.years_of_experience || 0}
                          onChange={(e) => handleSetYearsOfExperience(discipline.id, e.target.value)}
                          className="w-32 border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo */}
          {therapistSpecialties.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Resumo:</h4>
              <ul className="space-y-1">
                <li className="text-sm text-gray-700">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 mr-2" />
                  {therapistSpecialties.length} especialidade{therapistSpecialties.length !== 1 ? 's' : ''} selecionada{therapistSpecialties.length !== 1 ? 's' : ''}
                </li>
                {therapistSpecialties.filter(s => s.main_specialty).length > 0 && (
                  <li className="text-sm text-gray-700">
                    <FontAwesomeIcon icon={faStar} className="text-yellow-500 mr-2" />
                    Especialidade principal: {
                      disciplines.find(d => d.id === therapistSpecialties.find(s => s.main_specialty)?.discipline_id)?.name
                    }
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {!selectedTherapist && (
        <div className="text-center py-12 text-gray-500">
          <FontAwesomeIcon icon={faUser} size="3x" className="mb-4 text-gray-300" />
          <p className="text-lg">Selecione um terapeuta para gerenciar suas especialidades</p>
        </div>
      )}
    </div>
  );
};

export default TherapistSpecialtiesManager;
