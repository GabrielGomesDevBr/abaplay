import React from 'react';
import { usePrograms } from '../../context/ProgramContext';
import ProgramCard from './ProgramCard';
import './ProgramLibrary.css';

// SOLUÇÃO: As props 'onRemove' e 'removingId' foram removidas,
// pois esta tela não terá mais a função de remover.
const ProgramLibrary = ({ onAssign, assigningId, assignedPrograms, isPatientSelected }) => {
  const { disciplines, isLoading, error } = usePrograms();

  if (isLoading) {
    return <div className="loading-message">Carregando biblioteca de programas...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!disciplines || Object.keys(disciplines).length === 0) {
    return <div className="empty-message">Nenhum programa encontrado na biblioteca.</div>;
  }

  return (
    <div className="program-library">
      {Object.keys(disciplines).map((disciplineName) => {
        const areas = disciplines[disciplineName];
        return (
          <details key={disciplineName} className="discipline-details" open>
            <summary className="discipline-summary">{disciplineName}</summary>
            <div className="discipline-content">
              {Object.keys(areas).map((areaName) => {
                const subAreas = areas[areaName];
                return (
                  <details key={areaName} className="area-details" open>
                    <summary className="area-summary">{areaName}</summary>
                    <div className="area-content">
                      {Object.keys(subAreas).map((subAreaName) => {
                        const programs = subAreas[subAreaName];
                        return (
                          <div key={subAreaName} className="sub-area-container">
                            <h4 className="sub-area-header">{subAreaName}</h4>
                            <div className="programs-grid">
                              {programs?.map((program) => {
                                const isAssigned = Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.program_id === program.id);
                                return (
                                  <ProgramCard
                                    key={program.id}
                                    program={program}
                                    onAssign={onAssign}
                                    // A lógica de remoção não é mais passada para o card.
                                    isAssigned={isAssigned}
                                    isAssigning={assigningId === program.id}
                                    isPatientSelected={isPatientSelected}
                                  />
                                );
                              })}
                              {(!programs || programs.length === 0) && (
                                <p className="empty-message-small">Nenhum programa nesta sub-área.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                       {(!subAreas || Object.keys(subAreas).length === 0) && (
                          <p className="empty-message-small">Nenhuma sub-área encontrada.</p>
                        )}
                    </div>
                  </details>
                );
              })}
              {(!areas || Object.keys(areas).length === 0) && (
                <p className="empty-message-small">Nenhuma área de atuação encontrada para esta disciplina.</p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default ProgramLibrary;
