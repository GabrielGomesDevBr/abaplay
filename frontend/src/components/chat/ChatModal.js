import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Modal fullscreen para chats em mobile
 * Proporciona experiência WhatsApp-like em dispositivos móveis
 */
const ChatModal = ({ isOpen, onClose, title, children }) => {
  // Prevenir scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Adicionar padding para compensar scrollbar (evita shift de layout)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Prevenir scroll em iOS quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      const preventScroll = (e) => {
        if (e.target.closest('.chat-messages')) return; // Permitir scroll na área de mensagens
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventScroll, { passive: false });

      return () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [isOpen]);

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col"
      style={{
        // Use 100dvh (dynamic viewport height) para lidar com teclado virtual mobile
        height: '100dvh',
        maxHeight: '-webkit-fill-available', // Fallback para Safari iOS
      }}
    >
      {/* Header do Modal */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-3 safe-area-top">
          {/* Botão Voltar */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
            aria-label="Voltar"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
          </button>

          {/* Título */}
          <h2 className="flex-1 text-center text-base sm:text-lg font-semibold px-2 truncate">
            {title}
          </h2>

          {/* Botão Fechar (alternativo) */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
            aria-label="Fechar"
          >
            <FontAwesomeIcon icon={faTimes} className="text-xl" />
          </button>
        </div>
      </div>

      {/* Conteúdo do Chat */}
      <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50">
        {children}
      </div>
    </div>
  );
};

export default ChatModal;
