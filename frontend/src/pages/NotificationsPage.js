import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheckDouble,
  faComments,
  faUsers,
  faBullseye,
  faCalendarAlt,
  faCalendarTimes,
  faCalendarPlus,
  faInbox
} from '@fortawesome/free-solid-svg-icons';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';

/**
 * Página dedicada de notificações - Fullscreen Mobile / Desktop
 * Substituição do NotificationPanel em mobile para melhor UX
 */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(user?.id);
      setNotifications(data || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      await markAllAsRead();
      await fetchNotifications(); // Recarrega a lista
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Marca como lida
      if (notification.unreadCount > 0) {
        await markAsRead(notification.patientId, notification.chatType);
      }

      // Navega para a página apropriada
      const chatType = notification.chatType;

      if (chatType === 'parent_chat' || chatType === 'case_discussion') {
        navigate('/notes');
      } else if (chatType === 'scheduling_reminder' || chatType === 'appointment_cancelled' || chatType === 'appointment_created') {
        if (user?.is_admin) {
          navigate('/scheduling');
        } else {
          navigate('/my-schedule');
        }
      } else if (chatType === 'progress_alert') {
        navigate('/clients');
      }
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
    }
  };

  const getChatTypeLabel = (chatType) => {
    switch (chatType) {
      case 'case_discussion': return 'Discussão de Caso';
      case 'parent_chat': return 'Chat com Pais';
      case 'progress_alert': return 'Alerta de Progresso';
      case 'scheduling_reminder': return 'Lembrete de Agendamento';
      case 'appointment_cancelled': return 'Agendamento Cancelado';
      case 'appointment_created': return 'Novo Agendamento';
      default: return 'Notificação';
    }
  };

  const getChatTypeIcon = (chatType) => {
    switch (chatType) {
      case 'case_discussion': return faUsers;
      case 'parent_chat': return faComments;
      case 'progress_alert': return faBullseye;
      case 'scheduling_reminder': return faCalendarAlt;
      case 'appointment_cancelled': return faCalendarTimes;
      case 'appointment_created': return faCalendarPlus;
      default: return faComments;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `Há ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `Há ${diffInDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Agrupa notificações por data
  const groupNotificationsByDate = () => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const thisWeekStart = new Date(todayStart);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);

    notifications.forEach(notification => {
      const timestamp = new Date(notification.lastReadTimestamp || notification.createdAt);

      if (timestamp >= todayStart) {
        groups.today.push(notification);
      } else if (timestamp >= yesterdayStart) {
        groups.yesterday.push(notification);
      } else if (timestamp >= thisWeekStart) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate();
  const hasUnread = notifications.some(n => n.unreadCount > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fixo */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
            </button>
            <h1 className="text-xl font-bold">Notificações</h1>
          </div>

          {hasUnread && !markingAll && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all text-sm"
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              <span>Marcar todas</span>
            </button>
          )}

          {markingAll && (
            <div className="text-sm flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Marcando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
            <p className="text-gray-500">Carregando notificações...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full mb-6">
              <FontAwesomeIcon icon={faInbox} className="text-6xl text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Nenhuma notificação</h2>
            <p className="text-gray-500 text-center">Você está em dia com tudo!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Hoje */}
            {groupedNotifications.today.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                  Hoje
                </h2>
                <div className="space-y-3">
                  {groupedNotifications.today.map((notification) => (
                    <NotificationCard
                      key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      getChatTypeLabel={getChatTypeLabel}
                      getChatTypeIcon={getChatTypeIcon}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ontem */}
            {groupedNotifications.yesterday.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                  Ontem
                </h2>
                <div className="space-y-3">
                  {groupedNotifications.yesterday.map((notification) => (
                    <NotificationCard
                      key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      getChatTypeLabel={getChatTypeLabel}
                      getChatTypeIcon={getChatTypeIcon}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Esta semana */}
            {groupedNotifications.thisWeek.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                  Esta semana
                </h2>
                <div className="space-y-3">
                  {groupedNotifications.thisWeek.map((notification) => (
                    <NotificationCard
                      key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      getChatTypeLabel={getChatTypeLabel}
                      getChatTypeIcon={getChatTypeIcon}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mais antigas */}
            {groupedNotifications.older.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
                  Mais antigas
                </h2>
                <div className="space-y-3">
                  {groupedNotifications.older.map((notification) => (
                    <NotificationCard
                      key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      getChatTypeLabel={getChatTypeLabel}
                      getChatTypeIcon={getChatTypeIcon}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de Card de Notificação
const NotificationCard = ({ notification, onClick, getChatTypeLabel, getChatTypeIcon, formatTimestamp }) => {
  const isUnread = notification.unreadCount > 0;
  const isSchedulingNotification = ['scheduling_reminder', 'appointment_cancelled', 'appointment_created'].includes(notification.chatType);

  const bgColor = notification.chatType === 'appointment_cancelled'
    ? 'bg-red-50 border-red-200'
    : notification.chatType === 'appointment_created'
    ? 'bg-green-50 border-green-200'
    : isUnread
    ? 'bg-blue-50 border-blue-200'
    : 'bg-white border-gray-200';

  const iconColor = notification.chatType === 'appointment_cancelled'
    ? 'bg-red-100 text-red-600'
    : notification.chatType === 'appointment_created'
    ? 'bg-green-100 text-green-600'
    : isUnread
    ? 'bg-indigo-100 text-indigo-600'
    : 'bg-gray-100 text-gray-600';

  const textColor = notification.chatType === 'appointment_cancelled'
    ? 'text-red-700'
    : notification.chatType === 'appointment_created'
    ? 'text-green-700'
    : 'text-gray-700';

  return (
    <div
      onClick={onClick}
      className={`${bgColor} border-2 rounded-xl p-4 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200`}
    >
      <div className="flex items-start space-x-4">
        {/* Ícone */}
        <div className={`${iconColor} p-3 rounded-full flex-shrink-0`}>
          <FontAwesomeIcon icon={getChatTypeIcon(notification.chatType)} className="text-xl" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {notification.patient_name}
            </h3>
            {isUnread && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 flex-shrink-0">
                {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
              </span>
            )}
          </div>

          <p className={`${textColor} font-medium text-sm mb-1`}>
            {getChatTypeLabel(notification.chatType)}
          </p>

          {!isSchedulingNotification && (
            <p className="text-xs text-gray-500">
              Última leitura: {formatTimestamp(notification.lastReadTimestamp)}
            </p>
          )}

          {isSchedulingNotification && (
            <p className="text-xs text-gray-500">
              {formatTimestamp(notification.createdAt || notification.lastReadTimestamp)}
            </p>
          )}
        </div>
      </div>

      {/* Indicador de não lida */}
      {isUnread && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center text-xs text-indigo-600">
          <div className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
          Toque para visualizar
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
