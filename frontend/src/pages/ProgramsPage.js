import React, { useState } from 'react';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
// CORREÇÃO: Importar ambas as funções de API, de atribuição e remoção.
import { assignProgram } from '../api/programApi';
import { removeProgramFromPatient } from '../api/patientApi'; // Importa a função de remoção
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const { selectedPatient, refreshPatientData } = usePatients();
  const { isLoading, error: contextError } = usePrograms();

  const [assigningId, setAssigningId] = useState(null);
  // CORREÇÃO: Adicionar estado para controlar o processo de remoção.
  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const handleAssign = async (programId) => {
    if (!selectedPatient) {
      setActionError('Nenhum cliente selecionado para atribuir o programa.');
      return;
    }
    setAssigningId(programId);
    setActionError('');
    try {
      await assignProgram(selectedPatient.id, programId);
      // Atualiza os dados do paciente para refletir o novo programa designado.
      if (refreshPatientData) {
        // Força a recarga completa dos dados do paciente para obter a nova lista de programas.
        await refreshPatientData(selectedPatient.id);
      }
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      const errorMessage = error.response?.data?.message || error.response?.data || 'Ocorreu um erro ao atribuir o programa.';
      setActionError(errorMessage);
    } finally {
      setAssigningId(null);
    }
  };

  // CORREÇÃO: Nova função para lidar com a remoção de um programa.
  const handleRemove = async (programId) => {
    if (!selectedPatient) {
        setActionError('Nenhum cliente selecionado.');
        return;
    }
    setRemovingId(programId);
    setActionError('');
    try {
        await removeProgramFromPatient(selectedPatient.id, programId);
        // Atualiza os dados do paciente para refletir a remoção do programa.
        if (refreshPatientData) {
            await refreshPatientData(selectedPatient.id);
        }
    } catch (error) {
        console.error("Falha ao remover programa:", error);
        const errorMessage = error.response?.data?.message || error.response?.data || 'Ocorreu um erro ao remover o programa.';
        setActionError(errorMessage);
    } finally {
        setRemovingId(null);
    }
  };


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
          // CORREÇÃO: Passar a nova função de remoção e o estado de loading correspondente.
          onAssign={handleAssign}
          onRemove={handleRemove}
          isPatientSelected={!!selectedPatient}
          assigningId={assigningId}
          removingId={removingId}
          // A lista de programas atribuídos é crucial para a lógica de exibição dos botões.
          assignedPrograms={selectedPatient.assigned_programs || []}
        />
      )}
    </div>
  );
};

export default ProgramsPage;
