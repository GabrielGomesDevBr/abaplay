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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // <<< LÓGICA DE VISIBILIDADE ATUALIZADA >>>

    // 1. Verifica se a página atual é o painel de administração principal.
    const isAdminPanelPage = location.pathname.startsWith('/admin');

    // 2. A barra lateral deve existir para todos, exceto para o perfil 'pai'.
    const userHasSidebarAccess = user?.role !== 'pai';

    // 3. Páginas que devem ser renderizadas em tela cheia (sem padding, sem sidebar)
    const isFullScreenPage =
        location.pathname.startsWith('/session/') ||
        location.pathname === '/parent-chat' ||
        location.pathname === '/case-discussion';

    // Esconde a barra lateral em mobile sempre que a rota muda.
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    // Redirect super admin to their specific page
    if (user?.role === 'super_admin') {
        return <Navigate to="/super-admin" replace />;
    }

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
        <div className="relative h-screen flex flex-col bg-gray-50">
            {/* Navbar aparece sempre, exceto em páginas fullscreen */}
            {!isFullScreenPage && <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />}

            {/* Layout condicional: fullscreen vs normal */}
            {isFullScreenPage ? (
                /* FULLSCREEN: Sem sidebar, sem padding, sem navbar */
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            ) : (
                /* NORMAL: Com sidebar e padding */
                <div className={`flex-1 flex overflow-hidden lg:grid ${isAdminPanelPage || !userHasSidebarAccess ? 'lg:grid-cols-1' : 'lg:grid-cols-[280px_1fr]'}`}>

                    {/* A barra lateral é renderizada para todos os que têm acesso, permitindo o seu uso em mobile. */}
                    {userHasSidebarAccess && (
                        <>
                            {/* Overlay para ecrãs pequenos */}
                            {isSidebarOpen && (
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                                    onClick={() => setIsSidebarOpen(false)}
                                    aria-hidden="true"
                                ></div>
                            )}

                            {/* A própria barra lateral */}
                            {/* A sua visibilidade em desktop agora também depende da página atual. */}
                            <aside
                                className={`
                                    fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
                                    ${isAdminPanelPage ? 'lg:hidden' : 'lg:static lg:translate-x-0'}
                                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                                `}
                            >
                                <Sidebar />
                            </aside>
                        </>
                    )}

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <Outlet />
                    </main>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
