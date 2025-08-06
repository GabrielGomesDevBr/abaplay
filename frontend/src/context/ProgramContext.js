import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
// --- ALTERAÇÃO ---
// Importa ambas as funções da nossa API de programas.
import { getAllPrograms, getProgramById } from '../api/programApi';
import { useAuth } from './AuthContext';

const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  const [disciplines, setDisciplines] = useState([]);
  // --- NOVA ADIÇÃO ---
  // Estado para armazenar os detalhes de um único programa selecionado.
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // Função para buscar a lista completa de programas. (Seu código, mantido pois está perfeito)
  const fetchDisciplinesAndPrograms = useCallback(async () => {
    if (!isAuthenticated) {
      setDisciplines([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await getAllPrograms();
      setDisciplines(fetchedData || []);
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

  // --- NOVA FUNÇÃO ---
  // Função para buscar os detalhes de um programa específico pelo ID.
  const fetchProgramDetails = useCallback(async (programId) => {
    setIsLoading(true);
    setError(null);
    try {
        const programData = await getProgramById(programId);
        setSelectedProgram(programData);
    } catch (err) {
        setError('Não foi possível carregar os detalhes do programa.');
        console.error(`Erro em ProgramContext ao buscar programa ${programId}:`, err);
        setSelectedProgram(null); // Limpa em caso de erro
    } finally {
        setIsLoading(false);
    }
  }, []); // Não depende de isAuthenticated, pois pode ser chamado sob demanda.

  // --- ALTERAÇÃO ---
  // Adiciona os novos estados e funções ao valor do contexto.
  const value = {
    disciplines,
    selectedProgram,
    isLoading,
    error,
    refreshPrograms: fetchDisciplinesAndPrograms,
    fetchProgramDetails,
    clearSelectedProgram: () => setSelectedProgram(null) // Função para limpar o programa selecionado
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};

// O hook não muda, mas agora dará acesso aos novos valores.
export const usePrograms = () => {
  const context = useContext(ProgramContext);
  if (context === null) {
    throw new Error('usePrograms deve ser usado dentro de um ProgramProvider');
  }
  return context;
};
