import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheck, faSpinner, faBullseye, faTag, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

// Função para obter descrições resumidas dos códigos ABA
const getABACodesSummary = (procedure) => {
  if (!procedure) return null;
  
  try {
    const steps = typeof procedure === 'string' ? JSON.parse(procedure) : procedure;
    const allCodes = new Set();
    
    steps.forEach(step => {
      if (step.sd) allCodes.add('SD');
      if (step.r || step.R) allCodes.add('R');
      if (step.c || step.C) allCodes.add('C');
      if (step.dica) allCodes.add('Dica');
    });
    
    return allCodes.size > 0 ? Array.from(allCodes).sort() : null;
  } catch (e) {
    return null;
  }
};

// Função de cores para tags melhorada
const getTagColor = (tag) => {
    const colors = {
        "Mando": { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
        "Tato": { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
        "Ecoico": { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
        "Intraverbal": { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
    };
    return colors[tag] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" };
};

// SOLUÇÃO: As props 'onRemove' e 'isRemoving' foram removidas.
const ProgramCard = ({ program, onAssign, isAssigning, isPatientSelected, isAssigned }) => {
  
  const objectiveText = program.objective ? program.objective : 'Nenhum objetivo definido.';

  const renderButton = () => {
    if (isAssigned) {
      return (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 shadow-sm">
          <div className="bg-white bg-opacity-20 p-1 rounded-full">
            <FontAwesomeIcon icon={faCheck} className="text-sm" />
          </div>
          <span className="font-semibold text-sm">Já Atribuído</span>
        </div>
      );
    } else {
      return (
        <button
          onClick={() => onAssign(program.id)}
          disabled={!isPatientSelected || isAssigning}
          title={!isPatientSelected ? 'Selecione um cliente para atribuir' : 'Atribuir ao cliente'}
          className={`
            px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 w-full shadow-sm transform
            ${!isPatientSelected 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-105 active:scale-95'
            }
          `}
        >
          {isAssigning ? (
            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
          ) : (
            <>
              <div className={`p-1 rounded-full ${
                !isPatientSelected ? 'bg-gray-300' : 'bg-white bg-opacity-20'
              }`}>
                <FontAwesomeIcon icon={faPlus} className="text-sm" />
              </div>
              <span>Atribuir Programa</span>
            </>
          )}
        </button>
      );
    }
  };

  return (
    <div className={`
      bg-white border-2 rounded-xl shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1
      ${isAssigned ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-gray-200 hover:border-indigo-300'}
    `}>
      <div className="p-6">
        {/* Cabeçalho do programa */}
        <div className="flex items-start justify-between mb-4">
          <h3 className={`text-lg font-bold leading-tight flex-1 pr-3 ${
            isAssigned ? 'text-green-800' : 'text-gray-800'
          }`}>
            {program.name}
          </h3>
          {isAssigned && (
            <div className="bg-green-100 p-2 rounded-full">
              <FontAwesomeIcon icon={faCheck} className="text-green-600 text-sm" />
            </div>
          )}
        </div>
        
        {/* Seção de objetivos */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faBullseye} className="text-indigo-500 mr-2" />
            <h4 className="text-sm font-semibold text-gray-700">Objetivos</h4>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed" title={objectiveText}>
            {objectiveText.length > 120 ? `${objectiveText.substring(0, 120)}...` : objectiveText}
          </p>
        </div>

        {/* Seção de componentes ABA */}
        {(() => {
          const abaCodes = getABACodesSummary(program.procedure);
          return abaCodes && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <FontAwesomeIcon icon={faInfoCircle} className="text-emerald-500 mr-2" />
                <h4 className="text-sm font-semibold text-gray-700">Componentes ABA</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {abaCodes.map(code => (
                  <span
                    key={code}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                    title={
                      code === 'SD' ? 'Estímulo Discriminativo' :
                      code === 'R' ? 'Resposta' :
                      code === 'C' ? 'Consequência' :
                      code === 'Dica' ? 'Prompt' : code
                    }
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
        
        {/* Tags (se houver) */}
        {program.tags && program.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {program.tags.slice(0, 3).map((tag, index) => {
              const tagColors = getTagColor(tag);
              return (
                <span
                  key={index}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    tagColors.bg
                  } ${tagColors.text} ${tagColors.border}`}
                >
                  <FontAwesomeIcon icon={faTag} className="mr-1" />
                  {tag}
                </span>
              );
            })}
            {program.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                +{program.tags.length - 3} mais
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Footer com botão de ação */}
      <div className={`border-t p-4 ${
        isAssigned ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        {renderButton()}
      </div>
    </div>
  );
};

export default ProgramCard;
