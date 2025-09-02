// frontend/src/components/superAdmin/SuspendClinicModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faExclamationTriangle, faSpinner, faBan, 
  faBuilding, faUsers, faCalendarAlt 
} from '@fortawesome/free-solid-svg-icons';

const SuspendClinicModal = ({ isOpen, onClose, clinic, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Motivo da suspensão é obrigatório');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Motivo deve ter pelo menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit(reason.trim());
      setReason('');
    } catch (error) {
      console.error('Erro ao suspender clínica:', error);
      setError('Erro ao suspender clínica');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    setReason(e.target.value);
    if (error) setError('');
  };

  // Motivos predefinidos para facilitar
  const predefinedReasons = [
    'Inadimplência - Pagamento em atraso há mais de 10 dias',
    'Inadimplência - Múltiplas faturas em aberto',
    'Violação dos termos de uso',
    'Inatividade prolongada - Mais de 60 dias sem acesso',
    'Solicitação da própria clínica',
    'Problemas técnicos ou de segurança'
  ];

  if (!isOpen || !clinic) return null;

  const createdDate = new Date(clinic.created_at).toLocaleDateString('pt-BR');
  const totalUsers = parseInt(clinic.therapists_count || 0) + parseInt(clinic.parents_count || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Suspender Clínica
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Alerta */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-3 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-red-800 mb-2">Atenção!</h4>
                <p className="text-red-700">
                  Esta ação suspenderá completamente o acesso da clínica ao sistema. 
                  Todos os usuários (terapeutas e pais) serão bloqueados, exceto o administrador 
                  que terá acesso limitado apenas para regularização.
                </p>
              </div>
            </div>
          </div>

          {/* Informações da Clínica */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FontAwesomeIcon icon={faBuilding} className="mr-2 text-blue-600" />
              {clinic.name}
            </h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-500">Pacientes</div>
                <div className="font-semibold text-gray-900">
                  {clinic.patients_count || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Usuários</div>
                <div className="font-semibold text-gray-900">
                  {totalUsers}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Criada em</div>
                <div className="font-semibold text-gray-900">
                  {createdDate}
                </div>
              </div>
            </div>

            {/* Administrador */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Administrador:</span>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{clinic.admin_name}</div>
                  <div className="text-gray-500">@{clinic.admin_username}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Suspensão *
              </label>
              
              {/* Motivos predefinidos */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Motivos comuns (clique para selecionar):</p>
                <div className="space-y-1">
                  {predefinedReasons.map((predefinedReason, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setReason(predefinedReason)}
                      className="text-left w-full px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {predefinedReason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de texto */}
              <textarea
                value={reason}
                onChange={handleChange}
                rows="4"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descreva o motivo detalhado da suspensão..."
              />
              
              <div className="flex justify-between items-center mt-1">
                {error && (
                  <span className="text-red-500 text-xs">{error}</span>
                )}
                <div className="text-xs text-gray-500 ml-auto">
                  {reason.length}/500 caracteres
                </div>
              </div>
            </div>

            {/* Consequências */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-medium text-yellow-800 mb-2">Consequências da Suspensão:</h5>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Terapeutas não conseguirão fazer login</li>
                <li>• Pais não terão acesso aos dados dos filhos</li>
                <li>• Administrador terá acesso limitado para regularização</li>
                <li>• Dados permanecem seguros e podem ser reativados</li>
                <li>• Cobrança continua ativa até regularização</li>
              </ul>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim() || reason.trim().length < 10}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Suspendendo...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faBan} className="mr-2" />
                Suspender Clínica
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendClinicModal;