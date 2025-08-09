import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
// --- CORREÇÃO ---
// A importação do usePrograms não é mais necessária aqui, pois não geramos links dinâmicos.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import NotificationBadge from '../notifications/NotificationBadge';
import NotificationPanel from '../notifications/NotificationPanel';
import ProgressAlert from '../notifications/ProgressAlert';
import { faBrain, faSignOutAlt, faBars, faTimes, faTachometerAlt, faUsers, faFolderOpen, faPencilAlt, faUserShield } from '@fortawesome/free-solid-svg-icons';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { selectedPatient } = usePatients();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [showProgressAlert, setShowProgressAlert] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const notificationBadgeRef = useRef(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!isMobileMenuOpen);
  const toggleNotificationPanel = () => setNotificationPanelOpen(!isNotificationPanelOpen);

  const handleNotificationClick = (notification) => {
    if (notificationBadgeRef.current?.updateCount) {
      notificationBadgeRef.current.updateCount();
    }
    setNotificationPanelOpen(false);
    console.log('Notificação clicada:', notification);
  };

  const handleProgressAlertClose = () => {
    setShowProgressAlert(false);
    if (notificationBadgeRef.current?.updateCount) {
      notificationBadgeRef.current.updateCount();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    
    const handleProgressAlertCheck = () => {
      setShowProgressAlert(true);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('checkProgressAlerts', handleProgressAlertCheck);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('checkProgressAlerts', handleProgressAlertCheck);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return '--';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const shouldShowSidebarToggle = user?.role !== 'pai';

  const NavLinks = ({ isMobile = false, onLinkClick = () => {} }) => {
    const location = useLocation();
    const baseClasses = "flex items-center font-medium transition-colors duration-200";
    const mobileClasses = "px-4 py-3 rounded-lg text-base";
    const desktopClasses = "px-3 py-2 rounded-md text-sm";
    
    const getLinkClass = (path) => {
      const isActive = location.pathname.startsWith(path);
      if (isMobile) {
        return `${baseClasses} ${mobileClasses} ${
          isActive 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg transform scale-105' 
            : 'text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 transition-all'
        }`;
      }
      return `${baseClasses} ${desktopClasses} ${
        isActive 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700'
      }`;
    };

    if (user?.role === 'pai') {
        // A navegação para pais permanece a mesma.
        return ( <NavLink to="/" className={() => getLinkClass("/")} onClick={onLinkClick}><FontAwesomeIcon icon={faTachometerAlt} className="fa-fw mr-2" /> Acompanhamento</NavLink> );
    }

    return (
      <>
        {user?.is_admin && (
            <NavLink to="/admin" className={() => getLinkClass("/admin")} onClick={onLinkClick}>
                <FontAwesomeIcon icon={faUserShield} className="fa-fw mr-2" /> Admin
            </NavLink>
        )}
        <NavLink to="/dashboard" className={() => getLinkClass("/dashboard")} onClick={onLinkClick}><FontAwesomeIcon icon={faTachometerAlt} className="fa-fw mr-2" /> Dashboard</NavLink>
        
        {!user?.is_admin && (
          <NavLink to="/clients" className={() => getLinkClass("/clients")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faUsers} className="fa-fw mr-2" /> Clientes
          </NavLink>
        )}

        {/* --- CORREÇÃO PRINCIPAL --- */}
        {/* A lógica de mapeamento foi removida e substituída por um único link estático. */}
        <NavLink to="/programs" className={() => getLinkClass("/programs")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faFolderOpen} className="fa-fw mr-2" /> Programas
        </NavLink>

        <NavLink to="/notes" className={() => getLinkClass("/notes")} onClick={onLinkClick}><FontAwesomeIcon icon={faPencilAlt} className="fa-fw mr-2" /> Anotações</NavLink>
      </>
    );
  };

  return (
    <header className="bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-md sticky top-0 z-10 w-full flex-shrink-0 border-b border-indigo-200/50 shadow-sm">
        {/* O resto do JSX do seu componente permanece o mesmo */}
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center">
                {shouldShowSidebarToggle && (
                    <button 
                        onClick={toggleSidebar} 
                        className="lg:hidden mr-3 p-2 rounded-md text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 transition-all transform hover:scale-105"
                        aria-label="Abrir menu de clientes"
                    >
                        <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
                    </button>
                )}

            <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent flex items-center mr-2 hover:from-indigo-700 hover:to-purple-800 transition-all">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg mr-3 shadow-sm">
                    <FontAwesomeIcon icon={faBrain} className="text-white" />
                </div>
                <span>ABAplay</span>
            </NavLink>
            <div className="hidden lg:flex items-center space-x-1 ml-4">
                <NavLinks />
            </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:block text-sm">
                {selectedPatient ? (
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 px-3 py-1 rounded-full">
                    <span className="font-medium bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Cliente: {selectedPatient.name}</span>
                </div>
                ) : ( user?.role === 'terapeuta' && 
                <div className="bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200 px-3 py-1 rounded-full">
                    <span className="italic text-gray-500">Nenhum cliente selecionado</span>
                </div>
                )}
                {user?.role === 'pai' && ( 
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 px-3 py-1 rounded-full">
                    <span className="font-medium bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Acompanhamento</span>
                </div>
                )}
            </div>
            <div className="relative flex items-center space-x-3">
                {user && user.role !== 'pai' && (
                <button
                    onClick={toggleNotificationPanel}
                    className="p-2 rounded-full hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition-all duration-200 transform hover:scale-110"
                    title="Notificações"
                >
                    <NotificationBadge ref={notificationBadgeRef} />
                </button>
                )}
                
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-md hover:shadow-lg transition-all transform hover:scale-110" title={user?.full_name || user?.username}>
                {getInitials(user?.full_name || user?.username)}
                </div>
                <button onClick={logout} title="Sair" className="text-gray-500 hover:text-red-600 transition-all duration-150 p-2 rounded-full hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transform hover:scale-110">
                <FontAwesomeIcon icon={faSignOutAlt} className="fa-fw" />
                </button>
            </div>

            <div className="lg:hidden flex items-center">
                <button ref={buttonRef} onClick={toggleMobileMenu} type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-white hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all transform hover:scale-105" aria-controls="mobile-menu" aria-expanded={isMobileMenuOpen}>
                <span className="sr-only">Abrir menu</span>
                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="h-6 w-6" />
                </button>
            </div>
            </div>
        </div>
      
        <div 
            ref={menuRef} 
            className={`lg:hidden absolute top-full left-0 right-0 bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 backdrop-blur-md shadow-xl border-t border-indigo-200/50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'transform translate-y-0' : 'transform -translate-y-full'}`} 
            style={{ visibility: isMobileMenuOpen ? 'visible' : 'hidden' }}
            id="mobile-menu"
        >
            <div className="px-3 pt-3 pb-4 space-y-2">
                <NavLinks isMobile={true} onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
            <div className="pt-4 pb-4 border-t border-gray-200">
                <div className="flex items-center justify-between px-4">
                    <div>
                        <div className="text-base font-medium leading-none text-gray-800">{user?.full_name || user?.username}</div>
                        <div className="text-sm font-medium leading-none text-gray-500">{user?.role}</div>
                    </div>
                    <button onClick={logout} className="ml-auto flex-shrink-0 bg-gradient-to-r from-gray-100 to-slate-100 p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 focus:outline-none transition-all transform hover:scale-110">
                        <span className="sr-only">Sair</span>
                        <FontAwesomeIcon icon={faSignOutAlt} />
                    </button>
                </div>
            </div>
        </div>
      
        <NotificationPanel
            isOpen={isNotificationPanelOpen}
            onClose={() => setNotificationPanelOpen(false)}
            onNotificationClick={handleNotificationClick}
        />

        {/* Modal de Alertas de Progresso */}
        {showProgressAlert && (
          <ProgressAlert
            onClose={handleProgressAlertClose}
            onProgramCompleted={handleProgressAlertClose}
          />
        )}
    </header>
  );
};

export default Navbar;
