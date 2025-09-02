// frontend/src/pages/HomePage.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

/**
 * Componente que atua como um "roteador" após o login.
 * Redireciona o utilizador para a sua página inicial apropriada
 * com base na sua função (role).
 */
const HomePage = () => {
  const { user, isLoading } = useAuth();

  // Enquanto a autenticação estiver a ser verificada, mostra um ecrã de carregamento.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl text-indigo-500" />
      </div>
    );
  }

  // Lógica de redirecionamento com base na função do utilizador.
  if (user) {
    if (user.role === 'super_admin') {
      // Se for super admin, redireciona para o painel super admin.
      return <Navigate to="/super-admin" replace />;
    }
    if (user.is_admin) {
      // Se for admin, redireciona para o painel de administração.
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'pai') {
      // Se for pai, redireciona para o dashboard dos pais.
      return <Navigate to="/parent-dashboard" replace />;
    }
    // Para todos os outros casos (ex: terapeuta), redireciona para a página de clientes.
    return <Navigate to="/clients" replace />;
  }

  // Se, por alguma razão, não houver utilizador após o carregamento, volta para o login.
  return <Navigate to="/login" replace />;
};

export default HomePage;
