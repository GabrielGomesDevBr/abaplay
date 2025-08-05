import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // Adiciona useParams
import { usePatients } from '../context/PatientContext';
import { getAllProgramsForPatient, assignProgram } from '../api/programApi';
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  const [programsData, setProgramsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  const { selectedPatient } = usePatients();
  const { areaName } = useParams(); // Obtém o nome da área da URL
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchTerm = queryParams.get('search') || '';

  // Efeito para buscar os programas sempre que o paciente ou a área mudar
  useEffect(() => {
    if (selectedPatient && areaName) {
      const fetchPrograms = async () => {
        setIsLoading(true);
        setError('');
        try {
          // A API busca todos os programas do paciente, a filtragem ocorre no frontend
          const data = await getAllProgramsForPatient(selectedPatient.id);
          setProgramsData(data);
        } catch (err) {
          setError('Não foi possível carregar os programas. Verifique a conexão ou tente novamente.');
          setProgramsData({});
        } finally {
          setIsLoading(false);
        }
      };
      fetchPrograms();
    } else {
      setProgramsData({});
    }
  }, [selectedPatient, areaName]); // Dependências: executa quando o paciente ou a área muda

  // Lógica de filtragem e exibição simplificada
  const programsForCurrentArea = programsData[areaName] || [];

  const programsToShow = searchTerm
    ? programsForCurrentArea.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : programsForCurrentArea;

  // Função para lidar com a atribuição de um programa
  const handleAssign = async (programId) => {
    if (!selectedPatient) return;

    setAssigningId(programId);
    try {
      await assignProgram(programId, selectedPatient.id);
      
      setProgramsData(currentData => {
        const newData = { ...currentData };
        if (newData[areaName]) {
          const programIndex = newData[areaName].findIndex(p => p.id === programId);
          if (programIndex !== -1) {
            newData[areaName][programIndex] = { ...newData[areaName][programIndex], is_assigned: true };
          }
        }
        return newData;
      });

    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
    } finally {
      setAssigningId(null);
    }
  };

  // Renderização condicional para o estado de carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-center p-10">
        <div>
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500 mb-4" />
          <p className="text-gray-500">Carregando programas para o paciente...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Biblioteca de Programas: {areaName}
      </h1>
      
      {/* Mensagens para o usuário */}
      {!selectedPatient && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            Selecione um cliente na barra lateral para visualizar e atribuir programas.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-red-800">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
              {error}
            </p>
        </div>
      )}

      {/* A biblioteca de programas só é renderizada se um paciente estiver selecionado */}
      {selectedPatient && !error && (
        <ProgramLibrary 
          programs={programsToShow} 
          onAssign={handleAssign} 
          isPatientSelected={!!selectedPatient} 
          assigningId={assigningId}
          // A prop 'assignedPrograms' não é mais necessária, pois cada programa já tem 'is_assigned'
        />
      )}
    </div>
  );
};

export default ProgramsPage;
