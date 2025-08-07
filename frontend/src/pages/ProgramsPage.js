import React, { useState } from 'react';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { useAuth } from '../context/AuthContext';
// A função 'removeProgramAssignment' foi removida das importações.
import { assignProgramToPatient } from '../api/patientApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const { selectedPatient, refreshPatientData } = usePatients();
  const { isLoading, error: contextError } = usePrograms();
  
  // SOLUÇÃO: O token agora é extraído diretamente do hook useAuth.
  const { token } = useAuth();

  const [assigningId, setAssigningId] = useState(null);
  // O estado 'removingId' não é mais necessário.
  const [actionError, setActionError] = useState('');

  const handleAssign = async (programId) => {
    if (!selectedPatient) {
      setActionError('Nenhum cliente selecionado para atribuir o programa.');
      return;
    }
    
    if (!token) {
      setActionError('Erro de autenticação. Por favor, faça login novamente.');
      return;
    }

    setAssigningId(programId);
    setActionError('');
    try {
      await assignProgramToPatient(selectedPatient.id, programId, token);
      if (refreshPatientData) {
        await refreshPatientData(selectedPatient.id);
      }
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      setActionError(error.message || 'Ocorreu um erro ao atribuir o programa.');
    } finally {
      setAssigningId(null);
    }
  };

  // A função handleRemove foi completamente removida desta página,
  // conforme nossa decisão de centralizar a lógica.

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-center p-10">
        <div>
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500 mb-4" />
          <p className="text-gray-500">Carregando biblioteca de programas...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
        <p className="text-sm text-red-800">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {contextError || 'Não foi possível carregar os programas.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Biblioteca de Programas
      </h1>

      {actionError && (
         <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-red-800">{actionError}</p>
        </div>
      )}

      {!selectedPatient && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            Selecione um cliente na barra lateral para visualizar e atribuir programas.
          </p>
        </div>
      )}

      {selectedPatient && (
        <ProgramLibrary
          onAssign={handleAssign}
          // As props 'onRemove' e 'removingId' não são mais passadas.
          isPatientSelected={!!selectedPatient}
          assigningId={assigningId}
          assignedPrograms={selectedPatient.assigned_programs || []}
        />
      )}
    </div>
  );
};

export default ProgramsPage;
