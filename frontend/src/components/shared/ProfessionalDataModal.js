import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserMd, faIdCard, faGraduationCap, faSignature,
  faTimes, faCheck, faSpinner, faInfo
} from '@fortawesome/free-solid-svg-icons';
import { updateProfessionalData } from '../../api/reportApi';

/**
 * Modal reutilizável para configuração de dados profissionais
 * Usado tanto no relatório de evolução quanto no consolidado
 */
const ProfessionalDataModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentUser,
  title = "Dados Profissionais"
}) => {
  const [professionalData, setProfessionalData] = useState({
    professional_id: '',
    qualifications: '',
    professional_signature: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && currentUser) {
      // Carregar dados existentes do usuário
      setProfessionalData({
        professional_id: currentUser.professional_id || '',
        qualifications: currentUser.qualifications || '',
        professional_signature: currentUser.professional_signature || ''
      });
      setErrors({});
    }
  }, [isOpen, currentUser]);

  const validateData = () => {
    const newErrors = {};
    
    if (!professionalData.professional_id.trim()) {
      newErrors.professional_id = 'Registro profissional é obrigatório';
    }
    
    if (!professionalData.qualifications.trim()) {
      newErrors.qualifications = 'Qualificações são obrigatórias';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateData()) return;

    setLoading(true);

    try {
      // Salvar dados via API
      const response = await updateProfessionalData(professionalData);

      // Callback para o componente pai com dados atualizados do servidor
      onSave(response.user || professionalData);

      onClose();
    } catch (error) {
      console.error('Erro ao salvar dados profissionais:', error);

      // Definir erro mais específico baseado na resposta
      let errorMessage = 'Erro ao salvar dados. Tente novamente.';
      if (error.message) {
        errorMessage = error.message;
      }

      setErrors({
        general: errorMessage
      });

      // Forçar re-configuração chamando callback de erro se fornecido
      if (onSave && typeof onSave === 'function') {
        // Chamar callback indicando erro para que o componente pai
        // possa resetar needsProfessionalData se necessário
        onSave(null, error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfessionalData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando usuário digita
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faUserMd} className="text-indigo-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Info section */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <FontAwesomeIcon icon={faInfo} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Configuração única</p>
                <p className="text-xs">
                  Estes dados serão salvos uma vez e reutilizados em todos os relatórios futuros. 
                  Você pode editá-los a qualquer momento.
                </p>
              </div>
            </div>
          </div>

          {/* Error general */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Registro Profissional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faIdCard} className="mr-2 text-indigo-500" />
                Registro Profissional *
              </label>
              <input
                type="text"
                value={professionalData.professional_id}
                onChange={(e) => handleInputChange('professional_id', e.target.value)}
                placeholder="Ex: CRP 12345, CRO 67890, CREFITO 11111"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                  errors.professional_id ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.professional_id && (
                <p className="mt-1 text-xs text-red-600">{errors.professional_id}</p>
              )}
            </div>

            {/* Qualificações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-indigo-500" />
                Qualificações e Formação *
              </label>
              <textarea
                value={professionalData.qualifications}
                onChange={(e) => handleInputChange('qualifications', e.target.value)}
                placeholder="Ex: Psicólogo Clínico, Especialista em ABA, Mestre em Psicologia do Desenvolvimento"
                rows="3"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-vertical ${
                  errors.qualifications ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.qualifications && (
                <p className="mt-1 text-xs text-red-600">{errors.qualifications}</p>
              )}
            </div>

            {/* Assinatura Digital (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FontAwesomeIcon icon={faSignature} className="mr-2 text-indigo-500" />
                Assinatura Digital (Opcional)
              </label>
              <input
                type="text"
                value={professionalData.professional_signature}
                onChange={(e) => handleInputChange('professional_signature', e.target.value)}
                placeholder="URL da assinatura digitalizada ou texto personalizado"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Deixe em branco se não possuir assinatura digital
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md text-sm transition duration-150 ease-in-out shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon 
              icon={loading ? faSpinner : faCheck} 
              className={`mr-2 ${loading ? 'fa-spin' : ''}`} 
            />
            {loading ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDataModal;