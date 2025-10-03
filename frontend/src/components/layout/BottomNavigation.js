import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faTachometerAlt,
  faCalendarCheck,
  faFolderOpen,
  faEllipsisH
} from '@fortawesome/free-solid-svg-icons';

const BottomNavigation = ({ toggleSidebar, toggleToolsMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Não renderizar para pais ou super admin
  if (user?.role === 'pai' || user?.role === 'super_admin') {
    return null;
  }

  const handleProgramsClick = () => {
    // Se há cliente selecionado, vai para programas do cliente
    // Se não, vai para biblioteca de programas
    navigate('/programs');
  };

  const navItems = [
    {
      icon: faUsers,
      label: 'Clientes',
      action: toggleSidebar,
      isActive: false, // Sidebar não tem rota específica
    },
    {
      icon: faTachometerAlt,
      label: 'Dashboard',
      action: () => navigate('/dashboard'),
      isActive: location.pathname === '/dashboard',
    },
    {
      icon: faCalendarCheck,
      label: user?.is_admin ? 'Agendamentos' : 'Agenda',
      action: () => navigate(user?.is_admin ? '/scheduling' : '/my-schedule'),
      isActive: location.pathname === '/scheduling' || location.pathname === '/my-schedule',
      show: true, // Sempre mostrar
    },
    {
      icon: faFolderOpen,
      label: 'Programas',
      action: handleProgramsClick,
      isActive: location.pathname.startsWith('/programs') || location.pathname.startsWith('/session'),
    },
    {
      icon: faEllipsisH,
      label: 'Mais',
      action: toggleToolsMenu,
      isActive: false,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          // Ocultar item de agendamento se não aplicável
          if (item.show === false) return null;

          return (
            <button
              key={index}
              onClick={item.action}
              className={`
                flex flex-col items-center justify-center flex-1 h-full transition-all duration-200
                ${item.isActive
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-indigo-500'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${item.isActive
                  ? 'bg-gradient-to-r from-indigo-100 to-purple-100 scale-110'
                  : 'hover:bg-gray-100'
                }
              `}>
                <FontAwesomeIcon
                  icon={item.icon}
                  className={`text-xl ${item.isActive ? 'text-indigo-600' : ''}`}
                />
              </div>
              <span className={`
                text-xs mt-1 font-medium
                ${item.isActive ? 'text-indigo-600' : 'text-gray-600'}
              `}>
                {item.label}
              </span>
              {item.isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
