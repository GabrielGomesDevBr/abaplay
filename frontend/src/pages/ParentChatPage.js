import { Link, useNavigate, useLocation } from 'react-router-dom'; // ✅ NOVO: useLocation
import { useEffect, useState } from 'react'; // ✅ NOVO: useState
import { useAuth } from '../context/AuthContext';
import { usePatients } from '../context/PatientContext';
import ParentTherapistChat from '../components/chat/ParentTherapistChat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faComments, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast'; // ✅ NOVO: Para mostrar toast informativo

const ParentChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ NOVO: Para receber state da navegação
  const { hasProAccess } = useAuth();
  const { selectedPatient } = usePatients();
  const [highlightUnread, setHighlightUnread] = useState(false); // ✅ NOVO: Para destacar não lidas

  // FASE 2: Proteção adicional - redireciona se não tiver acesso Pro
  useEffect(() => {
    if (!hasProAccess()) {
      navigate('/');
    }
  }, [hasProAccess, navigate]);

  // ✅ NOVO: Processar state da navegação (vindo de TodayPriorities)
  useEffect(() => {
    if (location.state) {
      const { openChatPatientId, highlightUnread: shouldHighlight } = location.state;

      // Se veio das prioridades para ver mensagens não lidas
      if (openChatPatientId && selectedPatient && openChatPatientId === selectedPatient.id) {
        if (shouldHighlight) {
          setHighlightUnread(true);

          // Mostrar toast informativo
          toast.success('Chat aberto para visualizar mensagens não lidas', {
            icon: '💬',
            duration: 3000
          });
        }
      }

      // Limpar o state após processar para evitar reprocessamento
      window.history.replaceState({}, document.title);
    }
  }, [location, selectedPatient]);

  if (!selectedPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full border border-red-100">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Paciente não encontrado</h2>
          <p className="text-gray-600 mb-8 leading-relaxed px-4">
            Não foi possível identificar o paciente associado.
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-xl border-b border-gray-100">
        <div className="px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <Link
                to="/"
                className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base min-h-[44px]"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span className="hidden sm:inline">Voltar ao Acompanhamento</span>
                <span className="sm:hidden">Voltar</span>
              </Link>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 break-words">
                  Chat com a Família
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600">
                  <FontAwesomeIcon icon={faComments} className="text-indigo-500" />
                  <span className="font-medium hidden sm:inline">Paciente:</span>
                  <span className="font-bold text-gray-800">{selectedPatient.name}</span>
                </div>
              </div>
            </div>

            {/* Badge de Status */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-green-200 w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-700 font-semibold text-xs sm:text-sm">Chat em Tempo Real</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* Chat */}
          <div className="p-2 sm:p-3 lg:p-4">
            <ParentTherapistChat
              patientId={selectedPatient.id}
              patientName={selectedPatient.name}
              highlightUnread={highlightUnread}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentChatPage;
