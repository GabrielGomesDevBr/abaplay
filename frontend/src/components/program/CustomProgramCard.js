import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faExclamationTriangle,
  faSpinner,
  faUser,
  faCalendar,
  faTag,
  faBullseye,
  faCog,
  faWarning,
  faPlus,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { deleteCustomProgram } from '../../api/programApi';

const CustomProgramCard = ({
  program,
  onEdit,
  onDelete,
  onAssign,
  isDeleting,
  hasAssignments = false,
  assignmentCount = 0,
  progressCount = 0,
  userIsAdmin = false,
  isAssigned = false,
  isAssigning = false,
  isPatientSelected = false
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: warning, 2: final confirmation

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteStep(1);
  };

  const handleDeleteConfirm = async () => {
    if (deleteStep === 1 && (hasAssignments || progressCount > 0)) {
      setDeleteStep(2); // Mostrar aviso final se há dados
      return;
    }

    try {
      await deleteCustomProgram(program.id);
      onDelete?.(program.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Erro ao deletar programa:', error);
      // Tratar erro
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(1);
  };

  const canEdit = program.created_by || true; // Assume que pode editar se é customizado
  const canDelete = !hasAssignments && progressCount === 0;

  return (
    <div className="bg-white border border-purple-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header com indicador de customizado */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                <FontAwesomeIcon icon={faCog} className="mr-1" />
                Customizado
              </span>
              {program.program_slug && (
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  <FontAwesomeIcon icon={faTag} className="mr-1" />
                  {program.program_slug}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 leading-tight">
              {program.name}
            </h3>
          </div>

          {/* Botões de ação */}
          <div className="flex space-x-2 ml-4">
            {canEdit && (
              <button
                onClick={() => onEdit?.(program)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar programa"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
            )}

            {userIsAdmin && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={`p-2 rounded-lg transition-colors ${
                  canDelete
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={canDelete ? 'Remover programa' : 'Não é possível remover: há dados associados'}
              >
                {isDeleting ? (
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                ) : (
                  <FontAwesomeIcon icon={faTrash} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo do programa */}
      <div className="p-4">
        {/* Objetivo */}
        {program.objective && (
          <div className="mb-4">
            <div className="flex items-center text-gray-600 text-sm mb-1">
              <FontAwesomeIcon icon={faBullseye} className="mr-2" />
              <span className="font-medium">Objetivo</span>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              {program.objective}
            </p>
          </div>
        )}

        {/* Metadados */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {program.trials && (
            <div>
              <span className="text-gray-500">Tentativas:</span>
              <span className="ml-1 font-medium">{program.trials}</span>
            </div>
          )}

          {program.created_by_name && (
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-1" />
              <span className="text-gray-600 truncate">{program.created_by_name}</span>
            </div>
          )}
        </div>

        {/* Status de uso */}
        {(assignmentCount > 0 || progressCount > 0) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center text-yellow-800 text-sm">
              <FontAwesomeIcon icon={faWarning} className="mr-2" />
              <span className="font-medium">Programa em uso</span>
            </div>
            <div className="mt-1 text-yellow-700 text-xs">
              {assignmentCount > 0 && `${assignmentCount} atribuição(ões)`}
              {assignmentCount > 0 && progressCount > 0 && ' • '}
              {progressCount > 0 && `${progressCount} registro(s) de progresso`}
            </div>
          </div>
        )}

        {/* Botão de atribuir programa */}
        {isPatientSelected && onAssign && (
          <div className="mt-4">
            {isAssigned ? (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 shadow-sm">
                <div className="bg-white bg-opacity-20 p-1 rounded-full">
                  <FontAwesomeIcon icon={faCheck} className="text-sm" />
                </div>
                <span className="font-semibold text-sm">Já Atribuído</span>
              </div>
            ) : (
              <button
                onClick={() => onAssign(program)}
                disabled={!isPatientSelected || isAssigning}
                title={!isPatientSelected ? 'Selecione um cliente para atribuir' : 'Atribuir ao cliente'}
                className={`
                  px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 w-full shadow-sm transform
                  ${!isPatientSelected
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-105 active:scale-95'
                  }
                `}
              >
                {isAssigning ? (
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                ) : (
                  <>
                    <div className={`p-1 rounded-full ${
                      !isPatientSelected ? 'bg-gray-300' : 'bg-white bg-opacity-20'
                    }`}>
                      <FontAwesomeIcon icon={faPlus} className="text-sm" />
                    </div>
                    <span>Atribuir Programa</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmação de deleção */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-3 rounded-full mr-4">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deleteStep === 1 ? 'Confirmar Remoção' : 'ATENÇÃO: Perda de Dados'}
                  </h3>
                </div>
              </div>

              {deleteStep === 1 ? (
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Tem certeza que deseja remover o programa:
                  </p>
                  <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded border-l-4 border-purple-500">
                    "{program.name}"
                  </p>

                  {hasAssignments || progressCount > 0 ? (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center text-red-800 mb-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                        <span className="font-semibold">CUIDADO!</span>
                      </div>
                      <p className="text-red-700 text-sm">
                        Este programa possui dados associados que serão PERMANENTEMENTE perdidos:
                      </p>
                      <ul className="mt-2 text-red-700 text-sm list-disc list-inside">
                        {assignmentCount > 0 && (
                          <li>{assignmentCount} atribuição(ões) a pacientes</li>
                        )}
                        {progressCount > 0 && (
                          <li>{progressCount} registro(s) de progresso/sessões</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700 text-sm">
                        ✓ Este programa não possui dados associados. É seguro removê-lo.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-red-700 font-medium mb-4">
                    🚨 ÚLTIMA CONFIRMAÇÃO
                  </p>
                  <p className="text-gray-700 mb-4">
                    Ao continuar, TODOS os dados abaixo serão PERMANENTEMENTE perdidos:
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <ul className="text-red-800 text-sm space-y-1">
                      <li>• O programa customizado</li>
                      <li>• Todas as atribuições aos pacientes</li>
                      <li>• Todo o histórico de progresso/sessões</li>
                      <li>• Relatórios e dados analíticos</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 mt-4 text-sm">
                    <strong>Esta ação NÃO pode ser desfeita!</strong>
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>

                {deleteStep === 1 && (hasAssignments || progressCount > 0) ? (
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Continuar Mesmo Assim
                  </button>
                ) : (
                  <button
                    onClick={handleDeleteConfirm}
                    className={`px-4 py-2 text-white rounded-lg ${
                      canDelete
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-red-800 hover:bg-red-900'
                    }`}
                  >
                    {deleteStep === 2 ? 'CONFIRMAR REMOÇÃO' : 'Remover Programa'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomProgramCard;