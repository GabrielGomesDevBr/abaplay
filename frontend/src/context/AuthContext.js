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
          localStorage.removeItem('professionalData');
        } else {
          // Token válido - carregar dados profissionais persistidos
          const storedProfessionalData = localStorage.getItem('professionalData');
          let userWithProfessionalData = decoded;

          if (storedProfessionalData) {
            try {
              const professionalData = JSON.parse(storedProfessionalData);
              userWithProfessionalData = { ...decoded, ...professionalData };
            } catch (error) {
              console.warn('Erro ao carregar dados profissionais persistidos:', error);
              localStorage.removeItem('professionalData');
            }
          }

          setToken(storedToken);
          setUser(userWithProfessionalData);
          setIsAuthenticated(true);
          return; // Sai da função se o token for válido
        }
      } catch (error) {
        // Token inválido, limpando dados
        localStorage.removeItem('token');
        localStorage.removeItem('professionalData');
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
        // Erro ao processar token, limpando estado
        logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('professionalData');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Função para atualizar dados do usuário (para dados profissionais)
  const updateUser = (updatedUserData) => {
    if (user && updatedUserData) {
      const newUser = { ...user, ...updatedUserData };
      setUser(newUser);

      // Persistir dados profissionais no localStorage se necessário
      if (token && (updatedUserData.professional_id || updatedUserData.qualifications || updatedUserData.professional_signature)) {
        try {
          // Salvar apenas dados profissionais no localStorage separadamente
          const professionalData = {
            professional_id: updatedUserData.professional_id,
            qualifications: updatedUserData.qualifications,
            professional_signature: updatedUserData.professional_signature
          };

          localStorage.setItem('professionalData', JSON.stringify(professionalData));

          // Dados profissionais persistidos com sucesso
        } catch (error) {
          // Erro ao persistir dados profissionais
        }
      }
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
