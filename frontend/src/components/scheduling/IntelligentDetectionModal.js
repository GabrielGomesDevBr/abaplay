// frontend/src/components/scheduling/IntelligentDetectionModal.js

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faBrain,
  faCalendarAlt,
  faSearch,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faInfoCircle,
  faCog
} from '@fortawesome/free-solid-svg-icons';
import { runIntelligentDetection } from '../../api/schedulingApi';

/**
 * Modal para executar detecção inteligente de sessões
 * Identifica sessões realizadas e marca agendamentos como completados
 */
const IntelligentDetectionModal = ({
  isOpen,
  onClose,
  onDetectionComplete
}) => {
  const [detectionData, setDetectionData] = useState({
    start_date: '',
    end_date: '',
    auto_create_retroactive: false
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDetectionData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const runDetection = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setResults(null);

      const response = await runIntelligentDetection(detectionData);
      setResults(response.detection_results);

      // Notificar componente pai sobre a conclusão
      if (onDetectionComplete) {
        onDetectionComplete(response.detection_results);
      }
    } catch (error) {
      console.error('Erro na detecção inteligente:', error);
      setError(error.message || 'Erro ao executar detecção inteligente');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runDetection();
  };

  const resetModal = () => {
    setDetectionData({
      start_date: '',
      end_date: '',
      auto_create_retroactive: false
    });
    setResults(null);
    setError(null);
    setIsRunning(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Gerar data padrão (últimos 30 dias)
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faBrain} className="mr-3 text-purple-600" />
            Detecção Inteligente de Sessões
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isRunning}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Explicação */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-1 mr-3" />
              <div className="text-sm text-blue-700">
                <h4 className="font-medium mb-2">Como funciona a detecção inteligente:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Analisa sessões realizadas</strong> no período selecionado</li>
                  <li>• <strong>Identifica agendamentos correspondentes</strong> com base em paciente, terapeuta e data</li>
                  <li>• <strong>Marca agendamentos como completados</strong> quando há sessões correspondentes</li>
                  <li>• <strong>Detecta sessões órfãs</strong> (realizadas sem agendamento prévio)</li>
                  <li>• <strong>Opcionalmente cria agendamentos retroativos</strong> para sessões órfãs</li>
                </ul>
              </div>
            </div>
          </div>

          {!results ? (
            /* Formulário de configuração */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Período */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-400" />
                    Data inicial
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={detectionData.start_date}
                    onChange={handleInputChange}
                    placeholder={getDefaultStartDate()}
                    disabled={isRunning}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para últimos 30 dias
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-2 text-gray-400" />
                    Data final
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={detectionData.end_date}
                    onChange={handleInputChange}
                    placeholder={getDefaultEndDate()}
                    disabled={isRunning}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Deixe em branco para hoje
                  </p>
                </div>
              </div>

              {/* Opções avançadas */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <FontAwesomeIcon icon={faCog} className="mr-2 text-gray-400" />
                  Opções Avançadas
                </h4>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="auto_create_retroactive"
                    name="auto_create_retroactive"
                    checked={detectionData.auto_create_retroactive}
                    onChange={handleInputChange}
                    disabled={isRunning}
                    className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_create_retroactive" className="ml-3 text-sm">
                    <span className="font-medium text-gray-900">
                      Criar agendamentos retroativos automaticamente
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      Quando ativado, criará automaticamente agendamentos retroativos para todas as sessões órfãs encontradas.
                      Caso contrário, apenas listará as sessões órfãs para criação manual.
                    </p>
                  </label>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                    <span className="text-red-800 text-sm font-medium">Erro na detecção</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isRunning}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRunning}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 flex items-center"
                >
                  {isRunning ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSearch} className="mr-2" />
                      Executar Detecção
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Resultados da detecção */
            <div className="space-y-6">
              <div className="text-center">
                <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Detecção Concluída com Sucesso!
                </h3>
                <p className="text-gray-600">
                  A análise foi executada no período especificado.
                </p>
              </div>

              {/* Estatísticas dos resultados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.completed_sessions?.length || 0}
                  </div>
                  <div className="text-sm text-green-700 font-medium">
                    Agendamentos Completados
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Agendamentos marcados como realizados
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.orphan_sessions?.length || 0}
                  </div>
                  <div className="text-sm text-orange-700 font-medium">
                    Sessões Órfãs
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Sessões sem agendamento prévio
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.retroactive_created?.length || 0}
                  </div>
                  <div className="text-sm text-blue-700 font-medium">
                    Retroativos Criados
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Agendamentos criados automaticamente
                  </div>
                </div>
              </div>

              {/* Detalhes dos resultados */}
              {results.completed_sessions?.length > 0 && (
                <div className="border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">
                    ✓ Agendamentos marcados como completados:
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    {results.completed_sessions.slice(0, 5).map((session, index) => (
                      <div key={index}>
                        • {session.patient_name} - {session.therapist_name} ({new Date(session.scheduled_date).toLocaleDateString('pt-BR')})
                      </div>
                    ))}
                    {results.completed_sessions.length > 5 && (
                      <div className="text-xs text-green-600">
                        ... e mais {results.completed_sessions.length - 5} agendamentos
                      </div>
                    )}
                  </div>
                </div>
              )}

              {results.orphan_sessions?.length > 0 && (
                <div className="border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">
                    ⚠ Sessões órfãs encontradas:
                  </h4>
                  <div className="text-sm text-orange-700 space-y-1">
                    {results.orphan_sessions.slice(0, 5).map((session, index) => (
                      <div key={index}>
                        • {session.patient_name} - {session.therapist_name} ({new Date(session.session_date).toLocaleDateString('pt-BR')})
                      </div>
                    ))}
                    {results.orphan_sessions.length > 5 && (
                      <div className="text-xs text-orange-600">
                        ... e mais {results.orphan_sessions.length - 5} sessões órfãs
                      </div>
                    )}
                  </div>
                  {!detectionData.auto_create_retroactive && (
                    <p className="text-xs text-orange-600 mt-2">
                      💡 Use a aba "Sessões Órfãs" para criar agendamentos retroativos manualmente.
                    </p>
                  )}
                </div>
              )}

              {/* Botões finais */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setResults(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Nova Detecção
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligentDetectionModal;