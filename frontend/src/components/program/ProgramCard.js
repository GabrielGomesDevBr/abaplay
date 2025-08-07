import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// O ícone de lixeira não é mais necessário aqui.
import { faPlus, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';

// A função de cores é mantida.
const getTagColor = (tag) => {
    const colors = {
        "Mando": "bg-blue-100 text-blue-800", "Tato": "bg-green-100 text-green-800",
        "Ecoico": "bg-yellow-100 text-yellow-800", "Intraverbal": "bg-purple-100 text-purple-800",
    };
    return colors[tag] || "bg-gray-200 text-gray-700";
}

// SOLUÇÃO: As props 'onRemove' e 'isRemoving' foram removidas.
const ProgramCard = ({ program, onAssign, isAssigning, isPatientSelected, isAssigned }) => {
  
  const objectiveText = program.objective ? program.objective : 'Nenhum objetivo definido.';

  const renderButton = () => {
    // Se o programa já está atribuído, mostra o botão "Atribuído" (verde e desabilitado).
    if (isAssigned) {
      return (
        <button
          disabled={true} // Sempre desabilitado
          title="Este programa já foi atribuído ao cliente"
          className={`text-sm font-semibold py-2 px-4 rounded-lg w-32 text-center shadow-sm 
            bg-green-500 text-white cursor-default`} // Cor verde, cursor padrão
        >
          <FontAwesomeIcon icon={faCheck} className="mr-2" /> Atribuído
        </button>
      );
    } else {
      // Se não, mostra o botão "Atribuir" (azul e funcional).
      return (
        <button
          onClick={() => onAssign(program.id)}
          disabled={!isPatientSelected || isAssigning}
          title={!isPatientSelected ? 'Selecione um cliente para atribuir' : 'Atribuir ao cliente'}
          className={`text-sm font-semibold py-2 px-4 rounded-lg transition-all duration-200 w-32 text-center shadow-sm 
            ${!isPatientSelected ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'}`} // Cor azul
        >
          {isAssigning ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} className="mr-2" /> Atribuir
            </>
          )}
        </button>
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-base font-bold text-gray-800 leading-tight pr-2">
            {program.name}
          </h3>
        </div>
        <p className="text-sm font-semibold text-indigo-700 mb-1">Objetivos:</p>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3" title={objectiveText}>
          {objectiveText}
        </p>
      </div>
      <div className="program-card-actions bg-gray-50 px-5 py-3 rounded-b-xl border-t border-gray-100 text-right">
        {renderButton()}
      </div>
    </div>
  );
};

export default ProgramCard;
