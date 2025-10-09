// frontend/src/components/superAdmin/CreateClinicModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBuilding, faUser, faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons';

const CreateClinicModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    clinic_name: '',
    max_patients: 50,
    admin_name: '',
    admin_username: '',
    subscription_plan: 'pro' // FASE 3: Plano padrão Pro
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_patients' ? parseInt(value) || 0 : value
    }));
    
    // Limpa erro do campo quando usuário digita
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.clinic_name.trim()) {
      newErrors.clinic_name = 'Nome da clínica é obrigatório';
    }
    
    if (!formData.admin_name.trim()) {
      newErrors.admin_name = 'Nome do administrador é obrigatório';
    }
    
    if (!formData.admin_username.trim()) {
      newErrors.admin_username = 'Username é obrigatório';
    } else if (formData.admin_username.length < 3) {
      newErrors.admin_username = 'Username deve ter pelo menos 3 caracteres';
    }
    
    if (!formData.max_patients || formData.max_patients < 1) {
      newErrors.max_patients = 'Limite de pacientes deve ser maior que 0';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        clinic_name: '',
        max_patients: 50,
        admin_name: '',
        admin_username: '',
        subscription_plan: 'pro'
      });
      setErrors({});
    } catch (error) {
      console.error('Erro ao criar clínica:', error);
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.msg.includes('Nome de usuário')) {
            apiErrors.admin_username = 'Este username já está em uso';
          }
        });
        setErrors(apiErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faBuilding} className="text-2xl text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Nova Clínica</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome da Clínica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Clínica *
            </label>
            <input
              type="text"
              name="clinic_name"
              value={formData.clinic_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.clinic_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Clínica ABA Plus"
            />
            {errors.clinic_name && (
              <p className="text-red-500 text-xs mt-1">{errors.clinic_name}</p>
            )}
          </div>

          {/* Limite de Pacientes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de Pacientes *
            </label>
            <input
              type="number"
              name="max_patients"
              value={formData.max_patients}
              onChange={handleChange}
              min="1"
              max="1000"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.max_patients ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.max_patients && (
              <p className="text-red-500 text-xs mt-1">{errors.max_patients}</p>
            )}
          </div>

          {/* FASE 3: Seletor de Plano de Assinatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plano de Assinatura *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Plano Agendamento */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, subscription_plan: 'scheduling' }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.subscription_plan === 'scheduling'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">📅 Agendamento</div>
                <div className="text-xl font-bold text-blue-600 mt-1">R$ 10</div>
                <div className="text-xs text-gray-500 mt-1">/paciente/mês</div>
                <div className="text-xs text-gray-600 mt-2">
                  • Agendamentos<br/>
                  • Notas simples<br/>
                  • Calendário
                </div>
              </button>

              {/* Plano Pro */}
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, subscription_plan: 'pro' }))}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.subscription_plan === 'pro'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-white hover:border-green-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">🚀 Pro</div>
                <div className="text-xl font-bold text-green-600 mt-1">R$ 35</div>
                <div className="text-xs text-gray-500 mt-1">/paciente/mês</div>
                <div className="text-xs text-gray-600 mt-2">
                  • Tudo do Agendamento<br/>
                  • Programas ABA<br/>
                  • Relatórios<br/>
                  • Dashboard
                </div>
              </button>
            </div>
          </div>

          {/* Previsão de Faturamento */}
          <div className={`border-2 rounded-lg p-4 ${
            formData.subscription_plan === 'pro'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-1">Faturamento Máximo Estimado</div>
                <div className={`text-lg font-bold ${
                  formData.subscription_plan === 'pro' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  R$ {(formData.max_patients * (formData.subscription_plan === 'pro' ? 35 : 10)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formData.max_patients} pacientes × R$ {formData.subscription_plan === 'pro' ? '35,00' : '10,00'} = faturamento máximo/mês
                </div>
              </div>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-4 pt-4">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faUser} className="text-blue-600 mr-2" />
              <h4 className="text-sm font-semibold text-gray-900">Dados do Administrador</h4>
            </div>
          </div>

          {/* Nome do Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              name="admin_name"
              value={formData.admin_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.admin_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: João Silva"
            />
            {errors.admin_name && (
              <p className="text-red-500 text-xs mt-1">{errors.admin_name}</p>
            )}
          </div>

          {/* Username do Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username de Login *
            </label>
            <input
              type="text"
              name="admin_username"
              value={formData.admin_username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.admin_username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: clinica.abaplus"
            />
            {errors.admin_username && (
              <p className="text-red-500 text-xs mt-1">{errors.admin_username}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              O administrador definirá a senha no primeiro acesso
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                Criar Clínica
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClinicModal;