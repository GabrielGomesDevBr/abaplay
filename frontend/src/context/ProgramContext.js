// frontend/src/contexts/ProgramContext.js
import React, { createContext, useState, useContext } from 'react';
// A importação de 'axios' e 'API_URL' foi removida, pois não são mais necessárias aqui.

// 1. Cria o Contexto
const ProgramContext = createContext(null);

// 2. Cria o Provedor do Contexto (versão corrigida e segura)
export const ProgramProvider = ({ children }) => {
  // --- MODIFICAÇÃO IMPORTANTE ---
  // A busca de dados automática via useEffect foi COMPLETAMENTE REMOVIDA.
  // Isso elimina o erro 401 que estava bloqueando a aplicação.
  // A responsabilidade de buscar os programas agora pertence exclusivamente à ProgramsPage.

  // Mantemos os estados com valores iniciais seguros para não quebrar a aplicação.
  const [programs, setPrograms] = useState([]);
  const [programsByArea, setProgramsByArea] = useState({});
  const [isLoading, setIsLoading] = useState(false); // Inicia como 'false'
  const [error, setError] = useState(null);

  // A função useEffect que chamava a API foi removida.

  // Mantemos a função getProgramById para compatibilidade, mas ela operará
  // com os dados que a ProgramsPage eventualmente carregar.
  const getProgramById = (programId) => {
    if (!programs || programs.length === 0) return null;
    return programs.find(p => p.id === programId) || null;
  };

  // Adicionamos o estado 'selectedArea' que é necessário para a nova lógica de navegação.
  const [selectedArea, setSelectedArea] = useState('Todos');

  // O valor fornecido pelo contexto
  const value = {
    programs,
    allProgramsData: programsByArea, // Mantém o nome antigo para compatibilidade
    isLoading,
    error,
    getProgramById,
    selectedArea, // Adiciona o novo estado ao contexto
    setSelectedArea, // Adiciona a função para atualizar o estado
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
};

// 3. Hook customizado para facilitar o uso do contexto (mantido como no original)
export const usePrograms = () => {
  const context = useContext(ProgramContext);
  if (context === null) {
    throw new Error('usePrograms deve ser usado dentro de um ProgramProvider');
  }
  return context;
};
