// frontend/src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getUserProfile } from '../api/reportApi';
import { getMySubscription } from '../api/subscriptionApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // <<< MELHORIA: Estado de carregamento para a verificação inicial >>>
  const [isLoading, setIsLoading] = useState(true);
  // <<< NOVO: Estado de assinatura >>>
  const [subscription, setSubscription] = useState(null);

  // Função para sincronizar assinatura
  const syncSubscription = useCallback(async () => {
    try {
      const subscriptionData = await getMySubscription();
      setSubscription(subscriptionData);
      return subscriptionData;
    } catch (error) {
      // Erro ao buscar assinatura - não bloqueia aplicação
      setSubscription(null);
      return null;
    }
  }, []);

  // Função para sincronizar perfil do backend com localStorage
  const syncUserProfile = useCallback(async (token) => {
    try {
      const profileData = await getUserProfile();

      // Extrair dados profissionais para o localStorage (cache)
      if (profileData.professional_id || profileData.qualifications || profileData.professional_signature) {
        const professionalData = {
          professional_id: profileData.professional_id,
          qualifications: profileData.qualifications,
          professional_signature: profileData.professional_signature
        };
        localStorage.setItem('professionalData', JSON.stringify(professionalData));
      }

      // Criar objeto de usuário completo
      const decoded = jwtDecode(token);
      const completeUser = {
        ...decoded,
        professional_id: profileData.professional_id,
        qualifications: profileData.qualifications,
        professional_signature: profileData.professional_signature,
        clinic_name: profileData.clinic_name,
        full_name: profileData.full_name || decoded.full_name
      };

      setUser(completeUser);

      // Sincronizar assinatura
      await syncSubscription();

      return completeUser;

    } catch (error) {
      // Se falhar a sincronização, usa dados do localStorage como fallback
      const storedProfessionalData = localStorage.getItem('professionalData');
      const decoded = jwtDecode(token);
      let userWithProfessionalData = decoded;

      if (storedProfessionalData) {
        try {
          const professionalData = JSON.parse(storedProfessionalData);
          userWithProfessionalData = { ...decoded, ...professionalData };
        } catch (error) {
          localStorage.removeItem('professionalData');
        }
      }

      setUser(userWithProfessionalData);
      return userWithProfessionalData;
    }
  }, [syncSubscription]);

  // Função para inicializar o estado de autenticação a partir do localStorage
  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        if (decoded.exp * 1000 < Date.now()) {
          // Token expirado
          localStorage.removeItem('token');
          localStorage.removeItem('professionalData');
        } else {
          // Token válido - sincronizar com backend
          setToken(storedToken);
          setIsAuthenticated(true);
          await syncUserProfile(storedToken);
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
  }, [syncUserProfile]);

  // Efeito que corre apenas uma vez no arranque da aplicação
  useEffect(() => {
    const initializeAuthAndComplete = async () => {
      await initializeAuth();
      setIsLoading(false); // Marca o carregamento como completo
    };
    initializeAuthAndComplete();
  }, [initializeAuth]);

  // <<< CORREÇÃO CRÍTICA: Funções de login e logout agora são mais robustas >>>
  const login = async (newToken) => {
    try {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setIsAuthenticated(true);

        // Sincronizar dados do perfil logo após o login
        await syncUserProfile(newToken);
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

      // Persistir dados profissionais no localStorage para manter cache sincronizado
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
          // Nota: Os dados já foram salvos no backend pela API updateProfessionalData
          // O localStorage serve apenas como cache
        } catch (error) {
          // Erro ao persistir dados profissionais
        }
      }
    }
  };

  // Helper functions para verificar plano
  const hasProAccess = useCallback(() => {
    if (!subscription) return false;
    return subscription.effective_plan === 'pro' || subscription.has_active_trial;
  }, [subscription]);

  const canAccessPrograms = useCallback(() => {
    return hasProAccess();
  }, [hasProAccess]);

  const canAccessSessionRecording = useCallback(() => {
    return hasProAccess();
  }, [hasProAccess]);

  const value = {
    token,
    user,
    isAuthenticated,
    isLoading,
    subscription,
    hasProAccess,
    canAccessPrograms,
    canAccessSessionRecording,
    syncSubscription,
    login,
    logout,
    updateUser
  };

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
