import React, { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationTriangle, faInfoCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * Componente Toast para feedback visual ao usuário
 * @param {string} type - Tipo do toast: 'success', 'error', 'warning', 'info'
 * @param {string} message - Mensagem a ser exibida
 * @param {function} onClose - Callback para fechar o toast
 * @param {number} duration - Duração em ms antes de fechar automaticamente (default: 3000)
 */
const Toast = ({ type = 'info', message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
      icon: faCheckCircle,
      iconColor: 'text-white'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-pink-600',
      icon: faTimesCircle,
      iconColor: 'text-white'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      icon: faExclamationTriangle,
      iconColor: 'text-white'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      icon: faInfoCircle,
      iconColor: 'text-white'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in-right">
      <div className={`${style.bg} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 min-w-[300px] max-w-md`}>
        <FontAwesomeIcon icon={style.icon} className={`${style.iconColor} text-2xl flex-shrink-0`} />
        <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors ml-2 flex-shrink-0"
          aria-label="Fechar notificação"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
