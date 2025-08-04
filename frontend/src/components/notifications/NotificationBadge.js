import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { getNotifications } from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext'; // Importa o useAuth

const NotificationBadge = React.forwardRef(({ className = '' }, ref) => {
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Obtém o usuário do contexto

  const fetchTotalUnread = async () => {
    if (!user?.id) return; // <<< CORREÇÃO: Não faz a chamada se não houver ID de usuário

    try {
      // A API agora retorna um objeto com a contagem, então precisamos acessá-la
      const data = await getNotifications(user.id);
      // A resposta da API é um array, então contamos os itens com unreadCount > 0
      const unreadCount = data.filter(n => n.unreadCount > 0).length;
      setTotalUnread(unreadCount || 0);
    } catch (error) {
      console.error('Erro ao buscar total de não lidas:', error);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Executa a função apenas se o usuário estiver logado
    if (user?.id) {
      fetchTotalUnread();
      
      const interval = setInterval(fetchTotalUnread, 30000);
      window.addEventListener('messageSentOrReceived', fetchTotalUnread);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('messageSentOrReceived', fetchTotalUnread);
      };
    }
  }, [user]); // <<< CORREÇÃO: Adiciona 'user' como dependência do useEffect

  // Função para atualizar o contador externamente
  const updateCount = () => {
    fetchTotalUnread();
  };

  // Expõe a função updateCount para componentes pais
  React.useImperativeHandle(ref, () => ({
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
});

export default NotificationBadge;