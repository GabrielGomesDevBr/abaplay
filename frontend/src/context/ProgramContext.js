import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
// CORREÇÃO: Importa a nova função 'getAllPrograms'
import { getAllPrograms } from '../api/programApi';
import { useAuth } from './AuthContext';

const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  // CORREÇÃO: O estado agora armazena 'disciplines', não mais 'areas'.
  const [disciplines, setDisciplines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  // A função de busca foi renomeada para maior clareza.
  const fetchDisciplinesAndPrograms = useCallback(async () => {
    if (!isAuthenticated) {
      setDisciplines([]); // Limpa os dados se o usuário deslogar.
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // CORREÇÃO: Chama a função correta da API.
      const fetchedData = await getAllPrograms();
      // Armazena a estrutura completa (que começa com disciplinas) no estado.
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

  // CORREÇÃO: Fornece 'disciplines' para os componentes filhos.
  const value = {
    disciplines,
    isLoading,
    error,
    refreshPrograms: fetchDisciplinesAndPrograms // Fornece uma função para recarregar os dados
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};

// O hook customizado agora retorna o contexto com os dados corretos.
export const usePrograms = () => {
  const context = useContext(ProgramContext);
  if (context === null) {
    throw new Error('usePrograms deve ser usado dentro de um ProgramProvider');
  }
  return context;
};
