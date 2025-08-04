// frontend/src/contexts/ProgramContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config'; // Garante que a URL da API seja importada corretamente

// 1. Cria o Contexto
const ProgramContext = createContext(null);

// 2. Cria o Provedor do Contexto (versão refatorada)
export const ProgramProvider = ({ children }) => {
  // Estado para a lista original de programas da API
  const [programs, setPrograms] = useState([]);
  // Estado para os programas agrupados por área (recriando a estrutura antiga)
  const [programsByArea, setProgramsByArea] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgramsFromApi = async () => {
      try {
        setIsLoading(true);
        // Usa a URL da API do arquivo de configuração
        const response = await axios.get(`${API_URL}/api/programs`);
        
        const fetchedPrograms = response.data;
        console.log("[ProgramContext] Dados recebidos da API:", fetchedPrograms);
        setPrograms(fetchedPrograms); // Armazena o array de programas

        // --- LÓGICA DE AGRUPAMENTO ---
        // Transforma o array de programas em um objeto agrupado por área
        const groupedPrograms = fetchedPrograms.reduce((acc, program) => {
          const { area } = program;
          if (!acc[area]) {
            acc[area] = [];
          }
          acc[area].push(program);
          return acc;
        }, {});

        console.log("[ProgramContext] Programas agrupados por área:", groupedPrograms);
        setProgramsByArea(groupedPrograms); // Armazena o objeto agrupado
        setError(null);

      } catch (err) {
        console.error("Falha ao carregar os programas da API:", err);
        setError('Não foi possível carregar os programas. Verifique a conexão com o servidor.');
        // O fallback para o JSON local pode ser mantido se desejado, mas o erro principal é a conexão com a API
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramsFromApi();
  }, []); // O array vazio [] garante que isto só executa uma vez

  // Função para encontrar um programa por ID (ajustada para a nova estrutura)
  const getProgramById = (programId) => {
    if (!programs || programs.length === 0) return null;
    // A busca agora é mais simples, pois 'programs' é um array plano
    return programs.find(p => p.id === programId) || null;
  };

  // O valor fornecido pelo contexto
  const value = {
    programs, // A lista original de programas
    allProgramsData: programsByArea, // O objeto agrupado para a Navbar (mantendo o nome antigo para compatibilidade)
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