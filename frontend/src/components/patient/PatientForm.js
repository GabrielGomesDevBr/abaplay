import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Função para formatar a data para o input type="date"
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};


const PatientForm = ({ isOpen, onClose, onSave, patientToEdit }) => {
  // Estado para os campos do formulário
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [general_notes, setGeneralNotes] = useState('');

  // Estado para controlo da UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(patientToEdit);

  // Efeito para popular o formulário quando 'patientToEdit' muda
  useEffect(() => {
    if (isEditMode && patientToEdit) {
      setName(patientToEdit.name || '');
      setDob(formatDateForInput(patientToEdit.dob));
      setDiagnosis(patientToEdit.diagnosis || '');
      setGeneralNotes(patientToEdit.general_notes || '');
    } else {
      // Limpa o formulário quando não está em modo de edição
      setName('');
      setDob('');
      setDiagnosis('');
      setGeneralNotes('');
    }
  }, [patientToEdit, isEditMode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const patientData = { name, dob, diagnosis, general_notes };
    if (!dob) { 
      patientData.dob = null;
    }
    
    try {
      await onSave(patientData);
      onClose();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao salvar.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) {
    return null;
  }

  return (
    // 1. Fundo do modal com animação de fade-in
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 fade-in">
      {/* 2. Painel do modal com animação de entrada e estilo refinado */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-up">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditMode ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div>
            <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            {/* 3. Estilo de input melhorado com foco mais visível */}
            <input
              type="text"
              id="patient-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="patient-dob" className="block text-sm font-medium text-gray-700 mb-1.5">
                Data de Nascimento
              </label>
              <input
                type="date"
                id="patient-dob"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
              />
            </div>
            <div>
              <label htmlFor="patient-diagnosis" className="block text-sm font-medium text-gray-700 mb-1.5">
                Diagnóstico
              </label>
              <input
                type="text"
                id="patient-diagnosis"
                placeholder="Ex: TEA Nível 1"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="patient-notes" className="block text-sm font-medium text-gray-700 mb-1.5">
              Anotações Gerais
            </label>
            <textarea
              id="patient-notes"
              rows="4"
              placeholder="Informações relevantes sobre o cliente..."
              value={general_notes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow text-sm resize-vertical"
            ></textarea>
          </div>
        
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>

        <div className="p-4 bg-gray-50 border-t border-gray-200 mt-auto text-right">
          {/* 4. Botão de guardar com estilo refinado */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-all duration-200 shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 active:scale-95"
          >
            <FontAwesomeIcon icon={isLoading ? faSpinner : faSave} className={`mr-2 ${isLoading && 'fa-spin'}`} />
            {isLoading ? 'A Guardar...' : isEditMode ? 'Guardar Alterações' : 'Criar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Adiciona uma animação Keyframes para a entrada do modal (opcional, mas recomendado)
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .fade-in { animation: fadeIn 0.3s ease-out forwards; }
  @keyframes fadeInUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
`;
document.head.appendChild(style);


export default PatientForm;
