import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getAllPrograms } from '../api/programApi';
import { useAuth } from './AuthContext';

const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  // CORRIGIDO: Inicializado como objeto, que é o formato que a API retorna.
  const [disciplines, setDisciplines] = useState({});
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const fetchDisciplinesAndPrograms = useCallback(async () => {
    if (!isAuthenticated) {
      setDisciplines({}); // Limpa como objeto
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await getAllPrograms();
      // Garante que sempre teremos um objeto
      setDisciplines(fetchedData || {});
    } catch (err) {
      setError('Não foi possível carregar os programas.');
      // Erro ao buscar programas
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Função auxiliar para encontrar um programa pelo ID na estrutura carregada
  const getProgramById = useCallback((programId) => {
    if (!disciplines || typeof disciplines !== 'object') {
      return null;
    }

    // Percorre a estrutura hierárquica: disciplines -> areas -> areas -> programs
    for (const disciplineKey in disciplines) {
      const discipline = disciplines[disciplineKey];
      if (discipline && typeof discipline === 'object') {
        for (const areaKey in discipline) {
          const area = discipline[areaKey];
          if (area && typeof area === 'object') {
            for (const subAreaKey in area) {
              const subArea = area[subAreaKey];
              if (Array.isArray(subArea)) {
                // subArea é diretamente um array de programas
                const program = subArea.find(p => p.id == programId);
                if (program) {
                  // Adiciona informação da área para melhor organização
                  return {
                    ...program,
                    area: areaKey,
                    discipline: disciplineKey,
                    sub_area: subAreaKey
                  };
                }
              }
            }
          }
        }
      }
    }
    return null;
  }, [disciplines]);

  useEffect(() => {
    fetchDisciplinesAndPrograms();
  }, [fetchDisciplinesAndPrograms]);

  const fetchProgramDetails = useCallback(async (programId) => {
    // Primeiro tenta buscar localmente
    const localProgram = getProgramById(programId);
    if (localProgram) {
      setSelectedProgram(localProgram);
      return;
    }

    // Se não encontrou localmente, busca via API
    setIsLoading(true);
    setError(null);
    try {
        const { getProgramById: apiGetProgramById } = await import('../api/programApi');
        const programData = await apiGetProgramById(programId);
        setSelectedProgram(programData);
    } catch (err) {
        setError('Não foi possível carregar os detalhes do programa.');
        // Erro ao buscar detalhes do programa
        setSelectedProgram(null);
    } finally {
        setIsLoading(false);
    }
  }, [getProgramById]);

  const value = {
    disciplines,
    selectedProgram,
    isLoading,
    error,
    refreshPrograms: fetchDisciplinesAndPrograms,
    fetchProgramDetails,
    getProgramById,
    clearSelectedProgram: () => setSelectedProgram(null)
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};

export const usePrograms = () => {
  const context = useContext(ProgramContext);
  if (context === null) {
    throw new Error('usePrograms deve ser usado dentro de um ProgramProvider');
  }
  return context;
};
