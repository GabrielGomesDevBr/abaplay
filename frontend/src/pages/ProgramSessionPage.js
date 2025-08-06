import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePrograms } from '../context/ProgramContext';
import { getAssignmentDetails } from '../api/programApi';
import SessionProgress from '../components/program/SessionProgress'; // --- NOVA IMPORTAÇÃO ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const ProgramSessionPage = () => {
  const { assignmentId } = useParams();
  const { selectedProgram, fetchProgramDetails, clearSelectedProgram } = usePrograms();
  
  const [assignment, setAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    clearSelectedProgram();

    const loadSessionData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const assignmentData = await getAssignmentDetails(assignmentId);
        if (!assignmentData) {
          throw new Error('Designação de programa não encontrada.');
        }
        setAssignment(assignmentData);

        await fetchProgramDetails(assignmentData.program_id);

      } catch (err) {
        console.error("Erro ao carregar dados da sessão:", err);
        setError(err.response?.data || err.message || 'Ocorreu um erro ao carregar a sessão.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();

    return () => {
      clearSelectedProgram();
    };
  }, [assignmentId, fetchProgramDetails, clearSelectedProgram]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-center p-10">
        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500" />
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

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <Link to={`/clients/${assignment?.patient_id}`} className="text-indigo-600 hover:text-indigo-800 text-sm">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Voltar para os detalhes do paciente
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
          {selectedProgram?.name || 'Carregando programa...'}
        </h1>
        <p className="text-md text-gray-600">
          Sessão de Terapia para: <span className="font-semibold">{assignment?.patient_name}</span>
        </p>
      </div>

      {/* --- ALTERAÇÃO PRINCIPAL --- */}
      {/* O componente SessionProgress é renderizado aqui, recebendo os dados necessários. */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {selectedProgram && assignment ? (
          <SessionProgress program={selectedProgram} assignment={assignment} />
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
