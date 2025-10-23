// frontend/src/components/availability/TherapistConfigModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faLock,
  faLockOpen,
  faUserTie,
  faUserClock,
  faUserCheck,
  faClock,
  faHistory,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { updateTherapistPermissions, getTherapistChangesLog } from '../../api/availabilityAdminApi';

const TherapistConfigModal = ({ therapist, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    contract_type: therapist.contract_type || 'freelancer',
    can_edit_own_schedule: therapist.can_edit_own_schedule !== false,
    default_weekly_hours: therapist.default_weekly_hours || ''
  });

  const [changesLog, setChangesLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar histórico de alterações
  const loadChangesLog = React.useCallback(async () => {
    try {
      setLoadingLog(true);
      const response = await getTherapistChangesLog(therapist.id, 10);
      setChangesLog(response.log || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de alterações');
    } finally {
      setLoadingLog(false);
    }
  }, [therapist.id]);

  useEffect(() => {
    if (showLog && changesLog.length === 0) {
      loadChangesLog();
    }
  }, [showLog, changesLog.length, loadChangesLog]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação
    if (formData.default_weekly_hours && formData.default_weekly_hours < 0) {
      toast.error('Horas semanais não pode ser negativo');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        contract_type: formData.contract_type,
        can_edit_own_schedule: formData.can_edit_own_schedule,
        default_weekly_hours: formData.default_weekly_hours ? parseInt(formData.default_weekly_hours) : null
      };

      await updateTherapistPermissions(therapist.id, payload);
      onSave();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Configurar Permissões
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {therapist.full_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Contrato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <FontAwesomeIcon icon={faUserTie} className="mr-2 text-blue-600" />
              Tipo de Contrato
            </label>
            <div className="space-y-3">
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-blue-300 bg-white">
                <input
                  type="radio"
                  name="contract_type"
                  value="freelancer"
                  checked={formData.contract_type === 'freelancer'}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value }))}
                  className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUserClock} className="text-blue-600" />
                    <span className="font-medium text-gray-900">Freelancer</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Horários totalmente flexíveis. Terapeuta define sua própria disponibilidade.
                  </p>
                </div>
              </label>

              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-yellow-50 hover:border-yellow-300 bg-white">
                <input
                  type="radio"
                  name="contract_type"
                  value="part_time"
                  checked={formData.contract_type === 'part_time'}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value }))}
                  className="mt-1 mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUserTie} className="text-yellow-600" />
                    <span className="font-medium text-gray-900">Meio Período</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Horário parcial fixo. Terapeuta pode editar sua agenda livremente.
                  </p>
                </div>
              </label>

              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-green-50 hover:border-green-300 bg-white">
                <input
                  type="radio"
                  name="contract_type"
                  value="full_time"
                  checked={formData.contract_type === 'full_time'}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_type: e.target.value }))}
                  className="mt-1 mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUserCheck} className="text-green-600" />
                    <span className="font-medium text-gray-900">Tempo Integral</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Horário contratual fixo. Alterações requerem aprovação do administrador.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Horas Semanais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faClock} className="mr-2 text-blue-600" />
              Horas Semanais Contratuais (opcional)
            </label>
            <input
              type="number"
              min="0"
              max="168"
              value={formData.default_weekly_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, default_weekly_hours: e.target.value }))}
              placeholder="Ex: 40"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Usado para relatórios e cálculos de carga horária
            </p>
          </div>

          {/* Permissão de Edição */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="can_edit"
                checked={formData.can_edit_own_schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, can_edit_own_schedule: e.target.checked }))}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
              />
              <label htmlFor="can_edit" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <FontAwesomeIcon
                    icon={formData.can_edit_own_schedule ? faLockOpen : faLock}
                    className={formData.can_edit_own_schedule ? 'text-green-600' : 'text-red-600'}
                  />
                  <span>Permitir que terapeuta edite a própria agenda</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.can_edit_own_schedule ? (
                    <>
                      <FontAwesomeIcon icon={faInfoCircle} className="mr-1 text-green-600" />
                      O terapeuta poderá adicionar/remover horários e ausências livremente
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faInfoCircle} className="mr-1 text-red-600" />
                      Apenas administradores poderão alterar a disponibilidade deste terapeuta
                    </>
                  )}
                </p>
              </label>
            </div>
          </div>

          {/* Histórico de Alterações */}
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setShowLog(!showLog)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faHistory} />
              {showLog ? 'Ocultar histórico' : 'Ver histórico de alterações'}
            </button>

            {showLog && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                {loadingLog ? (
                  <p className="text-sm text-gray-500 text-center">Carregando...</p>
                ) : changesLog.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">Nenhuma alteração registrada</p>
                ) : (
                  <div className="space-y-3">
                    {changesLog.map((log) => (
                      <div key={log.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {log.description}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Por: {log.changed_by_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TherapistConfigModal;
