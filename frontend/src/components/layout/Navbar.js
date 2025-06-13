import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
import { usePrograms } from '../../context/ProgramContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Ícones importados
import { faBrain, faSignOutAlt, faBars, faTimes, faTachometerAlt, faUsers, faFolderOpen, faPencilAlt, faChartLine, faPuzzlePiece, faChild, faGraduationCap, faMusic, faCommentDots, faUserShield } from '@fortawesome/free-solid-svg-icons';

// O componente agora recebe a prop 'toggleSidebar' do MainLayout.
const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { selectedPatient } = usePatients();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return '--';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  // Condição para mostrar o botão da sidebar
  const shouldShowSidebarToggle = user?.role !== 'pai' && !user?.is_admin;

  const NavLinks = ({ isMobile = false, onLinkClick = () => {} }) => {
    const { allProgramsData } = usePrograms();
    const programAreas = Object.keys(allProgramsData).sort();
    const location = useLocation();
    const currentArea = new URLSearchParams(location.search).get('area');
    const baseClasses = "flex items-center font-medium transition-colors duration-200";
    const mobileClasses = "px-4 py-3 rounded-lg text-base";
    const desktopClasses = "px-3 py-2 rounded-md text-sm";
    const getLinkClass = ({ isActive }) => 
        `${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'}`;
    const getProgramLinkClass = (area) => {
        const isActive = location.pathname === '/programs' && currentArea === area;
        return `${baseClasses} ${isMobile ? mobileClasses : desktopClasses} ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'}`;
    }
    const areaIcons = {
        Psicologia: faFolderOpen,
        TerapiaOcupacional: faPuzzlePiece,
        Psicomotricidade: faChild,
        Psicopedagogia: faGraduationCap,
        Musicoterapia: faMusic,
        Fonoaudiologia: faCommentDots
    };

    if (user?.role === 'pai') {
        return ( <NavLink to="/" className={getLinkClass} onClick={onLinkClick}><FontAwesomeIcon icon={faChartLine} className="fa-fw mr-2" /> Acompanhamento</NavLink> );
    }

    return (
      <>
        {user?.is_admin && (
            <NavLink to="/admin" className={getLinkClass} onClick={onLinkClick}>
                <FontAwesomeIcon icon={faUserShield} className="fa-fw mr-2" /> Admin
            </NavLink>
        )}
        <NavLink to="/dashboard" className={getLinkClass} onClick={onLinkClick}><FontAwesomeIcon icon={faTachometerAlt} className="fa-fw mr-2" /> Dashboard</NavLink>
        
        {!user?.is_admin && (
          <NavLink 
            to="/clients"
            className={getLinkClass}
            onClick={onLinkClick}
          >
            <FontAwesomeIcon icon={faUsers} className="fa-fw mr-2" /> Clientes
          </NavLink>
        )}

        {programAreas.map(area => {
            const areaName = area.replace(/([A-Z])/g, ' $1').trim();
            return (
                <NavLink
                    key={area}
                    to={`/programs?area=${area}`}
                    className={getProgramLinkClass(area)}
                    onClick={onLinkClick}
                    title={areaName}
                >
                    <FontAwesomeIcon icon={areaIcons[area] || faFolderOpen} className="fa-fw mr-2" />
                    {isMobile ? areaName : area.substring(0, 10)}
                </NavLink>
            )
        })}
        <NavLink to="/notes" className={getLinkClass} onClick={onLinkClick}><FontAwesomeIcon icon={faPencilAlt} className="fa-fw mr-2" /> Anotações</NavLink>
      </>
    );
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-10 w-full flex-shrink-0 border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center">
            {shouldShowSidebarToggle && (
                 <button 
                    onClick={toggleSidebar} 
                    className="lg:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-white hover:bg-indigo-600"
                    aria-label="Abrir menu de clientes"
                >
                    <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
                </button>
            )}

          <NavLink to="/" className="text-2xl font-bold text-indigo-600 flex items-center mr-2">
            <FontAwesomeIcon icon={faBrain} className="mr-2" />
            <span>ABAplay</span>
          </NavLink>
          <div className="hidden lg:flex items-center space-x-1 ml-4">
            <NavLinks />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:block text-sm">
            {selectedPatient ? (
              <span className="font-medium text-indigo-700">Cliente: {selectedPatient.name}</span>
            ) : ( user?.role === 'terapeuta' && <span className="italic text-gray-500">Nenhum cliente selecionado</span> )}
            {user?.role === 'pai' && ( <span className="font-medium text-indigo-700">Acompanhamento</span> )}
          </div>
          <div className="relative flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm" title={user?.full_name || user?.username}>
              {getInitials(user?.full_name || user?.username)}
            </div>
            {/* <<< CORREÇÃO APLICADA AQUI >>> */}
            {/* As classes 'hidden' e 'md:block' foram removidas para tornar o botão sempre visível. */}
            <button onClick={logout} title="Sair" className="text-gray-500 hover:text-red-600 transition-colors duration-150 p-2 rounded-full hover:bg-red-50">
              <FontAwesomeIcon icon={faSignOutAlt} className="fa-fw" />
            </button>
          </div>

          {/* Este botão para o menu de navegação é redundante em mobile se o botão de sair já está visível. */}
          {/* Poderíamos escondê-lo ou alterar a sua função, mas vamos manter por agora para não quebrar a lógica existente. */}
          <div className="lg:hidden flex items-center">
            <button ref={buttonRef} onClick={toggleMobileMenu} type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500" aria-controls="mobile-menu" aria-expanded={isMobileMenuOpen}>
              <span className="sr-only">Abrir menu</span>
              <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      
      <div 
        ref={menuRef} 
        className={`lg:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm shadow-lg transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'transform translate-y-0' : 'transform -translate-y-full'}`} 
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
                    {/* O botão de sair no dropdown torna-se um pouco redundante, mas pode ser mantido ou removido no futuro. */}
                    <button onClick={logout} className="ml-auto flex-shrink-0 bg-gray-100 p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 focus:outline-none">
                        <span className="sr-only">Sair</span>
                        <FontAwesomeIcon icon={faSignOutAlt} />
                    </button>
                </div>
            </div>
      </div>
    </header>
  );
};

export default Navbar;
