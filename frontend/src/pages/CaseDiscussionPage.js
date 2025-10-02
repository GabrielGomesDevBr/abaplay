import { Link, useSearchParams } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import CaseDiscussionChat from '../components/chat/CaseDiscussionChat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faExclamationCircle, faUserMd } from '@fortawesome/free-solid-svg-icons';

const CaseDiscussionPage = () => {
  const [searchParams] = useSearchParams();
  const { selectedPatient } = usePatients();

  // Pegar parâmetros da URL (caso venha de link externo)
  const patientId = searchParams.get('patient') || selectedPatient?.id;
  const colleagueName = searchParams.get('colleagueName');

  if (!selectedPatient && !patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full border border-red-100">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Paciente não encontrado</h2>
          <p className="text-gray-600 mb-8 leading-relaxed px-4">
            Selecione um paciente para iniciar uma discussão de caso.
          </p>
          <Link
            to="/clients"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Ir para Pacientes</span>
          </Link>
        </div>
      </div>
    );
  }

  const patientName = selectedPatient?.name || 'paciente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-xl border-b border-gray-100">
        <div className="px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <Link
                to={selectedPatient ? `/clients/${selectedPatient.id}` : '/clients'}
                className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base min-h-[44px]"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span className="hidden sm:inline">Voltar ao Paciente</span>
                <span className="sm:hidden">Voltar</span>
              </Link>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 break-words">
                  Discussão de Caso
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600">
                  <FontAwesomeIcon icon={faUserMd} className="text-indigo-500" />
                  <span className="font-medium hidden sm:inline">
                    {colleagueName ? `Com ${colleagueName} sobre:` : 'Discussão sobre:'}
                  </span>
                  <span className="font-bold text-gray-800">{patientName}</span>
                </div>
              </div>
            </div>

            {/* Badge de Status */}
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-purple-200 w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                <span className="text-purple-700 font-semibold text-xs sm:text-sm">Equipe Multidisciplinar</span>
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
