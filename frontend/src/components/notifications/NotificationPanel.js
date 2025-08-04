import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUsers, faEye, faTimes } from '@fortawesome/free-solid-svg-icons';
import { getNotifications, markAsRead } from '../../api/notificationApi';

const NotificationPanel = ({ isOpen, onClose, onNotificationClick }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }

    // Escuta o evento personalizado para atualizar as notificações
    window.addEventListener('messageSentOrReceived', fetchNotifications);
    
    return () => {
      window.removeEventListener('messageSentOrReceived', fetchNotifications);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notification) => {
    try {
      await markAsRead(notification.patientId, notification.chatType);
      
      // Atualiza a lista de notificações
      setNotifications(prev => 
        prev.map(n => 
          n.userId === notification.userId && 
          n.patientId === notification.patientId && 
          n.chatType === notification.chatType
            ? { ...n, unreadCount: 0 }
            : n
        )
      );

      // Chama callback se fornecido
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const getChatTypeLabel = (chatType) => {
    return chatType === 'case_discussion' ? 'Discussão de Caso' : 'Chat com Pais';
  };

  const getChatTypeIcon = (chatType) => {
    return chatType === 'case_discussion' ? faUsers : faComments;
  };

  const formatLastRead = (timestamp) => {
    if (!timestamp) return 'Nunca lida';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Há poucos minutos';
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhuma notificação encontrada
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    notification.unreadCount > 0 ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      notification.unreadCount > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <FontAwesomeIcon icon={getChatTypeIcon(notification.chatType)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.patient_name}
                        </p>
                        {notification.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {getChatTypeLabel(notification.chatType)}
                      </p>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Última leitura: {formatLastRead(notification.lastReadTimestamp)}
                      </p>
                    </div>
                  </div>
                  
                  {notification.unreadCount > 0 && (
                    <div className="mt-2 flex items-center text-xs text-indigo-600">
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      Clique para marcar como lida
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;

