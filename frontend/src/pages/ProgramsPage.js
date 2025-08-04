import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePrograms } from '../context/ProgramContext';
import { usePatients } from '../context/PatientContext';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const { allProgramsData, isLoading: programsAreLoading } = usePrograms();
  const { selectedPatient, assignProgram } = usePatients();
  const [assigningId, setAssigningId] = useState(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  const activeArea = queryParams.get('area') || 'Psicologia'; 
  const searchTerm = queryParams.get('search') || '';

  let programsInArea = allProgramsData[activeArea] || [];
  let programsToShow = [];

  if (searchTerm) {
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

      <ProgramLibrary 
        programs={programsToShow} 
        onAssign={handleAssign} 
        isPatientSelected={!!selectedPatient} 
        assigningId={assigningId} 
        assignedPrograms={selectedPatient?.assigned_programs} 
      />
    </div>
  );
};

export default ProgramsPage;