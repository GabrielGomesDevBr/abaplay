// frontend/src/context/ProgramContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// 1. Cria o Contexto do Programa
const ProgramContext = createContext(null);

// 2. Cria o Provedor do Contexto
export const ProgramProvider = ({ children }) => {
  const [allProgramsData, setAllProgramsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect para carregar o ficheiro programs.json quando a aplicação inicia
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await axios.get('/data/programs.json');
        const rawPrograms = response.data;
        const programsWithArea = {};

        // Itera sobre as chaves (áreas) do JSON original
        for (const areaKey in rawPrograms) {
          if (Object.hasOwnProperty.call(rawPrograms, areaKey) && Array.isArray(rawPrograms[areaKey])) {
            // Mapeia os programas dentro de cada área para adicionar a propriedade 'area'
            programsWithArea[areaKey] = rawPrograms[areaKey].map(program => ({
              ...program,
              area: areaKey // Adiciona a propriedade 'area' com o nome da chave
            }));
          }
        }
        
        console.log("[ProgramContext] Programas carregados e processados com 'area':", programsWithArea);
        setAllProgramsData(programsWithArea);

      } catch (err) {
        console.error("Erro ao carregar programs.json:", err);
        setError("Não foi possível carregar a biblioteca de programas.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, []); // O array vazio [] garante que isto só executa uma vez

  // Função auxiliar para encontrar um programa por ID em qualquer área
  const getProgramById = (programId) => {
    if (!allProgramsData) return null;
    for (const areaKey in allProgramsData) {
      if (Array.isArray(allProgramsData[areaKey])) {
        // Agora, 'program' já terá a propriedade 'area'
        const program = allProgramsData[areaKey].find(p => p.id === programId);
        if (program) return program;
      }
    }
    return null;
  };

  const value = {
    allProgramsData,
    isLoading,
    error,
    getProgramById,
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};

// 3. Hook customizado para facilitar o uso do contexto
export const usePrograms = () => {
  const context = useContext(ProgramContext);
  if (context === null) {
    throw new Error('usePrograms deve ser usado dentro de um ProgramProvider');
  }
  return context;
};
