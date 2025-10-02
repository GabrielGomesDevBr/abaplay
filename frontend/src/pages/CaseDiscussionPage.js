import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import CaseDiscussionChat from '../components/chat/CaseDiscussionChat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faComments, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const CaseDiscussionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedPatient } = usePatients();

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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center py-3 sm:py-4 gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
              aria-label="Voltar"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
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
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-5xl mx-auto px-2 sm:px-3 lg:px-4 py-3 sm:py-4 lg:py-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* Header do chat */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl mb-2 sm:mb-3">
                <FontAwesomeIcon icon={faComments} className="text-2xl sm:text-3xl text-white" />
              </div>

              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 tracking-wide px-2">
                💬 Chat em Tempo Real
              </h3>

              <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed px-2">
                Troque experiências e estratégias com toda a equipe
              </p>

              <div className="mt-3 sm:mt-4 flex items-center justify-center space-x-3 sm:space-x-6 text-indigo-100 text-xs sm:text-sm flex-wrap gap-y-2">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="font-medium">Online</span>
                </div>
                <div className="w-px h-3 sm:h-4 bg-white/30 hidden sm:block"></div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="font-medium">Mensagens Instantâneas</span>
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
      </div>
    </div>
  );
};

export default CaseDiscussionPage;
