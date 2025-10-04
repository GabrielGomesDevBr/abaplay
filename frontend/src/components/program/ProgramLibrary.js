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
  faBuilding,
  faTimes,
  faEllipsisH,
  faArrowRight
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
  const [showActionsMenu, setShowActionsMenu] = useState(false); // ✅ NOVO: Menu de ações mobile

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
    } else if (activeTab === 'global') {
      // Restaura primeira disciplina dos programas globais ao voltar para aba global
      if (disciplines && Object.keys(disciplines).length > 0) {
        setActiveDiscipline(Object.keys(disciplines)[0]);
      }
    }
  }, [activeTab, disciplines]);

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

  const handleViewGlobalPrograms = () => {
    setActiveTab('global');
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
  const areas = (activeDiscipline && currentPrograms[activeDiscipline]) || {};
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

  // ✅ NOVO: Abreviações para mobile
  const getMobileDisciplineName = (name) => {
    const mobileNames = {
      'Fonoaudiologia': 'Fono',
      'Psicologia': 'Psico',
      'Musicoterapia': 'Musico',
      'TerapiaOcupacional': 'TO',
      'Psicomotricidade': 'Psicomo',
      'Psicopedagogia': 'Psicopedag',
      'VB-MAPP': 'VB-MAPP'
    };
    return mobileNames[name] || name;
  };


  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Sistema de abas Global/Custom - ✅ RESPONSIVO */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            className={`
              flex-1 px-3 sm:px-6 py-3 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2
              ${
                activeTab === 'global'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }
            `}
            onClick={() => setActiveTab('global')}
          >
            <FontAwesomeIcon icon={faGlobe} className="text-sm sm:text-base" />
            {/* Desktop: Texto completo */}
            <span className="hidden sm:inline">Programas Globais</span>
            {/* Mobile: Texto reduzido */}
            <span className="sm:hidden">Globais</span>
          </button>
          <button
            className={`
              flex-1 px-3 sm:px-6 py-3 font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2
              ${
                activeTab === 'custom'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }
            `}
            onClick={() => setActiveTab('custom')}
          >
            <FontAwesomeIcon icon={faBuilding} className="text-sm sm:text-base" />
            {/* Desktop: Texto completo */}
            <span className="hidden sm:inline">Programas da Clínica</span>
            {/* Mobile: Texto reduzido */}
            <span className="sm:hidden">Clínica</span>
            {hasCustomPrograms && (
              <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full ml-1">
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

      {/* Botão de criar programa customizado - ✅ DESKTOP APENAS */}
      {activeTab === 'custom' && user?.is_admin && (
        <div className="hidden lg:block border-b border-gray-200 p-4">
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
        <div className="flex overflow-x-auto scrollbar-hide">
          {Object.keys(currentPrograms).map((disciplineName, index) => {
            const colors = getDisciplineColors(disciplineName);
            const isActive = activeDiscipline === disciplineName;

            return (
              <button
                key={disciplineName}
                className={`
                  flex-shrink-0 px-6 py-4 font-semibold text-sm transition-all duration-200 relative whitespace-nowrap
                  ${isActive
                    ? `bg-gradient-to-r ${colors.bg} text-white shadow-lg`
                    : `bg-gradient-to-r ${colors.light} ${colors.text} hover:shadow-md`
                  }
                `}
                onClick={() => handleTabClick(disciplineName)}
              >
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  <FontAwesomeIcon
                    icon={activeTab === 'custom' ? faCog : faGraduationCap}
                    className="flex-shrink-0 text-sm sm:text-base"
                  />
                  {/* Desktop: Nome completo */}
                  <span className="hidden sm:inline">{formatDisciplineName(disciplineName)}</span>
                  {/* Mobile: Abreviação */}
                  <span className="sm:hidden text-xs">{getMobileDisciplineName(disciplineName)}</span>
                  {activeTab === 'custom' && (
                    <span className="hidden sm:inline bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
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
          <div className="text-center py-8 sm:py-12 px-4">
            {/* Ícone - responsivo */}
            <div className={`bg-gradient-to-br ${user?.is_admin ? 'from-purple-100 to-indigo-100' : 'from-gray-100 to-slate-100'} p-6 sm:p-8 rounded-full w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center`}>
              <FontAwesomeIcon
                icon={faBuilding}
                className={`text-3xl sm:text-4xl ${user?.is_admin ? 'text-purple-400' : 'text-gray-400'}`}
              />
            </div>

            {/* Título - responsivo */}
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
              {/* Desktop */}
              <span className="hidden sm:inline">
                A clínica ainda não possui programas próprios cadastrados
              </span>
              {/* Mobile */}
              <span className="sm:hidden">
                Sem programas da clínica
              </span>
            </h3>

            {/* Descrição - apenas desktop */}
            <p className="hidden sm:block text-gray-600 text-center max-w-md mx-auto mb-6">
              {user?.is_admin
                ? 'Programas customizados são programas exclusivos da sua clínica para necessidades específicas de intervenção.'
                : 'Enquanto isso, você pode explorar os programas globais disponíveis para suas intervenções.'
              }
            </p>

            {/* Descrição curta - mobile */}
            <p className="sm:hidden text-gray-600 text-sm text-center px-4 mb-4">
              {user?.is_admin
                ? 'Crie programas exclusivos para sua clínica'
                : 'Explore os programas globais disponíveis'
              }
            </p>

            {/* Botões - layout responsivo */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center mt-6">
              {user?.is_admin && (
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md min-h-[44px]"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span className="hidden sm:inline">Cadastrar Primeiro Programa</span>
                  <span className="sm:hidden">Cadastrar</span>
                </button>
              )}

              <button
                onClick={handleViewGlobalPrograms}
                className="w-full sm:w-auto bg-white border-2 border-purple-600 text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition-all duration-200 flex items-center justify-center space-x-2 min-h-[44px]"
              >
                <span className="hidden sm:inline">Ver Programas Globais</span>
                <span className="sm:hidden">Ver Globais</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>

            {/* Dica adicional - apenas desktop admin */}
            {user?.is_admin && (
              <div className="hidden sm:block mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  💡 Você também pode começar explorando os programas globais e depois criar versões customizadas
                </p>
              </div>
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

            {/* Cabeçalho da disciplina (mobile) - acima da busca */}
            <div className="lg:hidden mb-6">
              <div className={`bg-gradient-to-r ${getDisciplineColors(activeDiscipline).light} border-l-4 ${getDisciplineColors(activeDiscipline).border} p-4 rounded-r-lg`}>
                <h3 className={`text-xl font-bold ${getDisciplineColors(activeDiscipline).text} flex items-center`}>
                  <FontAwesomeIcon icon={faLayerGroup} className="mr-3" />
                  {formatDisciplineName(activeDiscipline)}
                </h3>
              </div>
            </div>

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

      {/* ✅ NOVO: FAB Mobile - Apenas para admin */}
      {user?.is_admin && (
        <button
          onClick={() => setShowActionsMenu(true)}
          className="lg:hidden fixed bottom-20 right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
          aria-label="Menu de ações"
        >
          <FontAwesomeIcon icon={faPlus} className="text-xl" />
        </button>
      )}

      {/* ✅ NOVO: Modal de Ações Mobile */}
      {showActionsMenu && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end" onClick={() => setShowActionsMenu(false)}>
          <div className="bg-white rounded-t-2xl w-full p-4 pb-8 space-y-3 slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Menu de Ações</h3>
              <button onClick={() => setShowActionsMenu(false)} className="text-gray-400 hover:text-gray-600">
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            {/* Criar Programa Customizado */}
            <button
              onClick={() => { setShowCustomModal(true); setShowActionsMenu(false); }}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-lg font-medium hover:from-purple-100 hover:to-indigo-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-3 text-lg" />
              Criar Programa Customizado
            </button>

            {/* Ver Programas Globais */}
            <button
              onClick={() => { setActiveTab('global'); setShowActionsMenu(false); }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg font-medium hover:from-blue-100 hover:to-indigo-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faGlobe} className="mr-3 text-lg" />
              Ver Programas Globais
            </button>

            {/* Ver Programas da Clínica */}
            <button
              onClick={() => { setActiveTab('custom'); setShowActionsMenu(false); }}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-lg font-medium hover:from-green-100 hover:to-emerald-100 active:scale-95 transition-all flex items-center"
            >
              <FontAwesomeIcon icon={faBuilding} className="mr-3 text-lg" />
              Ver Programas da Clínica
              {hasCustomPrograms && (
                <span className="ml-auto bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
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
      )}
    </div>
  );
};

export default ProgramLibrary;
