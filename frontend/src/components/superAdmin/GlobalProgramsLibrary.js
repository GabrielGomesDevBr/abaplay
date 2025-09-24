import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGlobe,
  faPlus,
  faSpinner,
  faRefresh,
  faTrash,
  faEye,
  faChevronDown,
  faChevronRight,
  faExclamationTriangle,
  faCheckCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { getGlobalPrograms, deleteGlobalProgram, getProgramUsage } from '../../api/superAdminApi';
import GlobalProgramModal from './GlobalProgramModal';

const GlobalProgramsLibrary = () => {
  const [programs, setPrograms] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDisciplines, setExpandedDisciplines] = useState({});
  const [expandedAreas, setExpandedAreas] = useState({});
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getGlobalPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Erro ao buscar programas globais:', error);
      setError('Erro ao carregar programas globais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setSuccessMessage('Programa global criado com sucesso!');
    fetchPrograms();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const toggleDiscipline = (discipline) => {
    setExpandedDisciplines(prev => ({
      ...prev,
      [discipline]: !prev[discipline]
    }));
  };

  const toggleArea = (disciplineArea) => {
    setExpandedAreas(prev => ({
      ...prev,
      [disciplineArea]: !prev[disciplineArea]
    }));
  };

  const handleViewUsage = async (program) => {
    try {
      setLoadingUsage(true);
      setSelectedProgram(program);
      const usage = await getProgramUsage(program.id);
      setUsageData(usage);
      setShowUsageModal(true);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      setError('Erro ao carregar estatísticas do programa.');
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleDeleteProgram = async (program) => {
    if (!window.confirm(
      `Tem certeza que deseja excluir o programa "${program.name}"?\n\nEsta ação não pode ser desfeita e o programa será removido de todas as clínicas.`
    )) {
      return;
    }

    try {
      await deleteGlobalProgram(program.id);
      setSuccessMessage('Programa global excluído com sucesso!');
      fetchPrograms();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Erro ao excluir programa:', error);
      if (error.response?.status === 400) {
        setError('Não é possível excluir um programa que está sendo usado por clínicas.');
      } else {
        setError('Erro ao excluir programa global.');
      }
    }
  };

  const renderProgram = (program, disciplineName, areaName, subAreaName) => (
    <div
      key={program.id}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <FontAwesomeIcon icon={faGlobe} className="text-green-600" />
            <h4 className="font-semibold text-gray-900">{program.name}</h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              program.program_type === 'global_admin'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {program.program_type === 'global_admin' ? 'Super Admin' : 'Global Original'}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-2">{program.objective}</p>

          <div className="text-xs text-gray-500 space-y-1">
            <div><strong>Habilidade:</strong> {program.skill}</div>
            <div><strong>Tentativas:</strong> {program.trials}</div>
            {program.created_by_name && (
              <div><strong>Criado por:</strong> {program.created_by_name}</div>
            )}
            <div><strong>Criado em:</strong> {new Date(program.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => handleViewUsage(program)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
            title="Ver estatísticas de uso"
            disabled={loadingUsage}
          >
            <FontAwesomeIcon icon={loadingUsage ? faSpinner : faEye} spin={loadingUsage} />
          </button>

          <button
            onClick={() => handleDeleteProgram(program)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
            title="Excluir programa"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderSubArea = (subAreaName, subAreaPrograms, disciplineName, areaName) => (
    <div key={subAreaName} className="ml-8">
      <h4 className="font-medium text-gray-700 mb-3 text-sm">{subAreaName}</h4>
      <div className="space-y-3">
        {subAreaPrograms.map(program =>
          renderProgram(program, disciplineName, areaName, subAreaName)
        )}
      </div>
    </div>
  );

  const renderArea = (areaName, areaData, disciplineName) => {
    const areaKey = `${disciplineName}-${areaName}`;
    const isExpanded = expandedAreas[areaKey];

    return (
      <div key={areaName} className="ml-4">
        <button
          onClick={() => toggleArea(areaKey)}
          className="flex items-center space-x-2 text-left w-full py-2 px-3 hover:bg-gray-50 rounded-md transition-colors"
        >
          <FontAwesomeIcon
            icon={isExpanded ? faChevronDown : faChevronRight}
            className="text-gray-400 text-sm"
          />
          <h3 className="font-medium text-gray-800">{areaName}</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-auto">
            {Object.values(areaData).reduce((total, subArea) => total + subArea.length, 0)} programas
          </span>
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-4">
            {Object.entries(areaData).map(([subAreaName, subAreaPrograms]) =>
              renderSubArea(subAreaName, subAreaPrograms, disciplineName, areaName)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDiscipline = (disciplineName, disciplineData) => {
    const isExpanded = expandedDisciplines[disciplineName];
    const disciplineTotal = Object.values(disciplineData).reduce((total, area) =>
      total + Object.values(area).reduce((areaTotal, subArea) => areaTotal + subArea.length, 0), 0
    );

    return (
      <div key={disciplineName} className="border border-gray-200 rounded-lg bg-gray-50">
        <button
          onClick={() => toggleDiscipline(disciplineName)}
          className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronRight}
              className="text-gray-500"
            />
            <h2 className="text-lg font-semibold text-gray-900">{disciplineName}</h2>
          </div>
          <span className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
            {disciplineTotal} programas
          </span>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {Object.entries(disciplineData).map(([areaName, areaData]) =>
              renderArea(areaName, areaData, disciplineName)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-blue-600 mr-3" />
        <span className="text-gray-600">Carregando programas globais...</span>
      </div>
    );
  }

  const totalPrograms = Object.values(programs).reduce((total, disciplineData) =>
    total + Object.values(disciplineData).reduce((disciplineTotal, area) =>
      disciplineTotal + Object.values(area).reduce((areaTotal, subArea) => areaTotal + subArea.length, 0), 0
    ), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FontAwesomeIcon icon={faGlobe} className="text-green-600 text-xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Biblioteca Global de Programas</h1>
            <p className="text-sm text-gray-600 mt-1">
              Total: <span className="font-medium text-green-600">{totalPrograms} programas</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchPrograms}
            className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faRefresh} className="mr-2" />
            Atualizar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Criar Programa Global
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
          {successMessage}
        </div>
      )}

      {/* Lista de Programas */}
      {Object.keys(programs).length === 0 ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faGlobe} className="text-4xl text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum programa global encontrado</h3>
          <p className="text-gray-600 mb-4">
            Comece criando seu primeiro programa global que ficará disponível para todas as clínicas.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mx-auto"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Criar Programa Global
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(programs).map(([disciplineName, disciplineData]) =>
            renderDiscipline(disciplineName, disciplineData)
          )}
        </div>
      )}

      {/* Modal de Criação */}
      <GlobalProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Modal de Estatísticas */}
      {showUsageModal && usageData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Estatísticas de Uso</h3>
              <button
                onClick={() => setShowUsageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">{selectedProgram?.name}</h4>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Atribuições:</span>
                  <span className="font-medium">{usageData.assignment_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pacientes:</span>
                  <span className="font-medium">{usageData.patient_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessões:</span>
                  <span className="font-medium">{usageData.progress_count}</span>
                </div>
                {usageData.first_session && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primeira sessão:</span>
                    <span className="font-medium">
                      {new Date(usageData.first_session).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {usageData.last_session && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Última sessão:</span>
                    <span className="font-medium">
                      {new Date(usageData.last_session).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {usageData.assignment_count > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                    Este programa está sendo usado por clínicas e não pode ser excluído.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowUsageModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalProgramsLibrary;