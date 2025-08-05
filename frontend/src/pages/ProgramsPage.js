import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePatients } from '../context/PatientContext'; // Usado apenas para obter o paciente selecionado
import { getAllProgramsForPatient, assignProgram } from '../api/programApi'; // Nossas novas funções da API
import ProgramLibrary from '../components/program/ProgramLibrary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ProgramsPage = () => {
  // Estado local para gerenciar os dados, carregamento e erros
  const [programsData, setProgramsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState(null);

  const { selectedPatient } = usePatients(); // Obter o paciente selecionado do contexto
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // A área ativa vem da URL, com um padrão para o primeiro link
  const activeArea = queryParams.get('area') || 'Todos'; 
  const searchTerm = queryParams.get('search') || '';

  // Efeito para buscar os programas sempre que o paciente selecionado mudar
  useEffect(() => {
    if (selectedPatient) {
      const fetchPrograms = async () => {
        setIsLoading(true);
        setError('');
        try {
          const data = await getAllProgramsForPatient(selectedPatient.id);
          setProgramsData(data);
        } catch (err) {
          setError('Não foi possível carregar os programas. Verifique a conexão ou tente novamente.');
          setProgramsData({}); // Limpa os dados em caso de erro
        } finally {
          setIsLoading(false);
        }
      };
      fetchPrograms();
    } else {
      // Se nenhum paciente estiver selecionado, limpa os dados.
      setProgramsData({});
    }
  }, [selectedPatient]); // Dependência: re-executa quando selectedPatient muda

  // Lógica de filtragem e exibição
  const programsInArea = activeArea === 'Todos' 
    ? Object.values(programsData).flat() // Se "Todos", junta os programas de todas as áreas
    : programsData[activeArea] || []; // Senão, pega os programas da área ativa

  let programsToShow = [];
  if (searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    programsToShow = programsInArea.filter(p => 
        p.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  } else {
    programsToShow = programsInArea;
  }

  // Função para lidar com a atribuição de um programa
  const handleAssign = async (programId) => {
    if (!selectedPatient) return;

    setAssigningId(programId);
    try {
      await assignProgram(programId, selectedPatient.id);
      
      // Atualização otimista: atualiza a UI sem precisar de um novo fetch
      setProgramsData(currentData => {
        const newData = { ...currentData };
        for (const area in newData) {
          const programIndex = newData[area].findIndex(p => p.id === programId);
          if (programIndex !== -1) {
            // Cria um novo objeto de programa para garantir a re-renderização
            newData[area][programIndex] = { ...newData[area][programIndex], is_assigned: true };
            break;
          }
        }
        return newData;
      });

    } catch (error) {
      console.error("Falha ao atribuir programa:", error);
      // Opcional: Adicionar um toast/notificação de erro para o usuário
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
        Biblioteca de Programas: {activeArea}
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
