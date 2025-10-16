// frontend/src/components/admin/UserFormModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';

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

  const isEditing = Boolean(userToEdit);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        fullName: userToEdit.full_name || '',
        username: userToEdit.username || '',
        password: '',
        role: userToEdit.role || 'terapeuta',
        associated_patient_id: userToEdit.associated_patient_id || '',
      });
    } else {
      setFormData({
        fullName: '', username: '', password: '', role: 'terapeuta', associated_patient_id: '',
      });
    }
    setError('');
  }, [isOpen, userToEdit, isEditing]);

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
        await onSave(formData);
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
