import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { usePrograms } from '../context/ProgramContext';
import { assignProgram } from '../api/programApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const { areaName: disciplineName } = useParams();
  const { selectedPatient, refreshPatientData } = usePatients();
  const { disciplines, isLoading, error: contextError } = usePrograms();
  
  const [assigningId, setAssigningId] = useState(null);
  const [assignError, setAssignError] = useState('');

  const programsToShow = useMemo(() => {
    // --- INÍCIO DOS LOGS DE DEPURAÇÃO ---
    console.log('[DEBUG ProgramsPage] Recalculando a lista de programas para exibir...');
    console.log('[DEBUG ProgramsPage] Nome da disciplina da URL:', disciplineName);
    console.log('[DEBUG ProgramsPage] Dados completos recebidos do contexto (disciplines):', JSON.parse(JSON.stringify(disciplines))); // Log profundo

    if (!disciplineName || !disciplines || disciplines.length === 0) {
      console.log('[DEBUG ProgramsPage] Condição inicial não atendida (sem nome ou sem disciplinas). Retornando [].');
      return [];
    }

    // 1. Tenta encontrar a disciplina correspondente
    const currentDiscipline = disciplines.find(d => d.name === disciplineName);
    console.log('[DEBUG ProgramsPage] Resultado da busca pela disciplina:', currentDiscipline);

    if (!currentDiscipline || !currentDiscipline.areas || currentDiscipline.areas.length === 0) {
      console.log('[DEBUG ProgramsPage] Disciplina não encontrada ou não possui áreas. Retornando [].');
      return [];
    }

    // 2. Tenta "desempacotar" os programas
    const allPrograms = currentDiscipline.areas.flatMap(area => 
      (area.sub_areas || []).flatMap(subArea => subArea.programs || [])
    );
    console.log('[DEBUG ProgramsPage] Resultado final da lista de programas (allPrograms):', allPrograms);
    // --- FIM DOS LOGS DE DEPURAÇÃO ---

    return allPrograms;
  }, [disciplines, disciplineName]);

  const handleAssign = async (programId) => {
    if (!selectedPatient) {
      setAssignError('Nenhum cliente selecionado para atribuir o programa.');
      return;
    }
    setAssigningId(programId);
    setAssignError('');
    try {
      await assignProgram(selectedPatient.id, programId);
      if (refreshPatientData) {
        await refreshPatientData(selectedPatient.id);
      }
    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      setAssignError('Ocorreu um erro ao atribuir o programa.');
    } finally {
      setAssigningId(null);
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
          {contextError.message || 'Não foi possível carregar os programas.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Biblioteca de Programas: {disciplineName}
      </h1>
      
      {assignError && (
         <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-red-800">{assignError}</p>
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
          programs={programsToShow} 
          onAssign={handleAssign} 
          isPatientSelected={!!selectedPatient} 
          assigningId={assigningId}
          assignedPrograms={selectedPatient.assigned_programs || []}
        />
      )}
    </div>
  );
};

export default ProgramsPage;
