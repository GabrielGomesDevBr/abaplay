// frontend/src/components/admin/UserFormModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faSpinner,
  faChevronDown,
  faChevronUp,
  faPlus,
  faTrash,
  faCertificate
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import therapistSpecialtyApi from '../../api/therapistSpecialtyApi';
import { getDisciplineHierarchy } from '../../api/programApi';

// O componente agora recebe a lista de `patients` da clínica
const UserFormModal = ({ isOpen, onClose, onSave, userToEdit = null, patients = [] }) => {
  const { hasProAccess } = useAuth(); // ✅ Verificar plano
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    role: 'terapeuta',
    associated_patient_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Estados para especialidades
  const [showSpecialties, setShowSpecialties] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState({
    discipline_id: '',
    certification_date: '',
    notes: ''
  });

  const isEditing = Boolean(userToEdit);

  // Carregar lista de disciplinas disponíveis
  const loadDisciplines = async () => {
    try {
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
    }
  };

  // Carregar especialidades do terapeuta
  const loadSpecialties = async () => {
    if (!userToEdit?.id) return;

    setLoadingSpecialties(true);
    try {
      const data = await therapistSpecialtyApi.getTherapistSpecialties(userToEdit.id);
      setSpecialties(data || []);
    } catch (error) {
      console.error('Erro ao carregar especialidades:', error);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  // Adicionar nova especialidade
  const handleAddSpecialty = async () => {
    if (!newSpecialty.discipline_id) {
      setError('Selecione uma disciplina');
      return;
    }

    // Se estiver editando, salva diretamente no backend
    if (isEditing && userToEdit?.id) {
      try {
        await therapistSpecialtyApi.addTherapistSpecialty(userToEdit.id, newSpecialty);
        setNewSpecialty({ discipline_id: '', certification_date: '', notes: '' });
        setError('');
        await loadSpecialties(); // Recarregar lista
      } catch (error) {
        setError(error.response?.data?.message || 'Erro ao adicionar especialidade');
      }
    } else {
      // Se estiver criando, adiciona à lista temporária
      const disciplineName = disciplines.find(d => d.id === parseInt(newSpecialty.discipline_id))?.name || '';

      // Verifica se a disciplina já está na lista
      if (specialties.some(s => s.discipline_id === parseInt(newSpecialty.discipline_id))) {
        setError('Esta disciplina já foi adicionada');
        return;
      }

      setSpecialties([...specialties, {
        discipline_id: parseInt(newSpecialty.discipline_id),
        discipline_name: disciplineName,
        certification_date: newSpecialty.certification_date,
        notes: newSpecialty.notes
      }]);
      setNewSpecialty({ discipline_id: '', certification_date: '', notes: '' });
      setError('');
    }
  };

  // Remover especialidade
  const handleRemoveSpecialty = async (disciplineId) => {
    if (!window.confirm('Tem certeza que deseja remover esta especialidade?')) {
      return;
    }

    // Se estiver editando, remove do backend
    if (isEditing && userToEdit?.id) {
      try {
        await therapistSpecialtyApi.removeTherapistSpecialty(userToEdit.id, disciplineId);
        await loadSpecialties(); // Recarregar lista
      } catch (error) {
        setError(error.response?.data?.message || 'Erro ao remover especialidade');
      }
    } else {
      // Se estiver criando, remove da lista temporária
      setSpecialties(specialties.filter(s => s.discipline_id !== disciplineId));
    }
  };

  // UseEffect para carregar dados quando o modal abre
  useEffect(() => {
    if (isEditing) {
      setFormData({
        fullName: userToEdit.full_name || '',
        username: userToEdit.username || '',
        password: '',
        role: userToEdit.role || 'terapeuta',
        associated_patient_id: userToEdit.associated_patient_id || '',
      });

      // Carregar especialidades e disciplinas se for terapeuta
      if (userToEdit.role === 'terapeuta') {
        loadDisciplines();
        loadSpecialties();
      }
    } else {
      setFormData({
        fullName: '', username: '', password: '', role: 'terapeuta', associated_patient_id: '',
      });
      setSpecialties([]);
      // Carregar disciplinas mesmo ao criar novo terapeuta
      loadDisciplines();
    }
    setError('');
    setShowSpecialties(false);
  }, [isOpen, userToEdit, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
        ...prev,
        role: value,
        // Limpa o paciente associado ao mudar de papel
        associated_patient_id: '' 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEditing && !formData.password) {
        setError("O campo 'senha' é obrigatório para novos utilizadores.");
        return;
    }

    // Validação para garantir que um paciente foi selecionado para o papel de 'pai'
    if (formData.role === 'pai' && !formData.associated_patient_id) {
        setError("É obrigatório selecionar um paciente para o papel 'Pai/Responsável'.");
        return;
    }

    setIsSubmitting(true);
    try {
        // Se for um novo terapeuta e houver especialidades, incluir nos dados
        const dataToSave = {
          ...formData,
          ...(formData.role === 'terapeuta' && !isEditing && specialties.length > 0 && {
            specialties: specialties.map(s => ({
              discipline_id: s.discipline_id,
              certification_date: s.certification_date || null,
              notes: s.notes || ''
            }))
          })
        };

        await onSave(dataToSave);
        onClose();
    } catch (err) {
        setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Editar Utilizador' : 'Adicionar Novo Utilizador'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Nome de Utilizador (login)</label>
            <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'} required={!isEditing} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Função</label>
            <select id="role" name="role" value={formData.role} onChange={handleRoleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
                <option value="terapeuta">Terapeuta</option>
                {/* ✅ Cadastro de Pai apenas no plano Pro */}
                {hasProAccess && hasProAccess() && (
                  <option value="pai">Pai/Responsável</option>
                )}
            </select>
            {/* ✅ Aviso visual se não tiver acesso Pro */}
            {!hasProAccess || !hasProAccess() ? (
              <p className="mt-1 text-xs text-gray-500">
                💡 Cadastro de pais/responsáveis disponível apenas no plano Pro
              </p>
            ) : null}
          </div>
          
          {/* <<< MELHORIA: Substituído o campo de texto por um dropdown >>> */}
          {formData.role === 'pai' && (
            <div className="transition-all duration-300 ease-in-out">
              <label htmlFor="associated_patient_id" className="block text-sm font-medium text-gray-700 mb-1">Paciente Associado</label>
              <select 
                id="associated_patient_id" 
                name="associated_patient_id" 
                value={formData.associated_patient_id} 
                onChange={handleChange} 
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">-- Selecione um paciente --</option>
                {patients.length > 0 ? (
                    patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                            {patient.name} (ID: {patient.id})
                        </option>
                    ))
                ) : (
                    <option disabled>Nenhum paciente cadastrado na clínica</option>
                )}
              </select>
            </div>
          )}

          {/* Seção de Especialidades - Para Terapeutas (criar ou editar) */}
          {formData.role === 'terapeuta' && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSpecialties(!showSpecialties)}
                className="w-full bg-gray-50 hover:bg-gray-100 px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faCertificate} className="text-indigo-600 mr-2" />
                  <span className="font-medium text-gray-700">
                    Especialidades
                    {specialties.length > 0 && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({specialties.length})
                      </span>
                    )}
                  </span>
                </div>
                <FontAwesomeIcon
                  icon={showSpecialties ? faChevronUp : faChevronDown}
                  className="text-gray-400"
                />
              </button>

              {showSpecialties && (
                <div className="p-4 bg-white space-y-4">
                  {loadingSpecialties ? (
                    <div className="text-center py-4">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-gray-400 text-xl" />
                      <p className="text-sm text-gray-500 mt-2">Carregando especialidades...</p>
                    </div>
                  ) : (
                    <>
                      {/* Lista de Especialidades Existentes */}
                      {specialties.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Especialidades Atuais
                          </h4>
                          {specialties.map((specialty) => (
                            <div
                              key={specialty.discipline_id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {specialty.discipline_name}
                                </p>
                                {specialty.certification_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Certificado em: {new Date(specialty.certification_date).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                                {specialty.notes && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {specialty.notes}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSpecialty(specialty.discipline_id)}
                                className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                                title="Remover especialidade"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Nenhuma especialidade cadastrada
                        </p>
                      )}

                      {/* Formulário para Adicionar Nova Especialidade */}
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Adicionar Especialidade
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Disciplina *
                            </label>
                            <select
                              value={newSpecialty.discipline_id}
                              onChange={(e) => setNewSpecialty(prev => ({ ...prev, discipline_id: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                              <option value="">-- Selecione uma disciplina --</option>
                              {disciplines.map((discipline) => (
                                <option key={discipline.id} value={discipline.id}>
                                  {discipline.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Data de Certificação (opcional)
                            </label>
                            <input
                              type="date"
                              value={newSpecialty.certification_date}
                              onChange={(e) => setNewSpecialty(prev => ({ ...prev, certification_date: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Observações (opcional)
                            </label>
                            <textarea
                              value={newSpecialty.notes}
                              onChange={(e) => setNewSpecialty(prev => ({ ...prev, notes: e.target.value }))}
                              rows="2"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Ex: Certificação em ABA, experiência com autismo..."
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddSpecialty}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center text-sm"
                          >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Adicionar Especialidade
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}
        </form>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} type="button" className="bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-md border border-gray-300 mr-3">Cancelar</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors shadow flex items-center disabled:opacity-60">
            <FontAwesomeIcon icon={isSubmitting ? faSpinner : faSave} className={`mr-2 ${isSubmitting && 'fa-spin'}`} />
            {isSubmitting ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
