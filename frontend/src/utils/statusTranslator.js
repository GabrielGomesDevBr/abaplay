// frontend/src/utils/statusTranslator.js

/**
 * Tradutor de status de agendamentos
 * Padroniza a terminologia em toda a aplicação
 *
 * IMPORTANTE: Status 'missed' diferenciado se foi justificado ou não
 */

export const translateStatus = (status, justifiedAt = null) => {
  const statusMap = {
    'scheduled': 'Agendado',
    'completed': 'Realizado',
    'missed': justifiedAt ? 'Não Realizado / Justificado' : 'Não Realizado',
    'cancelled': 'Cancelado'
  };

  return statusMap[status] || status;
};

/**
 * Retorna a cor associada ao status (para badges, cards, etc)
 */
export const getStatusColor = (status) => {
  const colorMap = {
    'scheduled': 'yellow',
    'completed': 'green',
    'missed': 'red',
    'cancelled': 'gray'
  };

  return colorMap[status] || 'gray';
};

/**
 * Retorna classe CSS do Tailwind para o status
 */
export const getStatusBadgeClasses = (status) => {
  const classMap = {
    'scheduled': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'missed': 'bg-red-100 text-red-800 border-red-200',
    'cancelled': 'bg-orange-100 text-orange-800 border-orange-200' // ✅ Diferenciado em laranja
  };

  return classMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Retorna ícone apropriado para o status (FontAwesome)
 */
export const getStatusIcon = (status) => {
  const iconMap = {
    'scheduled': 'clock',
    'completed': 'check-circle',
    'missed': 'exclamation-circle',
    'cancelled': 'times-circle'
  };

  return iconMap[status] || 'circle';
};

/**
 * Retorna descrição detalhada do status
 */
export const getStatusDescription = (status) => {
  const descriptionMap = {
    'scheduled': 'Agendamento confirmado, aguardando data/hora',
    'completed': 'Sessão foi realizada com sucesso',
    'missed': 'Sessão não foi realizada no horário agendado',  // ✅ Padronizado
    'cancelled': 'Agendamento foi cancelado'
  };

  return descriptionMap[status] || 'Status desconhecido';
};

/**
 * Verifica se status precisa de justificativa
 */
export const requiresJustification = (status, justifiedAt) => {
  return status === 'missed' && !justifiedAt;
};

/**
 * Formata texto de ação pendente baseado no status
 */
export const getPendingActionText = (status, justifiedAt) => {
  if (status === 'missed' && !justifiedAt) {
    return 'Aguardando justificativa';
  }
  if (status === 'missed' && justifiedAt) {
    return 'Justificativa registrada';
  }
  if (status === 'scheduled') {
    return 'Agendamento confirmado';
  }
  if (status === 'completed') {
    return 'Realizado';
  }
  if (status === 'cancelled') {
    return 'Cancelado';
  }
  return 'Status desconhecido';
};

export default {
  translateStatus,
  getStatusColor,
  getStatusBadgeClasses,
  getStatusIcon,
  getStatusDescription,
  requiresJustification,
  getPendingActionText
};
