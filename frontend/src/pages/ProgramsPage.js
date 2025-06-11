// -----------------------------------------------------------------------------
// Arquivo da Página de Programas (frontend/src/pages/ProgramsPage.js)
// -----------------------------------------------------------------------------
// - CORRIGIDO: A lógica para verificar se um programa está atribuído ('isAssigned')
//   foi atualizada para usar a nova estrutura de dados `selectedPatient.assigned_programs`,
//   que é um array de objetos. Isto restaura o feedback visual correto do botão.
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePrograms } from '../context/ProgramContext';
import { usePatients } from '../context/PatientContext';
import ProgramCard from '../components/program/ProgramCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faBookOpen } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const { allProgramsData, isLoading: programsAreLoading } = usePrograms();
  const { selectedPatient, assignProgram } = usePatients();
  const [assigningId, setAssigningId] = useState(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const activeArea = queryParams.get('area') || 'Psicologia'; 
  const activeProgramId = queryParams.get('programId');
  const searchTerm = queryParams.get('search') || '';

  let programsInArea = allProgramsData[activeArea] || [];
  let programsToShow = [];

  if (activeProgramId) {
    programsToShow = programsInArea.filter(p => p.id === activeProgramId);
  } else if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    programsToShow = programsInArea.filter(p => 
        p.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        (p.tag && p.tag.toLowerCase().includes(lowerCaseSearchTerm))
    );
  } else {
    programsToShow = programsInArea;
  }

  const handleAssign = async (programId) => {
    setAssigningId(programId);
    try {
      await assignProgram(programId);
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      alert(error.message || "Não foi possível atribuir o programa.");
    } finally {
      setAssigningId(null);
    }
  };

  if (programsAreLoading) {
    return (
      <div className="flex items-center justify-center h-full text-center p-10">
        <div>
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500 mb-4" />
          <p className="text-gray-500">A carregar biblioteca de programas...</p>
        </div>
      </div>
    );
  }
  
  const formattedAreaName = activeArea.replace(/([A-Z])/g, ' $1').trim();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Biblioteca de Programas: {formattedAreaName}</h1>
      
      {!selectedPatient && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-yellow-800">
                Selecione um cliente na barra lateral para poder atribuir programas.
            </p>
        </div>
      )}

      {programsToShow.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {programsToShow.map(program => {
            // CORREÇÃO: A verificação agora é feita no array de objetos `assigned_programs`.
            const isAssigned = selectedPatient?.assigned_programs?.some(p => p.id === program.id);

            return (
              <ProgramCard
                key={program.id}
                program={program}
                onAssign={handleAssign}
                isAssigned={isAssigned}
                isAssigning={assigningId === program.id}
                isPatientSelected={!!selectedPatient}
              />
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-full">
            <FontAwesomeIcon icon={faBookOpen} className="text-5xl text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600">Nenhum programa encontrado</p>
            <p className="mt-1 text-sm">
              {searchTerm 
                ? `A sua busca por "${searchTerm}" não encontrou resultados em ${formattedAreaName}.`
                : `Não existem programas disponíveis para a área de ${formattedAreaName}.`
              }
            </p>
        </div>
      )}
    </div>
  );
};

export default ProgramsPage;
