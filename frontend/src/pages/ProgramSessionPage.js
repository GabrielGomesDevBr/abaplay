import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssignmentDetails } from '../api/programApi';
import SessionProgress from '../components/program/SessionProgress';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faArrowLeft, faUserMd, faClipboardList } from '@fortawesome/free-solid-svg-icons';

const ProgramSessionPage = () => {
  const { assignmentId } = useParams();
  
  // Simplificamos o estado para um único objeto que conterá todos os dados da sessão.
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Garante que o ID da atribuição existe antes de tentar carregar os dados.
    if (!assignmentId) {
      setError('ID da designação não fornecido.');
      setIsLoading(false);
      return;
    }

    const loadSessionData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fazemos apenas UMA chamada à API, que agora retorna todos os dados necessários.
        const data = await getAssignmentDetails(assignmentId);
        if (!data) {
          throw new Error('Designação de programa não encontrada.');
        }
        
        // Armazenamos a resposta completa no nosso estado.
        setSessionData(data);

      } catch (err) {
        console.error("Erro ao carregar dados da sessão:", err);
        setError(err.response?.data?.message || err.message || 'Ocorreu um erro ao carregar a sessão.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();

  }, [assignmentId]); // O useEffect agora só depende do assignmentId.

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full border border-gray-100">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">Carregando Sessão</h3>
          <p className="text-gray-600 leading-relaxed">Preparando os dados da sessão terapêutica...</p>
          <div className="mt-6 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-lg w-full border border-red-100">
          <div className="bg-gradient-to-br from-red-100 to-pink-100 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            {error.includes('arquivado') ? 'Programa Arquivado' : 'Erro ao Carregar Sessão'}
          </h3>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          {error.includes('arquivado') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">
                🎉 Este programa foi marcado como dominado com sucesso! 
                Volte à lista de programas para selecionar outro.
              </p>
            </div>
          )}
          <Link 
            to="/clients" 
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Voltar aos Clientes</span>
          </Link>
        </div>
      </div>
    );
  }

  // Se os dados não foram carregados por algum motivo, mostramos uma mensagem.
  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full border border-gray-100">
          <div className="bg-gradient-to-br from-gray-100 to-slate-100 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FontAwesomeIcon icon={faClipboardList} className="text-3xl text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">Dados Indisponíveis</h3>
          <p className="text-gray-600 leading-relaxed">Não foi possível carregar os dados da sessão.</p>
        </div>
      </div>
    );
  }

  // Extraímos os dados do nosso estado para usar no JSX.
  const { program, patient, assignment_id } = sessionData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Cabeçalho Moderno */}
      <div className="bg-white shadow-xl border-b border-gray-100">
        <div className="px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <Link
                to={`/clients/${patient?.id}`}
                className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base min-h-[44px]"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span className="hidden sm:inline">Voltar ao Paciente</span>
                <span className="sm:hidden">Voltar</span>
              </Link>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 break-words">
                  {program?.name || 'Carregando programa...'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-600">
                  <FontAwesomeIcon icon={faUserMd} className="text-indigo-500" />
                  <span className="font-medium hidden sm:inline">Sessão de Terapia para:</span>
                  <span className="font-medium sm:hidden">Paciente:</span>
                  <span className="font-bold text-gray-800">{patient?.name}</span>
                </div>
              </div>
            </div>

            {/* Badge de Status */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border border-green-200 w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-semibold text-sm">Sessão Ativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-2 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {program && sessionData ? (
            <SessionProgress program={program} assignment={sessionData} />
          ) : (
            <div className="p-16 text-center">
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-2xl w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Preparando Sessão</h3>
              <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
                A carregar detalhes do registo de progresso...
              </p>
              <div className="mt-8 flex items-center justify-center space-x-3">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramSessionPage;
