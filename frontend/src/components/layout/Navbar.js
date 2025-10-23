import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
import useNotifications from '../../hooks/useNotifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBrain, faSignOutAlt, faTachometerAlt, faUsers, faFolderOpen, faPencilAlt, faUserShield, faCalendarAlt, faCalendarCheck, faBell } from '@fortawesome/free-solid-svg-icons';
import NotificationPanel from '../notifications/NotificationPanel';
import ProgressAlert from '../notifications/ProgressAlert';

const Navbar = ({ isNotificationPanelOpen, setNotificationPanelOpen }) => {
  const { user, logout, hasProAccess } = useAuth();
  const { selectedPatient, refreshPatientData } = usePatients();
  const { totalUnread, refresh: refreshNotifications } = useNotifications();
  const [showProgressAlert, setShowProgressAlert] = useState(false);

  const toggleNotificationPanel = () => setNotificationPanelOpen(!isNotificationPanelOpen);

  const handleNotificationClick = () => {
    refreshNotifications();
    setNotificationPanelOpen(false);
  };

  const handleProgressAlertClose = () => {
    setShowProgressAlert(false);
    refreshNotifications();
  };

  const handleProgramCompleted = async () => {
    // Atualiza os dados do paciente para refletir o programa arquivado
    if (selectedPatient?.id) {
      await refreshPatientData();
    }
    handleProgressAlertClose();
  };

  useEffect(() => {
    const handleProgressAlertCheck = () => {
      setShowProgressAlert(true);
    };

    window.addEventListener('checkProgressAlerts', handleProgressAlertCheck);

    return () => {
      window.removeEventListener('checkProgressAlerts', handleProgressAlertCheck);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return '--';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

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

        {/* Dashboard - APENAS PLANO PRO */}
        {hasProAccess() && (
          <NavLink to="/dashboard" className={() => getLinkClass("/dashboard")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faTachometerAlt} className="fa-fw mr-2" /> Dashboard
          </NavLink>
        )}

        {!user?.is_admin && (
          <NavLink to="/clients" className={() => getLinkClass("/clients")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faUsers} className="fa-fw mr-2" /> Clientes
          </NavLink>
        )}

        {/* Programas - APENAS PLANO PRO */}
        {hasProAccess() && (
          <NavLink to="/programs" className={() => getLinkClass("/programs")} onClick={onLinkClick}>
              <FontAwesomeIcon icon={faFolderOpen} className="fa-fw mr-2" /> Programas
          </NavLink>
        )}

        {/* --- LINKS DO SISTEMA DE AGENDAMENTO --- */}
        {user?.is_admin && (
          <NavLink to="/scheduling" className={() => getLinkClass("/scheduling")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faCalendarAlt} className="fa-fw mr-2" /> Agendamentos
          </NavLink>
        )}

        {(user?.role === 'terapeuta' && !user?.is_admin) && (
          <NavLink to="/my-schedule" className={() => getLinkClass("/my-schedule")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faCalendarCheck} className="fa-fw mr-2" /> Minha Agenda
          </NavLink>
        )}

        {/* Link para gestão de disponibilidade (terapeutas) */}
        {user?.role === 'terapeuta' && (
          <NavLink to="/availability" className={() => getLinkClass("/availability")} onClick={onLinkClick}>
            <FontAwesomeIcon icon={faCalendarCheck} className="fa-fw mr-2" /> Disponibilidade
          </NavLink>
        )}

        <NavLink to="/notes" className={() => getLinkClass("/notes")} onClick={onLinkClick}><FontAwesomeIcon icon={faPencilAlt} className="fa-fw mr-2" /> Anotações</NavLink>
      </>
    );
  };

  return (
    <header className="bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-md sticky top-0 z-50 w-full flex-shrink-0 border-b border-indigo-200/50 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            {/* Mobile: Logo centralizado, ícones nas laterais */}
            <div className="flex items-center lg:flex-1">

            <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent flex items-center hover:from-indigo-700 hover:to-purple-800 transition-all">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-lg mr-2 sm:mr-3 shadow-sm">
                    <FontAwesomeIcon icon={faBrain} className="text-white text-sm sm:text-base" />
                </div>
                <span className="text-lg sm:text-2xl">ABAplay</span>
            </NavLink>

            {/* Desktop: Links de navegação */}
            <div className="hidden lg:flex items-center space-x-1 ml-4">
                <NavLinks />
            </div>
            </div>

            {/* Informações do cliente (desktop e tablet) */}
            <div className="hidden md:flex items-center justify-center flex-1 lg:flex-none px-4">
                {selectedPatient ? (
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 px-3 py-1 rounded-full max-w-xs truncate">
                    <span className="font-medium bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent text-sm">
                        Cliente: {selectedPatient.name}
                    </span>
                </div>
                ) : ( user?.role === 'terapeuta' &&
                <div className="bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200 px-3 py-1 rounded-full">
                    <span className="italic text-gray-500 text-sm">Nenhum cliente</span>
                </div>
                )}
                {user?.role === 'pai' && (
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 px-3 py-1 rounded-full">
                    <span className="font-medium bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent text-sm">Acompanhamento</span>
                </div>
                )}
            </div>

            {/* Ícones à direita (simplificados em mobile) */}
            <div className="flex items-center space-x-2 lg:space-x-3">
                {/* Notificações (apenas desktop para terapeutas/admin) */}
                {user && user.role !== 'pai' && (
                <button
                    onClick={toggleNotificationPanel}
                    className="hidden lg:flex p-2 rounded-full hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition-all duration-200 transform hover:scale-110 relative"
                    title="Notificações"
                >
                    <FontAwesomeIcon
                        icon={faBell}
                        className={`transition-colors duration-200 ${
                            totalUnread > 0 ? 'text-indigo-600' : 'text-gray-500'
                        }`}
                    />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-white">
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </button>
                )}

                {/* Avatar do usuário */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-white shadow-md hover:shadow-lg transition-all transform hover:scale-110" title={user?.full_name || user?.username}>
                {getInitials(user?.full_name || user?.username)}
                </div>

                {/* Botão de logout (apenas desktop) */}
                <button onClick={logout} title="Sair" className="hidden lg:flex text-gray-500 hover:text-red-600 transition-all duration-150 p-2 rounded-full hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transform hover:scale-110">
                <FontAwesomeIcon icon={faSignOutAlt} className="fa-fw" />
                </button>
            </div>
        </div>

        {/* Painel de notificações (desktop) */}
        <NotificationPanel
            isOpen={isNotificationPanelOpen}
            onClose={() => setNotificationPanelOpen(false)}
            onNotificationClick={handleNotificationClick}
        />

        {/* Modal de Alertas de Progresso */}
        {showProgressAlert && (
          <ProgressAlert
            onClose={handleProgressAlertClose}
            onProgramCompleted={handleProgramCompleted}
          />
        )}
    </header>
  );
};

export default Navbar;
