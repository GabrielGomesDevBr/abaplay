import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useNotifications from '../../hooks/useNotifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolderOpen,
  faBell,
  faUserShield,
  faCalendarXmark,
  faHome,
  faClipboard,
  faSignOutAlt,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

/**
 * Menu "Mais" expansível do bottom navigation
 * Design mobile-first com animações suaves
 */
const MoreMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, canAccessPrograms, logout } = useAuth();
  const { totalUnread } = useNotifications();
  const menuRef = useRef(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando menu aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const menuItems = [
    {
      icon: faHome,
      label: 'Dashboard',
      action: () => handleNavigate('/'),
      isActive: location.pathname === '/',
      show: true,
    },
    {
      icon: faFolderOpen,
      label: 'Programas',
      action: () => handleNavigate('/programs'),
      isActive: location.pathname === '/programs',
      show: canAccessPrograms(),
    },
    {
      icon: faBell,
      label: 'Notificações',
      action: () => handleNavigate('/notifications'),
      isActive: location.pathname === '/notifications',
      badge: totalUnread,
      show: true,
    },
    {
      icon: faUserShield,
      label: 'Administração',
      action: () => handleNavigate('/admin'),
      isActive: location.pathname === '/admin',
      show: user?.is_admin,
    },
    {
      icon: faCalendarXmark,
      label: 'Ausências',
      action: () => handleNavigate('/availability'),
      isActive: location.pathname === '/availability',
      show: !user?.is_admin, // Apenas terapeutas
    },
    {
      icon: faClipboard,
      label: 'Anotações',
      action: () => handleNavigate('/case-discussions'),
      isActive: location.pathname === '/case-discussions',
      show: canAccessPrograms(), // Pro feature
    },
    {
      icon: faSignOutAlt,
      label: 'Sair',
      action: handleLogout,
      isActive: false,
      show: true,
      isDanger: true,
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Menu expansível de baixo para cima */}
      <div
        ref={menuRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 lg:hidden animate-slide-up"
      >
        {/* Header do menu */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Menu
          </h3>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
            aria-label="Fechar menu"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de itens do menu */}
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="px-2 py-2">
            {menuItems.map((item, index) => {
              if (!item.show) return null;

              return (
                <button
                  key={index}
                  onClick={item.action}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 sm:py-4
                    min-h-[56px] rounded-xl transition-all duration-200
                    ${item.isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600'
                      : item.isDanger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-lg
                      ${item.isActive
                        ? 'bg-white shadow-sm'
                        : item.isDanger
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                      }
                    `}>
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={`w-5 h-5 ${
                          item.isActive
                            ? 'text-indigo-600'
                            : item.isDanger
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <span className="text-sm sm:text-base font-medium">
                      {item.label}
                    </span>
                  </div>

                  {/* Badge de notificações */}
                  {item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-[24px] flex items-center justify-center px-2">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}

                  {/* Indicador de ativo */}
                  {item.isActive && (
                    <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Safe area no iOS */}
        <div className="safe-area-bottom" />
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default MoreMenu;
