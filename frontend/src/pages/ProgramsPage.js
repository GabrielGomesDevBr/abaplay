import React, { useState } from 'react';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { useAuth } from '../context/AuthContext';
import { assignProgramToPatient } from '../api/patientApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faBook, faUserCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

// Estilos de animação para a página
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
`;

// Injeta os estilos no head
if (typeof document !== 'undefined' && !document.querySelector('#programs-page-styles')) {
  const style = document.createElement('style');
  style.id = 'programs-page-styles';
  style.textContent = fadeInStyle;
  document.head.appendChild(style);
}

const ProgramsPage = () => {
  const { selectedPatient, refreshPatientData } = usePatients();
  const { isLoading, error: contextError } = usePrograms();
  
  // SOLUÇÃO: O token agora é extraído diretamente do hook useAuth.
  const { token } = useAuth();

  const [assigningId, setAssigningId] = useState(null);
  // O estado 'removingId' não é mais necessário.
  const [actionError, setActionError] = useState('');

  const handleAssign = async (programId) => {
    if (!selectedPatient) {
      setActionError('Nenhum cliente selecionado para atribuir o programa.');
      return;
    }
    
    if (!token) {
      setActionError('Erro de autenticação. Por favor, faça login novamente.');
      return;
    }

    setAssigningId(programId);
    setActionError('');
    try {
      await assignProgramToPatient(selectedPatient.id, programId, token);
      if (refreshPatientData) {
        await refreshPatientData(selectedPatient.id);
      }
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      setActionError(error.message || 'Ocorreu um erro ao atribuir o programa.');
    } finally {
      setAssigningId(null);
    }
  };

  // A função handleRemove foi completamente removida desta página,
  // conforme nossa decisão de centralizar a lógica.

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregando Biblioteca</h2>
          <p className="text-gray-600">Preparando os programas de intervenção...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden max-w-lg w-full">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3" />
              Erro ao Carregar
            </h3>
            <p className="text-red-100 text-sm mt-1">Não foi possível acessar a biblioteca de programas</p>
          </div>
          <div className="p-6">
            <p className="text-red-800 mb-4">
              {contextError || 'Não foi possível carregar os programas.'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="p-6">
        {/* Cabeçalho da página */}
        <div className="animate-fade-in mb-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white flex items-center">
                    <FontAwesomeIcon icon={faBook} className="mr-4" />
                    Biblioteca de Programas
                  </h1>
                  <p className="text-purple-100 text-lg mt-2">
                    Explore e atribua programas de intervenção especializados
                  </p>
                </div>
                {selectedPatient && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                    <FontAwesomeIcon icon={faUserCircle} className="text-white text-2xl mb-2" />
                    <p className="text-white text-sm font-medium">{selectedPatient.name}</p>
                    <p className="text-purple-100 text-xs">Cliente selecionado</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Alertas e notificações */}
            <div className="p-6">
              {actionError && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mt-1 mr-3" />
                    <div>
                      <p className="text-red-800 font-medium mb-1">Erro na Operação</p>
                      <p className="text-red-700 text-sm">{actionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPatient && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-amber-600 mt-1 mr-3" />
                    <div>
                      <p className="text-amber-800 font-medium mb-1">👥 Selecione um Cliente</p>
                      <p className="text-amber-700 text-sm leading-relaxed">
                        Para visualizar os programas e realizar atribuições, 
                        é necessário primeiro selecionar um cliente na barra lateral.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Biblioteca de programas ou estado vazio */}
        <div className="animate-fade-in">
          {selectedPatient ? (
            <ProgramLibrary
              onAssign={handleAssign}
              isPatientSelected={!!selectedPatient}
              assigningId={assigningId}
              assignedPrograms={selectedPatient.assigned_programs || []}
            />
          ) : (
            /* Estado vazio quando nenhum cliente está selecionado */
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-center h-96 text-center p-8">
                <div>
                  <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                    <FontAwesomeIcon icon={faBook} className="text-5xl text-indigo-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Biblioteca Pronta para Uso</h3>
                  <p className="text-gray-600 leading-relaxed max-w-md mx-auto mb-6">
                    Nossa biblioteca contém centenas de programas organizados por disciplinas e áreas de intervenção. 
                    Selecione um cliente para começar a explorar.
                  </p>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-lg p-4 max-w-sm mx-auto">
                    <div className="flex items-center justify-center space-x-3 text-indigo-600">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Aguardando seleção de cliente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramsPage;
