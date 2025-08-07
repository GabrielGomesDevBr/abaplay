import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faEye, faEyeSlash, faTrashAlt, faSpinner, faArchive } from '@fortawesome/free-solid-svg-icons';

const AssignedProgramsList = () => {
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

  // --- CORREÇÃO PRINCIPAL ---
  // A função `handleRemove` agora recebe o `programId` e o passa para o contexto.
  const handleRemove = async (programId) => {
    setRemovingId(programId); // Usamos o programId para o feedback de loading
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
      // O objeto 'program' vindo da API contém 'discipline_name'
      const discipline = program.discipline_name || 'Programas'; 
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
    <div className="md:col-span-1 lg:col-span-1 bg-white p-5 rounded-lg shadow-md border border-gray-200 flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800 flex items-center">
            <FontAwesomeIcon icon={faArchive} className="mr-2 text-gray-400" />
            Programas Atribuídos
        </h3>
        <div className="flex items-center">
            <input 
                type="checkbox"
                id="show-archived"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="show-archived" className="ml-2 text-xs font-medium text-gray-600">
                Mostrar Arquivados
            </label>
        </div>
      </div>
      
      <ul className="space-y-4 overflow-y-auto flex-1 -mx-2 px-2 max-h-[calc(100vh-450px)]">
        {programsToShow.length > 0 ? (
          programDisciplines.map(discipline => (
            <li key={discipline}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-3 py-2 rounded-md sticky top-0 shadow-sm">
                {discipline}
              </h4>
              <ul className="space-y-2 pt-3">
                {groupedPrograms[discipline].map(program => {
                  const isArchived = program.status === 'archived';
                  
                  return (
                    <li key={program.assignment_id} className={`p-2 rounded-lg flex justify-between items-center transition-all duration-200 hover:bg-gray-100 ${isArchived ? 'bg-gray-100 opacity-70' : ''}`}>
                      <div className={`truncate pr-2 ${isArchived && 'italic text-gray-500'}`}>
                        <p className="text-sm font-medium truncate" title={program.program_name}>
                          {program.program_name}
                        </p>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <Link to={`/session/${program.assignment_id}`} title="Iniciar Sessão" className={`p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-indigo-600 hover:bg-indigo-100 ${isArchived ? 'text-gray-400 bg-transparent cursor-not-allowed pointer-events-none' : ''}`}>
                          <FontAwesomeIcon icon={faChartLine} className="fa-fw" />
                        </Link>
                        
                        <button title={isArchived ? "Reativar Programa" : "Arquivar Programa"} onClick={() => handleToggleStatus(program.assignment_id, program.status)} disabled={togglingId === program.assignment_id} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-yellow-600 hover:bg-yellow-100 disabled:opacity-50">
                          {togglingId === program.assignment_id ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> : <FontAwesomeIcon icon={isArchived ? faEye : faEyeSlash} className="fa-fw" />}
                        </button>

                        {/* --- CORREÇÃO PRINCIPAL 2 --- */}
                        {/* O botão de remover agora passa o `program.program_id` */}
                        <button title="Remover Programa Permanentemente" onClick={() => handleRemove(program.program_id)} disabled={removingId === program.program_id} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-red-500 hover:bg-red-100 disabled:opacity-50">
                          {removingId === program.program_id ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> : <FontAwesomeIcon icon={faTrashAlt} className="fa-fw" />}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))
        ) : (
          <li className="text-center text-gray-500 text-xs py-4">
            {assignedPrograms.length === 0 ? 'Nenhum programa atribuído.' : 'Nenhum programa ativo para exibir.'}
          </li>
        )}
      </ul>
    </div>
  );
};

export default AssignedProgramsList;
