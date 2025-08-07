import React, { useState, useEffect } from 'react';
import { usePrograms } from '../../context/ProgramContext';
import ProgramCard from './ProgramCard';
import './ProgramLibrary.css'; // O CSS será atualizado no próximo passo

const ProgramLibrary = ({ onAssign, assigningId, assignedPrograms, isPatientSelected }) => {
  const { disciplines, isLoading, error } = usePrograms();
  const [activeDiscipline, setActiveDiscipline] = useState(null);

  // Define a primeira disciplina como ativa assim que os dados chegarem.
  useEffect(() => {
    if (disciplines && Object.keys(disciplines).length > 0) {
      setActiveDiscipline(Object.keys(disciplines)[0]);
    }
  }, [disciplines]);

  if (isLoading) {
    return <div className="loading-message">Carregando biblioteca de programas...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!disciplines || Object.keys(disciplines).length === 0) {
    return <div className="empty-message">Nenhum programa encontrado na biblioteca.</div>;
  }

  const handleTabClick = (disciplineName) => {
    setActiveDiscipline(disciplineName);
  };

  const areas = activeDiscipline ? disciplines[activeDiscipline] : {};

  return (
    <div className="program-library">
      {/* Navegação por Abas */}
      <div className="tabs-container">
        {Object.keys(disciplines).map((disciplineName) => (
          <button
            key={disciplineName}
            className={`tab-button ${activeDiscipline === disciplineName ? 'active' : ''}`}
            onClick={() => handleTabClick(disciplineName)}
          >
            {disciplineName.replace(/([A-Z])/g, ' $1').trim()} {/* Adiciona espaço antes de letra maiúscula */}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div className="tab-content">
        {activeDiscipline && Object.keys(areas).length > 0 ? (
          Object.keys(areas).map((areaName) => {
            const subAreas = areas[areaName];
            return (
              <div key={areaName} className="area-container">
                <h3 className="area-header">{areaName}</h3>
                {Object.keys(subAreas).map((subAreaName) => {
                  const programs = subAreas[subAreaName];
                  return (
                    <div key={subAreaName} className="sub-area-container">
                      {/* Opcional: mostrar o nome da sub-área se for diferente da área */}
                      {subAreaName !== areaName && <h4 className="sub-area-header">{subAreaName}</h4>}
                      <div className="programs-grid">
                        {programs?.map((program) => {
                          const isAssigned = Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.program_id === program.id);
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
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          <p className="empty-message-small">Selecione uma disciplina para ver os programas.</p>
        )}
      </div>
    </div>
  );
};

export default ProgramLibrary;
