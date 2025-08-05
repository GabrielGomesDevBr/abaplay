import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';

// A função getTagColor é mantida caso você decida adicionar as tags de volta à API no futuro.
const getTagColor = (tag) => {
    const colors = {
        "Mando": "bg-blue-100 text-blue-800", "Tato": "bg-green-100 text-green-800",
        "Ecoico": "bg-yellow-100 text-yellow-800", "Intraverbal": "bg-purple-100 text-purple-800",
        "Imitação": "bg-pink-100 text-pink-800", "Contato Visual": "bg-red-100 text-red-800",
        "Comportamento Ouvinte": "bg-orange-100 text-orange-800", "Brincar": "bg-teal-100 text-teal-800",
        "Habilidades Sociais": "bg-cyan-100 text-cyan-800", "Pareamento": "bg-gray-300 text-gray-800",
        "Coordenação Fina": "bg-lime-200 text-lime-800", "Coordenação Grossa": "bg-emerald-200 text-emerald-800",
        "Processamento Sensorial": "bg-amber-200 text-amber-800", "Percepção Visual": "bg-sky-200 text-sky-800",
        "AVDs": "bg-violet-200 text-violet-800", "Brincar T.O.": "bg-fuchsia-200 text-fuchsia-800",
        "Funções Executivas T.O.": "bg-rose-200 text-rose-800", "Esquema Corporal": "bg-indigo-200 text-indigo-800",
        "Lateralidade": "bg-yellow-300 text-yellow-900", "Organização Espaço-Temporal": "bg-green-300 text-green-900",
        "Coordenação Global": "bg-blue-300 text-blue-900", "Coordenação Fina Psicomot.": "bg-lime-300 text-lime-900",
        "Equilíbrio e Ritmo": "bg-pink-300 text-pink-900", "Grafomotricidade": "bg-purple-300 text-purple-900",
        "Pré-Alfabetização": "bg-red-300 text-red-900", "Leitura e Escrita": "bg-orange-300 text-orange-900",
        "Matemática Psicoped.": "bg-teal-300 text-teal-900", "Atenção e Memória": "bg-cyan-300 text-cyan-900",
        "Organização de Estudos": "bg-gray-400 text-gray-900", "Percepção Auditiva": "bg-fuchsia-300 text-fuchsia-900",
        "Expressão Vocal/Musical": "bg-rose-300 text-rose-900", "Ritmo e Movimento": "bg-sky-300 text-sky-900",
        "Interação Musical": "bg-violet-300 text-violet-900", "Relaxamento Musical": "bg-emerald-300 text-emerald-900",
        "Linguagem Receptiva": "bg-blue-400 text-blue-900", "Linguagem Expressiva": "bg-green-400 text-green-900",
        "Articulação/Fonologia": "bg-yellow-400 text-yellow-900", "Fluência": "bg-purple-400 text-purple-900",
        "Motricidade Orofacial": "bg-pink-400 text-pink-900", "Pragmática (Fono)": "bg-orange-400 text-orange-900"
    };
    return colors[tag] || "bg-gray-200 text-gray-700";
}

// O componente agora é mais simples. Ele recebe o objeto 'program' completo da API.
const ProgramCard = ({ program, onAssign, isAssigning, isPatientSelected }) => {
  
  // A verificação se o programa está atribuído agora vem diretamente do próprio objeto.
  const isAssigned = program.is_assigned;

  // Formata a lista de objetivos para exibição.
  const objectivesText = program.objectives && program.objectives.length > 0
    ? program.objectives.map(o => o.description).join('; ')
    : 'Nenhum objetivo definido.';

  return (
    <div className="bg-white rounded-xl shadow-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          {/* O título agora vem de 'program.name' */}
          <h3 className="text-base font-bold text-gray-800 leading-tight pr-2">
            {program.name}
          </h3>
          {/* A exibição de 'tag' foi removida temporariamente pois a API atual não fornece este dado.
            Para reativar, adicione 'p.tag' à query SQL no 'programController.js'
            e descomente o span abaixo.
            
            <span className={`tag text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${getTagColor(program.tag)} flex-shrink-0`}>
              {program.tag || 'N/A'}
            </span>
          */}
        </div>
        <p className="text-sm font-semibold text-indigo-700 mb-1">Objetivos:</p>
        {/* Os objetivos agora vêm de 'program.objectives' */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3" title={objectivesText}>
          {objectivesText}
        </p>
      </div>
      <div className="program-card-actions bg-gray-50 px-5 py-3 rounded-b-xl border-t border-gray-100 text-right">
        <button
          onClick={() => onAssign(program.id)}
          // A lógica de desabilitar o botão agora usa a flag 'isAssigned' derivada de 'program.is_assigned'.
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
