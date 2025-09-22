import React, { useState, useEffect } from 'react';
import { usePrograms } from '../../context/ProgramContext';
import { useAuth } from '../../context/AuthContext';
import ProgramCard from './ProgramCard';
import CustomProgramCard from './CustomProgramCard';
import ProgramSearch from './ProgramSearch';
import CustomProgramModal from './CustomProgramModal';
import EditCustomProgramModal from './EditCustomProgramModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faLayerGroup,
  faSearch,
  faGraduationCap,
  faPlus,
  faCog,
  faGlobe,
  faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { getCustomPrograms } from '../../api/programApi';

const ProgramLibrary = ({ onAssign, assigningId, assignedPrograms, isPatientSelected }) => {
  const { disciplines, isLoading, error, refreshPrograms } = usePrograms();
  const { user } = useAuth();
  const [activeDiscipline, setActiveDiscipline] = useState(null);
  const [activeTab, setActiveTab] = useState('global'); // 'global' ou 'custom'
  const [customPrograms, setCustomPrograms] = useState({});
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [deletingProgramId, setDeletingProgramId] = useState(null);

  // Define a primeira disciplina como ativa assim que os dados chegarem.
  useEffect(() => {
    if (disciplines && Object.keys(disciplines).length > 0) {
      setActiveDiscipline(Object.keys(disciplines)[0]);
    }
  }, [disciplines]);

  // Busca programas customizados quando muda para aba custom
  useEffect(() => {
    if (activeTab === 'custom') {
      fetchCustomPrograms();
    }
  }, [activeTab]);

  const fetchCustomPrograms = async () => {
    setLoadingCustom(true);
    try {
      const customData = await getCustomPrograms();
      setCustomPrograms(customData);
      // Define primeira disciplina dos programas customizados se existir
      if (Object.keys(customData).length > 0 && !activeDiscipline) {
        setActiveDiscipline(Object.keys(customData)[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar programas customizados:', error);
    } finally {
      setLoadingCustom(false);
    }
  };

  const handleCustomProgramSuccess = () => {
    fetchCustomPrograms();
    refreshPrograms(); // Atualiza programas globais também
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    fetchCustomPrograms();
    setShowEditModal(false);
    setEditingProgram(null);
  };

  const handleDeleteProgram = (programId) => {
    setDeletingProgramId(programId);
    // Remove o programa da lista local
    fetchCustomPrograms();
    setDeletingProgramId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-purple-500 mb-4" />
          <p className="text-gray-600">Carregando biblioteca de programas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-6 rounded-r-lg">
        <div className="flex items-start">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 mt-1 mr-3" />
          <div>
            <p className="text-red-800 font-medium mb-1">Erro ao Carregar Programas</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!disciplines || Object.keys(disciplines).length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <FontAwesomeIcon icon={faSearch} className="text-4xl text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Biblioteca Vazia</h3>
        <p className="text-gray-500">Nenhum programa encontrado na biblioteca.</p>
      </div>
    );
  }

  const handleTabClick = (disciplineName) => {
    setActiveDiscipline(disciplineName);
  };

  const getCurrentPrograms = () => {
    if (activeTab === 'global') {
      return disciplines;
    } else {
      return customPrograms;
    }
  };

  const currentPrograms = getCurrentPrograms();
  const areas = activeDiscipline ? currentPrograms[activeDiscipline] : {};
  const hasCustomPrograms = Object.keys(customPrograms).length > 0;
  
  // Cores para cada disciplina
  const getDisciplineColors = (disciplineName) => {
    const colorMap = {
      'Fonoaudiologia': { bg: 'from-blue-500 to-indigo-600', light: 'from-blue-50 to-indigo-50', border: 'border-blue-300', text: 'text-blue-700' },
      'Psicologia': { bg: 'from-red-500 to-pink-600', light: 'from-red-50 to-pink-50', border: 'border-red-300', text: 'text-red-700' },
      'Musicoterapia': { bg: 'from-purple-500 to-violet-600', light: 'from-purple-50 to-violet-50', border: 'border-purple-300', text: 'text-purple-700' },
      'TerapiaOcupacional': { bg: 'from-orange-500 to-amber-600', light: 'from-orange-50 to-amber-50', border: 'border-orange-300', text: 'text-orange-700' },
      'Psicomotricidade': { bg: 'from-green-500 to-emerald-600', light: 'from-green-50 to-emerald-50', border: 'border-green-300', text: 'text-green-700' },
      'Psicopedagogia': { bg: 'from-yellow-500 to-orange-600', light: 'from-yellow-50 to-orange-50', border: 'border-yellow-300', text: 'text-yellow-700' },
      'VB-MAPP': { bg: 'from-teal-500 to-cyan-600', light: 'from-teal-50 to-cyan-50', border: 'border-teal-300', text: 'text-teal-700' },
    };
    return colorMap[disciplineName] || { bg: 'from-gray-500 to-slate-600', light: 'from-gray-50 to-slate-50', border: 'border-gray-300', text: 'text-gray-700' };
  };

  const formatDisciplineName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };


  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Sistema de abas Global/Custom */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            className={`
              flex-1 px-6 py-3 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2
              ${
                activeTab === 'global'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }
            `}
            onClick={() => setActiveTab('global')}
          >
            <FontAwesomeIcon icon={faGlobe} />
            <span>Programas Globais</span>
          </button>
          <button
            className={`
              flex-1 px-6 py-3 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2
              ${
                activeTab === 'custom'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }
            `}
            onClick={() => setActiveTab('custom')}
          >
            <FontAwesomeIcon icon={faBuilding} />
            <span>Programas da Clínica</span>
            {hasCustomPrograms && (
              <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
                {Object.values(customPrograms).reduce((total, discipline) => {
                  return total + Object.values(discipline).reduce((areaTotal, area) => {
                    return areaTotal + Object.values(area).reduce((subAreaTotal, subArea) => {
                      return subAreaTotal + (Array.isArray(subArea) ? subArea.length : 0);
                    }, 0);
                  }, 0);
                }, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Botão de criar programa customizado */}
      {activeTab === 'custom' && user?.is_admin && (
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={() => setShowCustomModal(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Criar Programa Customizado</span>
          </button>
        </div>
      )}

      {/* Sistema de navegação por disciplinas */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap">
          {Object.keys(currentPrograms).map((disciplineName, index) => {
            const colors = getDisciplineColors(disciplineName);
            const isActive = activeDiscipline === disciplineName;
            
            return (
              <button
                key={disciplineName}
                className={`
                  flex-1 min-w-0 px-6 py-4 font-semibold text-sm transition-all duration-200 relative
                  ${isActive
                    ? `bg-gradient-to-r ${colors.bg} text-white shadow-lg`
                    : `bg-gradient-to-r ${colors.light} ${colors.text} hover:shadow-md`
                  }
                `}
                onClick={() => handleTabClick(disciplineName)}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FontAwesomeIcon
                    icon={activeTab === 'custom' ? faCog : faGraduationCap}
                    className="flex-shrink-0"
                  />
                  <span className="truncate">{formatDisciplineName(disciplineName)}</span>
                  {activeTab === 'custom' && (
                    <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
                      Custom
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white bg-opacity-30 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da disciplina ativa */}
      <div className="p-6">
        {(isLoading || loadingCustom) ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-purple-500 mb-4" />
              <p className="text-gray-600">
                {activeTab === 'custom' ? 'Carregando programas customizados...' : 'Carregando biblioteca de programas...'}
              </p>
            </div>
          </div>
        ) : activeTab === 'custom' && !hasCustomPrograms ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FontAwesomeIcon icon={faBuilding} className="text-4xl text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum Programa Customizado</h3>
            <p className="text-gray-500 mb-6">Sua clínica ainda não criou programas customizados.</p>
            {user?.is_admin && (
              <button
                onClick={() => setShowCustomModal(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Criar Primeiro Programa</span>
              </button>
            )}
          </div>
        ) : activeDiscipline && Object.keys(areas).length > 0 ? (
          <div className="space-y-8">
            {/* Componente de busca - apenas para programas globais */}
            {activeTab === 'global' && (
              <>
                <ProgramSearch
                  onProgramSelect={() => {}} // TODO: implementar visualização
                  onAssign={onAssign}
                  assigningId={assigningId}
                  assignedPrograms={assignedPrograms}
                  isPatientSelected={isPatientSelected}
                  disciplineName={activeDiscipline}
                  disciplineDisplayName={formatDisciplineName(activeDiscipline)}
                  disciplineColors={getDisciplineColors(activeDiscipline)}
                />
                {/* Divisor visual */}
                <div className="border-b border-gray-200 my-6"></div>
              </>
            )}

            {/* Header da aba atual */}
            {activeTab === 'custom' && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faBuilding} className="text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-800">Programas da Clínica</h3>
                      <p className="text-sm text-purple-600">Programas criados especificamente para sua clínica</p>
                    </div>
                  </div>
                  {user?.is_admin && (
                    <button
                      onClick={() => setShowCustomModal(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      <span>Novo</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {Object.keys(areas).map((areaName) => {
              const subAreas = areas[areaName];
              const disciplineColors = getDisciplineColors(activeDiscipline);
              
              return (
                <div key={areaName} className="space-y-6">
                  {/* Cabeçalho da área */}
                  <div className={`bg-gradient-to-r ${disciplineColors.light} border-l-4 ${disciplineColors.border} p-4 rounded-r-lg`}>
                    <h3 className={`text-xl font-bold ${disciplineColors.text} flex items-center`}>
                      <FontAwesomeIcon icon={faLayerGroup} className="mr-3" />
                      {areaName}
                    </h3>
                  </div>
                  
                  {/* Sub-áreas */}
                  {Object.keys(subAreas).map((subAreaName) => {
                    const programs = subAreas[subAreaName];
                    const totalPrograms = programs?.length || 0;
                    
                    // Não mostrar sub-área se não há programas
                    if (totalPrograms === 0) {
                      return null;
                    }
                    
                    const assignedCount = programs?.filter(program => 
                      Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.program_id === program.id)
                    ).length || 0;
                    
                    return (
                      <div key={subAreaName} className="space-y-4">
                        {/* Sub-área header (se diferente da área principal) */}
                        {subAreaName !== areaName && (
                          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                            <h4 className="text-lg font-semibold text-gray-800">{subAreaName}</h4>
                            <div className="flex space-x-4 text-sm">
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                {totalPrograms} programa{totalPrograms !== 1 ? 's' : ''}
                              </span>
                              {assignedCount > 0 && (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                  {assignedCount} atribuído{assignedCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Grid de programas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                          {programs?.map((program) => {
                            const isAssigned = Array.isArray(assignedPrograms) && assignedPrograms.some(p => p.program_id === program.id);

                            if (activeTab === 'custom') {
                              return (
                                <CustomProgramCard
                                  key={program.id}
                                  program={program}
                                  onEdit={handleEditProgram}
                                  onDelete={handleDeleteProgram}
                                  onAssign={onAssign}
                                  isDeleting={deletingProgramId === program.id}
                                  hasAssignments={program.assignment_count > 0}
                                  assignmentCount={program.assignment_count || 0}
                                  progressCount={program.progress_count || 0}
                                  userIsAdmin={user?.is_admin || false}
                                  isAssigned={isAssigned}
                                  isAssigning={assigningId === program.id}
                                  isPatientSelected={isPatientSelected}
                                />
                              );
                            } else {
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
                            }
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FontAwesomeIcon icon={faSearch} className="text-3xl text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Selecione uma disciplina para explorar os programas</p>
          </div>
        )}
      </div>

      {/* Modal de criação de programa customizado */}
      <CustomProgramModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSuccess={handleCustomProgramSuccess}
      />

      {/* Modal de edição de programa customizado */}
      <EditCustomProgramModal
        isOpen={showEditModal}
        program={editingProgram}
        onClose={() => {
          setShowEditModal(false);
          setEditingProgram(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default ProgramLibrary;
