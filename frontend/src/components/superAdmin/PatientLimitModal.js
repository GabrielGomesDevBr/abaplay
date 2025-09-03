// frontend/src/components/superAdmin/PatientLimitModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faSpinner, faCheck, faUsers, faExclamationTriangle, faKey } from '@fortawesome/free-solid-svg-icons';

const PatientLimitModal = ({ isOpen, onClose, clinic, onSubmit, onResetPassword }) => {
  const [maxPatients, setMaxPatients] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('limit');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clinic) {
      setMaxPatients(clinic.max_patients?.toString() || '');
      setError('');
      setActiveTab('limit');
    }
  }, [isOpen, clinic]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newLimit = parseInt(maxPatients);
    const currentPatients = parseInt(clinic?.patients_count || 0);
    
    // Validações
    if (!newLimit || newLimit < 1) {
      setError('Limite deve ser um número maior que 0');
      return;
    }
    
    if (newLimit < currentPatients) {
      setError(`Limite não pode ser menor que ${currentPatients} (pacientes atuais)`);
      return;
    }

    if (newLimit === clinic.max_patients) {
      setError('O limite informado é igual ao atual');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit(newLimit);
    } catch (error) {
      console.error('Erro ao atualizar limite:', error);
      setError('Erro ao atualizar limite de pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setMaxPatients(value);
    if (error) setError('');
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Tem certeza que deseja resetar a senha do administrador? Ele precisará cadastrar uma nova senha no próximo login.')) {
      return;
    }
    
    setResetPasswordLoading(true);
    
    try {
      await onResetPassword(clinic.id);
      alert('Senha resetada! O administrador deverá cadastrar nova senha no próximo login.');
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      alert('Erro ao resetar senha do administrador');
    } finally {
      setResetPasswordLoading(false);
    }
  };


  if (!isOpen || !clinic) return null;

  const currentPatients = parseInt(clinic.patients_count || 0);
  const currentLimit = parseInt(clinic.max_patients || 0);
  const newLimit = parseInt(maxPatients) || 0;
  const difference = newLimit - currentLimit;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faEdit} className="text-2xl text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Gerenciar Clínica
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-t">
            <button
              onClick={() => setActiveTab('limit')}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'limit'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              Limite de Pacientes
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faKey} className="mr-2" />
              Resetar Senha Admin
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Informações da Clínica */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">{clinic.name}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Admin:</span>
                <div className="font-semibold text-gray-900">{clinic.admin_name}</div>
              </div>
              <div>
                <span className="text-gray-500">E-mail:</span>
                <div className="font-semibold text-gray-900 text-xs">{clinic.admin_email}</div>
              </div>
              {activeTab === 'limit' && (
                <>
                  <div>
                    <span className="text-gray-500">Pacientes atuais:</span>
                    <div className="font-semibold text-gray-900">{currentPatients}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Limite atual:</span>
                    <div className="font-semibold text-gray-900">{currentLimit}</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Barra de progresso - apenas na aba de limite */}
            {activeTab === 'limit' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Ocupação atual</span>
                  <span>{Math.round((currentPatients / currentLimit) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      currentPatients / currentLimit > 0.8 ? 'bg-red-500' : 
                      currentPatients / currentLimit > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentPatients / currentLimit) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Aba Limite de Pacientes */}
          {activeTab === 'limit' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faUsers} className="mr-2 text-blue-600" />
                  Novo Limite de Pacientes
                </label>
                <input
                  type="number"
                  value={maxPatients}
                  onChange={handleChange}
                  min={currentPatients}
                  max="1000"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Digite o novo limite"
                />
                
                {/* Preview da mudança */}
                {newLimit && newLimit !== currentLimit && !error && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FontAwesomeIcon 
                        icon={difference > 0 ? faCheck : faExclamationTriangle} 
                        className={`mr-2 ${difference > 0 ? 'text-green-600' : 'text-yellow-600'}`} 
                      />
                      <span className="text-sm">
                        {difference > 0 
                          ? `Aumento de ${difference} paciente${difference > 1 ? 's' : ''}`
                          : `Redução de ${Math.abs(difference)} paciente${Math.abs(difference) > 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Nova ocupação: {Math.round((currentPatients / newLimit) * 100)}%
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-2 mt-0.5" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Dicas */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                <strong>Dicas:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>O limite não pode ser menor que o número atual de pacientes</li>
                  <li>Recomenda-se manter uma margem de 10-20% para crescimento</li>
                  <li>Clínicas com mais de 80% de ocupação podem precisar expandir</li>
                </ul>
              </div>
            </form>
          )}

          {/* Aba Resetar Senha */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mr-2 mt-0.5" />
                  <div className="text-red-800 text-sm">
                    <strong>Atenção!</strong> Esta ação irá resetar a senha do administrador da clínica para NULL. 
                    O administrador será obrigado a cadastrar uma nova senha no próximo login.
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Como funciona:</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• A senha atual será removida do sistema</li>
                  <li>• O administrador não conseguirá fazer login com a senha atual</li>
                  <li>• No próximo acesso, será solicitada a criação de uma nova senha</li>
                  <li>• Apenas o próprio administrador definirá a nova senha</li>
                </ul>
              </div>

              {/* Informações de segurança */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                <strong>Segurança:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>O super admin nunca tem acesso às senhas dos usuários</li>
                  <li>Esta é uma operação de segurança que remove credenciais</li>
                  <li>Informe o administrador sobre a necessidade de criar nova senha</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading || resetPasswordLoading}
          >
            Cancelar
          </button>
          
          {/* Botão para aba de limite */}
          {activeTab === 'limit' && (
            <button
              onClick={handleSubmit}
              disabled={loading || !maxPatients || error}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Atualizando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  Atualizar Limite
                </>
              )}
            </button>
          )}
          
          {/* Botão para aba de senha */}
          {activeTab === 'password' && (
            <button
              onClick={handleResetPassword}
              disabled={resetPasswordLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
            >
              {resetPasswordLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  Resetando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faKey} className="mr-2" />
                  Resetar Senha
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientLimitModal;