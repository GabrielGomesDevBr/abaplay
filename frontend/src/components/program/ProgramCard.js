import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';

const getTagColor = (tag) => {
    // A função de cores é mantida para uso futuro.
    const colors = {
        "Mando": "bg-blue-100 text-blue-800", "Tato": "bg-green-100 text-green-800",
        "Ecoico": "bg-yellow-100 text-yellow-800", "Intraverbal": "bg-purple-100 text-purple-800",
        // ...outras cores
    };
    return colors[tag] || "bg-gray-200 text-gray-700";
}

const ProgramCard = ({ program, onAssign, isAssigning, isPatientSelected, isAssigned }) => {
  
  // --- CORREÇÃO PRINCIPAL ---
  // A lógica agora verifica a propriedade 'objective' (singular), que é o que a API envia.
  const objectiveText = program.objective ? program.objective : 'Nenhum objetivo definido.';

  return (
    <div className="bg-white rounded-xl shadow-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-base font-bold text-gray-800 leading-tight pr-2">
            {program.name}
          </h3>
          {/* A funcionalidade de tag pode ser reativada no futuro. */}
        </div>
        <p className="text-sm font-semibold text-indigo-700 mb-1">Objetivos:</p>
        {/* CORREÇÃO: Exibe o texto do objetivo diretamente. */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3" title={objectiveText}>
          {objectiveText}
        </p>
      </div>
      <div className="program-card-actions bg-gray-50 px-5 py-3 rounded-b-xl border-t border-gray-100 text-right">
        <button
          onClick={() => onAssign(program.id)}
          disabled={!isPatientSelected || isAssigned || isAssigning}
          title={!isPatientSelected ? 'Selecione um cliente para atribuir' : (isAssigned ? 'Programa já atribuído' : 'Atribuir ao cliente')}
          className={`text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-200 w-32 text-center shadow-sm 
            ${isAssigned ? 'bg-emerald-500 text-white cursor-default' : 
            !isPatientSelected ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95'}`}
        >
          {isAssigning ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : isAssigned ? (
            <>
              <FontAwesomeIcon icon={faCheck} className="mr-2" /> Atribuído
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} className="mr-2" /> Atribuir
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProgramCard;
