import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // ✅ NOVO: Para receber state da navegação
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { useAuth } from '../context/AuthContext';
import { assignProgramToPatient } from '../api/patientApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faBook, faUserCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast'; // ✅ NOVO: Para mostrar toast informativo

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
  const location = useLocation(); // ✅ NOVO: Para receber state da navegação
  const { selectedPatient, refreshPatientData } = usePatients();
  const { isLoading, error: contextError } = usePrograms();

  // SOLUÇÃO: O token agora é extraído diretamente do hook useAuth.
  const { token, user } = useAuth();

  const [assigningId, setAssigningId] = useState(null);
  // O estado 'removingId' não é mais necessário.
  const [actionError, setActionError] = useState('');
  const [highlightedAssignments, setHighlightedAssignments] = useState([]); // ✅ NOVO: Assignments a destacar
  const [showWithoutProgress, setShowWithoutProgress] = useState(false); // ✅ NOVO: Filtro para mostrar apenas sem progresso

  // ✅ NOVO: Processar state da navegação (vindo de TodayPriorities)
  useEffect(() => {
    if (location.state) {
      const { highlightAssignments, showWithoutProgress: filterWithoutProgress } = location.state;

      // Se veio das prioridades para ver programas sem progresso
      if (highlightAssignments && Array.isArray(highlightAssignments)) {
        setHighlightedAssignments(highlightAssignments);

        // Mostrar toast informativo
        toast.success(`Exibindo ${highlightAssignments.length} programa${highlightAssignments.length > 1 ? 's' : ''} sem registro de progresso há mais de 7 dias`, {
          icon: '📋',
          duration: 4000
        });
      }

      if (filterWithoutProgress) {
        setShowWithoutProgress(true);
      }

      // Limpar o state após processar para evitar reprocessamento
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 sm:p-8 rounded-full w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 sm:mb-8 flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl sm:text-4xl text-purple-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Carregando Biblioteca</h2>
          <p className="text-sm sm:text-base text-gray-600 px-4">Preparando os programas de intervenção...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden max-w-lg w-full">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-4 sm:px-6 py-3 sm:py-4">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 sm:mr-3 flex-shrink-0" />
              <span className="break-words">Erro ao Carregar</span>
            </h3>
            <p className="text-red-100 text-xs sm:text-sm mt-1">Não foi possível acessar a biblioteca de programas</p>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-red-800 mb-4 text-sm sm:text-base">
              {contextError || 'Não foi possível carregar os programas.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
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
      <div className="p-2 sm:p-4 lg:p-6">
        {/* Cabeçalho da página */}
        <div className="animate-fade-in mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-3 sm:px-4 lg:px-8 py-4 sm:py-5 lg:py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="w-full sm:w-auto">
                  {/* Desktop: Título completo */}
                  <h1 className="hidden sm:flex text-2xl lg:text-3xl font-bold text-white items-center">
                    <FontAwesomeIcon icon={faBook} className="mr-3 lg:mr-4 flex-shrink-0" />
                    <span className="break-words">Biblioteca de Programas</span>
                  </h1>
                  {/* Mobile: Título compacto */}
                  <h1 className="sm:hidden text-xl font-bold text-white flex items-center">
                    <FontAwesomeIcon icon={faBook} className="mr-2 flex-shrink-0" />
                    <span>Programas</span>
                  </h1>
                  <p className="text-purple-100 text-xs sm:text-base lg:text-lg mt-1 sm:mt-2">
                    {/* Desktop: Descrição completa */}
                    <span className="hidden sm:inline">Explore e atribua programas de intervenção especializados</span>
                    {/* Mobile: Descrição reduzida */}
                    <span className="sm:hidden">Biblioteca de intervenção</span>
                  </p>
                </div>
                {selectedPatient && (
                  <div className="bg-white bg-opacity-20 rounded-lg p-2 sm:p-3 lg:p-4 text-center w-full sm:w-auto">
                    <FontAwesomeIcon icon={faUserCircle} className="text-white text-lg sm:text-xl lg:text-2xl mb-1 sm:mb-2" />
                    <p className="text-white text-xs sm:text-sm font-medium break-words">{selectedPatient.name}</p>
                    <p className="text-purple-100 text-xs">Cliente selecionado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Alertas e notificações */}
            <div className="p-3 sm:p-4 lg:p-6">
              {actionError && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-3 sm:p-4 mb-3 sm:mb-4 rounded-r-lg">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-red-800 font-medium mb-1 text-sm sm:text-base">Erro na Operação</p>
                      <p className="text-red-700 text-xs sm:text-sm">{actionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NOVO: Alerta apenas para terapeutas sem cliente selecionado */}
              {!selectedPatient && !user?.is_admin && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 p-3 sm:p-4 rounded-r-lg">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="text-amber-600 mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-amber-800 font-medium mb-1 text-sm sm:text-base">👥 Selecione um Cliente</p>
                      <p className="text-amber-700 text-xs sm:text-sm leading-relaxed">
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
          {/* ✅ NOVO: Admin vê biblioteca sempre, terapeuta precisa de cliente */}
          {selectedPatient || user?.is_admin ? (
            <ProgramLibrary
              onAssign={handleAssign}
              isPatientSelected={!!selectedPatient}
              assigningId={assigningId}
              assignedPrograms={selectedPatient?.assigned_programs || []}
              highlightedAssignments={highlightedAssignments}
              showWithoutProgress={showWithoutProgress}
            />
          ) : (
            /* Estado vazio apenas para terapeutas sem cliente */
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] text-center p-4 sm:p-6 lg:p-8">
                <div>
                  <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 sm:p-8 rounded-full w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 sm:mb-8 flex items-center justify-center">
                    <FontAwesomeIcon icon={faBook} className="text-4xl sm:text-5xl text-indigo-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Biblioteca Pronta para Uso</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto mb-4 sm:mb-6 px-2">
                    Nossa biblioteca contém centenas de programas organizados por disciplinas e áreas de intervenção.
                    Selecione um cliente para começar a explorar.
                  </p>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-lg p-3 sm:p-4 max-w-sm mx-auto">
                    <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-indigo-600">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-500 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="font-medium text-xs sm:text-sm">Aguardando seleção de cliente</span>
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
