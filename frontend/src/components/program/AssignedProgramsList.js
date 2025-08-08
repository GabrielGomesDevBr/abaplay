import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faEye, faEyeSlash, faTrashAlt, faSpinner, faArchive, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

// O componente recebe onProgramSelect e selectedProgramId da ClientsPage
const AssignedProgramsList = ({ onProgramSelect, selectedProgramId }) => {
  const { 
    selectedPatient, 
    toggleProgramStatus, 
    removeProgram,
    isLoading: patientIsLoading
  } = usePatients();

  const [togglingId, setTogglingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleToggleStatus = async (assignmentId, currentStatus) => {
    setTogglingId(assignmentId);
    try {
      await toggleProgramStatus(assignmentId, currentStatus);
    } catch (error) {
      console.error("Falha ao mudar status do programa:", error);
    } finally {
      setTogglingId(null);
    }
  };
  
  const handleRemove = async (programId) => {
    setRemovingId(programId);
    try {
        await removeProgram(programId);
    } catch(error) {
        console.error("Falha ao remover programa:", error);
    } finally {
        setRemovingId(null);
    }
  };

  const assignedPrograms = useMemo(() => {
    return selectedPatient?.assigned_programs || [];
  }, [selectedPatient]);

  const programsToShow = useMemo(() => {
    return showArchived 
      ? assignedPrograms
      : assignedPrograms.filter(p => p.status !== 'archived');
  }, [assignedPrograms, showArchived]);

  const groupedPrograms = useMemo(() => {
    return programsToShow.reduce((acc, program) => {
      // Com a correção no Context, 'discipline_name' agora estará presente
      const discipline = program.discipline_name || 'Geral'; 
      if (!acc[discipline]) {
        acc[discipline] = [];
      }
      acc[discipline].push(program);
      return acc;
    }, {});
  }, [programsToShow]);

  const programDisciplines = Object.keys(groupedPrograms).sort();

  if (patientIsLoading) {
    return <div className="text-center py-4"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-indigo-500" /></div>;
  }
  
  return (
    <div className="md:col-span-1 lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Cabeçalho redesenhado */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center">
              <FontAwesomeIcon icon={faArchive} className="mr-3" />
              Programas Atribuídos
            </h3>
            <p className="text-emerald-100 text-sm mt-1">Lista de programas de intervenção do cliente</p>
          </div>
        </div>
      </div>
      
      {/* Controles */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
        <div className="flex items-center justify-center">
          <div className="bg-white border-2 border-emerald-200 rounded-lg p-3 flex items-center space-x-3">
            <input 
                type="checkbox"
                id="show-archived"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="show-archived" className="text-sm font-medium text-gray-700 flex items-center">
              <FontAwesomeIcon icon={faEyeSlash} className="mr-2 text-gray-500" />
              Mostrar Programas Arquivados
            </label>
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-y-auto flex-1 max-h-[calc(100vh-450px)]">
        {programsToShow.length > 0 ? (
          <div className="space-y-6">
            {programDisciplines.map(discipline => {
              const disciplineColors = {
                'Fonoaudiologia': { bg: 'from-blue-500 to-indigo-600', light: 'from-blue-50 to-indigo-50', border: 'border-blue-200' },
                'Psicologia': { bg: 'from-red-500 to-pink-600', light: 'from-red-50 to-pink-50', border: 'border-red-200' },
                'Musicoterapia': { bg: 'from-purple-500 to-violet-600', light: 'from-purple-50 to-violet-50', border: 'border-purple-200' },
                'TerapiaOcupacional': { bg: 'from-orange-500 to-amber-600', light: 'from-orange-50 to-amber-50', border: 'border-orange-200' },
                'Psicomotricidade': { bg: 'from-green-500 to-emerald-600', light: 'from-green-50 to-emerald-50', border: 'border-green-200' },
                'Psicopedagogia': { bg: 'from-yellow-500 to-orange-600', light: 'from-yellow-50 to-orange-50', border: 'border-yellow-200' },
              };
              const colors = disciplineColors[discipline] || { bg: 'from-gray-500 to-slate-600', light: 'from-gray-50 to-slate-50', border: 'border-gray-200' };

              return (
                <div key={discipline} className={`bg-gradient-to-r ${colors.light} border-2 ${colors.border} rounded-lg overflow-hidden`}>
                  <div className={`bg-gradient-to-r ${colors.bg} px-4 py-3`}>
                    <h4 className="text-white font-bold flex items-center">
                      <FontAwesomeIcon icon={faLayerGroup} className="mr-2" />
                      {discipline}
                      <span className="ml-auto bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                        {groupedPrograms[discipline].length} programa{groupedPrograms[discipline].length !== 1 ? 's' : ''}
                      </span>
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {groupedPrograms[discipline].map(program => {
                      const isArchived = program.status === 'archived';
                      const isSelected = program.assignment_id === selectedProgramId;

                      return (
                        <div key={program.assignment_id} 
                            onClick={() => !isArchived && onProgramSelect(program)}
                            className={`
                              p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer transform
                              ${isSelected 
                                ? 'bg-white border-emerald-400 shadow-lg scale-105' 
                                : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md hover:scale-102'
                              } 
                              ${isArchived 
                                ? 'opacity-60 cursor-not-allowed bg-gray-50' 
                                : ''
                              }
                            `}>
                          <div className="flex justify-between items-center">
                            <div className={`flex-1 mr-4 ${isArchived ? 'italic text-gray-500' : ''}`}>
                              <p className="text-sm font-semibold text-gray-800 mb-1" title={program.program_name}>
                                {program.program_name}
                              </p>
                              {isSelected && (
                                <div className="flex items-center text-xs text-emerald-600 mt-1">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                                  Programa selecionado
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 flex-shrink-0">
                              <Link 
                                to={`/session/${program.assignment_id}`} 
                                title="Iniciar Sessão" 
                                onClick={(e) => e.stopPropagation()}
                                className={`
                                  p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all transform hover:scale-110
                                  ${isArchived 
                                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none' 
                                    : 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'
                                  }
                                `}>
                                <FontAwesomeIcon icon={faChartLine} className="fa-fw" />
                              </Link>
                              
                              <button 
                                title={isArchived ? "Reativar Programa" : "Arquivar Programa"} 
                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(program.assignment_id, program.status); }} 
                                disabled={togglingId === program.assignment_id} 
                                className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all text-yellow-600 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 transform hover:scale-110"
                              >
                                {togglingId === program.assignment_id 
                                  ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> 
                                  : <FontAwesomeIcon icon={isArchived ? faEye : faEyeSlash} className="fa-fw" />
                                }
                              </button>

                              <button 
                                title="Remover Programa Permanentemente" 
                                onClick={(e) => { e.stopPropagation(); handleRemove(program.program_id); }} 
                                disabled={removingId === program.program_id} 
                                className="p-2 rounded-full w-10 h-10 flex items-center justify-center transition-all text-red-500 bg-red-100 hover:bg-red-200 disabled:opacity-50 transform hover:scale-110"
                              >
                                {removingId === program.program_id 
                                  ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> 
                                  : <FontAwesomeIcon icon={faTrashAlt} className="fa-fw" />
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <FontAwesomeIcon icon={faArchive} className="text-4xl text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                {assignedPrograms.length === 0 
                  ? 'Nenhum programa atribuído' 
                  : 'Nenhum programa ativo para exibir'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {assignedPrograms.length === 0
                  ? 'Adicione programas na página de Programas'
                  : 'Ative a opção "Mostrar Arquivados" para ver todos'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignedProgramsList;
