import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faChevronRight } from '@fortawesome/free-solid-svg-icons';

/**
 * Botão trigger para abrir o chat modal em mobile
 * Design atraente que convida o usuário a iniciar a conversa
 */
const ChatTrigger = ({ onClick, patientName, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border-2 border-indigo-200 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 overflow-hidden touch-manipulation"
    >
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
            <FontAwesomeIcon icon={faComments} className="text-white text-xl" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Conversa com a Equipe</p>
            <p className="text-blue-100 text-xs">Toque para abrir o chat</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          <FontAwesomeIcon icon={faChevronRight} className="text-white text-lg" />
        </div>
      </div>

      {/* Body com preview */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-indigo-700 text-sm font-medium">Chat em tempo real</p>
          </div>
          <p className="text-indigo-600 text-xs">
            Mensagens instantâneas
          </p>
        </div>

        <div className="mt-2 bg-white/60 rounded-lg p-2 border border-indigo-100">
          <p className="text-gray-600 text-xs leading-relaxed">
            💬 Converse diretamente com todos os terapeutas de <span className="font-semibold">{patientName}</span>
          </p>
        </div>
      </div>
    </button>
  );
};

export default ChatTrigger;
