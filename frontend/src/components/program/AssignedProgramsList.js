import React, { useState, useMemo } from 'react';
import { usePatients } from '../../context/PatientContext';
import { usePrograms } from '../../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faEye, faEyeSlash, faTrashAlt, faSpinner, faArchive } from '@fortawesome/free-solid-svg-icons';

// A função de cor da tag permanece a mesma
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


const AssignedProgramsList = () => {
  const { 
    selectedPatient, 
    toggleProgramStatus, 
    removeProgram,
    selectProgramForProgress, 
    programForProgress 
  } = usePatients();

  const { getProgramById, isLoading: programsAreLoading } = usePrograms();
  const [togglingId, setTogglingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // A lógica de negócio original para os botões permanece intacta.
  const handleToggleStatus = async (programId, currentStatus) => {
    setTogglingId(programId);
    try {
      await toggleProgramStatus(programId, currentStatus);
    } catch (error) {
      console.error("Falha ao mudar status do programa:", error);
      // Evitando alert() como boa prática, mas mantendo o log.
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
  }

  const handleSelectForProgress = (program) => {
    if (program.status === 'active') {
        selectProgramForProgress(program);
    } else {
        // Evitando alert()
        console.warn("Tentativa de selecionar programa arquivado para progresso.");
    }
  };

  // Lógica original para buscar detalhes dos programas.
  const assignedProgramsDetails = useMemo(() => {
    if (!selectedPatient || !selectedPatient.assigned_programs) {
      return [];
    }
    return selectedPatient.assigned_programs
      .map(link => {
          const programDetails = getProgramById(link.id);
          // Adicionamos a propriedade 'area' aqui, que vem de programDetails
          return programDetails ? { ...programDetails, status: link.status } : null;
      })
      .filter(p => p !== null);
  }, [selectedPatient, getProgramById]);

  // Lógica original para filtrar entre ativos e arquivados.
  const programsToShow = useMemo(() => {
    return showArchived 
      ? assignedProgramsDetails
      : assignedProgramsDetails.filter(p => p.status === 'active');
  }, [assignedProgramsDetails, showArchived]);

  // Lógica de agrupamento mantida.
  const groupedPrograms = useMemo(() => {
    return programsToShow.reduce((acc, program) => {
      const area = program.area || 'Outros'; // Chave para agrupar. 'Outros' como fallback.
      if (!acc[area]) {
        acc[area] = [];
      }
      acc[area].push(program);
      return acc;
    }, {});
  }, [programsToShow]);

  // <<< TOQUE FINAL APLICADO AQUI >>>
  // As chaves (nomes das áreas) agora são ordenadas alfabeticamente.
  const programAreas = Object.keys(groupedPrograms).sort();

  if (programsAreLoading) {
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
          programAreas.map(area => (
            <li key={area}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-3 py-2 rounded-md sticky top-0 shadow-sm">
                {area}
              </h4>
              <ul className="space-y-2 pt-3">
                {groupedPrograms[area].map(program => {
                  const isSelectedForProgress = programForProgress?.id === program.id;
                  const isArchived = program.status === 'archived';
                  
                  // A renderização do item da lista original foi mantida aqui dentro
                  return (
                    <li key={program.id} className={`p-2 rounded-lg flex justify-between items-center transition-all duration-200 ${
                        isSelectedForProgress ? 'bg-indigo-100 ring-2 ring-indigo-300' : 'hover:bg-gray-100'
                      } ${isArchived ? 'bg-gray-100 opacity-70' : ''}`}
                    >
                      <div className={`truncate pr-2 ${isArchived && 'italic text-gray-500'}`}>
                        <p className="text-sm font-medium truncate" title={program.title}>
                          {program.title}
                        </p>
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${getTagColor(program.tag)}`}>
                          {program.tag || 'N/A'}
                        </span>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0">
                        <button onClick={() => handleSelectForProgress(program)} title={isArchived ? "Reative para registrar progresso" : "Ver Progresso/Registrar Sessão"} disabled={isArchived} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-indigo-600 hover:bg-indigo-100 disabled:text-gray-400 disabled:bg-transparent disabled:cursor-not-allowed">
                          <FontAwesomeIcon icon={faChartLine} className="fa-fw" />
                        </button>
                        <button title={isArchived ? "Reativar Programa" : "Arquivar Programa"} onClick={() => handleToggleStatus(program.id, program.status)} disabled={togglingId === program.id} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-yellow-600 hover:bg-yellow-100 disabled:opacity-50">
                          {togglingId === program.id ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> : <FontAwesomeIcon icon={isArchived ? faEye : faEyeSlash} className="fa-fw" />}
                        </button>
                        <button title="Remover Programa Permanentemente" onClick={() => handleRemove(program.id)} disabled={removingId === program.id} className="p-2 rounded-full w-9 h-9 flex items-center justify-center transition-colors text-red-500 hover:bg-red-100 disabled:opacity-50">
                          {removingId === program.id ? <FontAwesomeIcon icon={faSpinner} className="fa-spin fa-fw" /> : <FontAwesomeIcon icon={faTrashAlt} className="fa-fw" />}
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
            {assignedProgramsDetails.length === 0 ? 'Nenhum programa atribuído.' : 'Nenhum programa ativo para exibir.'}
          </li>
        )}
      </ul>
    </div>
  );
};

export default AssignedProgramsList;
