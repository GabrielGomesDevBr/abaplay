import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePatients } from '../../context/PatientContext';
import useNotifications from '../../hooks/useNotifications';
import usePendingActions from '../../hooks/usePendingActions';
import MoreMenu from './MoreMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faCalendarCheck,
  faEdit,
  faEllipsisH
} from '@fortawesome/free-solid-svg-icons';

/**
 * Bottom Navigation com design mobile-first
 * Reduzido para 4 ícones principais + Menu "Mais"
 *
 * Touch targets: min-h-[56px] (WCAG 2.1 AA compliant)
 * Espaçamento: 25% de largura cada (4 itens)
 * Badge: Notificações centralizadas no menu "Mais"
 */
const BottomNavigation = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, canAccessSessionRecording } = useAuth();
  const { selectedPatient } = usePatients();
  const { totalUnread } = useNotifications();
  const { pendingCount } = usePendingActions();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Badge total do menu "Mais" (notificações + pendências se admin)
  const moreMenuBadge = totalUnread + (user?.is_admin ? pendingCount : 0);

  // 4 ítens principais do bottom navigation
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
      show: !user?.is_admin && canAccessSessionRecording(), // ✅ Requer plano Pro (terapeutas)
    },
    {
      icon: faCalendarCheck,
      label: user?.is_admin ? 'Agenda' : 'Agenda',
      action: () => navigate(user?.is_admin ? '/scheduling' : '/my-schedule'),
      isActive: location.pathname === '/scheduling' || location.pathname === '/my-schedule',
      badge: user?.is_admin ? pendingCount : 0, // ✅ Badge de pendências para admins
      show: true, // ✅ Sempre disponível (ambos planos)
    },
    {
      icon: faEllipsisH,
      label: 'Mais',
      action: () => setShowMoreMenu(true),
      isActive: false,
      badge: moreMenuBadge, // Total de notificações + pendências
      show: true,
    },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around h-16 sm:h-18 px-1 sm:px-2">
          {navItems.map((item, index) => {
            if (item.show === false) return null;

            return (
              <button
                key={index}
                onClick={item.action}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full
                  min-h-[56px] transition-all duration-200
                  ${item.isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-indigo-500 active:text-indigo-600'
                  }
                `}
                aria-label={item.label}
              >
                <div className={`
                  p-2 sm:p-2.5 rounded-lg transition-all duration-200 relative
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                  ${item.isActive
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 scale-110'
                    : 'hover:bg-gray-100 active:bg-gray-200'
                  }
                `}>
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`text-lg sm:text-xl ${item.isActive ? 'text-indigo-600' : ''}`}
                  />

                  {/* Badge de alerta laranja (cliente não selecionado) */}
                  {item.hasAlert && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}

                  {/* Badge de notificações/pendências com número */}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 border-2 border-white shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                <span className={`
                  text-xs sm:text-xs mt-0.5 sm:mt-1 font-medium truncate max-w-full px-1
                  ${item.isActive ? 'text-indigo-600' : 'text-gray-600'}
                `}>
                  {item.label}
                </span>

                {/* Indicador de página ativa */}
                {item.isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Menu "Mais" expansível */}
      <MoreMenu
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
      />
    </>
  );
};

export default BottomNavigation;
