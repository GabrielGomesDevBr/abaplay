import React, { useState } from 'react';
import { usePatients } from '../context/PatientContext';
// O usePrograms agora nos dá tudo que precisamos, sem a necessidade de filtrar aqui.
import { usePrograms } from '../context/ProgramContext';
import { assignProgram } from '../api/programApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  // Hooks para obter dados dos contextos.
  const { selectedPatient, refreshPatientData } = usePatients();
  const { isLoading, error: contextError } = usePrograms();
  
  // Estados locais para gerenciar o processo de designação.
  const [assigningId, setAssigningId] = useState(null);
  const [assignError, setAssignError] = useState('');

  // A função para designar um programa permanece a mesma.
  const handleAssign = async (programId) => {
    if (!selectedPatient) {
      setAssignError('Nenhum cliente selecionado para atribuir o programa.');
      return;
    }
    setAssigningId(programId);
    setAssignError('');
    try {
      await assignProgram(selectedPatient.id, programId);
      // Atualiza os dados do paciente para refletir o novo programa designado.
      if (refreshPatientData) {
        await refreshPatientData(selectedPatient.id);
      }
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      const errorMessage = error.response?.data || 'Ocorreu um erro ao atribuir o programa.';
      setAssignError(errorMessage);
    } finally {
      setAssigningId(null);
    }
  };

  // Renderização de estado de carregamento global (vindo do ProgramContext).
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
  
  // Renderização de estado de erro global.
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
      
      {/* Exibe erros que possam ocorrer durante a designação. */}
      {assignError && (
         <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-red-800">{assignError}</p>
        </div>
      )}

      {/* Alerta para o usuário selecionar um paciente. */}
      {!selectedPatient && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            Selecione um cliente na barra lateral para visualizar e atribuir programas.
          </p>
        </div>
      )}

      {/* Quando um paciente está selecionado, a biblioteca é renderizada. */}
      {selectedPatient && (
        <ProgramLibrary 
          // Não passamos mais `programs`, pois o componente busca do context.
          onAssign={handleAssign} 
          isPatientSelected={!!selectedPatient} 
          assigningId={assigningId}
          // Passamos os programas já designados para o ProgramLibrary poder desabilitar os botões corretos.
          assignedPrograms={selectedPatient.assigned_programs || []}
        />
      )}
    </div>
  );
};

export default ProgramsPage;
