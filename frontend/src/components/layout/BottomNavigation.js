import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faCalendarCheck,
  faFolderOpen,
  faEllipsisH,
  faEdit
} from '@fortawesome/free-solid-svg-icons';

const BottomNavigation = ({ toggleSidebar, toggleToolsMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedPatient } = usePatients();

  // Não renderizar para pais ou super admin
  if (user?.role === 'pai' || user?.role === 'super_admin') {
    return null;
  }

  const handleSessionClick = () => {
    if (!selectedPatient) {
      // Se não há cliente selecionado, abre o sidebar para selecionar
      toggleSidebar();
    } else {
      // Se há cliente selecionado, vai para página de clientes (onde estão os programas atribuídos)
      navigate('/clients');
    }
  };

  const navItems = [
    {
      icon: faUsers,
      label: 'Clientes',
      action: toggleSidebar,
      isActive: false, // Sidebar não tem rota específica
      show: true,
    },
    {
      icon: faEdit,
      label: 'Sessão',
      action: handleSessionClick,
      isActive: location.pathname.startsWith('/clients') || location.pathname.startsWith('/session'),
      hasAlert: !selectedPatient, // Mostra alerta visual se não há cliente selecionado
      show: !user?.is_admin, // ✅ Esconder para admin
    },
    {
      icon: faCalendarCheck,
      label: user?.is_admin ? 'Agendamentos' : 'Agenda',
      action: () => navigate(user?.is_admin ? '/scheduling' : '/my-schedule'),
      isActive: location.pathname === '/scheduling' || location.pathname === '/my-schedule',
      show: true,
    },
    {
      icon: faFolderOpen,
      label: 'Programas',
      action: () => navigate('/programs'),
      isActive: location.pathname === '/programs',
      show: true,
    },
    {
      icon: faEllipsisH,
      label: 'Mais',
      action: toggleToolsMenu,
      isActive: false,
      show: true,
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
                p-2 rounded-lg transition-all duration-200 relative
                ${item.isActive
                  ? 'bg-gradient-to-r from-indigo-100 to-purple-100 scale-110'
                  : 'hover:bg-gray-100'
                }
              `}>
                <FontAwesomeIcon
                  icon={item.icon}
                  className={`text-xl ${item.isActive ? 'text-indigo-600' : ''}`}
                />
                {/* Badge de alerta se não há cliente selecionado no botão Sessão */}
                {item.hasAlert && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></span>
                )}
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
