import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const MainLayout = () => {
    const location = useLocation();
    const { user, isAuthenticated, isLoading } = useAuth();
    
    // 1. NOVO ESTADO: Controla se a barra lateral está visível em mobile.
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isAdminPage = location.pathname.startsWith('/admin');
    const hideSidebarForRole = isAdminPage || user?.role === 'pai';

    // Esconde a barra lateral em mobile sempre que a rota muda.
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return (
        // O div principal agora tem uma posição relativa para conter a barra lateral em mobile.
        <div className="relative h-screen flex flex-col bg-gray-50">
            {/* 2. A função para abrir a barra lateral será passada para a Navbar na Fase 2. */}
            <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            <div className="flex-1 flex overflow-hidden">
                {/* 3. Lógica da Barra Lateral Responsiva */}
                {!hideSidebarForRole && (
                    <>
                        {/* Overlay para ecrãs pequenos: aparece quando o menu está aberto e fecha-o ao clicar. */}
                        {isSidebarOpen && (
                            <div 
                                className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
                                onClick={() => setIsSidebarOpen(false)}
                                aria-hidden="true"
                            ></div>
                        )}

                        {/* A própria barra lateral */}
                        <aside 
                            className={`
                                fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
                                lg:static lg:translate-x-0 lg:w-72
                                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                            `}
                        >
                            <Sidebar />
                        </aside>
                    </>
                )}

                {/* 4. Conteúdo Principal */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
