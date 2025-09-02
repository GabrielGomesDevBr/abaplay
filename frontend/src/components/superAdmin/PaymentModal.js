// frontend/src/components/superAdmin/PaymentModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faCreditCard, faSpinner, faCheck, 
  faCalendarAlt, faMoneyBillWave, faBuilding, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const PaymentModal = ({ isOpen, onClose, billing, onSubmit }) => {
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'credit_card',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && billing) {
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'credit_card',
        notes: ''
      });
      setError('');
    }
  }, [isOpen, billing]);

  const paymentMethods = [
    { value: 'credit_card', label: '💳 Cartão de Crédito' },
    { value: 'debit_card', label: '💳 Cartão de Débito' },
    { value: 'bank_transfer', label: '🏦 Transferência Bancária' },
    { value: 'pix', label: '📱 PIX' },
    { value: 'bank_slip', label: '📄 Boleto Bancário' },
    { value: 'cash', label: '💵 Dinheiro' },
    { value: 'other', label: '🔧 Outros' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.payment_date) {
      setError('Data de pagamento é obrigatória');
      return;
    }

    const paymentDate = new Date(formData.payment_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (paymentDate > today) {
      setError('Data de pagamento não pode ser futura');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      setError('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'credit_card',
      notes: ''
    });
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  if (!isOpen || !billing) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value) || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const daysOverdue = Math.floor((new Date() - new Date(billing.due_date)) / (1000 * 60 * 60 * 24));
  const isOverdue = daysOverdue > 0 && billing.status === 'pending';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCreditCard} className="text-2xl text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Registrar Pagamento
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
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faBuilding} className="mr-2 text-blue-600" />
                {billing.clinic_name}
              </h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                billing.plan_type === 'premium' ? 'bg-purple-100 text-purple-800' :
                billing.plan_type === 'enterprise' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {billing.plan_type?.charAt(0).toUpperCase() + billing.plan_type?.slice(1)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Valor:</span>
                <div className="font-bold text-lg text-green-600">
                  {formatCurrency(billing.amount)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Vencimento:</span>
                <div className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(billing.due_date)}
                </div>
                {isOverdue && (
                  <div className="text-xs text-red-500">
                    {daysOverdue} dia{daysOverdue > 1 ? 's' : ''} em atraso
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alert para atraso */}
          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex">
                <FontAwesomeIcon icon={faInfoCircle} className="text-red-600 mr-2 mt-0.5" />
                <div className="text-sm text-red-700">
                  <strong>Pagamento em Atraso:</strong> Esta cobrança está vencida há {daysOverdue} dia{daysOverdue > 1 ? 's' : ''}. 
                  Após confirmar o pagamento, a clínica será automaticamente reativada.
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data do Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-blue-600" />
                Data do Pagamento *
              </label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  error && error.includes('Data') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>

            {/* Método de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2 text-blue-600" />
                Método de Pagamento *
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Ex: Número da transação, observações sobre o pagamento..."
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.notes.length}/200 caracteres
              </div>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <FontAwesomeIcon icon={faInfoCircle} className="text-red-600 mr-2 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Consequências */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <h5 className="font-medium text-green-800 mb-2">Após confirmar o pagamento:</h5>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Status da cobrança será alterado para "Pago"</li>
              {billing.clinic_status === 'suspended' && (
                <li>• Clínica será automaticamente reativada</li>
              )}
              <li>• Métricas financeiras serão atualizadas</li>
              <li>• Registro ficará disponível no histórico</li>
            </ul>
          </div>
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
            disabled={loading || !formData.payment_date}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                Registrando...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                Confirmar Pagamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;