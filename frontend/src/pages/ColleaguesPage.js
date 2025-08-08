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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum paciente selecionado</h2>
          <p className="text-gray-600 mb-4">Selecione um paciente para ver os colegas da equipe.</p>
          <button 
            onClick={() => navigate('/clients')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/clients')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Discussão de Casos</h1>
                <p className="text-gray-600">Converse com colegas sobre {selectedPatient.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-indigo-600">
              <FontAwesomeIcon icon={faUsers} />
              <span className="font-medium">Equipe Multidisciplinar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ContactList
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
            type="colleagues"
            onContactSelect={handleColleagueSelect}
            className="w-full"
          />
        </div>

        {/* Instruções de uso */}
        <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={faComments} className="text-indigo-400 w-5 h-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-indigo-800">Discussão de Casos</h3>
              <div className="mt-2 text-sm text-indigo-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Clique em qualquer colega para iniciar uma discussão sobre o caso</li>
                  <li>Compartilhe observações, estratégias e progressos do paciente</li>
                  <li>Colabore de forma integrada para otimizar o tratamento</li>
                  <li>Todas as discussões ficam registradas para consulta futura</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Benefícios da discussão em equipe */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-500 mb-2">
              <FontAwesomeIcon icon={faUsers} className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-green-800">Colaboração</h4>
            <p className="text-sm text-green-700 mt-1">Trabalho em equipe integrado</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-blue-500 mb-2">
              <FontAwesomeIcon icon={faComments} className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-blue-800">Comunicação</h4>
            <p className="text-sm text-blue-700 mt-1">Troca de experiências</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-purple-500 mb-2">
              <FontAwesomeIcon icon={faComments} className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-purple-800">Resultados</h4>
            <p className="text-sm text-purple-700 mt-1">Melhores outcomes</p>
          </div>
        </div>
      </div>

      {/* Loading overlay quando está iniciando discussão */}
      {isStartingDiscussion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-700">Iniciando discussão...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColleaguesPage;