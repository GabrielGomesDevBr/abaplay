import React from 'react';
import { useLocation, Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const MainLayout = () => {
    const location = useLocation();
    // Obtém o estado de isLoading e isAuthenticated do nosso AuthContext
    const { user, isAuthenticated, isLoading } = useAuth();
    
    const isAdminPage = location.pathname.startsWith('/admin');
    const hideSidebar = isAdminPage || user?.role === 'pai';

    // 1. Enquanto a verificação inicial do token está a decorrer, mostra um ecrã de carregamento.
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500" />
            </div>
        );
    }

    // 2. Após o carregamento, se o utilizador NÃO estiver autenticado, redireciona para a página de login.
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // 3. Se tudo estiver correto (carregamento completo e utilizador autenticado), mostra a aplicação.
    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Navbar />
            <div className={`flex-grow overflow-hidden lg:grid ${hideSidebar ? 'lg:grid-cols-1' : 'lg:grid-cols-[280px_1fr]'}`}>
                
                {!hideSidebar && (
                    <aside className="hidden lg:block h-full border-r border-gray-200 bg-white">
                        <Sidebar />
                    </aside>
                )}

                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// <<< CORREÇÃO: Adiciona a exportação padrão que estava em falta >>>
export default MainLayout;
