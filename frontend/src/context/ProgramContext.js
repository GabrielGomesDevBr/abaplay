// frontend/src/context/ProgramContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getProgramAreas } from '../api/programApi';
import { useAuth } from './AuthContext';

const ProgramContext = createContext();

export const ProgramProvider = ({ children }) => {
  const [areas, setAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchAreas = async () => {
      if (!isAuthenticated) {
        setAreas([]); // Limpa as áreas se o usuário não estiver autenticado
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAreas = await getProgramAreas();
        setAreas(fetchedAreas);
      } catch (err) {
        setError('Não foi possível carregar as áreas de programa.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAreas();
  }, [isAuthenticated]); // Recarrega as áreas quando o status de autenticação muda

  const value = {
    areas,
    isLoading,
    error,
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