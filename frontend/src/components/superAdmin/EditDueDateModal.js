// frontend/src/components/superAdmin/EditDueDateModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faCalendarAlt, faEdit, faBuilding, 
  faSpinner, faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';

const EditDueDateModal = ({ isOpen, onClose, billing, onSubmit }) => {
  const [formData, setFormData] = useState({
    due_date: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form quando o modal abre ou billing muda
  useEffect(() => {
    if (isOpen && billing) {
      setFormData({
        due_date: new Date(billing.due_date).toISOString().split('T')[0],
        reason: ''
      });
      setError('');
    }
  }, [isOpen, billing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.due_date) {
      setError('Nova data de vencimento é obrigatória');
      return;
    }

    const newDate = new Date(formData.due_date);
    const originalDate = new Date(billing.due_date);
    
    if (newDate.getTime() === originalDate.getTime()) {
      setError('A nova data deve ser diferente da data atual');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit({
        billing_id: billing.id,
        old_due_date: billing.due_date,
        new_due_date: formData.due_date,
        reason: formData.reason || 'Alteração solicitada pelo super admin'
      });
      
      setFormData({ due_date: '', reason: '' });
    } catch (error) {
      console.error('Erro ao editar data de vencimento:', error);
      setError('Erro ao salvar alteração');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ due_date: '', reason: '' });
    setError('');
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!isOpen || !billing) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faEdit} className="text-2xl text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Editar Data de Vencimento
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
          {/* Informações da Cobrança */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FontAwesomeIcon icon={faBuilding} className="mr-2 text-gray-600" />
              Informações da Cobrança
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Clínica:</span>
                <span className="ml-2 text-gray-900">{billing.clinic_name}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Valor:</span>
                <span className="ml-2 text-gray-900 font-semibold">
                  {formatCurrency(billing.amount)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  billing.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : billing.status === 'overdue'
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {billing.status === 'paid' ? 'Pago' : 
                   billing.status === 'overdue' ? 'Vencido' : 'Pendente'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Vencimento Atual:</span>
                <span className="ml-2 text-gray-900 font-semibold">
                  {formatDate(billing.due_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Alerta para cobranças pagas */}
          {billing.status === 'paid' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 mr-2" />
                <span className="text-amber-800 text-sm font-medium">
                  Atenção: Esta cobrança já foi paga. Alterar a data pode afetar relatórios financeiros.
                </span>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nova Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                Nova Data de Vencimento *
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Data atual: {formatDate(billing.due_date)}
              </p>
            </div>

            {/* Motivo da Alteração */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Alteração (opcional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Descreva o motivo da alteração da data de vencimento..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este motivo será registrado no histórico de alterações.
              </p>
            </div>

            {/* Comparação de Datas */}
            {formData.due_date && formData.due_date !== billing.due_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">Resumo da Alteração</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Data Original:</span>
                    <br />
                    <span className="text-blue-900">{formatDate(billing.due_date)}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Nova Data:</span>
                    <br />
                    <span className="text-blue-900 font-semibold">
                      {formatDate(formData.due_date)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <span className="text-blue-700 text-sm">
                    {new Date(formData.due_date) > new Date(billing.due_date) 
                      ? '📅 Prazo será estendido' 
                      : '⚡ Prazo será antecipado'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 flex items-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                  {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !formData.due_date || formData.due_date === billing.due_date}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors flex items-center"
              >
                {loading && <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />}
                {loading ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDueDateModal;