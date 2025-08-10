import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faUsers, faTimes } from '@fortawesome/free-solid-svg-icons';

const PatientNotificationBadge = ({ 
  patientId, 
  patientName, 
  onNavigateToChat,
  notifications = { parentChat: 0, caseDiscussion: 0, total: 0 },
  className = ""
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleNavigate = (chatType) => {
    setShowModal(false);
    if (onNavigateToChat) {
      onNavigateToChat(patientId, chatType);
    }
  };

  const getBadgeColor = () => {
    if (notifications.total >= 3) return 'bg-red-500 text-white animate-pulse';
    if (notifications.total > 0) return 'bg-blue-500 text-white';
    return 'hidden';
  };

  if (notifications.total === 0) return null;

  return (
    <>
      {/* Badge */}
      <div
        onClick={handleBadgeClick}
        className={`
          absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold cursor-pointer
          flex items-center justify-center transition-all duration-200 hover:scale-110
          ${getBadgeColor()} ${className}
        `}
        title={`${notifications.total} notificação${notifications.total !== 1 ? 'ões' : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleBadgeClick(e);
          }
        }}
      >
        {notifications.total > 99 ? '99+' : notifications.total}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            className={`
              ${window.innerWidth < 768 
                ? 'fixed inset-x-0 bottom-0 bg-white rounded-t-xl shadow-xl transform transition-transform duration-300'
                : 'bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300'
              }
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-800">{patientName}</h3>
                <p className="text-sm text-gray-600">
                  {notifications.total} notificação{notifications.total !== 1 ? 'ões' : ''} pendente{notifications.total !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {notifications.parentChat > 0 && (
                <button
                  onClick={() => handleNavigate('parent_chat')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faComments} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Chat dos Pais</p>
                      <p className="text-sm text-gray-600">Mensagens da família</p>
                    </div>
                  </div>
                  <div className="bg-blue-500 text-white rounded-full min-w-[24px] h-6 flex items-center justify-center text-xs font-bold">
                    {notifications.parentChat}
                  </div>
                </button>
              )}

              {notifications.caseDiscussion > 0 && (
                <button
                  onClick={() => handleNavigate('case_discussion')}
                  className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <FontAwesomeIcon icon={faUsers} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">Discussão de Caso</p>
                      <p className="text-sm text-gray-600">Chat da equipe técnica</p>
                    </div>
                  </div>
                  <div className="bg-green-500 text-white rounded-full min-w-[24px] h-6 flex items-center justify-center text-xs font-bold">
                    {notifications.caseDiscussion}
                  </div>
                </button>
              )}
            </div>

            {/* Footer - Mobile only */}
            {window.innerWidth < 768 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 text-gray-600 font-medium"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PatientNotificationBadge;