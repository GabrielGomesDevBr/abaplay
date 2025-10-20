// frontend/src/components/superAdmin/CreateBillingModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faDollarSign, faSpinner, faCalendarAlt, 
  faBuilding, faInfoCircle, faCalculator
} from '@fortawesome/free-solid-svg-icons';
import { getAllClinics } from '../../api/superAdminApi';

const CreateBillingModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    clinic_id: '',
    due_date: '',
    notes: ''
  });
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carregar clínicas quando modal abre
  useEffect(() => {
    if (isOpen) {
      loadClinics();
      // Definir data padrão para 30 dias no futuro
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        due_date: defaultDate.toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const loadClinics = async () => {
    try {
      const response = await getAllClinics();
      setClinics(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
      setError('Erro ao carregar clínicas');
    }
  };

  const handleClinicChange = (e) => {
    const clinicId = e.target.value;
    const clinic = clinics.find(c => c.id === parseInt(clinicId));

    setFormData(prev => ({ ...prev, clinic_id: clinicId }));
    setSelectedClinic(clinic);

    if (clinic) {
      const pricePerPatient = 15.00;
      const amount = (clinic.current_patients || 0) * pricePerPatient;
      setCalculatedAmount(amount);
    } else {
      setCalculatedAmount(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.clinic_id || !formData.due_date) {
      setError('Clínica e data de vencimento são obrigatórios');
      return;
    }

    if (!selectedClinic || selectedClinic.current_patients === 0) {
      setError('A clínica selecionada deve ter pelo menos 1 paciente para cobrança');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSubmit({
        clinic_id: parseInt(formData.clinic_id),
        due_date: formData.due_date,
        notes: formData.notes || `Cobrança automática - ${selectedClinic?.current_patients || 0} pacientes`
      });
      
      // Reset form
      setFormData({ clinic_id: '', due_date: '', notes: '' });
      setSelectedClinic(null);
      setCalculatedAmount(0);
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      setError('Erro ao criar cobrança');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ clinic_id: '', due_date: '', notes: '' });
    setSelectedClinic(null);
    setCalculatedAmount(0);
    setError('');
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faDollarSign} className="text-2xl text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Nova Cobrança
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seleção da Clínica */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faBuilding} className="mr-2" />
              Clínica *
            </label>
            <select
              value={formData.clinic_id}
              onChange={handleClinicChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione uma clínica</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} ({clinic.current_patients || 0} pacientes)
                </option>
              ))}
            </select>
          </div>

          {/* Informações da Clínica Selecionada */}
          {selectedClinic && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Informações da Clínica
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    selectedClinic.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedClinic.status === 'active' ? 'Ativa' : 'Suspensa'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Pacientes:</span>
                  <span className="ml-2 text-blue-900">
                    {selectedClinic.current_patients || 0} / {selectedClinic.max_patients}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Terapeutas:</span>
                  <span className="ml-2 text-blue-900">{selectedClinic.therapists_count || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Administrador:</span>
                  <span className="ml-2 text-blue-900">{selectedClinic.admin_name || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cálculo do Valor */}
          {calculatedAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                <FontAwesomeIcon icon={faCalculator} className="mr-2" />
                Cálculo da Cobrança
              </h4>
              <div className="text-sm text-green-800">
                <div className="flex justify-between items-center">
                  <span>{selectedClinic?.current_patients || 0} pacientes × R$ 15,00</span>
                  <span className="font-bold text-lg">{formatCurrency(calculatedAmount)}</span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  * Valor calculado automaticamente baseado no número atual de pacientes
                </p>
              </div>
            </div>
          )}

          {/* Data de Vencimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
              Data de Vencimento *
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações sobre esta cobrança (opcional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
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
              disabled={loading || !formData.clinic_id || !formData.due_date || calculatedAmount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors flex items-center"
            >
              {loading && <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />}
              {loading ? 'Criando...' : `Criar Cobrança ${formatCurrency(calculatedAmount)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBillingModal;