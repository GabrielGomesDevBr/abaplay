import React, { useState, useEffect } from 'react';
import { useLocation, Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const MainLayout = () => {
    const location = useLocation();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

    // Estado para controlar visibilidade da sidebar em desktop (persistente)
    const [isSidebarVisibleDesktop, setIsSidebarVisibleDesktop] = useState(() => {
        const saved = localStorage.getItem('sidebarVisibleDesktop');
        return saved !== null ? saved === 'true' : true; // Default: visível
    });

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

    // Esconde a barra lateral e painel de notificações em mobile sempre que a rota muda.
    useEffect(() => {
        setIsSidebarOpen(false);
        setIsToolsMenuOpen(false);
        setIsNotificationPanelOpen(false);
    }, [location]);

    // Persiste a visibilidade da sidebar em desktop no localStorage
    useEffect(() => {
        localStorage.setItem('sidebarVisibleDesktop', isSidebarVisibleDesktop.toString());
    }, [isSidebarVisibleDesktop]);

    // Função para alternar visibilidade da sidebar em desktop
    const toggleSidebarDesktop = () => {
        setIsSidebarVisibleDesktop(prev => !prev);
    };

    // Função para alternar o menu de ferramentas (expande Ferramentas no Sidebar)
    const toggleToolsMenu = () => {
        if (!isSidebarOpen) {
            setIsSidebarOpen(true);
        }
        // Delay para garantir que o sidebar está aberto antes de expandir ferramentas
        setTimeout(() => {
            setIsToolsMenuOpen(true);
        }, 100);
    };

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
            {!isFullScreenPage && (
                <Navbar
                    isNotificationPanelOpen={isNotificationPanelOpen}
                    setNotificationPanelOpen={setIsNotificationPanelOpen}
                />
            )}

            {/* Layout condicional: fullscreen vs normal */}
            {isFullScreenPage ? (
                /* FULLSCREEN: Sem sidebar, sem padding, sem navbar */
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            ) : (
                /* NORMAL: Com sidebar e padding */
                <div className={`flex-1 flex overflow-hidden lg:grid ${isAdminPanelPage || !userHasSidebarAccess || !isSidebarVisibleDesktop ? 'lg:grid-cols-1' : 'lg:grid-cols-[280px_1fr]'}`}>

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
                            {/* A sua visibilidade em desktop agora também depende da página atual e do toggle. */}
                            <aside
                                className={`
                                    fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
                                    ${isAdminPanelPage || !isSidebarVisibleDesktop ? 'lg:hidden' : 'lg:static lg:translate-x-0'}
                                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                                `}
                            >
                                <Sidebar isToolsExpanded={isToolsMenuOpen} setIsToolsExpanded={setIsToolsMenuOpen} />

                                {/* Botão de toggle na borda da sidebar (apenas desktop) */}
                                {!isAdminPanelPage && (
                                    <button
                                        onClick={toggleSidebarDesktop}
                                        className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-r-md shadow-md hover:shadow-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 items-center gap-1 px-1 py-2 group z-40"
                                        title="Esconder barra lateral (Alt + B)"
                                    >
                                        <svg
                                            className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors flex-shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}
                            </aside>

                            {/* Botão flutuante para mostrar sidebar quando escondida (apenas desktop) */}
                            {!isAdminPanelPage && !isSidebarVisibleDesktop && (
                                <button
                                    onClick={toggleSidebarDesktop}
                                    className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 border-2 border-white rounded-r-lg shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 z-40 items-center gap-1.5 px-2 py-3 group"
                                    title="Mostrar barra lateral (Alt + B)"
                                >
                                    <svg
                                        className="w-5 h-5 text-white transition-transform group-hover:translate-x-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                                    </svg>
                                    <span className="text-xs font-medium text-white whitespace-nowrap pr-1">Clientes</span>
                                </button>
                            )}
                        </>
                    )}

                    <main className="flex-1 overflow-y-auto pl-2 pr-2 sm:pl-4 sm:pr-4 pb-20 lg:pb-6 pt-4 sm:pt-6">
                        <Outlet />
                    </main>
                </div>
            )}

            {/* Bottom Navigation (apenas mobile, não em fullscreen) */}
            {!isFullScreenPage && (
                <BottomNavigation
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
            )}
        </div>
    );
};

export default MainLayout;
