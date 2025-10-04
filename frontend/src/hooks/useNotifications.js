import { useState, useEffect, useCallback } from 'react';
import { getNotifications } from '../api/notificationApi';
import { useAuth } from '../context/AuthContext';

/**
 * Hook customizado para gerenciar notificações
 * Centraliza a lógica de busca, contagem e atualização de notificações
 */
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    try {
      const data = await getNotifications(user.id);
      setNotifications(data || []);

      // Calcula total de não lidas
      const unreadCount = (data || [])
        .filter(n => n.unreadCount > 0)
        .reduce((sum, n) => sum + n.unreadCount, 0);

      setTotalUnread(unreadCount);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Polling a cada 30 segundos
      const interval = setInterval(fetchNotifications, 30000);

      // Escuta eventos personalizados
      window.addEventListener('messageSentOrReceived', fetchNotifications);

      return () => {
        clearInterval(interval);
        window.removeEventListener('messageSentOrReceived', fetchNotifications);
      };
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    totalUnread,
    loading,
    refresh: fetchNotifications
  };
};

export default useNotifications;
