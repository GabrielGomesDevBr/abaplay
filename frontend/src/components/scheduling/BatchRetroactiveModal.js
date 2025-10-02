// frontend/src/components/scheduling/BatchRetroactiveModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarPlus,
  faStickyNote,
  faStethoscope,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { createBatchRetroactive } from '../../api/schedulingApi';
import { getDisciplineHierarchy } from '../../api/programApi';

/**
 * Modal para criar múltiplos agendamentos retroativos
 */
const BatchRetroactiveModal = ({ isOpen, onClose, selectedSessions, onSuccess }) => {
  const [formData, setFormData] = useState({
    discipline_id: '',
    notes: 'Agendamentos retroativos criados em lote'
  });

  const [disciplines, setDisciplines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
      setFormData({
        discipline_id: '',
        notes: `Agendamentos retroativos criados em lote (${selectedSessions.length} sessões)`
      });
      setError(null);
      setResult(null);
    }
  }, [isOpen, selectedSessions.length]);

  const loadDisciplines = async () => {
    try {
      setIsLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();

      // Extrair array de disciplinas
      let disciplinesList = [];
      if (disciplinesData && typeof disciplinesData === 'object') {
        disciplinesList = Object.keys(disciplinesData).map(disciplineName => ({
          id: disciplinesData[disciplineName].id,
          name: disciplineName
        }));
      }

      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      setError('Erro ao carregar lista de disciplinas');
    } finally {
      setIsLoadingDisciplines(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);

      const sessionIds = selectedSessions.map(s => s.session_id);

      const commonData = {
        discipline_id: formData.discipline_id ? parseInt(formData.discipline_id) : null,
        notes: formData.notes
      };

      const response = await createBatchRetroactive(sessionIds, commonData);
      setResult(response);

      // Aguardar um momento antes de fechar
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response);
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar agendamentos em lote:', error);
      setError(error.message || 'Erro ao criar agendamentos retroativos');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ discipline_id: '', notes: '' });
      setError(null);
      setResult(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faCalendarPlus} className="mr-3 text-green-600" />
            Criar Agendamentos Retroativos em Lote
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {result ? (
            /* Tela de sucesso */
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Agendamentos Criados com Sucesso!
              </h3>
              <p className="text-gray-600 mb-4">
                {result.created} de {result.total} agendamentos foram criados
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left">
                  <p className="text-yellow-800 font-medium mb-2">Alguns agendamentos falharam:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>... e mais {result.errors.length - 3} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Resumo das sessões selecionadas */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  {selectedSessions.length} Sessão(ões) Selecionada(s)
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {selectedSessions.slice(0, 5).map((session, idx) => (
                    <div key={idx} className="text-sm text-blue-700 flex justify-between">
                      <span>{session.patient_name}</span>
                      <span>{new Date(session.session_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                  {selectedSessions.length > 5 && (
                    <div className="text-sm text-blue-600 text-center">
                      ... e mais {selectedSessions.length - 5} sessões
                    </div>
                  )}
                </div>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Disciplina comum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
                    Área de Intervenção <span className="text-gray-500 text-sm">(aplicar a todas)</span>
                  </label>
                  <select
                    name="discipline_id"
                    value={formData.discipline_id}
                    onChange={handleInputChange}
                    disabled={isLoading || isLoadingDisciplines}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {isLoadingDisciplines ? 'Carregando...' : 'Sessão geral (padrão)'}
                    </option>
                    {Array.isArray(disciplines) && disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta configuração será aplicada a todos os agendamentos
                  </p>
                </div>

                {/* Observações comuns */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-400" />
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    maxLength={500}
                    placeholder="Observações comuns para todos os agendamentos..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 resize-none"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    {formData.notes.length}/500 caracteres
                  </div>
                </div>

                {/* Aviso */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Esta operação criará {selectedSessions.length} agendamentos
                      retroativos de uma vez. Todos serão marcados como "realizados" e vinculados às sessões
                      correspondentes.
                    </div>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                      <span className="text-red-800 text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                        Criando {selectedSessions.length} agendamentos...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                        Criar {selectedSessions.length} Agendamentos
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchRetroactiveModal;