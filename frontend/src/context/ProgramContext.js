import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getAllPrograms, getProgramById } from '../api/programApi';
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
      console.error("Erro em ProgramContext ao buscar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDisciplinesAndPrograms();
  }, [fetchDisciplinesAndPrograms]);

  const fetchProgramDetails = useCallback(async (programId) => {
    setIsLoading(true);
    setError(null);
    try {
        const programData = await getProgramById(programId);
        setSelectedProgram(programData);
    } catch (err) {
        setError('Não foi possível carregar os detalhes do programa.');
        console.error(`Erro em ProgramContext ao buscar programa ${programId}:`, err);
        setSelectedProgram(null);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const value = {
    disciplines,
    selectedProgram,
    isLoading,
    error,
    refreshPrograms: fetchDisciplinesAndPrograms,
    fetchProgramDetails,
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
