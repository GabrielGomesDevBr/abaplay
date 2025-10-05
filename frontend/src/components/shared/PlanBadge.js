import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faCalendarCheck, faClock } from '@fortawesome/free-solid-svg-icons';

/**
 * Componente para exibir badge do plano de assinatura
 */
const PlanBadge = ({ subscription, size = 'md', showTrial = true }) => {
  if (!subscription) return null;

  const { effective_plan, has_active_trial, trial_pro_expires_at, plan_display_name } = subscription;

  // Calcular dias restantes do trial
  const daysLeft = has_active_trial && trial_pro_expires_at
    ? Math.ceil((new Date(trial_pro_expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Estilos baseados no tamanho
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Estilos baseados no plano
  const planStyles = {
    pro: {
      bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
      text: 'text-white',
      icon: faCrown,
      label: plan_display_name || 'Pro'
    },
    scheduling: {
      bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      text: 'text-white',
      icon: faCalendarCheck,
      label: plan_display_name || 'Agenda'
    }
  };

  const style = planStyles[effective_plan] || planStyles.scheduling;

  return (
    <div className="flex flex-col gap-1">
      {/* Badge principal */}
      <div className={`
        inline-flex items-center gap-2 rounded-full font-semibold shadow-md
        ${style.bg} ${style.text} ${sizeClasses[size]}
      `}>
        <FontAwesomeIcon icon={style.icon} className={iconSizeClasses[size]} />
        <span>{style.label}</span>
      </div>

      {/* Badge de trial (se ativo e showTrial = true) */}
      {has_active_trial && showTrial && (
        <div className={`
          inline-flex items-center gap-1.5 rounded-full font-medium shadow-sm
          ${daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
          ${sizeClasses[size]}
        `}>
          <FontAwesomeIcon icon={faClock} className={iconSizeClasses[size]} />
          <span>Trial: {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</span>
        </div>
      )}
    </div>
  );
};

export default PlanBadge;
