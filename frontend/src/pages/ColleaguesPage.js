import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers, faComments } from '@fortawesome/free-solid-svg-icons';
import ContactList from '../components/contacts/ContactList';
import { usePatients } from '../context/PatientContext';

const ColleaguesPage = () => {
  const navigate = useNavigate();
  const { selectedPatient } = usePatients();
  const [isStartingDiscussion, setIsStartingDiscussion] = useState(false);

  // Redirecionar se não há paciente selecionado
  if (!selectedPatient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 break-words">Nenhum paciente selecionado</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">Selecione um paciente para ver os colegas da equipe.</p>
          <button
            onClick={() => navigate('/clients')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
          >
            Voltar aos Clientes
          </button>
        </div>
      </div>
    );
  }

  const handleColleagueSelect = async (colleague) => {
    try {
      setIsStartingDiscussion(true);
      
      console.log('Iniciando discussão com colega:', colleague);
      
      // Navegar para a página de discussão de caso com informações do colega
      // Usando query params para identificar a discussão específica
      navigate(`/case-discussion?patient=${selectedPatient.id}&colleague=${colleague.id}&colleagueName=${encodeURIComponent(colleague.full_name)}`);
      
    } catch (error) {
      console.error('Erro ao iniciar discussão:', error);
      alert('Erro ao iniciar discussão. Tente novamente.');
    } finally {
      setIsStartingDiscussion(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-4 gap-3">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => navigate('/clients')}
                className="text-gray-600 hover:text-gray-800 transition-colors mt-1 sm:mt-0 flex-shrink-0"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">Discussão de Casos</h1>
                <p className="text-xs sm:text-sm text-gray-600 break-words">Converse com colegas sobre {selectedPatient.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-indigo-600 text-xs sm:text-sm w-full sm:w-auto justify-end">
              <FontAwesomeIcon icon={faUsers} className="flex-shrink-0" />
              <span className="font-medium truncate">Equipe Multidisciplinar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
          <ContactList
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
            type="colleagues"
            onContactSelect={handleColleagueSelect}
            className="w-full"
          />
        </div>

        {/* Instruções de uso */}
        <div className="mt-4 sm:mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={faComments} className="text-indigo-400 w-4 h-4 sm:w-5 sm:h-5 mt-0.5" />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-indigo-800">Discussão de Casos</h3>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-indigo-700">
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
                  <li className="break-words">Clique em qualquer colega para iniciar uma discussão sobre o caso</li>
                  <li className="break-words">Compartilhe observações, estratégias e progressos do paciente</li>
                  <li className="break-words">Colabore de forma integrada para otimizar o tratamento</li>
                  <li className="break-words">Todas as discussões ficam registradas para consulta futura</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Benefícios da discussão em equipe */}
        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-green-500 mb-1 sm:mb-2">
              <FontAwesomeIcon icon={faUsers} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h4 className="font-semibold text-green-800 text-sm sm:text-base">Colaboração</h4>
            <p className="text-xs sm:text-sm text-green-700 mt-0.5 sm:mt-1">Trabalho em equipe integrado</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-blue-500 mb-1 sm:mb-2">
              <FontAwesomeIcon icon={faComments} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h4 className="font-semibold text-blue-800 text-sm sm:text-base">Comunicação</h4>
            <p className="text-xs sm:text-sm text-blue-700 mt-0.5 sm:mt-1">Troca de experiências</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-purple-500 mb-1 sm:mb-2">
              <FontAwesomeIcon icon={faComments} className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h4 className="font-semibold text-purple-800 text-sm sm:text-base">Resultados</h4>
            <p className="text-xs sm:text-sm text-purple-700 mt-0.5 sm:mt-1">Melhores outcomes</p>
          </div>
        </div>
      </div>

      {/* Loading overlay quando está iniciando discussão */}
      {isStartingDiscussion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 text-center max-w-sm w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-700">Iniciando discussão...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColleaguesPage;