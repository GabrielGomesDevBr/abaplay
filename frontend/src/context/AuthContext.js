// frontend/src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // <<< MELHORIA: Estado de carregamento para a verificação inicial >>>
  const [isLoading, setIsLoading] = useState(true);

  // Função para inicializar o estado de autenticação a partir do localStorage
  const initializeAuth = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          // Token expirado
          localStorage.removeItem('token');
        } else {
          // Token válido
          setToken(storedToken);
          setUser(decoded);
          setIsAuthenticated(true);
          return; // Sai da função se o token for válido
        }
      } catch (error) {
        console.error("Falha ao descodificar token, a limpar...", error);
        localStorage.removeItem('token');
      }
    }
    // Se não houver token ou se for inválido, garante que o estado está limpo
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Efeito que corre apenas uma vez no arranque da aplicação
  useEffect(() => {
    initializeAuth();
    setIsLoading(false); // Marca o carregamento como completo
  }, [initializeAuth]);

  // <<< CORREÇÃO CRÍTICA: Funções de login e logout agora são mais robustas >>>
  const login = (newToken) => {
    try {
        localStorage.setItem('token', newToken);
        const decoded = jwtDecode(newToken);
        setToken(newToken);
        setUser(decoded);
        setIsAuthenticated(true);
    } catch (error) {
        console.error("Erro ao processar novo token de login:", error);
        logout(); // Garante que o estado é limpo em caso de erro
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Função para atualizar dados do usuário (para dados profissionais)
  const updateUser = (updatedUserData) => {
    if (user) {
      const newUser = { ...user, ...updatedUserData };
      setUser(newUser);
    }
  };

  const value = { token, user, isAuthenticated, isLoading, login, logout, updateUser };

  return (
    <AuthContext.Provider value={value}>
      {/* O conteúdo da aplicação só é renderizado após a verificação inicial terminar */}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
