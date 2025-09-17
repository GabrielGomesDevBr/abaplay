// frontend/src/components/admin/TransferAssignmentsModal.js

import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { getTherapistAssignments, transferTherapistAssignments } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

const TransferAssignmentsModal = ({
  isOpen,
  onClose,
  therapistToDelete,
  availableTherapists,
  onTransferComplete
}) => {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [transferList, setTransferList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && therapistToDelete) {
      fetchTherapistAssignments();
    }
  }, [isOpen, therapistToDelete]);

  const fetchTherapistAssignments = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getTherapistAssignments(therapistToDelete.id, token);
      setAssignments(response);

      // Inicializar lista de transferência
      const initialTransferList = [];
      response.patients.forEach(patient => {
        patient.programs.forEach(program => {
          initialTransferList.push({
            assignment_id: program.assignment_id,
            patient_name: patient.patient_name,
            program_name: program.program_name,
            session_count: program.session_count,
            to_therapist_id: availableTherapists.length > 0 ? availableTherapists[0].id : ''
          });
        });
      });
      setTransferList(initialTransferList);

    } catch (err) {
      setError('Erro ao carregar atribuições do terapeuta.');
      console.error('Erro ao buscar atribuições:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferChange = (assignmentId, newTherapistId) => {
    setTransferList(prev =>
      prev.map(item =>
        item.assignment_id === assignmentId
          ? { ...item, to_therapist_id: parseInt(newTherapistId) }
          : item
      )
    );
  };

  const handleTransfer = async () => {
    try {
      setLoading(true);
      setError('');

      // Validar se todos os terapeutas foram selecionados
      const invalidTransfers = transferList.filter(item => !item.to_therapist_id);
      if (invalidTransfers.length > 0) {
        setError('Por favor, selecione um terapeuta para todas as atribuições.');
        return;
      }

      // Executar transferência
      const transferData = transferList.map(item => ({
        assignment_id: item.assignment_id,
        to_therapist_id: item.to_therapist_id
      }));

      await transferTherapistAssignments(therapistToDelete.id, transferData, token);

      // Chamar callback de sucesso
      onTransferComplete();

    } catch (err) {
      setError('Erro ao transferir atribuições. Tente novamente.');
      console.error('Erro na transferência:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTherapistName = (therapistId) => {
    const therapist = availableTherapists.find(t => t.id === therapistId);
    return therapist ? therapist.full_name : 'Desconhecido';
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔄 Transferir Atribuições">
      <div className="max-w-4xl mx-auto">
        {loading && !assignments && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando atribuições...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {assignments && (
          <>
            {/* Cabeçalho de Aviso */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  🚨
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    ATENÇÃO: Transferência Obrigatória
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      <strong>{therapistToDelete.full_name}</strong> possui atribuições ativas.
                      Para manter a continuidade do tratamento, é necessário transferir
                      todas as atribuições antes da remoção.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo das Atribuições */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">📋 Resumo das Atribuições:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">{assignments.summary.total_patients}</span> pacientes ativos
                </div>
                <div>
                  <span className="font-medium">{assignments.summary.total_programs}</span> programas em andamento
                </div>
                <div>
                  <span className="font-medium">{assignments.summary.total_sessions}</span> sessões registradas (preservadas no histórico)
                </div>
              </div>
            </div>

            {/* Lista de Transferências */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                👤 Selecione o terapeuta substituto para cada programa:
              </h3>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {assignments.patients.map(patient => (
                  <div key={patient.patient_id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      📋 {patient.patient_name}
                    </h4>

                    <div className="space-y-2">
                      {patient.programs.map(program => {
                        const transferItem = transferList.find(
                          item => item.assignment_id === program.assignment_id
                        );

                        return (
                          <div key={program.assignment_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span className="text-sm font-medium">{program.program_name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                ({program.session_count} sessões)
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-sm text-gray-500 mr-2">→</span>
                              <select
                                value={transferItem?.to_therapist_id || ''}
                                onChange={(e) => handleTransferChange(program.assignment_id, e.target.value)}
                                className="block w-48 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              >
                                <option value="">Selecione um terapeuta</option>
                                {availableTherapists
                                  .filter(t => t.id !== therapistToDelete.id)
                                  .map(therapist => (
                                    <option key={therapist.id} value={therapist.id}>
                                      {therapist.full_name}
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso Importante */}
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-600">
                ⚠️ <strong>Importante:</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                <li>O histórico de evolução será preservado</li>
                <li>As sessões já realizadas permanecerão no nome do terapeuta original</li>
                <li>O novo terapeuta assumirá a responsabilidade a partir de hoje</li>
              </ul>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                onClick={handleTransfer}
                disabled={loading || transferList.some(item => !item.to_therapist_id)}
              >
                {loading ? 'Transferindo...' : 'Transferir e Remover'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default TransferAssignmentsModal;