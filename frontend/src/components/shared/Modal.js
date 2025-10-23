// frontend/src/components/shared/Modal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Modal component with mobile-first design
 *
 * Features:
 * - Fullscreen on mobile (<768px)
 * - Centered on desktop
 * - Responsive padding and fonts
 * - Touch-friendly close button (44px minimum)
 * - Smooth animations
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback to close modal
 * @param {string} title - Modal title
 * @param {node} children - Modal content
 * @param {string} size - Desktop size (max-w-sm, max-w-md, max-w-lg, max-w-3xl, etc.)
 * @param {boolean} fullscreenOnMobile - Force fullscreen on mobile (default: true)
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'max-w-3xl',
  fullscreenOnMobile = true
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detectar mudanças de tamanho de tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevenir scroll do body quando modal aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className={`
        flex items-center justify-center
        ${isMobile && fullscreenOnMobile
          ? 'min-h-screen'
          : 'min-h-screen pt-4 px-4 pb-20 sm:block sm:p-0'
        }
      `}>
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        ></div>

        {/* Modal content */}
        <div className={`
          inline-block bg-white text-left overflow-hidden shadow-xl
          transform transition-all
          ${isMobile && fullscreenOnMobile
            ? 'w-full h-full rounded-t-2xl'
            : `rounded-lg ${size} w-full sm:my-8 align-bottom sm:align-middle`
          }
        `}>
          {/* Header - Sticky no mobile */}
          <div className={`
            bg-white border-b border-gray-200 sticky top-0 z-10
            ${isMobile ? 'px-3 py-3' : 'px-4 sm:px-6 py-4'}
          `}>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <button
                type="button"
                className="
                  p-2 min-h-[44px] min-w-[44px]
                  flex items-center justify-center
                  rounded-full text-gray-400
                  hover:text-gray-600 hover:bg-gray-100
                  active:bg-gray-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                  transition-colors
                "
                onClick={onClose}
                aria-label="Fechar modal"
              >
                <FontAwesomeIcon icon={faTimes} className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className={`
            overflow-y-auto
            ${isMobile && fullscreenOnMobile
              ? 'max-h-[calc(100vh-64px)] px-3 py-4'
              : 'max-h-[calc(100vh-200px)] px-4 sm:px-6 py-4 sm:py-6'
            }
          `}>
            {children}
          </div>

          {/* Safe area no iOS */}
          {isMobile && fullscreenOnMobile && (
            <div className="safe-area-bottom bg-white" />
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
