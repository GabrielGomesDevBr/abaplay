import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import notificationApi from '../../api/notificationApi';

const NotificationBadge = ({ className = '' }) => {
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotalUnread = async () => {
    try {
      const data = await notificationApi.getTotalUnreadCount();
      setTotalUnread(data.totalUnread || 0);
    } catch (error) {
      console.error('Erro ao buscar total de não lidas:', error);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalUnread();
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchTotalUnread, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Função para atualizar o contador externamente
  const updateCount = () => {
    fetchTotalUnread();
  };

  // Expõe a função updateCount para componentes pais
  React.useImperativeHandle(React.forwardRef(), () => ({
    updateCount
  }));

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <FontAwesomeIcon icon={faBell} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <FontAwesomeIcon 
        icon={faBell} 
        className={`transition-colors duration-200 ${
          totalUnread > 0 ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
        }`}
      />
      {totalUnread > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </div>
  );
};

export default NotificationBadge;

