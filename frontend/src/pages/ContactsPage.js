import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faComments } from '@fortawesome/free-solid-svg-icons';
import ContactList from '../components/contacts/ContactList';
import { usePatients } from '../context/PatientContext';

const ContactsPage = () => {
  const navigate = useNavigate();
  const { selectedPatient } = usePatients();
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Redirecionar se não há paciente selecionado
  if (!selectedPatient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 break-words">Nenhum paciente selecionado</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">Selecione um paciente para ver os contatos disponíveis.</p>
          <button
            onClick={() => navigate('/parent-dashboard')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base min-h-[44px] w-full sm:w-auto"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleContactSelect = async (therapist) => {
    try {
      setIsStartingChat(true);
      
      console.log('Copiando menção do terapeuta:', therapist);
      
      // Copiar a menção para o clipboard
      const mention = `@${therapist.full_name}`;
      await navigator.clipboard.writeText(mention);
      
      // Mostrar feedback
      alert(`Menção "${mention}" copiada! Cole no chat para mencionar este terapeuta.`);
      
      // Voltar para o dashboard onde está o chat
      navigate('/parent-dashboard');
      
    } catch (error) {
      console.error('Erro ao copiar menção:', error);
      alert('Erro ao copiar menção. Tente novamente.');
    } finally {
      setIsStartingChat(false);
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
                onClick={() => navigate('/parent-dashboard')}
                className="text-gray-600 hover:text-gray-800 transition-colors mt-1 sm:mt-0 flex-shrink-0"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">Meus Terapeutas</h1>
                <p className="text-xs sm:text-sm text-gray-600 break-words">Mencione um terapeuta específico da equipe de {selectedPatient.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-blue-600 text-xs sm:text-sm w-full sm:w-auto justify-end">
              <span className="text-lg sm:text-2xl flex-shrink-0">@</span>
              <span className="font-medium truncate">Sistema de Menções</span>
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
            type="therapists"
            onContactSelect={handleContactSelect}
            className="w-full"
          />
        </div>

        {/* Instruções de uso */}
        <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-base sm:text-lg mt-0.5 flex-shrink-0">@</span>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-blue-800">Como mencionar terapeutas</h3>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
                  <li className="break-words">Clique em qualquer terapeuta para copiar sua menção (@nome)</li>
                  <li className="break-words">Cole a menção no chat geral para direcionar sua mensagem</li>
                  <li className="break-words">Todos da equipe verão a mensagem, garantindo transparência</li>
                  <li className="break-words">O terapeuta mencionado receberá destaque na mensagem</li>
                  <li className="break-words">Outros terapeutas podem contribuir com a resposta</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay quando está copiando menção */}
      {isStartingChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 text-center max-w-sm w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-700">Copiando menção...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;