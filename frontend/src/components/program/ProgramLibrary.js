import React from 'react';
import { usePrograms } from '../../context/ProgramContext';
import ProgramCard from './ProgramCard';
import './ProgramLibrary.css';

// CORREÇÃO: Adicionar onRemove e removingId às props do componente.
const ProgramLibrary = ({ onAssign, onRemove, assigningId, removingId, assignedPrograms, isPatientSelected }) => {
  const { disciplines, isLoading, error } = usePrograms();

  if (isLoading) {
    return <div className="loading-message">Carregando biblioteca de programas...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!disciplines || disciplines.length === 0) {
    return <div className="empty-message">Nenhum programa encontrado na biblioteca.</div>;
  }

  return (
    <div className="program-library">
      {disciplines.map((discipline) => (
        <details key={discipline.discipline_id} className="discipline-details" open>
          <summary className="discipline-summary">{discipline.discipline_name}</summary>
          <div className="discipline-content">
            {discipline.areas?.map((area) => (
              <details key={area.area_id} className="area-details" open>
                <summary className="area-summary">{area.area_name}</summary>
                <div className="area-content">
                  {area.sub_areas?.map((subArea) => (
                    <div key={subArea.sub_area_id} className="sub-area-container">
                      <h4 className="sub-area-header">{subArea.sub_area_name}</h4>
                      <div className="programs-grid">
                        {subArea.programs?.map((program) => {
                          const isAssigned = Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.program_id === program.id);
                          return (
                            <ProgramCard
                              key={program.id}
                              program={program}
                              onAssign={onAssign}
                              // CORREÇÃO: Passar a função onRemove para o card.
                              onRemove={onRemove}
                              isAssigned={isAssigned}
                              isAssigning={assigningId === program.id}
                              // CORREÇÃO: Passar o estado de remoção para o card.
                              isRemoving={removingId === program.id}
                              isPatientSelected={isPatientSelected}
                            />
                          );
                        })}
                        {(!subArea.programs || subArea.programs.length === 0) && (
                          <p className="empty-message-small">Nenhum programa nesta sub-área.</p>
                        )}
                      </div>
                    </div>
                  ))}
                   {(!area.sub_areas || area.sub_areas.length === 0) && (
                      <p className="empty-message-small">Nenhuma sub-área encontrada.</p>
                    )}
                </div>
              </details>
            ))}
            {(!discipline.areas || discipline.areas.length === 0) && (
              <p className="empty-message-small">Nenhuma área de atuação encontrada para esta disciplina.</p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
};

export default ProgramLibrary;
