import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faBullseye, faUser, faTimes } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { API_URL } from '../../config';

const ProgressAlert = ({ onClose, onProgramCompleted }) => {
  const [alertPrograms, setAlertPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    console.log('[PROGRESS-ALERT] Fechando modal...');
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  useEffect(() => {
    loadProgressAlerts();
    setIsVisible(true);

    // Adiciona listener para tecla Escape
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const loadProgressAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[PROGRESS-ALERT] Iniciando busca de alertas de progresso...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('[PROGRESS-ALERT] Token não encontrado');
        setError('Token de autenticação não encontrado');
        return;
      }

      const response = await axios.get(`${API_URL}/api/notifications/progress-alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[PROGRESS-ALERT] Resposta recebida:', response.data);
      setAlertPrograms(response.data || []);
    } catch (error) {
      console.error('[PROGRESS-ALERT] Erro ao carregar alertas:', error.response?.data || error.message);
      setError(error.response?.data?.errors?.[0]?.msg || error.message || 'Erro desconhecido');
      setAlertPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsCompleted = async (program) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/notifications/mark-completed`, {
        assignmentId: program.assignment_id,
        patientId: program.patient_id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Remove o programa da lista
      setAlertPrograms(prev => prev.filter(p => p.assignment_id !== program.assignment_id));
      
      // Callback para atualizar contador de notificações
      if (onProgramCompleted) {
        onProgramCompleted();
      }
      
      console.log(`Programa "${program.program_name}" marcado como dominado`);
    } catch (error) {
      console.error('Erro ao marcar programa como dominado:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-20"
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faBullseye} className="text-amber-600 text-lg" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Alertas de Progresso
              </h3>
              <p className="text-sm text-gray-600">
                Programas com 80%+ de progresso que podem estar dominados
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando alertas...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <FontAwesomeIcon icon={faTimes} className="mx-auto text-4xl text-red-500 mb-4" />
              <div className="space-y-2">
                <p className="font-semibold">Erro ao carregar alertas</p>
                <p className="text-sm text-gray-600">{error}</p>
                <button 
                  onClick={loadProgressAlerts}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          ) : alertPrograms.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <FontAwesomeIcon icon={faCheckCircle} className="mx-auto text-4xl text-green-500 mb-4" />
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">
                  Nenhum programa precisa de verificação no momento!
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Programas precisam ter ≥3 sessões registradas</p>
                  <p>• Progresso deve estar ≥80% nas últimas sessões</p>
                  <p>• Continue registrando sessões para acompanhar o progresso</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {alertPrograms.map((program) => (
                <div 
                  key={program.assignment_id} 
                  className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FontAwesomeIcon icon={faUser} className="text-blue-600 text-sm" />
                        <span className="font-medium text-gray-800">
                          {program.patient_name}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-800 mb-2">
                        {program.program_name}
                      </h4>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span>Progresso:</span>
                          <span className="font-semibold text-amber-600">
                            {Math.round(program.progress_average)}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Sessões:</span>
                          <span className="font-semibold">
                            {program.sessions_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleMarkAsCompleted(program)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                        <span>Dominado</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(program.progress_average, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - só aparece quando há alertas */}
        {!loading && !error && alertPrograms.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500 text-center">
              Revise se estes programas já foram aprendidos e marque como dominados se necessário
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressAlert;