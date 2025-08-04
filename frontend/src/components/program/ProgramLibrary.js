import React from 'react';
import ProgramCard from './ProgramCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';

const ProgramLibrary = ({ programs, onAssign, isPatientSelected, assigningId, assignedPrograms }) => {
  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-full">
        <FontAwesomeIcon icon={faBookOpen} className="text-5xl text-gray-300 mb-4" />
        <p className="text-lg font-medium text-gray-600">Nenhum programa encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {programs.map(program => {
        const isAssigned = assignedPrograms?.some(p => p.id === program.id);
        return (
          <ProgramCard
            key={program.id}
            program={program}
            onAssign={onAssign}
            isAssigned={isAssigned}
            isAssigning={assigningId === program.id}
            isPatientSelected={isPatientSelected}
          />
        );
      })}
    </div>
  );
};

export default ProgramLibrary;