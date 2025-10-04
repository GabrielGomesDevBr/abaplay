import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUsers, faEye, faTimes, faBullseye, faCalendarAlt, faCalendarTimes, faCalendarPlus, faBell } from '@fortawesome/free-solid-svg-icons';
import { getNotifications, markAsRead } from '../../api/notificationApi';
import { usePatients } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import ProgressAlert from './ProgressAlert';

const NotificationPanel = ({ isOpen, onClose, onNotificationClick }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedPatient, refreshPatientData } = usePatients();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProgressAlert, setShowProgressAlert] = useState(false);

  // Estado para swipe gesture
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const panelRef = useRef(null);

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

  // Função para lidar com clique em notificação
  const handleNotificationClick = async (notification) => {
    try {
      // Para alertas de progresso, abre o modal
      if (notification.chatType === 'progress_alert') {
        setShowProgressAlert(true);
        return;
      }

      // Marca como lida
      await markAsRead(notification.patientId, notification.chatType);

      // Atualiza a lista local
      setNotifications(prev =>
        prev.map(n =>
          n.userId === notification.userId &&
          n.patientId === notification.patientId &&
          n.chatType === notification.chatType
            ? { ...n, unreadCount: 0 }
            : n
        )
      );

      // Navega para a página apropriada
      const chatType = notification.chatType;

      if (chatType === 'parent_chat') {
        navigate('/notes');
      } else if (chatType === 'case_discussion') {
        navigate('/notes');
      } else if (chatType === 'scheduling_reminder' || chatType === 'appointment_cancelled' || chatType === 'appointment_created') {
        // Notificações de agendamento
        if (user?.is_admin) {
          navigate('/scheduling');
        } else {
          navigate('/my-schedule');
        }
      }

      // Chama callback se fornecido
      if (onNotificationClick) {
        onNotificationClick(notification);
      }

      // Fecha o painel
      onClose();
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
    }
  };

  // Funções de swipe gesture
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;

    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart;

    // Apenas permite arrastar para baixo
    if (diff > 0) {
      setDragOffset(diff);
      setTouchEnd(currentTouch);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Se arrastou mais de 100px, fecha o painel
    if (dragOffset > 100) {
      onClose();
    }

    // Reset
    setDragOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
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

  const handleProgressAlertClose = () => {
    setShowProgressAlert(false);
    fetchNotifications(); // Recarrega notificações após fechar o modal
  };

  const handleProgramCompleted = async () => {
    // Atualiza os dados do paciente para refletir o programa arquivado
    if (selectedPatient?.id) {
      await refreshPatientData();
    }
    handleProgressAlertClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop com opacidade condicional */}
      <div
        className={`fixed inset-0 bg-black z-50 transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        } lg:flex lg:items-start lg:justify-center lg:pt-16`}
        onClick={onClose}
      >
        {/* Painel de Notificações - Bottom Sheet Mobile / Modal Desktop */}
        <div
          ref={panelRef}
          className={`
            fixed bottom-0 left-0 right-0 bg-white
            lg:static lg:max-w-md lg:mx-4 lg:rounded-lg lg:shadow-xl
            rounded-t-2xl lg:rounded-b-lg
            max-h-[85vh] lg:max-h-[80vh]
            transition-transform duration-300 ease-out
            ${isOpen ? 'translate-y-0 lg:translate-y-0 lg:scale-100 lg:opacity-100' : 'translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0'}
            overflow-hidden
          `}
          style={{
            transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
            transition: isDragging ? 'none' : undefined
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Indicador de arraste (só mobile) */}
          <div className="lg:hidden pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Content - Com altura flexível */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                <p>Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBell} className="text-3xl text-indigo-600" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">Nenhuma notificação</h4>
                <p className="text-sm text-gray-500">Você está em dia com tudo!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => {
                  const isSchedulingNotification = ['scheduling_reminder', 'appointment_cancelled', 'appointment_created'].includes(notification.chatType);
                  const bgColor = notification.chatType === 'appointment_cancelled'
                    ? 'bg-red-50'
                    : notification.chatType === 'appointment_created'
                    ? 'bg-green-50'
                    : notification.unreadCount > 0
                    ? 'bg-blue-50'
                    : '';

                  return (
                    <div
                      key={`${notification.userId}-${notification.patientId}-${notification.chatType}`}
                      className={`p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer ${bgColor}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          notification.chatType === 'appointment_cancelled'
                            ? 'bg-red-100 text-red-600'
                            : notification.chatType === 'appointment_created'
                            ? 'bg-green-100 text-green-600'
                            : notification.unreadCount > 0
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <FontAwesomeIcon icon={getChatTypeIcon(notification.chatType)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.patient_name}
                            </p>
                            {notification.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
                                {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
                              </span>
                            )}
                          </div>

                          <p className={`text-sm mt-0.5 ${
                            notification.chatType === 'appointment_cancelled'
                              ? 'text-red-700 font-medium'
                              : notification.chatType === 'appointment_created'
                              ? 'text-green-700 font-medium'
                              : 'text-gray-600'
                          }`}>
                            {getChatTypeLabel(notification.chatType)}
                          </p>

                          {!isSchedulingNotification && (
                            <p className="text-xs text-gray-500 mt-1">
                              Última leitura: {formatLastRead(notification.lastReadTimestamp)}
                            </p>
                          )}
                        </div>
                      </div>

                      {notification.unreadCount > 0 && (
                        <div className="mt-2 flex items-center text-xs text-indigo-600">
                          <FontAwesomeIcon icon={faEye} className="mr-1" />
                          Toque para ver
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer - Apenas desktop */}
          <div className="hidden lg:block p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Alertas de Progresso */}
      {showProgressAlert && (
        <ProgressAlert
          onClose={handleProgressAlertClose}
          onProgramCompleted={handleProgramCompleted}
        />
      )}
    </>
  );
};

export default NotificationPanel;

