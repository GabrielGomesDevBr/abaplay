import React from 'react';
import ProgramCard from './ProgramCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';

const ProgramLibrary = ({ programs, onAssign, isPatientSelected, assigningId, assignedPrograms }) => {
  if (!programs || programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-full">
        <FontAwesomeIcon icon={faBookOpen} className="text-5xl text-gray-300 mb-4" />
        <p className="text-lg font-medium text-gray-600">Nenhum programa encontrado</p>
        <p className="text-sm mt-1">Esta disciplina ainda não possui programas cadastrados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {programs.map(program => {
        // --- CORREÇÃO ---
        // A verificação agora garante que 'assignedPrograms' é um array antes de
        // tentar usar o '.some()'. Isso evita erros.
        // A comparação 'p.id == program.id' usa '==' para lidar com casos
        // onde um ID pode ser número e o outro string.
        const isAssigned = Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.id == program.id);
        
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
