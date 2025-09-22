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
  faHashtag
} from '@fortawesome/free-solid-svg-icons';
import { createCustomProgram, getDisciplineHierarchy } from '../../api/programApi';

const CustomProgramModal = ({ isOpen, onClose, onSuccess }) => {
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
    }
  }, [isOpen]);

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
    newProcedure[index] = { ...newProcedure[index], [field]: value };
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
      setError('Selecione uma disciplina, área e sub-área.');
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
    if (!formData.program_slug.trim()) {
      setError('Tag do programa é obrigatória.');
      return false;
    }
    if (!formData.skill.trim()) {
      setError('Habilidade ABA é obrigatória.');
      return false;
    }
    if (formData.materials.every(m => !m.trim())) {
      setError('Adicione pelo menos um material.');
      return false;
    }
    if (formData.procedure.every(p => !p.step.trim() && !p.description.trim())) {
      setError('Adicione pelo menos um passo do procedimento.');
      return false;
    }
    if (!formData.criteria_for_advancement.trim()) {
      setError('Critérios para avanço são obrigatórios.');
      return false;
    }
    if (!formData.trials || formData.trials < 1 || formData.trials > 999) {
      setError('Número de tentativas deve ser entre 1 e 999.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const programData = {
        sub_area_id: formData.sub_area_id,
        name: formData.name.trim(),
        objective: formData.objective.trim(),
        program_slug: formData.program_slug.trim(),
        skill: formData.skill.trim(),
        materials: formData.materials.filter(m => m.trim()),
        procedure: formData.procedure.filter(p => p.step.trim() || p.description.trim()),
        criteria_for_advancement: formData.criteria_for_advancement.trim(),
        trials: parseInt(formData.trials)
      };

      await createCustomProgram(programData);

      // Reset form
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

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao criar programa:', error);
      setError(error.response?.data?.message || 'Erro ao criar programa customizado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* CSS para garantir scroll consistente */}
      <style>{`
        .modal-scroll-content {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }
        .modal-scroll-content::-webkit-scrollbar {
          width: 8px;
        }
        .modal-scroll-content::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 4px;
        }
        .modal-scroll-content::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .modal-scroll-content::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden"
           style={{
             maxHeight: window.innerHeight > 600 ? '90vh' : '95vh',
             minHeight: window.innerHeight > 600 ? '500px' : '300px',
             height: window.innerHeight > 600 ? '90vh' : '95vh'
           }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Criar Programa Customizado</h2>
              <p className="text-purple-100 text-sm">Programa específico para sua clínica</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 modal-scroll-content"
             style={{
               minHeight: 0,
               maxHeight: window.innerHeight > 600 ? 'calc(90vh - 140px)' : 'calc(95vh - 120px)',
               overflowY: 'auto',
               WebkitOverflowScrolling: 'touch' // Para iOS
             }}>
          {loadingHierarchy ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl text-purple-500 mb-4" />
                <p className="text-gray-600">Carregando disciplinas...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Hierarquia de Disciplinas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faLayerGroup} className="mr-2 text-purple-500" />
                    Disciplina *
                  </label>
                  <select
                    value={formData.discipline}
                    onChange={(e) => handleDisciplineChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Área *
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={!formData.discipline}
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-área *
                  </label>
                  <select
                    value={Object.keys(availableSubAreas).find(subArea =>
                      availableSubAreas[subArea].id === formData.sub_area_id
                    ) || ''}
                    onChange={(e) => handleSubAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={!formData.area}
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faTag} className="mr-2 text-purple-500" />
                    Nome do Programa *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Identificação de Objetos"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faHashtag} className="mr-2 text-purple-500" />
                    Tag/Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.program_slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, program_slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Mando, Tato, Ecoico"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faBullseye} className="mr-2 text-purple-500" />
                  Objetivo *
                </label>
                <textarea
                  value={formData.objective}
                  onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows="3"
                  placeholder="Descreva o objetivo terapêutico deste programa..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faCog} className="mr-2 text-purple-500" />
                  Habilidade ABA *
                </label>
                <input
                  type="text"
                  value={formData.skill}
                  onChange={(e) => setFormData(prev => ({ ...prev, skill: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Linguagem Receptiva, Habilidades Motoras"
                  required
                />
              </div>

              {/* Materiais */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faList} className="mr-2 text-purple-500" />
                  Materiais *
                </label>
                <div className="space-y-2">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={material}
                        onChange={(e) => handleMaterialChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder={`Material ${index + 1}`}
                      />
                      {formData.materials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMaterial(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="w-full py-2 text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Adicionar Material
                  </button>
                </div>
              </div>

              {/* Procedimentos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faClipboardList} className="mr-2 text-purple-500" />
                  Procedimentos *
                </label>
                <div className="space-y-3">
                  {formData.procedure.map((proc, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Passo {index + 1}</span>
                        {formData.procedure.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProcedureStep(index)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={proc.step}
                          onChange={(e) => handleProcedureChange(index, 'step', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Nome do passo"
                        />
                        <input
                          type="text"
                          value={proc.description}
                          onChange={(e) => handleProcedureChange(index, 'description', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Descrição do passo"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addProcedureStep}
                    className="w-full py-2 text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50"
                  >
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Adicionar Passo
                  </button>
                </div>
              </div>

              {/* Critérios e Tentativas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Critérios para Avanço *
                  </label>
                  <textarea
                    value={formData.criteria_for_advancement}
                    onChange={(e) => setFormData(prev => ({ ...prev, criteria_for_advancement: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="3"
                    placeholder="Ex: 80% de acertos em 3 sessões consecutivas"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tentativas Padrão *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.trials}
                    onChange={(e) => setFormData(prev => ({ ...prev, trials: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Número padrão de tentativas por sessão</p>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!loadingHierarchy && (
          <div className="border-t border-gray-200 p-6 flex justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  <span>Criar Programa</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CustomProgramModal;