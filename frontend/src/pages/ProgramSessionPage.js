import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// O 'usePrograms' não é mais necessário aqui, simplificando o componente.
import { getAssignmentDetails } from '../api/programApi';
import SessionProgress from '../components/program/SessionProgress';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

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
      <div className="flex items-center justify-center h-full text-center p-10">
        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500" />
        <p className="ml-4 text-lg text-gray-600">Carregando dados da sessão...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded-r-lg text-center">
        <p className="text-sm text-red-800">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {error}
        </p>
        <Link to="/clients" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
          Voltar para a lista de clientes
        </Link>
      </div>
    );
  }

  // Se os dados não foram carregados por algum motivo, mostramos uma mensagem.
  if (!sessionData) {
    return <div className="text-center p-10">Não foi possível carregar os dados da sessão.</div>;
  }

  // Extraímos os dados do nosso estado para usar no JSX.
  const { program, patient, assignment_id } = sessionData;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Link to={`/clients/${patient?.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Voltar para os detalhes do paciente
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
          {program?.name || 'Carregando programa...'}
        </h1>
        <p className="text-md text-gray-600">
          Sessão de Terapia para: <span className="font-semibold">{patient?.name}</span>
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {program && sessionData ? (
          // Passamos o objeto 'program' e o objeto 'sessionData' (como 'assignment') para o componente filho.
          <SessionProgress program={program} assignment={sessionData} />
        ) : (
          <div className="text-center text-gray-500">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl" />
            <p className="mt-2">A carregar detalhes do registo de progresso...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramSessionPage;
