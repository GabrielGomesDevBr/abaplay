import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPlus,
  faSpinner,
  faSave,
  faLayerGroup,
  faBullseye,
  faTag,
  faCog,
  faList,
  faClipboardList,
  faHashtag,
  faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { createGlobalProgram, getDisciplineHierarchy } from '../../api/superAdminApi';

const GlobalProgramModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    discipline: '',
    area: '',
    sub_area_id: '',
    name: '',
    objective: '',
    program_slug: '',
    skill: '',
    materials: [''],
    procedure: [{ step: '', description: '' }],
    criteria_for_advancement: '',
    trials: 5
  });

  const [hierarchy, setHierarchy] = useState({});
  const [availableAreas, setAvailableAreas] = useState({});
  const [availableSubAreas, setAvailableSubAreas] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHierarchy();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      discipline: '',
      area: '',
      sub_area_id: '',
      name: '',
      objective: '',
      program_slug: '',
      skill: '',
      materials: [''],
      procedure: [{ step: '', description: '' }],
      criteria_for_advancement: '',
      trials: 5
    });
    setAvailableAreas({});
    setAvailableSubAreas({});
    setError('');
  };

  const fetchHierarchy = async () => {
    try {
      setLoadingHierarchy(true);
      const data = await getDisciplineHierarchy();
      setHierarchy(data);
    } catch (error) {
      console.error('Erro ao buscar hierarquia:', error);
      setError('Erro ao carregar disciplinas. Tente novamente.');
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const handleDisciplineChange = (disciplineName) => {
    setFormData(prev => ({
      ...prev,
      discipline: disciplineName,
      area: '',
      sub_area_id: ''
    }));

    if (disciplineName && hierarchy[disciplineName]) {
      setAvailableAreas(hierarchy[disciplineName].areas);
      setAvailableSubAreas({});
    } else {
      setAvailableAreas({});
      setAvailableSubAreas({});
    }
  };

  const handleAreaChange = (areaName) => {
    setFormData(prev => ({
      ...prev,
      area: areaName,
      sub_area_id: ''
    }));

    if (areaName && availableAreas[areaName]) {
      setAvailableSubAreas(availableAreas[areaName].sub_areas);
    } else {
      setAvailableSubAreas({});
    }
  };

  const handleSubAreaChange = (subAreaName) => {
    const subAreaId = availableSubAreas[subAreaName]?.id;
    setFormData(prev => ({
      ...prev,
      sub_area_id: subAreaId
    }));
  };

  const handleMaterialChange = (index, value) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = value;
    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, '']
    }));
  };

  const removeMaterial = (index) => {
    if (formData.materials.length > 1) {
      const newMaterials = formData.materials.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, materials: newMaterials }));
    }
  };

  const handleProcedureChange = (index, field, value) => {
    const newProcedure = [...formData.procedure];
    newProcedure[index][field] = value;
    setFormData(prev => ({ ...prev, procedure: newProcedure }));
  };

  const addProcedureStep = () => {
    setFormData(prev => ({
      ...prev,
      procedure: [...prev.procedure, { step: '', description: '' }]
    }));
  };

  const removeProcedureStep = (index) => {
    if (formData.procedure.length > 1) {
      const newProcedure = formData.procedure.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, procedure: newProcedure }));
    }
  };

  const validateForm = () => {
    if (!formData.sub_area_id) {
      setError('Por favor, selecione uma sub-área.');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Nome do programa é obrigatório.');
      return false;
    }
    if (!formData.objective.trim()) {
      setError('Objetivo é obrigatório.');
      return false;
    }
    if (!formData.skill.trim()) {
      setError('Habilidade é obrigatória.');
      return false;
    }
    if (formData.materials.some(material => !material.trim())) {
      setError('Todos os materiais devem ser preenchidos.');
      return false;
    }
    if (formData.procedure.some(proc => !proc.step.trim() || !proc.description.trim())) {
      setError('Todos os passos do procedimento devem ser preenchidos.');
      return false;
    }
    if (!formData.criteria_for_advancement.trim()) {
      setError('Critério de avanço é obrigatório.');
      return false;
    }
    if (!formData.trials || formData.trials < 1 || formData.trials > 999) {
      setError('Número de tentativas deve estar entre 1 e 999.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Filtrar materiais e procedimentos vazios
      const filteredMaterials = formData.materials.filter(material => material.trim());
      const filteredProcedure = formData.procedure.filter(proc =>
        proc.step.trim() && proc.description.trim()
      );

      const programData = {
        sub_area_id: formData.sub_area_id,
        name: formData.name.trim(),
        objective: formData.objective.trim(),
        program_slug: formData.program_slug.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
        skill: formData.skill.trim(),
        materials: filteredMaterials,
        procedure: filteredProcedure,
        criteria_for_advancement: formData.criteria_for_advancement.trim(),
        trials: parseInt(formData.trials)
      };

      await createGlobalProgram(programData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar programa global:', error);
      if (error.response?.status === 409) {
        setError('Já existe um programa global com este nome.');
      } else {
        setError('Erro ao criar programa global. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon icon={faGlobe} className="text-green-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">
              Criar Programa Global
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loadingHierarchy ? (
            <div className="flex items-center justify-center py-8">
              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-blue-600" />
              <span className="ml-3 text-gray-600">Carregando hierarquia...</span>
            </div>
          ) : (
            <>
              {/* Seleção de Hierarquia */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-2 text-blue-600" />
                    Disciplina *
                  </label>
                  <select
                    value={formData.discipline}
                    onChange={(e) => handleDisciplineChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione uma disciplina</option>
                    {Object.keys(hierarchy).map(discipline => (
                      <option key={discipline} value={discipline}>
                        {discipline}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-2 text-blue-600" />
                    Área *
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!formData.discipline}
                  >
                    <option value="">Selecione uma área</option>
                    {Object.keys(availableAreas).map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-2 text-blue-600" />
                    Sub-área *
                  </label>
                  <select
                    value={Object.keys(availableSubAreas).find(subArea =>
                      availableSubAreas[subArea].id === formData.sub_area_id
                    ) || ''}
                    onChange={(e) => handleSubAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!formData.area}
                  >
                    <option value="">Selecione uma sub-área</option>
                    {Object.keys(availableSubAreas).map(subArea => (
                      <option key={subArea} value={subArea}>
                        {subArea}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faTag} className="mr-2 text-green-600" />
                    Nome do Programa *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Identificação de Cores"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faHashtag} className="mr-2 text-purple-600" />
                    Slug do Programa
                  </label>
                  <input
                    type="text"
                    value={formData.program_slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, program_slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: identificacao-cores (opcional)"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faBullseye} className="mr-2 text-red-600" />
                  Objetivo *
                </label>
                <textarea
                  value={formData.objective}
                  onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Descreva o objetivo do programa..."
                  required
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faCog} className="mr-2 text-yellow-600" />
                  Habilidade *
                </label>
                <input
                  type="text"
                  value={formData.skill}
                  onChange={(e) => setFormData(prev => ({ ...prev, skill: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Discriminação visual"
                  required
                />
              </div>

              {/* Materiais */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faList} className="mr-2 text-indigo-600" />
                  Materiais *
                </label>
                {formData.materials.map((material, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={material}
                      onChange={(e) => handleMaterialChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Material ${index + 1}`}
                      required
                    />
                    {formData.materials.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMaterial}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />
                  Adicionar Material
                </button>
              </div>

              {/* Procedimento */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faClipboardList} className="mr-2 text-orange-600" />
                  Procedimento *
                </label>
                {formData.procedure.map((proc, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Passo {index + 1}</h4>
                      {formData.procedure.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProcedureStep(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={proc.step}
                        onChange={(e) => handleProcedureChange(index, 'step', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do passo"
                        required
                      />
                      <textarea
                        value={proc.description}
                        onChange={(e) => handleProcedureChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="2"
                        placeholder="Descrição do passo"
                        required
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProcedureStep}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-1" />
                  Adicionar Passo
                </button>
              </div>

              {/* Critério de Avanço e Tentativas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faBullseye} className="mr-2 text-green-600" />
                    Critério de Avanço *
                  </label>
                  <input
                    type="text"
                    value={formData.criteria_for_advancement}
                    onChange={(e) => setFormData(prev => ({ ...prev, criteria_for_advancement: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 80% de acertos em 3 sessões consecutivas"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faHashtag} className="mr-2 text-purple-600" />
                    Número de Tentativas *
                  </label>
                  <input
                    type="number"
                    value={formData.trials}
                    onChange={(e) => setFormData(prev => ({ ...prev, trials: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="999"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || loadingHierarchy}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Criar Programa Global
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GlobalProgramModal;