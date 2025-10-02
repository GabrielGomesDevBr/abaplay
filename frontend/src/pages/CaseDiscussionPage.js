import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import CaseDiscussionChat from '../components/chat/CaseDiscussionChat';
import ChatModal from '../components/chat/ChatModal';
import useMediaQuery from '../hooks/useMediaQuery';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUsers, faComments, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const CaseDiscussionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedPatient } = usePatients();

  // Detectar se está em mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Pegar parâmetros da URL (caso venha de link externo)
  const patientId = searchParams.get('patient') || selectedPatient?.id;
  const colleagueName = searchParams.get('colleagueName');

  if (!selectedPatient && !patientId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-5xl text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Paciente não encontrado</h2>
          <p className="text-gray-600 mb-6 px-4">
            Selecione um paciente para iniciar uma discussão de caso.
          </p>
          <button
            onClick={() => navigate('/clients')}
            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm sm:text-base min-h-[44px]"
          >
            Ir para Pacientes
          </button>
        </div>
      </div>
    );
  }

  const patientName = selectedPatient?.name || 'paciente';

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? (
        /* MOBILE: Modal fullscreen */
        <ChatModal
          isOpen={true}
          onClose={() => navigate('/clients')}
          title={colleagueName ? `Discussão com ${colleagueName}` : `Discussão sobre ${patientName}`}
        >
          <CaseDiscussionChat
            patientId={patientId}
            patientName={patientName}
          />
        </ChatModal>
      ) : (
        /* DESKTOP: Layout normal com header */
        <>
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
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 break-words">
                      Discussão de Caso
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 break-words">
                      {colleagueName ? `Com ${colleagueName} sobre ${patientName}` : `Sobre ${patientName}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 text-indigo-600 text-xs sm:text-sm w-full sm:w-auto justify-end">
                  <FontAwesomeIcon icon={faUsers} className="flex-shrink-0" />
                  <span className="font-medium truncate">Equipe Multidisciplinar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              {/* Header do chat */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl mb-3 sm:mb-4">
                    <FontAwesomeIcon icon={faComments} className="text-2xl sm:text-3xl text-white" />
                  </div>

                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 sm:mb-3 tracking-wide px-2">
                    Discussão Multidisciplinar
                  </h3>

                  <div className="max-w-2xl mx-auto space-y-2 sm:space-y-3">
                    <p className="text-indigo-100 font-medium text-sm sm:text-base lg:text-lg leading-relaxed px-2">
                      💬 Troque experiências e estratégias com colegas
                    </p>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border border-white/20 mx-2">
                      <p className="text-white text-xs sm:text-sm leading-relaxed">
                        ✨ Use <span className="bg-white/20 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-mono font-semibold mx-1 border border-white/30 text-xs sm:text-sm">@nome</span> para mencionar um colega específico
                      </p>
                    </div>

                    <div className="flex items-center justify-center space-x-3 sm:space-x-6 text-indigo-100 text-xs sm:text-sm flex-wrap gap-y-2">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                        <span className="font-medium">📱 Tempo Real</span>
                      </div>
                      <div className="w-px h-3 sm:h-4 bg-white/30 hidden sm:block"></div>
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"></span>
                        <span className="font-medium">🔒 Privado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat */}
              <div className="p-2 sm:p-3 lg:p-4">
                <CaseDiscussionChat
                  patientId={patientId}
                  patientName={patientName}
                />
              </div>
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
                      <li className="break-words">Compartilhe observações, estratégias e progressos do paciente</li>
                      <li className="break-words">Colabore de forma integrada para otimizar o tratamento</li>
                      <li className="break-words">Todas as discussões ficam registradas para consulta futura</li>
                      <li className="break-words">Mantenha o sigilo profissional e ética nas discussões</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CaseDiscussionPage;
